// ======================================================
// stallController.js - Controller จัดการแผงร้านค้า (Rental Slots)
// รับผิดชอบ: CRUD แผง, บันทึกมิเตอร์น้ำ/ไฟ, สถิติ Dashboard
// ======================================================

// Prisma Client สำหรับติดต่อฐานข้อมูล
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: getAllSlots
// หน้าที่: ดึงแผงทั้งหมด (สำหรับแผนผังภาพรวม)
//   - รองรับ filter: ?food_court_id=1&status=OCCUPIED
//   - ต้องการ role ทุกระดับสามารถเรียกได้ (เพื่อแสดงแผนนำทาง)
//   - ดึงกลับมาพร้อม: ผู้เช่าปัจจุบัน (สัญญา ACTIVE), มิเตอร์ล่าสุด
// -------------------------------------------------------
const getAllSlots = async (req, res, next) => {
  try {
    // รับ query parameters สำหรับกรองข้อมูล
    const { food_court_id, status } = req.query;

    const where = {};
    if (food_court_id) where.food_court_id = parseInt(food_court_id);
    if (status) where.status = status;

    // ทุก role สามารถดึงข้อมูลแผงได้ (เพื่อแสดงแผนนำทาง)
    // แต่ข้อมูล tenant จะถูกซ่อนสำหรับ TENANT ที่ frontend
    const slots = await prisma.rentalSlot.findMany({
      where,
      include: {
        food_court: {
          select: { food_court_id: true, name: true }
        },
        rental_contracts: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: {
              select: { user_id: true, first_name: true, last_name: true, email: true, phone: true }
            }
          },
          take: 1
        },
        utility_meters: {
          orderBy: { created_at: 'desc' },
          take: 2 // Assuming we might get one water and one electric recently
        }
      },
      orderBy: { slot_number: 'asc' }
    });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: getSlotById
// หน้าที่: ดึงข้อมูลแผงตาม ID พร้อมข้อมูลลึก
//   - ดึง utility_meters ย้อนหลัง 12 รายการ (ประวัติมิเตอร์)
//   - ดึง rental_contracts ล่าสุด 5 รายการ (ประวัติการเช่า)
// -------------------------------------------------------
const getSlotById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const slot = await prisma.rentalSlot.findUnique({
      where: { slot_id: parseInt(id) },
      include: {
        food_court: true,
        utility_meters: {
          orderBy: { created_at: 'desc' },
          take: 12
        },
        rental_contracts: {
          include: {
            tenant: {
              select: { user_id: true, first_name: true, last_name: true, email: true, phone: true }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: createSlot
// หน้าที่: สร้างแผงใหม่ (Admin เท่านั้น)
//   - ตรวจสอบหมายเลขแผงซ้ำใน food court เดียวกัน
//   - ใช้ upsert สร้าง FoodCourt อัตโนมัติถ้ายังไม่มี
//     (ป้องกัน error foreign key constraint)
// -------------------------------------------------------
const createSlot = async (req, res, next) => {
  try {
    const { food_court_id, slot_number, slot_size, rent, status } = req.body;

    // ตรวจสอบว่าหมายเลขแผงนี้มีอยู่ใน food court นั้นแล้วหรือไม่
    const existing = await prisma.rentalSlot.findFirst({
      where: { food_court_id: parseInt(food_court_id), slot_number }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Slot number already exists in this food court.' });
    }

    // upsert FoodCourt: สร้างใหม่ถ้าไม่มี, ไม่ทำอะไรถ้ามีอยู่แล้ว
    // เพื่อป้องกัน Foreign Key Error เวลาสร้าง slot
    await prisma.foodCourt.upsert({
      where: { food_court_id: parseInt(food_court_id) },
      update: {},
      create: {
        food_court_id: parseInt(food_court_id),
        name: `ศูนย์อาหาร ${food_court_id}`,
        total_slots: 50,
      }
    });

    const slot = await prisma.rentalSlot.create({
      data: {
        food_court_id: parseInt(food_court_id),
        slot_number,
        slot_size: slot_size || null,
        rent: parseFloat(rent),
        status: status || 'VACANT'
      }
    });

    res.status(201).json({ success: true, message: 'Slot created successfully.', data: slot });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: updateSlot
// หน้าที่: แก้ไขข้อมูลแผง (Admin เท่านั้น)
//   - รองรับการเปลี่ยน tenant_id:
//     * null → ยกเลิกสัญญา ACTIVE ทั้งหมดของแผงนี้
//     * มีค่า → ยกเลิกสัญญาเก่า แล้วสร้างสัญญาใหม่ default 1 ปีให้ tenant ใหม่
//   - ใช้ spread operator (...) เพื่ออัปเดตเฉพาะ field ที่ส่งมา
// -------------------------------------------------------
const updateSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slot_number, slot_size, rent, status, tenant_id, menuType } = req.body;

    const existing = await prisma.rentalSlot.findUnique({ where: { slot_id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    // ใช้ spread operator เพื่อ partial update (ใส่เฉพาะ field ที่ส่งมาจริง ๆ)
    const updatedSlot = await prisma.rentalSlot.update({
      where: { slot_id: parseInt(id) },
      data: {
        ...(slot_number && { slot_number }),
        ...(slot_size !== undefined && { slot_size }),
        ...(rent && { rent: parseFloat(rent) }),
        ...(status && { status })
      }
    });

    // ถ้ามีการส่ง tenant_id มาด้วย → จัดการสัญญา
    if (tenant_id !== undefined) {
      if (tenant_id === null) {
        // ยกเลิกสัญญา ACTIVE ทั้งหมดของแผงนี้ (ปล่อยแผงว่าง)
        await prisma.rentalContract.updateMany({
          where: { slot_id: parseInt(id), status: 'ACTIVE' },
          data: { status: 'TERMINATED' }
        });
      } else {
        // ยกเลิกสัญญาเก่าก่อน
        await prisma.rentalContract.updateMany({
          where: { slot_id: parseInt(id), status: 'ACTIVE' },
          data: { status: 'TERMINATED' }
        });
        // สร้างสัญญา default ใหม่ 1 ปี พร้อม deposit 3 เดือน
        await prisma.rentalContract.create({
          data: {
            slot_id: parseInt(id),
            tenant_id: parseInt(tenant_id),
            contract_number: `CTR-${updatedSlot.slot_number}-${Date.now().toString().slice(-6)}`,
            start_date: new Date(),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            monthly_rent: updatedSlot.rent,
            deposit_amount: updatedSlot.rent * 3,
            menuType: menuType || null,
            status: 'ACTIVE'
          }
        });
      }
    }

    res.json({ success: true, message: 'Slot updated successfully.', data: updatedSlot });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: deleteSlot
// หน้าที่: ลบแผง (Admin เท่านั้น)
//   - ป้องกันการลบแผงที่มีสัญญา ACTIVE อยู่
//   - ต้องยกเลิกสัญญาก่อนจึงจะลบแผงได้
// -------------------------------------------------------
const deleteSlot = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.rentalSlot.findUnique({ where: { slot_id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    const activeContract = await prisma.rentalContract.findFirst({
      where: { slot_id: parseInt(id), status: 'ACTIVE' }
    });
    if (activeContract) {
      return res.status(400).json({ success: false, message: 'Cannot delete slot with active contract.' });
    }

    await prisma.rentalSlot.delete({ where: { slot_id: parseInt(id) } });
    res.json({ success: true, message: 'Slot deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: recordMeterReading
// หน้าที่: บันทึกค่ามิเตอร์น้ำ/ไฟสำหรับแผง (Admin เท่านั้น)
//   ขั้นตอน:
//   1. ดึงราคาต่อหน่วยจาก SystemSetting (WATER_RATE_PER_UNIT, ELECTRIC_RATE_PER_UNIT)
//   2. ดึงค่าอ่านมิเตอร์ครั้งก่อนหน้า (previous_reading)
//   3. คำนวณหน่วยที่ใช้ = ค่าอ่านใหม่ - ค่าอ่านเก่า
//   4. คำนวณค่าใช้จ่าย = หน่วยที่ใช้ × ราคาต่อหน่วย
//   5. บันทึก record ใหม่
//   รองรับทั้งมิเตอร์น้ำและมิเตอร์ไฟในครั้งเดียว
// -------------------------------------------------------
const recordMeterReading = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { waterMeter, electricMeter, waterMeterNumber, electricMeterNumber } = req.body;

    const slot = await prisma.rentalSlot.findUnique({ where: { slot_id: parseInt(id) } });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    // ดึงราคาต่อหน่วยจาก SystemSetting (fallback เป็น default ถ้าไม่มี)
    // น้ำ: 14 บาท/หน่วย, ไฟ: 6 บาท/หน่วย (ค่าตั้งต้น)
    const [waterSetting, electricSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { setting_key: 'WATER_RATE_PER_UNIT' } }),
      prisma.systemSetting.findUnique({ where: { setting_key: 'ELECTRIC_RATE_PER_UNIT' } })
    ]);
    const waterPrice = parseFloat(waterSetting?.setting_value || '14');
    const electricPrice = parseFloat(electricSetting?.setting_value || '6');

    const results = {}; // เก็บผลลัพธ์ทั้งมิเตอร์น้ำและไฟ

    // === ประมวลผลมิเตอร์น้ำ ===
    if (waterMeter !== undefined && waterMeter !== '') {
      const currWater = parseFloat(waterMeter) || 0;
      // ดึงค่าอ่านมิเตอร์น้ำครั้งล่าสุด (เรียงตาม created_at DESC)
      const lastWater = await prisma.utilityMeter.findFirst({
        where: { slot_id: parseInt(id), meter_type: 'WATER' },
        orderBy: { created_at: 'desc' }
      });
      const prevWater = lastWater ? parseFloat(lastWater.current_reading) : 0;
      // คำนวณหน่วยที่ใช้ (Math.max เพื่อป้องกันค่าติดลบ กรณีมิเตอร์ถูกรีเซ็ต)
      const usedWater = Math.max(0, currWater - prevWater);

      const record = await prisma.utilityMeter.create({
        data: {
          slot_id: parseInt(id),
          meter_type: 'WATER',
          meter_number: waterMeterNumber || null,
          previous_reading: prevWater,
          current_reading: currWater,
          unit_used: usedWater,
          unit_price: waterPrice,
          total_cost: usedWater * waterPrice,
          recorded_by: req.user.user_id
        }
      });
      results.water = record;
    }

    // === ประมวลผลมิเตอร์ไฟ ===
    if (electricMeter !== undefined && electricMeter !== '') {
      const currElectric = parseFloat(electricMeter) || 0;
      // ดึงค่าอ่านมิเตอร์ไฟครั้งล่าสุด
      const lastElectric = await prisma.utilityMeter.findFirst({
        where: { slot_id: parseInt(id), meter_type: 'ELECTRICITY' },
        orderBy: { created_at: 'desc' }
      });
      const prevElectric = lastElectric ? parseFloat(lastElectric.current_reading) : 0;
      // คำนวณหน่วยที่ใช้
      const usedElectric = Math.max(0, currElectric - prevElectric);

      const record = await prisma.utilityMeter.create({
        data: {
          slot_id: parseInt(id),
          meter_type: 'ELECTRICITY',
          meter_number: electricMeterNumber || null,
          previous_reading: prevElectric,
          current_reading: currElectric,
          unit_used: usedElectric,
          unit_price: electricPrice,
          total_cost: usedElectric * electricPrice,
          recorded_by: req.user.user_id
        }
      });
      results.electricity = record;
    }

    res.status(201).json({ success: true, message: 'บันทึกมิเตอร์สำเร็จ', data: results });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: getMeterReadings
// หน้าที่: ดึงประวัติการอ่านมิเตอร์ของแผง
//   - รองรับ filter ?meter_type=WATER หรือ ELECTRICITY
//   - เรียงจากล่าสุดก่อน (desc)
//   - ดึงข้อมูลผู้บันทึก (recorder) มาด้วย
// -------------------------------------------------------
const getMeterReadings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { meter_type } = req.query;

    const where = { slot_id: parseInt(id) };
    if (meter_type) where.meter_type = meter_type;

    const readings = await prisma.utilityMeter.findMany({
      where,
      include: {
        recorder: {
          select: { user_id: true, first_name: true, last_name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: readings });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: getDashboardStats
// หน้าที่: ดึงสถิติภาพรวมสำหรับ Admin Dashboard
//   ใช้ Promise.all เพื่อ query พร้อมกัน 7 queries (ประหยัดเวลา)
//   ข้อมูลที่ดึงมา:
//   - จำนวนแผงทั้งหมด, OCCUPIED, VACANT, MAINTENANCE
//   - จำนวน Tenant ทั้งหมด
//   - บิลที่ยังไม่ชำระ (PENDING)
//   - งานซ่อมที่ค้างอยู่ (PENDING + IN_PROGRESS)
//   - สถิติแยกตาม food_court (groupBy)
// -------------------------------------------------------
const getDashboardStats = async (req, res, next) => {
  try {
    // Query 7 ข้อมูลพร้อมกันด้วย Promise.all ประหยัดเวลา
    const [totalSlots, occupiedSlots, vacantSlots, maintenanceSlots, totalTenants, pendingExpenses, pendingRepairs] =
      await Promise.all([
        prisma.rentalSlot.count(),
        prisma.rentalSlot.count({ where: { status: 'OCCUPIED' } }),
        prisma.rentalSlot.count({ where: { status: 'VACANT' } }),
        prisma.rentalSlot.count({ where: { status: 'MAINTENANCE' } }),
        prisma.user.count({ where: { role: 'TENANT' } }),
        prisma.monthlyExpense.count({ where: { status: 'PENDING' } }),
        prisma.maintenanceRequest.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } })
      ]);

    const slotsByFoodCourt = await prisma.rentalSlot.groupBy({
      by: ['food_court_id', 'status'],
      _count: { status: true }
    });

    res.json({
      success: true,
      data: {
        overview: { totalSlots, occupiedSlots, vacantSlots, maintenanceSlots, totalTenants, pendingExpenses, pendingRepairs },
        slotsByFoodCourt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSlots,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
  recordMeterReading,
  getMeterReadings,
  getDashboardStats
};
