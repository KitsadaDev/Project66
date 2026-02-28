const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Checks for bills that are due in exactly 5 days and creates notifications for tenants.
 */
const checkUpcomingBills = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 5);

    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    console.log(`[NotificationService] Checking bills due between ${targetDate.toISOString()} and ${nextDay.toISOString()}`);

    // Find PENDING expenses due in exactly 5 days
    const upcomingExpenses = await prisma.monthlyExpense.findMany({
      where: {
        status: 'PENDING',
        due_date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: {
        contract: {
          include: {
            tenant: true,
          },
        },
      },
    });

    console.log(`[NotificationService] Found ${upcomingExpenses.length} upcoming bills for reminders.`);

    for (const expense of upcomingExpenses) {
      await createBillReminder(expense);
    }

    return upcomingExpenses.length;
  } catch (error) {
    console.error('[NotificationService] Error checking upcoming bills:', error);
    throw error;
  }
};

/**
 * Creates a notification record for a specific expense.
 * @param {Object} expense - The MonthlyExpense object with included contract and tenant.
 */
const createBillReminder = async (expense) => {
  try {
    const tenantId = expense.contract.tenant_id;
    const amount = expense.total_amount.toLocaleString();
    const month = new Date(expense.billing_month).toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });

    const title = 'แจ้งเตือน: บิลค่าเช่าใกล้ถึงกำหนดชำระ';
    const message = `บิลรอบเดือน ${month} จำนวน ฿${amount} จะครบกำหนดชำระในอีก 5 วัน (${new Date(expense.due_date).toLocaleDateString('th-TH')})`;

    // Check if notification already exists to avoid duplicates
    const existing = await prisma.notification.findFirst({
      where: {
        user_id: tenantId,
        reference_id: expense.expense_id,
        title: title,
      },
    });

    if (existing) {
      console.log(`[NotificationService] Reminder already exists for expense ${expense.expense_id}, skipping.`);
      return;
    }

    await prisma.notification.create({
      data: {
        user_id: tenantId,
        title,
        message,
        reference_id: expense.expense_id,
        status: 'UNREAD',
      },
    });

    console.log(`[NotificationService] Created reminder for tenant ${tenantId} regarding expense ${expense.expense_id}`);
  } catch (error) {
    console.error(`[NotificationService] Error creating reminder for expense ${expense.expense_id}:`, error);
  }
};

module.exports = {
  checkUpcomingBills,
  createBillReminder,
};
