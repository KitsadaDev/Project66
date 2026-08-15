const { PrismaClient } = require('@prisma/client');
const { sendPushNotifications } = require('../utils/pushNotification');

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
          include: {
            food_court: { select: { name: true } }
          }
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
          include: {
            food_court: { select: { name: true } }
          }
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

const createContract = async (req, res, next) => {
  try {
    const { 
      slot_id, tenant_id, startDate, endDate, deposit_amount,
      idCard, phone, address, receiptNumber, receiptDate,
      lateRentFine, lateUtilityFine, menuType, contract_number, contractNumber
    } = req.body;

    const slot = await prisma.rentalSlot.findUnique({ where: { slot_id: parseInt(slot_id) } });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    const tenant = await prisma.user.findUnique({ where: { user_id: parseInt(tenant_id) } });
    if (!tenant || tenant.role !== 'TENANT') {
      return res.status(400).json({ success: false, message: 'Invalid tenant.' });
    }

    const existingActiveTenantContract = await prisma.rentalContract.findFirst({
      where: { tenant_id: parseInt(tenant_id), status: 'ACTIVE' }
    });
    if (existingActiveTenantContract) {
      return res.status(400).json({ success: false, message: 'ผู้เช่ารายนี้มีสัญญาที่กำลังดำเนินการอยู่แล้ว ไม่สามารถเพิ่มสัญญาซ้อนได้' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const maxEnd = new Date(start);
    maxEnd.setFullYear(maxEnd.getFullYear() + 3);
    
    if (end > maxEnd) {
      return res.status(400).json({ success: false, message: 'ระยะเวลาสัญญาเช่าสูงสุดคือ 3 ปี' });
    }

    // Terminate existing active contracts for this slot
    await prisma.rentalContract.updateMany({
      where: { slot_id: parseInt(slot_id), status: 'ACTIVE' },
      data: { status: 'TERMINATED' }
    });

    const customContractNum = contract_number || contractNumber;

    const [contract] = await prisma.$transaction([
      prisma.rentalContract.create({
        data: {
          slot_id: parseInt(slot_id),
          tenant_id: parseInt(tenant_id),
          contract_number: customContractNum && customContractNum.trim() !== '' ? customContractNum.trim() : `CTR-${slot.slot_number}-${Date.now().toString().slice(-6)}`,
          start_date: new Date(startDate),
          end_date: new Date(endDate),
          monthly_rent: parseFloat(slot.rent),
          deposit_amount: deposit_amount && deposit_amount !== '' ? parseFloat(deposit_amount) : 0,
          idCard: idCard && idCard !== '' ? idCard : null,
          phone: phone && phone !== '' ? phone : null,
          address: address && address !== '' ? address : null,
          receiptNumber: receiptNumber && receiptNumber !== '' ? receiptNumber : null,
          receiptDate: receiptDate && receiptDate !== '' ? new Date(receiptDate) : null,
          // greaseTrapFee has been moved to global System Settings
          lateRentFine: lateRentFine && lateRentFine !== '' ? parseFloat(lateRentFine) : null,
          lateUtilityFine: lateUtilityFine && lateUtilityFine !== '' ? parseFloat(lateUtilityFine) : null,
          menuType: menuType && menuType !== '' ? menuType : null,
          contractImage: req.file ? req.file.path : (req.body.contractImage || null),
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
    console.error("Error creating contract:", error);
    next(error);
  }
};

// Update contract (Admin only)
const updateContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      startDate, endDate, deposit_amount, status,
      idCard, phone, address, receiptNumber, receiptDate,
      lateRentFine, lateUtilityFine, menuType, contract_number, contractNumber
    } = req.body;

    const existing = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    const newStart = startDate && startDate !== '' ? new Date(startDate) : existing.start_date;
    const newEnd = endDate && endDate !== '' ? new Date(endDate) : existing.end_date;
    const maxEnd = new Date(newStart);
    maxEnd.setFullYear(maxEnd.getFullYear() + 3);

    if (newEnd > maxEnd) {
      return res.status(400).json({ success: false, message: 'ระยะเวลาสัญญาเช่าสูงสุดคือ 3 ปี' });
    }

    const updateData = {};
    if (startDate && startDate !== '') updateData.start_date = new Date(startDate);
    if (endDate && endDate !== '') updateData.end_date = new Date(endDate);
    if (deposit_amount !== undefined && deposit_amount !== '') updateData.deposit_amount = parseFloat(deposit_amount);
    if (status) updateData.status = status;
    
    // New fields
    const customContractNum = contract_number !== undefined ? contract_number : contractNumber;
    if (customContractNum !== undefined && customContractNum !== '') updateData.contract_number = customContractNum.trim();
    if (idCard !== undefined) updateData.idCard = idCard === '' ? null : idCard;
    if (phone !== undefined) updateData.phone = phone === '' ? null : phone;
    if (address !== undefined) updateData.address = address === '' ? null : address;
    if (receiptNumber !== undefined) updateData.receiptNumber = receiptNumber === '' ? null : receiptNumber;
    if (receiptDate !== undefined) {
      updateData.receiptDate = receiptDate === '' ? null : new Date(receiptDate);
    }
    // greaseTrapFee is now a global setting, so we don't update it per contract
    if (lateRentFine !== undefined) updateData.lateRentFine = lateRentFine === '' ? null : parseFloat(lateRentFine);
    if (lateUtilityFine !== undefined) updateData.lateUtilityFine = lateUtilityFine === '' ? null : parseFloat(lateUtilityFine);
    if (menuType !== undefined) updateData.menuType = menuType === '' ? null : menuType;
    if (req.file) {
      updateData.contractImage = req.file.path;
    } else if (req.body.contractImage !== undefined) {
      updateData.contractImage = req.body.contractImage === '' ? null : req.body.contractImage;
    }

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

    try {
        const tenant = await prisma.user.findUnique({ where: { user_id: contract.tenant_id } });
        if (tenant?.push_token) {
          await sendPushNotifications([tenant.push_token], { title: 'อนุมัติการยกเลิกสัญญา', body: 'คำขอยกเลิกสัญญาเช่าของคุณได้รับการอนุมัติเรียบร้อยแล้ว' });
        }
      } catch (err) {
        console.error('Notification Error:', err);
      }
      res.json({ success: true, message: 'อนุมัติการยกเลิกสัญญาเรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
};

// Request Termination (Tenant only)
const requestTermination = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason, cancellation_note } = req.body;

    const contract = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่า' });
    }

    // Verify ownership
    if (contract.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการกับสัญญานี้' });
    }

    if (contract.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'สัญญาไม่ได้อยู่ในสถานะที่สามารถยกเลิกได้' });
    }

    await prisma.$transaction([
      prisma.rentalContract.update({
        where: { contract_id: parseInt(id) },
        data: { status: 'PENDING_TERMINATION' }
      }),
      prisma.cancellationRequest.create({
        data: {
          contract_id: parseInt(id),
          reason: cancellation_reason,
          note: cancellation_note,
          status: 'PENDING'
        }
      })
    ]);

    try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN', push_token: { not: null } } });
        const tokens = admins.map(a => a.push_token).filter(Boolean);
        if (tokens.length > 0) {
          await sendPushNotifications(tokens, { title: 'มีคำขอยกเลิกสัญญาใหม่', body: 'มีการส่งคำขอยกเลิกสัญญาเช่าเข้ามาใหม่ กรุณาตรวจสอบ' });
        }
      } catch (err) {
        console.error('Notification Error:', err);
      }
      res.json({ success: true, message: 'ส่งคำขอยกเลิกสัญญาเรียบร้อยแล้ว กรุณารอการอนุมัติ' });
  } catch (error) {
    next(error);
  }
};

// Reject Termination (Admin only)
const rejectTermination = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่า' });
    }

    if (contract.status !== 'PENDING_TERMINATION') {
      return res.status(400).json({ success: false, message: 'สัญญาไม่ได้อยู่ในสถานะรอยกเลิก' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rentalContract.update({
        where: { contract_id: parseInt(id) },
        data: { status: 'ACTIVE' }
      });
      
      const pendingReq = await tx.cancellationRequest.findFirst({
        where: { contract_id: parseInt(id), status: 'PENDING' },
        orderBy: { requested_at: 'desc' }
      });
      
      if (pendingReq) {
        await tx.cancellationRequest.update({
          where: { request_id: pendingReq.request_id },
          data: { status: 'REJECTED', reviewed_at: new Date() }
        });
      }
    });

    try {
        const tenant = await prisma.user.findUnique({ where: { user_id: contract.tenant_id } });
        if (tenant?.push_token) {
          await sendPushNotifications([tenant.push_token], { title: 'ปฏิเสธการยกเลิกสัญญา', body: 'คำขอยกเลิกสัญญาเช่าของคุณถูกปฏิเสธ กรุณาติดต่อแอดมิน' });
        }
      } catch (err) {
        console.error('Notification Error:', err);
      }
      res.json({ success: true, message: 'ปฏิเสธคำขอยกเลิกสัญญาเรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
};


// Get Cancellation Requests (Admin only)
const getCancellationRequests = async (req, res, next) => {
  try {
    

    const requests = await prisma.cancellationRequest.findMany({
      where: req.user.role === 'TENANT' ? { contract: { tenant_id: req.user.user_id } } : {},
      include: {
        contract: {
          include: { tenant: true, slot: true }
        }
      },
      orderBy: { requested_at: 'desc' }
    });
    
    // Map to old format for frontend compatibility (mostly)
    const mapped = requests.map(r => ({
      id: r.request_id,
      contract_id: r.contract_id,
      tenant_id: r.contract.tenant_id,
      cancellation_reason: r.reason,
      cancellation_note: r.note,
      cancellation_requested_at: r.requested_at,
      status: r.status === 'PENDING' ? 'PENDING_TERMINATION' : r.status,
      tenant: r.contract.tenant,
      slot: r.contract.slot
    }));
    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCancellationRequests, 
  getAllContracts, 
  getContractById, 
  createContract, 
  updateContract, 
  terminateContract,
  requestTermination,
  rejectTermination
};
