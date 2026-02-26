const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all contracts
const getAllContracts = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};

    if (req.user.role === 'TENANT') {
      where.tenant_id = req.user.user_id;
    }
    if (status) where.status = status;

    const contracts = await prisma.rentalContract.findMany({
      where,
      include: {
        slot: {
          select: { slot_id: true, slot_number: true, food_court_id: true, rent: true }
        },
        tenant: {
          select: { user_id: true, first_name: true, last_name: true, email: true, phone: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: contracts });
  } catch (error) {
    next(error);
  }
};

// Get contract by ID
const getContractById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.rentalContract.findUnique({
      where: { contract_id: parseInt(id) },
      include: {
        slot: {
          select: { slot_id: true, slot_number: true, food_court_id: true, rent: true, status: true }
        },
        tenant: {
          select: { user_id: true, first_name: true, last_name: true, email: true, phone: true }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    if (req.user.role === 'TENANT' && contract.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
};

// Create contract (Admin only)
const createContract = async (req, res, next) => {
  try {
    const { slot_id, tenant_id, startDate, endDate, securityDeposit } = req.body;

    const slot = await prisma.rentalSlot.findUnique({ where: { slot_id: parseInt(slot_id) } });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    const tenant = await prisma.user.findUnique({ where: { user_id: parseInt(tenant_id) } });
    if (!tenant || tenant.role !== 'TENANT') {
      return res.status(400).json({ success: false, message: 'Invalid tenant.' });
    }

    // Terminate existing active contracts for this slot
    await prisma.rentalContract.updateMany({
      where: { slot_id: parseInt(slot_id), status: 'ACTIVE' },
      data: { status: 'TERMINATED' }
    });

    const [contract] = await prisma.$transaction([
      prisma.rentalContract.create({
        data: {
          slot_id: parseInt(slot_id),
          tenant_id: parseInt(tenant_id),
          contract_number: `CTR-${slot.slot_number}-${Date.now().toString().slice(-6)}`,
          start_date: new Date(startDate),
          end_date: new Date(endDate),
          monthly_rent: parseFloat(slot.rent),
          deposit_amount: parseFloat(securityDeposit) || 0,
          status: 'ACTIVE'
        },
        include: {
          slot: { select: { slot_number: true, food_court_id: true } },
          tenant: { select: { first_name: true, last_name: true, email: true } }
        }
      }),
      prisma.rentalSlot.update({
        where: { slot_id: parseInt(slot_id) },
        data: { status: 'OCCUPIED' }
      })
    ]);

    res.status(201).json({ success: true, message: 'Contract created successfully.', data: contract });
  } catch (error) {
    next(error);
  }
};

// Update contract (Admin only)
const updateContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, securityDeposit, status } = req.body;

    const existing = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    const updateData = {};
    if (startDate) updateData.start_date = new Date(startDate);
    if (endDate) updateData.end_date = new Date(endDate);
    if (securityDeposit) updateData.deposit_amount = parseFloat(securityDeposit);
    if (status) updateData.status = status;

    const updatedContract = await prisma.rentalContract.update({
      where: { contract_id: parseInt(id) },
      data: updateData
    });

    // If terminated, set slot back to VACANT
    if (status === 'TERMINATED' || status === 'EXPIRED') {
      await prisma.rentalSlot.update({
        where: { slot_id: existing.slot_id },
        data: { status: 'VACANT' }
      });
    }

    res.json({ success: true, message: 'Contract updated successfully.', data: updatedContract });
  } catch (error) {
    next(error);
  }
};

// Terminate contract (Admin only)
const terminateContract = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    await prisma.$transaction([
      prisma.rentalContract.update({
        where: { contract_id: parseInt(id) },
        data: { status: 'TERMINATED' }
      }),
      prisma.rentalSlot.update({
        where: { slot_id: contract.slot_id },
        data: { status: 'VACANT' }
      })
    ]);

    res.json({ success: true, message: 'Contract terminated successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllContracts, getContractById, createContract, updateContract, terminateContract };
