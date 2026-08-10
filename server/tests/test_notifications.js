const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkUpcomingBills } = require('./src/services/notificationService');

async function test() {
  console.log('--- Starting Notification Trigger Test ---');
  
  try {
    // 1. Find a tenant with an active contract
    const contract = await prisma.rentalContract.findFirst({
      where: { status: 'ACTIVE' },
      include: { tenant: true }
    });
    
    if (!contract) {
      console.error('No active contract found for testing.');
      return;
    }
    
    console.log(`Using contract ${contract.contract_id} for tenant ${contract.tenant.username}`);
    
    // 2. Clear existing notifications for this expense (if any) to allow re-testing
    // But first, we need an expense. Let's create one due in 5 days.
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    targetDate.setHours(12, 0, 0, 0); // Noon

    console.log(`Creating test expense due on ${targetDate.toISOString()}`);

    const testExpense = await prisma.monthlyExpense.create({
      data: {
        contract_id: contract.contract_id,
        billing_month: new Date(),
        rent_amount: 5000,
        water_cost: 200,
        electricity_cost: 300,
        total_amount: 5500,
        due_date: targetDate,
        status: 'PENDING'
      }
    });

    console.log(`Created test expense ${testExpense.expense_id}`);

    // 3. Run the notification check
    console.log('Running checkUpcomingBills()...');
    const count = await checkUpcomingBills();
    console.log(`Processed ${count} bills.`);

    // 4. Verify notification creation
    const notification = await prisma.notification.findFirst({
      where: {
        user_id: contract.tenant_id,
        reference_id: testExpense.expense_id
      }
    });

    if (notification) {
      console.log('SUCCESS: Notification created!');
      console.log('Title:', notification.title);
      console.log('Message:', notification.message);
    } else {
      console.error('FAILED: No notification was created for the test expense.');
    }

    // Cleanup (optional but good)
    // await prisma.notification.delete({ where: { notification_id: notification.notification_id } });
    // await prisma.monthlyExpense.delete({ where: { expense_id: testExpense.expense_id } });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
