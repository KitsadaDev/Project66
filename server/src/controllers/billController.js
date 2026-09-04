const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const { sendPushNotifications } = require('../utils/pushNotification');

// Helper to compute late fees dynamically
const computeLateFees = async (expenses) => {
  if (!expenses || expenses.length === 0) return expenses;

  const lateRent = await prisma.systemSetting.findUnique({ where: { setting_key: 'LATE_RENT_FINE' } });
  const lateUtility = await prisma.systemSetting.findUnique({ where: { setting_key: 'LATE_UTILITY_FINE' } });
  const delaySetting = await prisma.systemSetting.findUnique({ where: { setting_key: 'LATE_FINE_DELAY_DAYS' } });
  
  const rentFine = parseFloat(lateRent?.setting_value || '100');
  const utilityFine = parseFloat(lateUtility?.setting_value || '50');
  const delayDays = parseInt(delaySetting?.setting_value || '0', 10);
  const totalDailyFine = rentFine + utilityFine;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const processExpense = (expense) => {
    if (expense.status === 'PENDING' || expense.status === 'OVERDUE') {
      const due = new Date(expense.due_date);
      due.setHours(0, 0, 0, 0);

      if (now > due) {
        const diffTime = now - due;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const lateFee = diffDays > delayDays ? (diffDays - delayDays) * totalDailyFine : 0;
        
        return {
          ...expense,
          status: 'OVERDUE', // dynamically reflect overdue
          late_fee: lateFee,
          total_amount: expense.total_amount + lateFee,
          original_total_amount: expense.total_amount
        };
      }
    }
    return expense;
  };

  if (Array.isArray(expenses)) {
    return expenses.map(processExpense);
  }
  return processExpense(expenses);
};


// Get all monthly expenses (filtered by role)
const getAllBills = async (req, res, next) => {
  try {
    const { status, billing_month, slot_id } = req.query;
    const where = {};

    if (req.user.role === 'TENANT') {
      // Find contracts for this tenant
      const contracts = await prisma.rentalContract.findMany({
        where: { tenant_id: req.user.user_id },
        select: { contract_id: true }
      });
      where.contract_id = { in: contracts.map(c => c.contract_id) };

      // If slot_id is provided, refine the filter
      if (slot_id) {
        where.contract = { slot_id: parseInt(slot_id) };
      }
    } else if (req.user.role === 'EXECUTIVE' || req.user.role === 'ADMIN') {
      // Admins and Executives see all bills by default, but can filter by slot
      if (slot_id) {
        where.contract = { slot_id: parseInt(slot_id) };
      }
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

    const expensesWithFines = await computeLateFees(expenses);
    res.json({ success: true, data: expensesWithFines });
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

    // IDOR prevention: TENANT can only view their own bills
    if (req.user.role === 'TENANT') {
      const tenantId = expense.contract?.tenant_id;
      if (tenantId !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const expenseWithFine = await computeLateFees(expense);
    res.json({ success: true, data: expenseWithFine });
  } catch (error) {
    next(error);
  }
};

// Create monthly expense (Admin only)
const createBill = async (req, res, next) => {
  try {
    const { 
      slot_id, 
      billing_month, 
      water_cost, 
      electricity_cost, 
      dueDate,
      water_units,
      electricity_units,
      water_rate,
      electricity_rate,
      grease_trap_fee: custom_grease_trap_fee
    } = req.body;

    if (!slot_id || !billing_month) {
      return res.status(400).json({ success: false, message: 'Missing required fields (slot_id, billing_month).' });
    }

    if (isNaN(new Date(billing_month).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format.' });
    }

    // Find active contract for this slot
    const contract = await prisma.rentalContract.findFirst({
      where: { 
        slot_id: parseInt(slot_id),
        status: 'ACTIVE'
      },
      include: { slot: true }
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'No active contract found for this slot.' });
    }

    const rent_amount = contract.monthly_rent;
    
    // Fetch global grease trap fee if not provided
    let greaseTrapFee = custom_grease_trap_fee !== undefined ? parseFloat(custom_grease_trap_fee) : null;
    if (greaseTrapFee === null) {
      const greaseTrapSetting = await prisma.systemSetting.findUnique({ where: { setting_key: 'GREASE_TRAP_FEE' } });
      const baseGreaseTrapFee = parseFloat(greaseTrapSetting?.setting_value || '500');
      
      const targetSlots = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','B1','B2','B3','B4','B5','B6','B7','B8'];
      const isTargetSlot = contract.slot && targetSlots.includes(contract.slot.slot_number);
      
      greaseTrapFee = (contract.menuType === 'ของคาว' || isTargetSlot) ? baseGreaseTrapFee : 0;
    }

    // Auto-calculate Due Date based on setting
    const dueDaysSetting = await prisma.systemSetting.findUnique({ where: { setting_key: 'BILL_DUE_DAYS' } });
    const dueDays = parseInt(dueDaysSetting?.setting_value || '10', 10);
    const calculatedDueDate = new Date(billing_month);
    calculatedDueDate.setDate(calculatedDueDate.getDate() + dueDays);

    const total_amount = parseFloat(rent_amount) + parseFloat(water_cost) + parseFloat(electricity_cost) + greaseTrapFee;

    const expense = await prisma.monthlyExpense.create({
      data: {
        contract_id: contract.contract_id,
        billing_month: new Date(billing_month),
        rent_amount: parseFloat(rent_amount),
        water_cost: parseFloat(water_cost),
        electricity_cost: parseFloat(electricity_cost),
        water_units: water_units ? parseFloat(water_units) : null,
        electricity_units: electricity_units ? parseFloat(electricity_units) : null,
        water_rate: water_rate ? parseFloat(water_rate) : null,
        electricity_rate: electricity_rate ? parseFloat(electricity_rate) : null,
        grease_trap_fee: greaseTrapFee,
        total_amount,
        due_date: calculatedDueDate,
        status: 'PENDING'
      }
    });

    // Send notification to tenant
    try {
      await prisma.notification.create({
        data: {
          user_id: contract.tenant_id,
          title: 'บิลค่าเช่าใหม่',
          message: `บิลสำหรับเดือน ${new Date(billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })} ยอดรวม ฿${total_amount.toLocaleString()} ได้รับการสร้างแล้ว`,
          reference_id: expense.expense_id
        }
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the whole request if notification fails
    }

          // Notify tenant about new bill
      try {
        const tenantUser = await prisma.user.findUnique({
          where: { user_id: contract.tenant_id },
          select: { push_token: true }
        });
        if (tenantUser && tenantUser.push_token) {
          await sendPushNotifications([tenantUser.push_token], {
            title: 'มีบิลค่าเช่าใหม่',
            body: 'กรุณาตรวจสอบบิลและชำระเงินภายในกำหนด',
            data: { screen: 'expenses', expense_id: expense.expense_id }
          });
        }
      } catch (pushErr) {
        console.error('[Push] Failed to notify tenant:', pushErr);
      }
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

    if (due_date && isNaN(new Date(due_date).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format.' });
    }

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
      const existingGreaseTrap = existing.grease_trap_fee || 0;
      updateData.total_amount = existing.rent_amount + newWater + newElec + existingGreaseTrap;
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

    const expense = await prisma.monthlyExpense.findUnique({ 
      where: { expense_id: parseInt(id) },
      include: { contract: true }
    });
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    // IDOR prevention: Tenant can only upload slips for their own bills
    if (req.user.role === 'TENANT' && expense.contract.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only upload slips for your own bills.' });
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

          // Notify admins about payment slip
      try {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', push_token: { not: null } },
          select: { push_token: true }
        });
        const adminTokens = admins.map(a => a.push_token).filter(Boolean);
        const expFull = await prisma.monthlyExpense.findUnique({
          where: { expense_id: parseInt(id) },
          include: { contract: { include: { slot: { select: { slot_number: true } } } } }
        });
        const slotNum = expFull && expFull.contract && expFull.contract.slot && expFull.contract.slot.slot_number || '';
        await sendPushNotifications(adminTokens, {
          title: 'ผู้เช่าแจ้งชำระเงินแล้ว',
          body: 'ล็อก ' + slotNum + ' โปรดตรวจสอบสลิปการชำระเงิน',
          data: { screen: 'bills', expense_id: parseInt(id) }
        });
      } catch (pushErr) {
        console.error('[Push] Failed to notify admins:', pushErr);
      }
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

    // If approved, update expense status to PAID; if rejected, reset to PENDING
    if (approved) {
      await prisma.monthlyExpense.update({
        where: { expense_id: payment.expense_id },
        data: { status: 'PAID' }
      });
    } else {
      // Reset bill back to PENDING so tenant can re-upload a new slip
      await prisma.monthlyExpense.update({
        where: { expense_id: payment.expense_id },
        data: { status: 'PENDING' }
      });
    }

          // Notify tenant about payment verification
      try {
        const expFull = await prisma.monthlyExpense.findUnique({
          where: { expense_id: payment.expense_id },
          include: { contract: { include: { tenant: { select: { push_token: true } } } } }
        });
        const token = expFull?.contract?.tenant?.push_token;
        if (token) {
          const monthStr = expFull.billing_month.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
          await sendPushNotifications([token], {
            title: approved ? '✅ ชำระเงินสำเร็จ' : '❌ ชำระเงินไม่ผ่าน',
            body: approved 
              ? `บิลเดือน ${monthStr} ได้รับการตรวจสอบแล้ว`
              : `บิลเดือน ${monthStr} กรุณาตรวจสอบและส่งสลิปใหม่`,
            data: { screen: 'expenses', expense_id: payment.expense_id }
          });
        }
      } catch (pushErr) {
        console.error('[Push] Failed to notify tenant on verify:', pushErr);
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

    const expensesWithFines = await computeLateFees(expenses);
    res.json({ success: true, data: expensesWithFines });
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
      where: { slot_id: parseInt(slot_id), status: 'ACTIVE' },
      include: { slot: true }
    });
    
    if (!contract) {
      return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่าที่ทำงานอยู่สำหรับล็อคนี้ (No active contract)' });
    }

    const date = new Date(month);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    // End of the billing month
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    // Grace period: allow readings recorded up to 15 days after the month ends
    const gracePeriod = new Date(endOfMonth);
    gracePeriod.setDate(gracePeriod.getDate() + 15);

    // Get the latest water meter recorded on or before the grace period
    const waterMeter = await prisma.utilityMeter.findFirst({
      where: { 
        slot_id: parseInt(slot_id), 
        meter_type: 'WATER',
        created_at: { gte: startOfMonth, lte: gracePeriod }
      },
      orderBy: { created_at: 'desc' }
    });

    // Get the latest electric meter recorded on or before the grace period
    const electricMeter = await prisma.utilityMeter.findFirst({
      where: { 
        slot_id: parseInt(slot_id), 
        meter_type: 'ELECTRICITY',
        created_at: { gte: startOfMonth, lte: gracePeriod }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!waterMeter && !electricMeter) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการจดมิเตอร์' });
    }

    const waterCost = waterMeter ? waterMeter.total_cost : 0;
    const electricCost = electricMeter ? electricMeter.total_cost : 0;
    const rent = contract.monthly_rent;
    
    // Fetch global grease trap fee, but also apply if slot is in target zones
    const greaseTrapSetting = await prisma.systemSetting.findUnique({ where: { setting_key: 'GREASE_TRAP_FEE' } });
    const baseGreaseTrapFee = parseFloat(greaseTrapSetting?.setting_value || '500');
    
    const targetSlots = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','B1','B2','B3','B4','B5','B6','B7','B8'];
    const isTargetSlot = contract.slot && targetSlots.includes(contract.slot.slot_number);
    
    const greaseTrapFee = (contract.menuType === 'ของคาว' || isTargetSlot) ? baseGreaseTrapFee : 0;

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
}; // Restart

