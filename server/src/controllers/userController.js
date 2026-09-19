// ======================================================
// userController.js - Controller จัดการผู้ใช้งาน (Users)
// รับผิดชอบ: CRUD ผู้ใช้งาน, reset password (Admin เท่านั้น)
// ======================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: getAllUsers
// หน้าที่: ดึงผู้ใช้งานทั้งหมด (Admin เท่านั้น)
//   - รองรับ filter: ?role=TENANT
//   - รองรับค้นหา: ?search=ชื่อ/อีเมล/username (ไม่คำนึงถึงตัวพิมพ์)
//   - map ข้อมูลสัญญาเช่า → แผงที่เช่าอยู่ปัจจุบัน (stall)
// -------------------------------------------------------
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;

    const where = {};

    // filter ตาม role
    if (role) {
      where.role = role;
    }

    // ค้นหาไม่คำนึงตัวพิมพ์ใน first_name, last_name, email หรือ username
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        title: true,
        address_line: true,
        subdistrict: true,
        district: true,
        province: true,
        postal_code: true,
        profile_image_url: true,
        rental_contracts: {
          where: { status: 'ACTIVE' },
          select: {
            slot: {
              select: {
                slot_id: true,
                slot_number: true,
                rent: true,
                status: true,
                food_court_id: true
              }
            }
          }
        }
      },
      orderBy: { first_name: 'asc' }
    });

    // map ข้อมูล: แปลง rental_contracts → stall (แผงที่เช่าปัจจุบัน)
    const formattedUsers = users.map(user => {
      const { rental_contracts, ...rest } = user;
      // เอาเฉพาะสัญญา ACTIVE แรก → slot ที่เช่าอยู่
      const stall = rental_contracts?.length > 0 ? rental_contracts[0].slot : null;
      return { ...rest, stall };
    });

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: createUser
// หน้าที่: Admin สร้างผู้ใช้งานใหม่ (ต่างจาก register ตรงที่ Admin กำหนด role ได้)
//   - ตรวจสอบชื่อ username และ email ซ้ำ
//   - Hash รหัสผ่านก่อนบันทึก
//   - บังคับให้เปลี่ยนรหัสผ่านครั้งแรก (must_change_password = true)
// -------------------------------------------------------
const createUser = async (req, res, next) => {
  try {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      phone,
      role,
      title,
      address_line,
      subdistrict,
      district,
      province,
      postal_code
    } = req.body;

    // Validate required fields
    if (!username || !password || !first_name || !role) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }

    // ตรวจสอบ username หรือ email ซ้ำในระบบ
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: email || undefined } // undefined ทำให้ Prisma ไม่ filter email ถ้าไม่ส่งมา
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ success: false, message: 'Username นี้ถูกใช้งานแล้ว' });
      }
      if (email && existingUser.email === email) {
        return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    let profile_image_url = null;

    if (req.file) {
      profile_image_url = req.file.path;
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        password_hash,
        first_name,
        last_name: last_name || null,
        email: email || null,
        phone: phone || null,
        role,
        title: title || null,
        address_line: address_line || null,
        subdistrict: subdistrict || null,
        district: district || null,
        province: province || null,
        postal_code: postal_code || null,
        profile_image_url,
        must_change_password: true
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        profile_image_url: true,
        must_change_password: true
      }
    });

    res.status(201).json({ success: true, message: 'สร้างผู้ใช้งานสำเร็จ', data: newUser });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: getUserById
// หน้าที่: ดึงข้อมูลผู้ใช้งานตาม ID
//   - ดึงสัญญา ACTIVE ที่เชื่อมกับผู้ใช้งานมาด้วย
// -------------------------------------------------------
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        title: true,
        address_line: true,
        subdistrict: true,
        district: true,
        province: true,
        postal_code: true,
        profile_image_url: true,
        rental_contracts: {
          where: { status: 'ACTIVE' },
          select: {
            contract_id: true,
            contract_number: true,
            start_date: true,
            end_date: true,
            monthly_rent: true,
            slot: {
              select: {
                slot_id: true,
                slot_number: true,
                food_court_id: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: updateUser
// หน้าที่: Admin แก้ไขข้อมูลผู้ใช้งาน
//   - ตรวจสอบ role ว่าอยู่ในลิสต์ที่อนุญาต
//   - partial update โดยใช้ spread operator (...condition && {key: value})
// -------------------------------------------------------
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, role, email, title,
            address_line, subdistrict, district, province, postal_code } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { user_id: parseInt(id) } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // ตรวจสอบว่า role ที่ส่งมาอยู่ในรายการที่อนุญาต
    const ALLOWED_ROLES = ['TENANT', 'ADMIN', 'EXECUTIVE', 'MAINTENANCE'];
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    let profile_image_url = undefined;
    if (req.file) {
      profile_image_url = req.file.path;
    } else if (req.body.profile_image_url !== undefined) {
      profile_image_url = req.body.profile_image_url === '' ? null : req.body.profile_image_url;
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
        ...(phone !== undefined && { phone }),
        ...(role && { role }),
        ...(email && { email }),
        ...(title !== undefined && { title }),
        ...(address_line !== undefined && { address_line }),
        ...(subdistrict !== undefined && { subdistrict }),
        ...(district !== undefined && { district }),
        ...(province !== undefined && { province }),
        ...(postal_code !== undefined && { postal_code }),
        ...(profile_image_url !== undefined && { profile_image_url })
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        profile_image_url: true
      }
    });

    res.json({ success: true, message: 'User updated successfully.', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: deleteUser
// หน้าที่: Admin ลบผู้ใช้งาน
//   - ป้องกันไม่ให้ลบ ADMIN accounts (เพื่อป้องกัน Admin ลบตัวเอง)
// -------------------------------------------------------
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const existingUser = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        rental_contracts: {
          select: {
            contract_id: true,
            slot_id: true,
            status: true,
            monthly_expenses: {
              select: { expense_id: true }
            }
          }
        },
        maintenance_requests: {
          select: { request_id: true }
        }
      }
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้งานในระบบ' });
    }

    // ป้องกันไม่ให้ Admin ลบ account Admin ด้วยกัน
    if (existingUser.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'ไม่สามารถลบบัญชีผู้ดูแลระบบ (Admin) ได้' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. จัดการสัญญาเช่าและคืนสถานะแผงค้า (ถ้ามีสัญญาที่ยัง ACTIVE)
      const contractIds = existingUser.rental_contracts.map((c) => c.contract_id);
      const activeSlotIds = existingUser.rental_contracts
        .filter((c) => c.status === 'ACTIVE')
        .map((c) => c.slot_id);

      // คืนสถานะแผงค้าที่เป็น ACTIVE ให้กลับเป็น VACANT (ว่าง)
      if (activeSlotIds.length > 0) {
        await tx.rentalSlot.updateMany({
          where: { slot_id: { in: activeSlotIds } },
          data: { status: 'VACANT' }
        });
      }

      if (contractIds.length > 0) {
        // ดึง expense_ids ทั้งหมดของสัญญา
        const expenseIds = existingUser.rental_contracts.flatMap((c) =>
          c.monthly_expenses.map((e) => e.expense_id)
        );

        // ลบ payments
        if (expenseIds.length > 0) {
          await tx.payment.deleteMany({
            where: { expense_id: { in: expenseIds } }
          });
          // ลบ monthly_expenses
          await tx.monthlyExpense.deleteMany({
            where: { expense_id: { in: expenseIds } }
          });
        }

        // ลบ cancellation_requests
        await tx.cancellationRequest.deleteMany({
          where: { contract_id: { in: contractIds } }
        });

        // ลบ rental_contracts
        await tx.rentalContract.deleteMany({
          where: { contract_id: { in: contractIds } }
        });
      }

      // 2. จัดการคำขอแจ้งซ่อม (Maintenance Requests)
      const requestIds = existingUser.maintenance_requests.map((r) => r.request_id);
      if (requestIds.length > 0) {
        await tx.maintenanceUpdate.deleteMany({
          where: { request_id: { in: requestIds } }
        });
        await tx.maintenanceImage.deleteMany({
          where: { request_id: { in: requestIds } }
        });
        await tx.maintenanceAssignment.deleteMany({
          where: { request_id: { in: requestIds } }
        });
        await tx.maintenanceRequest.deleteMany({
          where: { request_id: { in: requestIds } }
        });
      }

      // ลบความสัมพันธ์อื่นๆ ที่ชี้มายัง user นี้
      await tx.maintenanceUpdate.deleteMany({
        where: { updated_by: userId }
      });
      await tx.maintenanceAssignment.deleteMany({
        where: { OR: [{ assigned_to: userId }, { assigned_by: userId }] }
      });
      await tx.payment.updateMany({
        where: { verified_by: userId },
        data: { verified_by: null }
      });
      await tx.systemSetting.updateMany({
        where: { updated_by: userId },
        data: { updated_by: null }
      });

      // จัดการ utility_meters ถ้ามีผู้ใช้คนนี้เป็นคนบันทึก
      const metersRecorded = await tx.utilityMeter.count({ where: { recorded_by: userId } });
      if (metersRecorded > 0) {
        const adminUser = await tx.user.findFirst({ where: { role: 'ADMIN', user_id: { not: userId } } });
        if (adminUser) {
          await tx.utilityMeter.updateMany({
            where: { recorded_by: userId },
            data: { recorded_by: adminUser.user_id }
          });
        }
      }

      // 3. ลบการแจ้งเตือน (Notifications)
      await tx.notification.deleteMany({
        where: { user_id: userId }
      });

      // 4. ลบ User
      await tx.user.delete({
        where: { user_id: userId }
      });
    });

    res.json({ success: true, message: 'ลบข้อมูลผู้เช่าและคืนสถานะแผงค้าเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting user:', error);
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: resetPassword
// หน้าที่: Admin รีเซ็ตรหัสผ่านได้ (Admin เท่านั้น)
//   - Hash รหัสผ่านใหม่ปัอนเอา
//   - บังคับให้ user เปลี่ยนรหัสผ่านเมื่อ login ครั้งถัดไป
// -------------------------------------------------------
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { user_id: parseInt(id) } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    // Hash รหัสผ่านใหม่ก่อนบันทึก
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // อัปเดต hash ใหม่ + บังคับเปลี่ยนรหัสผ่านเมื่อ login ครั้งถัดไป
    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        password_hash,
        must_change_password: true // บังคับเปลี่ยนรหัสผ่านเมื่อ login ครั้งถัดไป
      }
    });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword
};
