// ======================================================
// maintenanceController.js - Controller จัดการแจ้งซ่อมและงานซ่อมบำรุง
// รับผิดชอบ: 
//   - การดึงรายการแจ้งซ่อมตามสิทธิ์ผู้ใช้งาน (Tenant, Maintenance, Admin)
//   - ผู้เช่าสร้างคำขอแจ้งซ่อมและแนบรูปภาพปัญหา
//   - ผู้ดูแลระบบ (Admin) มอบหมายงานให้ช่าง
//   - ช่าง/Admin อัปเดตสถานะงานซ่อมและแนบภาพผลงาน
//   - ส่ง Push Notification แจ้งเตือนผ่าน Expo Push API
// ======================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendPushNotifications } = require('../utils/pushNotification');

// -------------------------------------------------------
// ฟังก์ชัน: getAllRequests
// หน้าที่: ดึงรายการแจ้งซ่อมทั้งหมดตามสิทธิ์ (Role-based filtering)
//   - TENANT: เห็นเฉพาะคำขอของตัวเอง
//   - MAINTENANCE: เห็นเฉพาะงานที่ได้รับมอบหมาย (assignments)
//   - ADMIN / EXECUTIVE: เห็นรายการทั้งหมดในระบบ
//   - รองรับ Query filters: ?status=... และ ?slot_id=...
// -------------------------------------------------------
const getAllRequests = async (req, res, next) => {
  try {
    const { status, slot_id } = req.query;
    const where = {};

    // กรองตามสิทธิ์ของผู้ใช้งานที่ล็อกอิน
    if (req.user.role === 'TENANT') {
      where.tenant_id = req.user.user_id;
    } else if (req.user.role === 'MAINTENANCE') {
      where.assignments = { some: { assigned_to: req.user.user_id } };
    }

    // กรองเพิ่มเติมตาม Query Parameters
    if (status) where.status = status;
    if (slot_id) where.slot_id = parseInt(slot_id);

    // ดึงข้อมูลคำขอซ่อมพร้อมข้อมูลล็อค, ผู้เช่า, รูปภาพ และช่างที่รับผิดชอบ
    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        slot: { select: { slot_id: true, slot_number: true, food_court_id: true } },
        tenant: { select: { user_id: true, first_name: true, last_name: true, email: true, phone: true } },
        images: true,
        assignments: {
          include: {
            assignee: { select: { user_id: true, first_name: true, last_name: true, phone: true } }
          }
        }
      },
      orderBy: { requested_at: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: getRequestById
// หน้าที่: ดึงรายละเอียดของคำขอแจ้งซ่อมตาม ID
//   - ตรวจสอบความปลอดภัย: ผู้เช่าดูได้เฉพาะคำขอของตัวเองเท่านั้น
//   - โหลดข้อมูลประวัติการอัปเดตสถานะ (updates) และรูปภาพทั้งหมด
// -------------------------------------------------------
const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.maintenanceRequest.findUnique({
      where: { request_id: parseInt(id) },
      include: {
        slot: { select: { slot_id: true, slot_number: true, food_court_id: true } },
        tenant: { select: { user_id: true, first_name: true, last_name: true, email: true, phone: true } },
        images: true,
        assignments: {
          include: {
            assignee: { select: { user_id: true, first_name: true, last_name: true, phone: true } },
            assigner: { select: { user_id: true, first_name: true, last_name: true } }
          }
        },
        updates: {
          include: {
            updater: { select: { user_id: true, first_name: true, last_name: true } }
          },
          orderBy: { updated_at: 'desc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // ป้องกันผู้เช่าคนอื่นแอบดูข้อมูลคำขอซ่อมที่ไม่ใช่ของตน
    if (req.user.role === 'TENANT' && request.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: createRequest
// หน้าที่: ผู้เช่า (Tenant) ส่งคำขอแจ้งซ่อมใหม่
//   - ค้นหาสัญญาเช่าที่ยังเปิดใช้งานอยู่ (ACTIVE) เพื่อระบุแผงร้านค้าอัตโนมัติ
//   - บันทึกคำขอซ่อมลงตาราง maintenanceRequest ด้วยสถานะเริ่มต้น PENDING
//   - บันทึกไฟล์รูปภาพปัญหา (ถ้ามีการอัปโหลด)
//   - ส่ง Push Notification แจ้งเตือนไปยัง Admin ทุกคน
// -------------------------------------------------------
const createRequest = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;

    // ตรวจสอบว่าผู้เช่ามีสัญญาเช่าแผงที่เปิดใช้งานอยู่จริงหรือไม่
    const contract = await prisma.rentalContract.findFirst({
      where: { tenant_id: req.user.user_id, status: 'ACTIVE' }
    });

    if (!contract) {
      return res.status(400).json({ success: false, message: 'You do not have an active rental contract.' });
    }

    // สร้างข้อมูลคำขอแจ้งซ่อม
    const request = await prisma.maintenanceRequest.create({
      data: {
        slot_id: contract.slot_id,
        tenant_id: req.user.user_id,
        title,
        description: description || null,
        category: category || null,
        status: 'PENDING'
      }
    });

    // บันทึกรายการรูปภาพที่แนบมาพร้อมคำขอแจ้งซ่อม (image_type = 'request')
    if (req.files && req.files.length > 0) {
      await prisma.maintenanceImage.createMany({
        data: req.files.map(file => ({
          request_id: request.request_id,
          image_url: file.path,
          image_type: 'request'
        }))
      });
    }

    // ส่ง Push Notification แจ้งเตือนผู้ดูแลระบบ (Admin) ทุกคนที่มี push_token
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', push_token: { not: null } },
        select: { push_token: true }
      });
      const tokens = admins.map(a => a.push_token).filter(Boolean);
      const slotInfo = await prisma.rentalSlot.findUnique({ where: { slot_id: contract.slot_id }, select: { slot_number: true } });
      await sendPushNotifications(tokens, {
        title: 'แจ้งซ่อมใหม่',
        body: 'ล็อก ' + ((slotInfo && slotInfo.slot_number) || '') + ': ' + title,
        data: { screen: 'maintenance', request_id: request.request_id }
      });
    } catch (pushErr) {
      console.error('[Push] Failed to notify admins:', pushErr);
    }
    
    res.status(201).json({ success: true, message: 'Request submitted successfully.', data: request });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: updateRequest
// หน้าที่: ผู้เช่าแก้ไขรายละเอียดคำขอแจ้งซ่อม
//   - อนุญาตเฉพาะเจ้าของคำขอ (TENANT)
//   - แก้ไขได้เฉพาะตอนที่สถานะยังเป็น PENDING (รอดำเนินการ) เท่านั้น
//   - สามารถอัปโหลดรูปภาพเพิ่มเติมได้
// -------------------------------------------------------
const updateRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // ตรวจสอบว่าเป็นเจ้าของคำขอ
    if (req.user.role === 'TENANT' && request.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // ถ้าเริ่มงานซ่อมไปแล้ว ไม่อนุญาตให้แก้ไขข้อมูลเดิม
    if (req.user.role === 'TENANT' && request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cannot edit request that is already in progress.' });
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { request_id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category })
      }
    });

    // บันทึกรูปภาพเพิ่มเติม (ถ้ามี)
    if (req.files && req.files.length > 0) {
      await prisma.maintenanceImage.createMany({
        data: req.files.map(file => ({
          request_id: request.request_id,
          image_url: file.path,
          image_type: 'request'
        }))
      });
    }

    res.json({ success: true, message: 'Request updated.', data: updated });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: assignStaff
// หน้าที่: ผู้ดูแลระบบ (Admin) มอบหมายงานซ่อมให้ช่างบำรุงรักษา
//   - ตรวจสอบว่า staffId ที่ระบุมี role เป็น 'MAINTENANCE' จริง
//   - ใช้ Database Transaction ทำ 2 รายการพร้อมกัน:
//       1. สร้างบันทึกในตาราง maintenanceAssignment (ระบุวันที่นัดหมาย, ค่าใช้จ่ายประเมิน)
//       2. อัปเดตสถานะของคำขอเป็น 'IN_PROGRESS'
//   - ส่ง Push Notification แจ้งเตือนไปยังช่างผู้ได้รับมอบหมายงาน
// -------------------------------------------------------
const assignStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId, scheduleDate, estimatedCost } = req.body;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // ตรวจสอบความถูกต้องของช่างซ่อมบำรุง
    const staff = await prisma.user.findUnique({ where: { user_id: parseInt(staffId) } });
    if (!staff || staff.role !== 'MAINTENANCE') {
      return res.status(400).json({ success: false, message: 'Invalid maintenance staff.' });
    }

    // ดำเนินการสร้างข้อมูลการมอบหมายและปรับสถานะเป็น IN_PROGRESS แบบ Transaction
    const [assignment] = await prisma.$transaction([
      prisma.maintenanceAssignment.create({
        data: {
          request_id: parseInt(id),
          assigned_to: parseInt(staffId),
          assigned_by: req.user.user_id,
          scheduled_date: scheduleDate ? new Date(scheduleDate) : null,
          estimated_completion: scheduleDate ? new Date(scheduleDate) : null,
          notes: estimatedCost ? `Estimated Cost: ${estimatedCost}` : null
        }
      }),
      prisma.maintenanceRequest.update({
        where: { request_id: parseInt(id) },
        data: { status: 'IN_PROGRESS' }
      })
    ]);

    // ส่ง Push Notification ไปแจ้งเตือนช่างซ่อมบำรุง
    try {
      if (staff.push_token) {
        const slotInfo = await prisma.rentalSlot.findUnique({
           where: { slot_id: request.slot_id }, select: { slot_number: true }
        });
        await sendPushNotifications([staff.push_token], {
          title: 'งานมอบหมายใหม่',
          body: 'คุณได้รับมอบหมายงานซ่อม ล็อก ' + (slotInfo && slotInfo.slot_number || ''),
          data: { screen: 'maintenance', request_id: request.request_id }
        });
      }
    } catch (pushErr) {
      console.error('[Push] Failed to notify staff:', pushErr);
    }

    res.json({ success: true, message: 'Staff assigned successfully.', data: assignment });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: updateStatus
// หน้าที่: ช่างซ่อมบำรุง หรือ Admin อัปเดตสถานะงานซ่อม
//   - สถานะที่รองรับ: IN_PROGRESS, COMPLETED, REJECTED, PENDING
//   - บันทึกลงตาราง maintenanceUpdate เพื่อเก็บประวัติการเปลี่ยนแปลงพร้อมหมายเหตุ
//   - อัปโหลดรูปภาพผลงานซ่อม (image_type = 'completion') ถ้ามี
//   - ส่ง Push Notification แจ้งเตือนไปยังทั้ง Admin และ ผู้เช่าเจ้าของคำขอ
// -------------------------------------------------------
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Transaction: บันทึก log การเปลี่ยนสถานะ + อัปเดตสถานะในตารางหลัก
    const [update] = await prisma.$transaction([
      prisma.maintenanceUpdate.create({
        data: {
          request_id: parseInt(id),
          updated_by: req.user.user_id,
          status,
          comment: comment || null
        }
      }),
      prisma.maintenanceRequest.update({
        where: { request_id: parseInt(id) },
        data: { status }
      })
    ]);

    // บันทึกรูปภาพผลงานหลังซ่อมเสร็จ (completion proof)
    if (req.files && req.files.length > 0) {
      await prisma.maintenanceImage.createMany({
        data: req.files.map(file => ({
          request_id: parseInt(id),
          image_url: file.path,
          image_type: 'completion'
        }))
      });
    }

    // ส่ง Push Notification แจ้งเตือนผู้เกี่ยวข้อง (Admin + ผู้เช่า)
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', push_token: { not: null } },
        select: { push_token: true }
      });
      const tenantUser = await prisma.user.findUnique({
        where: { user_id: request.tenant_id },
        select: { push_token: true }
      });
      let tokens = admins.map(a => a.push_token);
      if (tenantUser && tenantUser.push_token) {
        tokens.push(tenantUser.push_token);
      }
      tokens = tokens.filter(Boolean);
      const slotInfo = await prisma.rentalSlot.findUnique({
        where: { slot_id: request.slot_id }, select: { slot_number: true }
      });
      
      // แปลงสถานะเป็นข้อความภาษาไทยเพื่อให้อ่านเข้าใจง่าย
      const statusMap = {
        'IN_PROGRESS': 'กำลังดำเนินการ',
        'COMPLETED': 'ซ่อมเสร็จสิ้น',
        'REJECTED': 'ถูกปฏิเสธ',
        'PENDING': 'รอดำเนินการ'
      };
      const thStatus = statusMap[status] || status;

      await sendPushNotifications(tokens, {
        title: 'อัปเดตสถานะงานซ่อม',
        body: 'ล็อก ' + (slotInfo && slotInfo.slot_number || '') + ' อัปเดตสถานะเป็น: ' + thStatus,
        data: { screen: 'maintenance', request_id: request.request_id }
      });
    } catch (pushErr) {
      console.error('[Push] Failed to notify admins and tenant:', pushErr);
    }

    res.json({ success: true, message: 'Status updated.', data: update });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: uploadCompletionProof
// หน้าที่: ช่างซ่อมบำรุงอัปโหลดรูปภาพหลักฐานการซ่อมแซมเสร็จสิ้น
//   - บันทึกรูปลงตาราง maintenanceImage โดยกำหนด image_type = 'completion'
//   - ปรับสถานะคำขอแจ้งซ่อมเป็น 'COMPLETED' ทันที
// -------------------------------------------------------
const uploadCompletionProof = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    // บันทึกรูปภาพหลักฐานงานซ่อมเสร็จ
    const images = await prisma.maintenanceImage.createMany({
      data: req.files.map(file => ({
        request_id: parseInt(id),
        image_url: file.path,
        image_type: 'completion'
      }))
    });

    // อัปเดตสถานะงานเป็นเสร็จสิ้น (COMPLETED)
    await prisma.maintenanceRequest.update({
      where: { request_id: parseInt(id) },
      data: { status: 'COMPLETED' }
    });

    res.json({ success: true, message: 'Completion proof uploaded.', data: images });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: deleteRequest
// หน้าที่: ลบคำขอแจ้งซ่อม
//   - ADMIN: ลบคำขอใดก็ได้
//   - TENANT: ลบได้เฉพาะคำขอของตัวเอง และต้องอยู่ในสถานะ 'PENDING' เท่านั้น
// -------------------------------------------------------
const deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // ตรวจสอบสิทธิ์กรณีผู้ใช้เป็นผู้เช่า
    if (req.user.role === 'TENANT') {
      if (request.tenant_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (request.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Can only delete pending requests.' });
      }
    }

    // ลบรายการออกจากฐานข้อมูล
    await prisma.maintenanceRequest.delete({ where: { request_id: parseInt(id) } });
    res.json({ success: true, message: 'Request deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  assignStaff,
  updateStatus,
  uploadCompletionProof,
  deleteRequest
};
