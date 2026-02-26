const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/dishware — ดึงรายการ (Admin เห็นทั้งหมด, Tenant เห็นของตัวเอง)
const getDishwareUsages = async (req, res, next) => {
  try {
    const { contract_id, month } = req.query;
    const where = {};

    if (req.user.role === 'TENANT') {
      const contracts = await prisma.rentalContract.findMany({
        where: { tenant_id: req.user.user_id },
        select: { contract_id: true }
      });
      where.contract_id = { in: contracts.map(c => c.contract_id) };
    } else if (contract_id) {
      where.contract_id = parseInt(contract_id);
    }

    if (month) {
      const d = new Date(month);
      where.usage_date = {
        gte: new Date(d.getFullYear(), d.getMonth(), 1),
        lt: new Date(d.getFullYear(), d.getMonth() + 1, 1)
      };
    }

    const usages = await prisma.dailyDishwareUsage.findMany({
      where,
      include: {
        contract: {
          include: {
            slot: { select: { slot_number: true, food_court_id: true } },
            tenant: { select: { first_name: true, last_name: true } }
          }
        },
        recorder: { select: { first_name: true, last_name: true } },
        items: {
          include: {
            dishware_type: true
          }
        }
      },
      orderBy: { usage_date: 'desc' }
    });

    res.json({ success: true, data: usages });
  } catch (error) {
    next(error);
  }
};

// POST /api/dishware — บันทึกรายการซื้อ (Admin หรือ Tenant)
// Body: { contract_id?, usage_date, items: [{dishware_type_id, quantity}] }
const createDishwareUsage = async (req, res, next) => {
  try {
    const { contract_id, usage_date, items } = req.body;

    if (!usage_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่และรายการภาชนะ' });
    }

    let resolvedContractId = contract_id ? parseInt(contract_id) : null;

    // ถ้าเป็น TENANT — หา active contract อัตโนมัติ
    if (req.user.role === 'TENANT') {
      const contract = await prisma.rentalContract.findFirst({
        where: { tenant_id: req.user.user_id, status: 'ACTIVE' }
      });
      if (!contract) {
        return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่าที่ active ของคุณ' });
      }
      resolvedContractId = contract.contract_id;
    }

    if (!resolvedContractId) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ contract_id' });
    }

    // ตรวจสอบ contract
    const contract = await prisma.rentalContract.findUnique({ where: { contract_id: resolvedContractId } });
    if (!contract) return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่านี้' });

    // ดึงราคาจาก DishwareType
    const typeIds = items.map(i => parseInt(i.dishware_type_id));
    const dishwareTypes = await prisma.dishwareType.findMany({
      where: { dishware_type_id: { in: typeIds }, is_active: true }
    });

    const typeMap = {};
    for (const t of dishwareTypes) typeMap[t.dishware_type_id] = t;

    // ตรวจว่า type ทุกตัวมีอยู่จริงและ active
    for (const item of items) {
      if (!typeMap[parseInt(item.dishware_type_id)]) {
        return res.status(400).json({ success: false, message: `ไม่พบประเภทภาชนะ id=${item.dishware_type_id}` });
      }
    }

    // คำนวณ subtotal และ total_cost
    const orderItems = items
      .filter(i => parseInt(i.quantity) > 0)
      .map(i => {
        const t = typeMap[parseInt(i.dishware_type_id)];
        const qty = parseInt(i.quantity);
        return {
          dishware_type_id: t.dishware_type_id,
          quantity: qty,
          unit_price: t.unit_price,
          subtotal: qty * t.unit_price
        };
      });

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกจำนวนอย่างน้อย 1 รายการ' });
    }

    const total_cost = orderItems.reduce((acc, i) => acc + i.subtotal, 0);

    const usage = await prisma.dailyDishwareUsage.create({
      data: {
        contract_id: resolvedContractId,
        usage_date: new Date(usage_date),
        total_cost,
        recorded_by: req.user.user_id,
        items: {
          create: orderItems
        }
      },
      include: {
        contract: { include: { slot: { select: { slot_number: true } } } },
        items: { include: { dishware_type: true } }
      }
    });

    res.status(201).json({ success: true, message: 'สั่งซื้อถ้วยชามเรียบร้อย', data: usage });
  } catch (error) {
    next(error);
  }
};

// GET /api/dishware/summary — สรุปรายเดือน (Admin/Executive)
const getDishwareSummary = async (req, res, next) => {
  try {
    const { month } = req.query;
    const where = {};

    if (month) {
      const d = new Date(month);
      where.usage_date = {
        gte: new Date(d.getFullYear(), d.getMonth(), 1),
        lt: new Date(d.getFullYear(), d.getMonth() + 1, 1)
      };
    }

    const usages = await prisma.dailyDishwareUsage.findMany({
      where,
      include: {
        contract: {
          include: {
            slot: { select: { slot_number: true, food_court_id: true } },
            tenant: { select: { first_name: true, last_name: true } }
          }
        },
        items: { include: { dishware_type: true } }
      },
      orderBy: { usage_date: 'asc' }
    });

    // Aggregate per contract
    const summaryMap = {};
    for (const u of usages) {
      const key = u.contract_id;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          contract_id: u.contract_id,
          slot_number: u.contract.slot.slot_number,
          tenant_name: `${u.contract.tenant.first_name} ${u.contract.tenant.last_name || ''}`.trim(),
          total_cost: 0,
          count: 0
        };
      }
      summaryMap[key].total_cost += u.total_cost;
      summaryMap[key].count += 1;
    }

    const summary = Object.values(summaryMap);
    const grandTotal = summary.reduce((acc, s) => acc + s.total_cost, 0);

    res.json({ success: true, data: summary, grandTotal });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/dishware/:id — ลบรายการ (Admin only)
const deleteDishwareUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usage = await prisma.dailyDishwareUsage.findUnique({ where: { usage_id: parseInt(id) } });
    if (!usage) return res.status(404).json({ success: false, message: 'ไม่พบรายการนี้' });

    // ลบ items ก่อน แล้วค่อยลบ usage
    await prisma.dishwareOrderItem.deleteMany({ where: { usage_id: parseInt(id) } });
    await prisma.dailyDishwareUsage.delete({ where: { usage_id: parseInt(id) } });

    res.json({ success: true, message: 'ลบรายการเรียบร้อย' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/dishware/:id/approve — อนุมัติรายการ (Admin only)
const approveDishwareUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usage = await prisma.dailyDishwareUsage.findUnique({ where: { usage_id: parseInt(id) } });
    if (!usage) return res.status(404).json({ success: false, message: 'ไม่พบรายการนี้' });
    if (usage.status !== 'PENDING') return res.status(400).json({ success: false, message: 'รายการนี้ถูกดำเนินการแล้ว' });

    const updated = await prisma.dailyDishwareUsage.update({
      where: { usage_id: parseInt(id) },
      data: { status: 'APPROVED', reviewed_by: req.user.user_id, reviewed_at: new Date() }
    });
    res.json({ success: true, message: 'อนุมัติรายการเรียบร้อย', data: updated });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/dishware/:id/reject — ปฏิเสธรายการ (Admin only)
const rejectDishwareUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reject_reason } = req.body;
    const usage = await prisma.dailyDishwareUsage.findUnique({ where: { usage_id: parseInt(id) } });
    if (!usage) return res.status(404).json({ success: false, message: 'ไม่พบรายการนี้' });
    if (usage.status !== 'PENDING') return res.status(400).json({ success: false, message: 'รายการนี้ถูกดำเนินการแล้ว' });

    const updated = await prisma.dailyDishwareUsage.update({
      where: { usage_id: parseInt(id) },
      data: {
        status: 'REJECTED',
        reviewed_by: req.user.user_id,
        reviewed_at: new Date(),
        reject_reason: reject_reason || null
      }
    });
    res.json({ success: true, message: 'ปฏิเสธรายการเรียบร้อย', data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDishwareUsages,
  createDishwareUsage,
  getDishwareSummary,
  deleteDishwareUsage,
  approveDishwareUsage,
  rejectDishwareUsage
};
