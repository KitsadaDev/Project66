const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all monthly expenses (filtered by role)
const getAllBills = async (req, res, next) => {
  try {
    const { status, billing_month } = req.query;
    const where = {};

    if (req.user.role === 'TENANT') {
      // Find contracts for this tenant
      const contracts = await prisma.rentalContract.findMany({
        where: { tenant_id: req.user.user_id },
        select: { contract_id: true }
      });
      where.contract_id = { in: contracts.map(c => c.contract_id) };
    }

    if (status) where.status = status;

    if (billing_month) {
      const d = new Date(billing_month);
      where.billing_month = {
        gte: new Date(d.getFullYear(), d.getMonth(), 1),
        lt: new Date(d.getFullYear(), d.getMonth() + 1, 1)
      };
    }

    const expenses = await prisma.monthlyExpense.findMany({
      where,
      include: {
        contract: {
          include: {
            slot: { select: { slot_id: true, slot_number: true, food_court_id: true } },
            tenant: { select: { user_id: true, first_name: true, last_name: true, email: true } }
          }
        },
        payments: { orderBy: { created_at: 'desc' }, take: 1 }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

// Get expense by ID
const getBillById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await prisma.monthlyExpense.findUnique({
      where: { expense_id: parseInt(id) },
      include: {
        contract: {
          include: {
            slot: { select: { slot_id: true, slot_number: true, food_court_id: true, rent: true } },
            tenant: { select: { user_id: true, first_name: true, last_name: true, email: true, phone: true } }
          }
        },
        payments: { orderBy: { created_at: 'desc' } }
      }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// Create monthly expense (Admin only)
const createBill = async (req, res, next) => {
  try {
    const { slot_id, billing_month, water_cost, electricity_cost, dueDate } = req.body;

    // Find active contract for this slot
    const contract = await prisma.rentalContract.findFirst({
      where: { 
        slot_id: parseInt(slot_id),
        status: 'ACTIVE'
      }
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'No active contract found for this slot.' });
    }

    const rent_amount = contract.monthly_rent;
    
    // Fetch global grease trap fee, but only apply if menuType is 'ของคาว'
    const greaseTrapSetting = await prisma.systemSetting.findUnique({ where: { setting_key: 'GREASE_TRAP_FEE' } });
    const baseGreaseTrapFee = parseFloat(greaseTrapSetting?.setting_value || '500');
    const greaseTrapFee = contract.menuType === 'ของคาว' ? baseGreaseTrapFee : 0;

    const total_amount = parseFloat(rent_amount) + parseFloat(water_cost) + parseFloat(electricity_cost) + greaseTrapFee;

    const expense = await prisma.monthlyExpense.create({
      data: {
        contract_id: contract.contract_id,
        billing_month: new Date(billing_month),
        rent_amount: parseFloat(rent_amount),
        water_cost: parseFloat(water_cost),
        electricity_cost: parseFloat(electricity_cost),
        total_amount,
        due_date: new Date(dueDate),
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, message: 'Expense created successfully.', data: expense });
  } catch (error) {
    next(error);
  }
};

// Update expense (Admin only)
const updateBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { water_cost, electricity_cost, due_date, status } = req.body;

    const existing = await prisma.monthlyExpense.findUnique({ where: { expense_id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    const updateData = {};
    if (water_cost !== undefined) updateData.water_cost = parseFloat(water_cost);
    if (electricity_cost !== undefined) updateData.electricity_cost = parseFloat(electricity_cost);
    if (due_date) updateData.due_date = new Date(due_date);
    if (status) updateData.status = status;

    if (water_cost !== undefined || electricity_cost !== undefined) {
      const newWater = water_cost !== undefined ? parseFloat(water_cost) : existing.water_cost;
      const newElec = electricity_cost !== undefined ? parseFloat(electricity_cost) : existing.electricity_cost;
      updateData.total_amount = existing.rent_amount + newWater + newElec;
    }

    const updated = await prisma.monthlyExpense.update({
      where: { expense_id: parseInt(id) },
      data: updateData
    });

    res.json({ success: true, message: 'Expense updated successfully.', data: updated });
  } catch (error) {
    next(error);
  }
};

// Upload payment slip (Tenant)
const uploadPaymentProof = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await prisma.monthlyExpense.findUnique({ where: { expense_id: parseInt(id) } });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Using Cloudinary, the full URL is in req.file.path
    const payment_slip_url = req.file.path;

    const payment = await prisma.payment.create({
      data: {
        expense_id: parseInt(id),
        payment_date: new Date(),
        payment_amount: expense.total_amount,
        payment_slip_url
      }
    });

    res.json({ success: true, message: 'Payment slip uploaded.', data: payment });
  } catch (error) {
    next(error);
  }
};

// Verify payment (Admin only)
const verifyPayment = async (req, res, next) => {
  try {
    const { payment_id } = req.params;
    const { approved, notes } = req.body;

    const payment = await prisma.payment.findUnique({ where: { payment_id: parseInt(payment_id) } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    const updatedPayment = await prisma.payment.update({
      where: { payment_id: parseInt(payment_id) },
      data: {
        verified_by: req.user.user_id,
        verified_at: new Date(),
        notes: notes || null
      }
    });

    // If approved, update expense status to PAID
    if (approved) {
      await prisma.monthlyExpense.update({
        where: { expense_id: payment.expense_id },
        data: { status: 'PAID' }
      });
    }

    res.json({ success: true, message: approved ? 'Payment verified.' : 'Payment noted.', data: updatedPayment });
  } catch (error) {
    next(error);
  }
};

// Get payment history (Tenant)
const getPaymentHistory = async (req, res, next) => {
  try {
    const contracts = await prisma.rentalContract.findMany({
      where: { tenant_id: req.user.user_id },
      select: { contract_id: true }
    });
    const contractIds = contracts.map(c => c.contract_id);

    const expenses = await prisma.monthlyExpense.findMany({
      where: { contract_id: { in: contractIds }, status: 'PAID' },
      include: {
        contract: {
          include: { slot: { select: { slot_number: true, food_court_id: true } } }
        },
        payments: { orderBy: { payment_date: 'desc' } }
      },
      orderBy: { billing_month: 'desc' }
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

// Get upcoming due expenses
const getDueBills = async (req, res, next) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    const where = {
      status: 'PENDING',
      due_date: { gte: today, lte: next7Days }
    };

    if (req.user.role === 'TENANT') {
      const contracts = await prisma.rentalContract.findMany({
        where: { tenant_id: req.user.user_id },
        select: { contract_id: true }
      });
      where.contract_id = { in: contracts.map(c => c.contract_id) };
    }

    const expenses = await prisma.monthlyExpense.findMany({
      where,
      include: {
        contract: {
          include: { slot: { select: { slot_number: true } } }
        }
      },
      orderBy: { due_date: 'asc' }
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

// Calculate expenses from meter readings
const calculateAmount = async (req, res, next) => {
  try {
    const { slot_id, month } = req.body;
    
    if (!slot_id || !month) {
      return res.status(400).json({ success: false, message: 'Missing slot_id or month.' });
    }

    const contract = await prisma.rentalContract.findFirst({
      where: { slot_id: parseInt(slot_id), status: 'ACTIVE' }
    });
    
    if (!contract) {
      return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่าที่ทำงานอยู่สำหรับล็อคนี้ (No active contract)' });
    }

    const date = new Date(month);
    // End of the billing month
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get the latest water meter recorded on or before the end of the billing month
    const waterMeter = await prisma.utilityMeter.findFirst({
      where: { 
        slot_id: parseInt(slot_id), 
        meter_type: 'WATER',
        created_at: { lte: endOfMonth }
      },
      orderBy: { created_at: 'desc' }
    });

    // Get the latest electric meter recorded on or before the end of the billing month
    const electricMeter = await prisma.utilityMeter.findFirst({
      where: { 
        slot_id: parseInt(slot_id), 
        meter_type: 'ELECTRICITY',
        created_at: { lte: endOfMonth }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!waterMeter && !electricMeter) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการจดมิเตอร์' });
    }

    const waterCost = waterMeter ? waterMeter.total_cost : 0;
    const electricCost = electricMeter ? electricMeter.total_cost : 0;
    const rent = contract.monthly_rent;
    
    // Fetch global grease trap fee, but only apply if menuType is 'ของคาว'
    const greaseTrapSetting = await prisma.systemSetting.findUnique({ where: { setting_key: 'GREASE_TRAP_FEE' } });
    const baseGreaseTrapFee = parseFloat(greaseTrapSetting?.setting_value || '500');
    const greaseTrapFee = contract.menuType === 'ของคาว' ? baseGreaseTrapFee : 0;

    const total = rent + waterCost + electricCost + greaseTrapFee;

    res.json({
      success: true,
      data: {
        amounts: {
          rent,
          water: waterCost,
          electric: electricCost,
          greaseTrapFee,
          total
        },
        units: {
          water: waterMeter ? waterMeter.unit_used : 0,
          electric: electricMeter ? electricMeter.unit_used : 0
        },
        rates: {
          water: waterMeter ? waterMeter.unit_price : 0,
          electric: electricMeter ? electricMeter.unit_price : 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  uploadPaymentProof,
  verifyPayment,
  getPaymentHistory,
  getDueBills,
  calculateAmount
};
