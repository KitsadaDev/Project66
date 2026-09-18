// ======================================================
// authController.js - Controller จัดการ Authentication
// รับผิดชอบ: สมัครสมาชิก, ล็อกอิน, ดูโปรไฟล์, แก้ไขโปรไฟล์, เปลี่ยนรหัสผ่าน
// ======================================================

// bcrypt: ใช้สำหรับ hash รหัสผ่าน และตรวจสอบรหัสผ่าน
// ไม่เก็บรหัสผ่านตรง ๆ ในฐานข้อมูล → ปลอดภัยกว่า
const bcrypt = require('bcryptjs');

// jwt: ใช้สร้าง JWT token สำหรับ authentication stateless
const jwt = require('jsonwebtoken');

// Prisma Client สำหรับติดต่อฐานข้อมูล
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: register
// หน้าที่: สมัครสมาชิกใหม่
//   - รับข้อมูลจาก req.body และ req.file (รูปโปรไฟล์)
//   - ตรวจสอบ username ซ้ำ
//   - Hash รหัสผ่านก่อนบันทึก
//   - บังคับให้ role เป็น TENANT เสมอ (ป้องกันการปลอม role)
//   - คืน JWT token พร้อมข้อมูล user
// -------------------------------------------------------
const register = async (req, res, next) => {
  try {
    // รับข้อมูลทั้งหมดจาก request body (form data)
    const { username, password, first_name, last_name, email, phone, role, title,
            address_line, subdistrict, district, province, postal_code } = req.body;

    // ตัด whitespace หัวท้ายออกจาก username
    const trimmedUsername = username?.trim();

    // ตรวจสอบว่า username ซ้ำกับในฐานข้อมูลหรือไม่
    const existingUsername = await prisma.user.findUnique({ where: { username: trimmedUsername } });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }

    // สร้าง salt (ค่าสุ่ม 10 รอบ) แล้ว hash รหัสผ่าน → เก็บ hash ในฐานข้อมูล
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // URL รูปโปรไฟล์: ถ้ามีไฟล์อัปโหลดมา → ใช้ path จาก Cloudinary, ไม่งั้นใช้ URL จาก body
    const profile_image_url = req.file ? req.file.path : (req.body.profile_image_url || null);

    // ⚠️ ความปลอดภัย: บังคับให้ role = 'TENANT' เสมอ ไม่ว่า req.body.role จะส่งมาว่าอะไร
    // เพื่อป้องกัน user สมัครตัวเองเป็น ADMIN ได้
    // การยกระดับ role ต้องทำผ่าน Admin เท่านั้น
    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        password_hash,
        first_name,
        last_name: last_name || undefined,
        email: email || null,
        phone: phone || null,
        role: 'TENANT',              // บังคับ TENANT เสมอ
        title: title || null,
        address_line: address_line || null,
        subdistrict: subdistrict || null,
        district: district || null,
        province: province || null,
        postal_code: postal_code || null,
        profile_image_url,
        must_change_password: true   // บังคับให้เปลี่ยนรหัสผ่านครั้งแรก
      },
      // คืนเฉพาะข้อมูลที่จำเป็น ไม่รวม password_hash
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

    // สร้าง JWT token บรรจุ user_id ไว้ใน payload
    // token หมดอายุตามที่กำหนดใน .env (default 7 วัน)
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // ตอบกลับ 201 Created พร้อมข้อมูล user และ token
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user, token }
    });
  } catch (error) {
    next(error); // ส่ง error ไปให้ global error handler
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: login
// หน้าที่: ล็อกอินด้วย username หรือ email + password
//   - ค้นหา user จาก email หรือ username (รองรับทั้งสองแบบ)
//   - ตรวจสอบรหัสผ่านโดย compare กับ hash ในฐานข้อมูล
//   - คืน JWT token และข้อมูล user
// -------------------------------------------------------
const login = async (req, res, next) => {
  try {
    // loginField คือ email หรือ username ที่ผู้ใช้พิมพ์
    let { login: loginField, password } = req.body;

    // ตรวจสอบว่ามีข้อมูลครบหรือไม่
    if (!loginField || !password) {
      return res.status(400).json({ success: false, message: 'Login and password are required.' });
    }

    // ตัด whitespace หัวท้ายออก (กรณีพิมพ์เว้นวรรคโดยไม่ตั้งใจ)
    loginField = typeof loginField === 'string' ? loginField.trim() : loginField;

    // ค้นหา user ในฐานข้อมูล โดยจับคู่กับ email หรือ username
    // OR condition: ถ้าตรงอันใดอันหนึ่งก็พบ
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginField },
          { username: loginField }
        ]
      }
    });

    // ถ้าไม่พบ user → ตอบ 401 (ข้อความกำกวมเพื่อไม่บอกว่า username หรือรหัสผ่านผิด)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // เปรียบเทียบรหัสผ่านที่พิมพ์มากับ hash ที่เก็บในฐานข้อมูล
    // bcrypt.compare คืน true ถ้าตรงกัน, false ถ้าไม่ตรง
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // สร้าง JWT token สำหรับ session นี้
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // ตอบกลับ 200 พร้อมข้อมูล user (ไม่รวม password_hash) และ token
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: user.phone,
          profile_image_url: user.profile_image_url,
          must_change_password: user.must_change_password
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: getProfile
// หน้าที่: ดึงข้อมูลโปรไฟล์ของ user ที่ล็อกอินอยู่
//   - ใช้ req.user.user_id ที่ถูกแนบมาโดย authenticate middleware
//   - ดึงข้อมูลที่ครบกว่า login response (รวมที่อยู่ ฯลฯ)
// -------------------------------------------------------
const getProfile = async (req, res, next) => {
  try {
    // ดึงข้อมูลจาก DB โดยใช้ user_id จาก token ที่ผ่าน authenticate แล้ว
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        address_line: true,    // ที่อยู่เพิ่มเติม
        subdistrict: true,
        district: true,
        province: true,
        postal_code: true,
        profile_image_url: true,
        must_change_password: true
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: updateProfile
// หน้าที่: แก้ไขข้อมูลโปรไฟล์ของ user ที่ล็อกอินอยู่
//   - ใส่เฉพาะ field ที่ส่งมาใน updateData (ไม่ override field ที่ไม่ได้ส่ง)
//   - รองรับการเปลี่ยนรหัสผ่าน (ต้องใส่รหัสเดิมมาด้วย)
//   - รองรับการอัปโหลดรูปโปรไฟล์ใหม่
// -------------------------------------------------------
const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, currentPassword, newPassword,
            address_line, subdistrict, district, province, postal_code, title } = req.body;

    // สร้าง object เปล่า แล้วค่อย ๆ ใส่เฉพาะ field ที่ส่งมาจริง ๆ
    // เพื่อป้องกันการ overwrite ข้อมูลที่ไม่ต้องการเปลี่ยน
    const updateData = {};

    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address_line !== undefined) updateData.address_line = address_line;
    if (subdistrict !== undefined) updateData.subdistrict = subdistrict;
    if (district !== undefined) updateData.district = district;
    if (province !== undefined) updateData.province = province;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (title !== undefined) updateData.title = title;
    
    // ถ้ามีไฟล์รูปโปรไฟล์ใหม่ → ใช้ path จาก Cloudinary
    // ถ้าส่ง profile_image_url เป็น string ว่าง → ลบรูป (set null)
    if (req.file) {
      updateData.profile_image_url = req.file.path;
    } else if (req.body.profile_image_url !== undefined) {
      updateData.profile_image_url = req.body.profile_image_url === '' ? null : req.body.profile_image_url;
    }

    // ถ้าต้องการเปลี่ยนรหัสผ่าน → ต้องส่ง currentPassword และ newPassword มาด้วย
    if (currentPassword && newPassword) {
      // ดึง user ล่าสุดเพื่อเอา password_hash มาตรวจสอบ
      const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
      // Hash รหัสผ่านใหม่ก่อนบันทึก
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(newPassword, salt);
      // เมื่อเปลี่ยนรหัสผ่านแล้ว → ไม่ต้องบังคับเปลี่ยนอีก
      updateData.must_change_password = false;
    }

    // อัปเดตข้อมูลใน DB เฉพาะ field ที่อยู่ใน updateData
    const updatedUser = await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: updateData,
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

    res.json({ success: true, message: 'Profile updated successfully.', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: updatePushToken
// หน้าที่: บันทึก Expo Push Token ของอุปกรณ์ mobile
//   ใช้สำหรับส่ง Push Notification ผ่าน Expo Notifications
//   โดยปกติเรียกตอน app เปิดขึ้นมาครั้งแรกหลัง login
// -------------------------------------------------------
const updatePushToken = async (req, res, next) => {
  try {
    const { push_token } = req.body;
    
    // ตรวจสอบว่ามี push_token ส่งมาหรือไม่
    if (!push_token) {
      return res.status(400).json({ success: false, message: 'Push token is required.' });
    }

    // บันทึก push_token ใน DB เชื่อมกับ user นี้
    // เมื่อต้องการส่ง push notification จะดึง token นี้มาใช้
    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { push_token }
    });

    res.json({ success: true, message: 'Push token updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: changePassword
// หน้าที่: เปลี่ยนรหัสผ่านแบบบังคับ (Force Change)
//   ใช้สำหรับ Tenant ที่ login ครั้งแรก และถูก flag must_change_password = true
//   ไม่ต้องใส่รหัสเดิม (ต่างจาก updateProfile ที่ต้องใส่ currentPassword)
// -------------------------------------------------------
const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    // รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    // Hash รหัสผ่านใหม่ก่อนบันทึก
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // อัปเดต hash ใหม่ และ set must_change_password = false
    // เพื่อไม่ต้องบังคับเปลี่ยนรหัสผ่านอีกครั้งในครั้งถัดไป
    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { password_hash, must_change_password: false }
    });

    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    next(error);
  }
};

// Export ทุกฟังก์ชันเพื่อให้ routes/auth.js นำไปใช้
module.exports = { register, login, getProfile, updateProfile, updatePushToken, changePassword };

