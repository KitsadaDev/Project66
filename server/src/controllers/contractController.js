// ======================================================
// contractController.js - Controller จัดการสัญญาเช่า
// รับผิดชอบ: ดู/สร้าง/แก้ไข/ยกเลิก สัญญา และจัดการคำขอยกเลิก
// ======================================================

// Prisma Client สำหรับติดต่อฐานข้อมูล
const { PrismaClient } = require('@prisma/client');

// ฟังก์ชันส่ง Push Notification ไปยังอุปกรณ์ mobile ผ่าน Expo
const { sendPushNotifications } = require('../utils/pushNotification');

const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: getAllContracts
// หน้าที่: ดึงรายการสัญญาทั้งหมด
//   - ADMIN/EXECUTIVE: เห็นสัญญาทั้งหมดในระบบ
//   - TENANT: เห็นเฉพาะสัญญาของตัวเอง (กรอง tenant_id)
//   - รองรับ filter ตาม status ผ่าน query string: ?status=ACTIVE
// -------------------------------------------------------
const getAllContracts = async (req, res, next) => {
  try {
    // รับ query parameter ?status=ACTIVE/TERMINATED/EXPIRED ฯลฯ
    const { status } = req.query;
    const where = {}; // object เงื่อนไขสำหรับ query

    // ถ้าเป็น TENANT → จำกัดให้เห็นเฉพาะสัญญาของตัวเอง
    if (req.user.role === 'TENANT') {
      where.tenant_id = req.user.user_id;
    }
    // ถ้ามีการส่ง ?status มา → เพิ่มเงื่อนไขกรองตาม status
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
        },
        cancellation_requests: {
          orderBy: { requested_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: contracts });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: getContractById
// หน้าที่: ดึงข้อมูลสัญญาตาม ID
//   - ตรวจสอบ TENANT ว่าเป็นเจ้าของสัญญาหรือไม่ก่อนคืนข้อมูล
// -------------------------------------------------------
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
        },
        cancellation_requests: {
          orderBy: { requested_at: 'desc' },
          take: 1
        }
      }
    });

    // ถ้าไม่พบสัญญาตาม ID → คืน 404
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    // ถ้าเป็น TENANT แต่พยายามดูสัญญาของคนอื่น → ปฏิเสธ
    if (req.user.role === 'TENANT' && contract.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: createContract
// หน้าที่: สร้างสัญญาเช่าใหม่ (Admin เท่านั้น)
//   ขั้นตอน:
//   1. ตรวจสอบว่า slot และ tenant มีอยู่จริง
//   2. ตรวจสอบว่า tenant ยังไม่มีสัญญา ACTIVE อยู่
//   3. ตรวจสอบระยะเวลาสัญญาไม่เกิน 3 ปี
//   4. ยกเลิกสัญญาเก่าของ slot นั้น (ถ้ามี)
//   5. สร้างสัญญาใหม่ + อัปเดตสถานะ slot → OCCUPIED
//   (ใช้ Transaction เพื่อความปลอดภัย)
// -------------------------------------------------------
const createContract = async (req, res, next) => {
  try {
    const { 
      slot_id, tenant_id, startDate, endDate, deposit_amount,
      idCard, phone, address, receiptNumber, receiptDate,
      lateRentFine, lateUtilityFine, menuType, contract_number, contractNumber
    } = req.body;

    // รองรับ fallback จากการเรียกผ่านหน้าจัดการผู้เช่า (stallId, tenantId)
    const rawSlotId = slot_id || req.body.stallId || req.body.stall_id;
    const rawTenantId = tenant_id || req.body.tenantId;

    if (!rawSlotId || !rawTenantId) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูลแผงค้าและผู้เช่า' });
    }

    const slotIdNum = parseInt(rawSlotId);
    const tenantIdNum = parseInt(rawTenantId);

    if (isNaN(slotIdNum) || isNaN(tenantIdNum)) {
      return res.status(400).json({ success: false, message: 'รหัสแผงค้าหรือผู้เช่าไม่ถูกต้อง' });
    }

    // ตรวจสอบว่า slot มีอยู่ในระบบหรือไม่
    const slot = await prisma.rentalSlot.findUnique({ where: { slot_id: slotIdNum } });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    // ตรวจสอบว่า tenant มีอยู่ และเป็น role TENANT จริง
    const tenant = await prisma.user.findUnique({ where: { user_id: tenantIdNum } });
    if (!tenant || tenant.role !== 'TENANT') {
      return res.status(400).json({ success: false, message: 'Invalid tenant.' });
    }

    // ตรวจสอบว่า tenant มีสัญญา ACTIVE อยู่แล้วหรือไม่
    // 1 คนมีได้แค่ 1 สัญญาที่ active ในเวลาเดียวกัน
    const existingActiveTenantContract = await prisma.rentalContract.findFirst({
      where: { tenant_id: tenantIdNum, status: 'ACTIVE' }
    });
    if (existingActiveTenantContract) {
      return res.status(400).json({ success: false, message: 'ผู้เช่ารายนี้มีสัญญาที่กำลังดำเนินการอยู่แล้ว ไม่สามารถเพิ่มสัญญาซ้อนได้' });
    }

    // ตรวจสอบความถูกต้องของวันที่เริ่มและสิ้นสุดสัญญา
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'รูปแบบวันที่เริ่มหรือสิ้นสุดสัญญาไม่ถูกต้อง' });
    }

    if (end <= start) {
      return res.status(400).json({ success: false, message: 'วันที่สิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา' });
    }

    // ตรวจสอบระยะเวลาสัญญา: ต้องไม่เกิน 3 ปีนับจากวันเริ่ม
    const maxEnd = new Date(start);
    maxEnd.setFullYear(maxEnd.getFullYear() + 3);
    
    if (end > maxEnd) {
      return res.status(400).json({ success: false, message: 'ระยะเวลาสัญญาเช่าสูงสุดคือ 3 ปี' });
    }

    // ยกเลิกสัญญาเก่าที่ยังมีสถานะ ACTIVE สำหรับ slot นี้
    // (กรณีสร้างสัญญาใหม่ทับสัญญาเก่า)
    await prisma.rentalContract.updateMany({
      where: { slot_id: slotIdNum, status: 'ACTIVE' },
      data: { status: 'TERMINATED' }
    });

    // รองรับทั้ง contract_number และ contractNumber (ชื่อ field ที่แตกต่างกัน)
    const customContractNum = contract_number || contractNumber;

    // Transaction: สร้างสัญญาและอัปเดต slot พร้อมกัน
    // ถ้าอันใดอันหนึ่งล้มเหลว → rollback ทั้งหมด
    const [contract] = await prisma.$transaction([
      prisma.rentalContract.create({
        data: {
          slot_id: slotIdNum,
          tenant_id: tenantIdNum,
          contract_number: customContractNum && customContractNum.trim() !== '' ? customContractNum.trim() : `CTR-${slot.slot_number}-${Date.now().toString().slice(-6)}`,
          start_date: start,
          end_date: end,
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
      // อัปเดตสถานะ slot → OCCUPIED (ไม่ว่าง)
      prisma.rentalSlot.update({
        where: { slot_id: slotIdNum },
        data: { status: 'OCCUPIED' }
      })
    ]);

    res.status(201).json({ success: true, message: 'Contract created successfully.', data: contract });
  } catch (error) {
    console.error("Error creating contract:", error);
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: updateContract
// หน้าที่: แก้ไขข้อมูลสัญญาตาม ID (Admin เท่านั้น)
//   - ใส่เฉพาะ field ที่ส่งมาใน updateData (partial update)
//   - ถ้าเปลี่ยน status → TERMINATED/EXPIRED → คืน slot เป็น VACANT
// -------------------------------------------------------
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

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return res.status(400).json({ success: false, message: 'รูปแบบวันที่เริ่มหรือสิ้นสุดสัญญาไม่ถูกต้อง' });
    }

    if (newEnd <= newStart) {
      return res.status(400).json({ success: false, message: 'วันที่สิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา' });
    }

    const maxEnd = new Date(newStart);
    maxEnd.setFullYear(maxEnd.getFullYear() + 3);

    if (newEnd > maxEnd) {
      return res.status(400).json({ success: false, message: 'ระยะเวลาสัญญาเช่าสูงสุดคือ 3 ปี' });
    }

    // สร้าง object เปล่า เพื่อใส่เฉพาะ field ที่ส่งมาจริง ๆ
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

    // ถ้าเปลี่ยนสถานะเป็น TERMINATED หรือ EXPIRED → คืนแผงให้ว่าง
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

// -------------------------------------------------------
// ฟังก์ชัน: terminateContract
// หน้าที่: Admin ยกเลิกสัญญาทันที (Forced Termination)
//   ใช้ Transaction:
//   1. เปลี่ยนสถานะสัญญา → TERMINATED
//   2. คืนแผง → VACANT
//   3. ส่ง Push Notification ให้ผู้เช่าทราบ
// -------------------------------------------------------
const terminateContract = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rentalContract.update({
        where: { contract_id: parseInt(id) },
        data: { status: 'TERMINATED' }
      });
      await tx.rentalSlot.update({
        where: { slot_id: contract.slot_id },
        data: { status: 'VACANT' }
      });
      // อัปเดตคำขอยกเลิกสัญญาของสัญญานี้ที่ยัง PENDING ให้เป็น APPROVED
      await tx.cancellationRequest.updateMany({
        where: { contract_id: parseInt(id), status: 'PENDING' },
        data: { status: 'APPROVED', reviewed_at: new Date() }
      });
    });

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

// -------------------------------------------------------
// ฟังก์ชัน: requestTermination
// หน้าที่: Tenant ส่งคำขอยกเลิกสัญญา
//   ขั้นตอน:
//   1. ตรวจสอบว่าสัญญาเป็นของตัวเอง
//   2. ตรวจสอบว่าสัญญาสถานะ ACTIVE (ยกเลิกได้)
//   3. ใช้ Transaction: เปลี่ยน status → PENDING_TERMINATION + สร้าง CancellationRequest
//   4. ส่ง Push Notification ไปแจ้ง Admin ทุกคน
// -------------------------------------------------------
const requestTermination = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellation_reason, cancellation_note } = req.body;

    const contract = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่า' });
    }

    // ตรวจสอบว่า tenant เป็นเจ้าของสัญญานี้จริง ๆ
    if (contract.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการกับสัญญานี้' });
    }

    // ยกเลิกได้เฉพาะสัญญาที่ ACTIVE เท่านั้น
    if (contract.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'สัญญาไม่ได้อยู่ในสถานะที่สามารถยกเลิกได้' });
    }

    await prisma.$transaction([
      prisma.rentalContract.update({
        where: { contract_id: parseInt(id) },
        data: {
          status: 'PENDING_TERMINATION',
          cancellation_reason,
          cancellation_note
        }
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
        // ดึง push_token ของ Admin ทุกคนที่ลงทะเบียนอุปกรณ์ไว้
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN', push_token: { not: null } } });
        const tokens = admins.map(a => a.push_token).filter(Boolean);
        // ส่ง push notification หา Admin ทุกคนพร้อมกัน
        if (tokens.length > 0) {
          await sendPushNotifications(tokens, { title: 'มีคำขอยกเลิกสัญญาใหม่', body: 'มีการส่งคำขอยกเลิกสัญญาเช่าเข้ามาใหม่ กรุณาตรวจสอบ' });
        }
      } catch (err) {
        // ถ้าส่ง notification ล้มเหลว → log error แต่ไม่ throw
        // เพราะ notification ไม่ใช่ขั้นตอนหลัก ไม่ควรทำให้ request ล้มเหลว
        console.error('Notification Error:', err);
      }
      res.json({ success: true, message: 'ส่งคำขอยกเลิกสัญญาเรียบร้อยแล้ว กรุณารอการอนุมัติ' });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: rejectTermination
// หน้าที่: Admin ปฏิเสธคำขอยกเลิกสัญญา
//   ใช้ async Transaction:
//   1. เปลี่ยนสัญญากลับเป็น ACTIVE
//   2. อัปเดต CancellationRequest ล่าสุด → REJECTED
//   3. ส่ง Push Notification แจ้ง Tenant
// -------------------------------------------------------
const rejectTermination = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.rentalContract.findUnique({ where: { contract_id: parseInt(id) } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'ไม่พบสัญญาเช่า' });
    }

    // ปฏิเสธได้เฉพาะสัญญาที่รอการยกเลิก (PENDING_TERMINATION) เท่านั้น
    if (contract.status !== 'PENDING_TERMINATION') {
      return res.status(400).json({ success: false, message: 'สัญญาไม่ได้อยู่ในสถานะรอยกเลิก' });
    }

    // ใช้ async transaction (รับ tx เพื่อทำ query หลายขั้นตอนในนั้น)
    await prisma.$transaction(async (tx) => {
      // 1. คืนสถานะสัญญากลับเป็น ACTIVE (สัญญายังมีผล)
      await tx.rentalContract.update({
        where: { contract_id: parseInt(id) },
        data: { status: 'ACTIVE' }
      });
      
      // 2. ค้นหา CancellationRequest ล่าสุดของสัญญานี้ที่ยัง PENDING
      const pendingReq = await tx.cancellationRequest.findFirst({
        where: { contract_id: parseInt(id), status: 'PENDING' },
        orderBy: { requested_at: 'desc' } // เอาล่าสุด
      });
      
      // 3. ถ้าพบ → เปลี่ยนสถานะเป็น REJECTED พร้อมบันทึกเวลาที่ตรวจสอบ
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


// -------------------------------------------------------
// ฟังก์ชัน: getCancellationRequests
// หน้าที่: ดึงรายการคำขอยกเลิกสัญญาทั้งหมด
//   - ADMIN/EXECUTIVE: เห็นทุกคำขอ
//   - TENANT: เห็นเฉพาะคำขอที่เชื่อมกับสัญญาของตัวเอง
//   - ทำ data mapping เพื่อให้ format ตรงกับที่ frontend คาดหวัง
// -------------------------------------------------------
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
    
    // แปลง (map) ข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
    // เนื่องจาก DB schema ใช้ CancellationRequest แยกต่างหาก
    // แต่ frontend คาดหวัง field ชื่อเดิม เช่น cancellation_reason, tenant_id, contract_number, start_date
    const mapped = requests.map(r => ({
      id: r.request_id,
      contract_id: r.contract_id,
      tenant_id: r.contract?.tenant_id,
      contract_number: r.contract?.contract_number || null,
      start_date: r.contract?.start_date || null,
      end_date: r.contract?.end_date || null,
      cancellation_reason: r.reason,
      cancellation_note: r.note,
      cancellation_requested_at: r.requested_at,
      reviewed_at: r.reviewed_at,
      // แปลง status ให้ตรงกับที่ frontend (CancelContracts.jsx และ CancelContract.jsx) คาดหวัง
      // PENDING -> PENDING_TERMINATION
      // APPROVED -> TERMINATED (ตรงกับแท็บ HISTORY ในหน้า Admin และ badge อนุมัติแล้วในหน้า Tenant)
      status: r.status === 'PENDING' ? 'PENDING_TERMINATION' : (r.status === 'APPROVED' ? 'TERMINATED' : r.status),
      tenant: r.contract?.tenant,
      slot: r.contract?.slot,
      contract: r.contract
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
