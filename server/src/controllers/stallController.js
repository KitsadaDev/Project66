const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all rental slots
const getAllSlots = async (req, res, next) => {
  try {
    const { food_court_id, status } = req.query;

    const where = {};
    if (food_court_id) where.food_court_id = parseInt(food_court_id);
    if (status) where.status = status;

    // Allow all roles to query all slots for visual layout map
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

// Get slot by ID
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

// Create slot (Admin only)
const createSlot = async (req, res, next) => {
  try {
    const { food_court_id, slot_number, slot_size, rent, status } = req.body;

    const existing = await prisma.rentalSlot.findFirst({
      where: { food_court_id: parseInt(food_court_id), slot_number }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Slot number already exists in this food court.' });
    }

    // Ensure FoodCourt exists before creating the stall
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

// Update slot (Admin only)
const updateSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slot_number, slot_size, rent, status, tenant_id, menuType } = req.body;

    const existing = await prisma.rentalSlot.findUnique({ where: { slot_id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    const updatedSlot = await prisma.rentalSlot.update({
      where: { slot_id: parseInt(id) },
      data: {
        ...(slot_number && { slot_number }),
        ...(slot_size !== undefined && { slot_size }),
        ...(rent && { rent: parseFloat(rent) }),
        ...(status && { status })
      }
    });

    if (tenant_id !== undefined) {
      if (tenant_id === null) {
        // Terminate active contracts for this slot
        await prisma.rentalContract.updateMany({
          where: { slot_id: parseInt(id), status: 'ACTIVE' },
          data: { status: 'TERMINATED' }
        });
      } else {
        // Terminate active contracts
        await prisma.rentalContract.updateMany({
          where: { slot_id: parseInt(id), status: 'ACTIVE' },
          data: { status: 'TERMINATED' }
        });
        // Create new default active contract
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

// Delete slot (Admin only)
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

// Record meter reading (Admin only)
const recordMeterReading = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { waterMeter, electricMeter, waterMeterNumber, electricMeterNumber } = req.body;

    const slot = await prisma.rentalSlot.findUnique({ where: { slot_id: parseInt(id) } });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    // ดึงราคาจาก SystemSetting (fallback เป็น default ถ้าไม่มี)
    const [waterSetting, electricSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { setting_key: 'WATER_RATE_PER_UNIT' } }),
      prisma.systemSetting.findUnique({ where: { setting_key: 'ELECTRIC_RATE_PER_UNIT' } })
    ]);
    const waterPrice = parseFloat(waterSetting?.setting_value || '14');
    const electricPrice = parseFloat(electricSetting?.setting_value || '6');

    const results = {};

    // Process Water Meter
    if (waterMeter !== undefined && waterMeter !== '') {
      const currWater = parseFloat(waterMeter) || 0;
      const lastWater = await prisma.utilityMeter.findFirst({
        where: { slot_id: parseInt(id), meter_type: 'WATER' },
        orderBy: { created_at: 'desc' }
      });
      const prevWater = lastWater ? parseFloat(lastWater.current_reading) : 0;
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

    // Process Electric Meter
    if (electricMeter !== undefined && electricMeter !== '') {
      const currElectric = parseFloat(electricMeter) || 0;
      const lastElectric = await prisma.utilityMeter.findFirst({
        where: { slot_id: parseInt(id), meter_type: 'ELECTRICITY' },
        orderBy: { created_at: 'desc' }
      });
      const prevElectric = lastElectric ? parseFloat(lastElectric.current_reading) : 0;
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

// Get meter readings for a slot
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

// Get dashboard stats (Admin only)
const getDashboardStats = async (req, res, next) => {
  try {
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
