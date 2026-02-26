const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/dishware-types — ดึงประเภทภาชนะทั้งหมด (active)
const getDishwareTypes = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const where = req.user.role === 'ADMIN' && includeInactive === 'true'
      ? {}
      : { is_active: true };

    const types = await prisma.dishwareType.findMany({
      where,
      orderBy: [{ category: 'asc' }, { size_label: 'asc' }]
    });
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
};

// POST /api/dishware-types — เพิ่มประเภทใหม่ (Admin only)
const createDishwareType = async (req, res, next) => {
  try {
    const { name, category, size_label, unit_price } = req.body;
    if (!name || !category || !size_label || unit_price == null) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ (name, category, size_label, unit_price)' });
    }
    const type = await prisma.dishwareType.create({
      data: {
        name,
        category,
        size_label,
        unit_price: parseFloat(unit_price)
      }
    });
    res.status(201).json({ success: true, message: 'เพิ่มประเภทภาชนะเรียบร้อย', data: type });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/dishware-types/:id — แก้ไขประเภท (Admin only)
const updateDishwareType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, size_label, unit_price, is_active } = req.body;

    const existing = await prisma.dishwareType.findUnique({ where: { dishware_type_id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'ไม่พบประเภทภาชนะนี้' });

    const updated = await prisma.dishwareType.update({
      where: { dishware_type_id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(size_label !== undefined && { size_label }),
        ...(unit_price !== undefined && { unit_price: parseFloat(unit_price) }),
        ...(is_active !== undefined && { is_active: Boolean(is_active) })
      }
    });
    res.json({ success: true, message: 'แก้ไขเรียบร้อย', data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/dishware-types/:id — ลบประเภท (Admin only)
const deleteDishwareType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.dishwareType.findUnique({ where: { dishware_type_id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'ไม่พบประเภทภาชนะนี้' });

    // ลบได้แค่ถ้ายังไม่มี order_items ไม่งั้น soft-delete
    const usedCount = await prisma.dishwareOrderItem.count({ where: { dishware_type_id: parseInt(id) } });
    if (usedCount > 0) {
      await prisma.dishwareType.update({
        where: { dishware_type_id: parseInt(id) },
        data: { is_active: false }
      });
      return res.json({ success: true, message: 'ซ่อนประเภทเรียบร้อย (มีการใช้งานอยู่ จึงซ่อนแทนการลบ)' });
    }

    await prisma.dishwareType.delete({ where: { dishware_type_id: parseInt(id) } });
    res.json({ success: true, message: 'ลบประเภทภาชนะเรียบร้อย' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDishwareTypes, createDishwareType, updateDishwareType, deleteDishwareType };
