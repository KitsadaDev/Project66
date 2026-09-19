// ======================================================
// auth.js - Middleware ตรวจสอบตัวตนและสิทธิ์การเข้าถึง
// ======================================================

// นำเข้า library สำหรับจัดการ JWT (JSON Web Token)
const jwt = require('jsonwebtoken');

// นำเข้า Prisma Client สำหรับติดต่อฐานข้อมูล
const { PrismaClient } = require('@prisma/client');

// สร้าง Prisma instance เพื่อใช้ query database
const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: authenticate
// หน้าที่: ตรวจสอบว่า request มี JWT token ที่ถูกต้องหรือไม่
//   ✅ ผ่าน → แนบข้อมูล user ไว้ที่ req.user แล้วเรียก next()
//   ❌ ไม่ผ่าน → ตอบกลับ 401 Unauthorized ทันที
// ใช้เป็น middleware วางก่อน route ที่ต้องการการล็อกอิน
// -------------------------------------------------------
const authenticate = async (req, res, next) => {
  try {
    // ดึงค่า Authorization header จาก request (รูปแบบ: "Bearer <token>")
    const authHeader = req.headers.authorization;

    // ถ้าไม่มี header หรือไม่ขึ้นต้นด้วย "Bearer " → ปฏิเสธทันที
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // แยกเอาเฉพาะตัว token ออกจาก header (ตัด "Bearer " ออก)
    const token = authHeader.split(' ')[1];

    // ถอดรหัส (verify) token โดยใช้ JWT_SECRET จาก .env
    // ถ้า token ผิดหรือหมดอายุ จะ throw error เข้าไปที่ catch
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ค้นหา user ในฐานข้อมูลด้วย user_id ที่ถอดได้จาก token
    // เลือกเฉพาะฟิลด์ที่จำเป็น ไม่รวม password_hash เพื่อความปลอดภัย
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        is_active: true
      }
    });

    // ถ้าไม่พบ user ในฐานข้อมูล (เช่น ถูกลบหลังจากล็อกอิน)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    // ถ้าผู้ใช้ถูกระงับการใช้งาน
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Access denied.'
      });
    }

    // แนบข้อมูล user ไว้ที่ req.user เพื่อให้ controller ถัดไปใช้ได้
    req.user = user;

    // เรียก next() ส่งต่อ request ไปยัง middleware/controller ถัดไป
    next();
  } catch (error) {
    // จัดการ error แยกตามประเภทของ JWT error
    if (error.name === 'JsonWebTokenError') {
      // token รูปแบบผิด หรือถูกแก้ไข/ปลอมแปลง
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      // token หมดอายุแล้ว (เกิน JWT_EXPIRES_IN ที่ตั้งไว้)
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    // error อื่น ๆ ส่งต่อให้ global error handler จัดการ
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: authorize(...roles)
// หน้าที่: ตรวจสอบว่า user มี role ที่อนุญาตให้เข้าถึง route นั้น ๆ
//   เป็น Higher-Order Function → รับ roles แล้วคืนเป็น middleware
//   ตัวอย่าง: authorize('ADMIN', 'EXECUTIVE')
//     → อนุญาตเฉพาะ ADMIN และ EXECUTIVE เท่านั้น
// ⚠️ ต้องใช้หลัง authenticate() เสมอ เพราะต้องใช้ req.user
// -------------------------------------------------------
const authorize = (...roles) => {
  // คืนค่า middleware function จริง ๆ (Express pattern)
  return (req, res, next) => {
    // ถ้าไม่มี req.user หมายความว่ายังไม่ได้ผ่าน authenticate
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    // ตรวจสอบว่า role ของ user อยู่ใน roles ที่ route นี้อนุญาตหรือไม่
    if (!roles.includes(req.user.role)) {
      // role ไม่ตรง → 403 Forbidden (ล็อกอินแล้ว แต่ไม่มีสิทธิ์)
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    // role ตรง → ส่งต่อไปยัง controller ถัดไป
    next();
  };
};

// Export ทั้งสองฟังก์ชันเพื่อให้ routes ต่าง ๆ นำไปใช้
module.exports = {
  authenticate,
  authorize
};
