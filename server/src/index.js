// ======================================================
// index.js - จุดเริ่มต้นหลักของ Backend Server (Express Application)
// รับผิดชอบ:
//   - การโหลด Environment Variables (.env)
//   - ตั้งค่า Middleware ความปลอดภัย (Helmet, CORS, Rate Limiting)
//   - ตรวจสอบและรัน Database Migrations เบื้องต้นอัตโนมัติตอน Startup
//   - กำหนด Route Endpoints ทั้งหมดของระบบ API
//   - ตั้งเวลาทำงานเบื้องหลังอัตโนมัติ (Daily Cron Jobs ตอนเที่ยงคืน)
//   - จัดการ Error Handling และเริ่มรัน Server บน Port ที่กำหนด
// ======================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// -------------------------------------------------------
// การนำเข้า Route Handlers ของแต่ละโมดูล
// -------------------------------------------------------
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const stallRoutes = require("./routes/stalls");
const billRoutes = require("./routes/bills");
const contractRoutes = require("./routes/contracts");
const maintenanceRoutes = require("./routes/maintenance");
const settingsRoutes = require("./routes/settings");
const notificationRoutes = require('./routes/notifications');
const shopTypeRoutes = require('./routes/shopTypes');
const foodCourtRoutes = require('./routes/foodCourts');

// นำเข้า Services สำหรับงาน Background Jobs
const notificationService = require('./services/notificationService');
const { autoTerminateContracts } = require('./services/contractService');
const cron = require('node-cron');

const app = express();

// -------------------------------------------------------
// Database Migration on Startup
// ตรวจสอบและเพิ่มคอลัมน์ในฐานข้อมูลที่จำเป็นอัตโนมัติ หากยังไม่มี
// -------------------------------------------------------
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function runMigrations() {
  console.log('[Database] Checking schema...');
  try {
    // เพิ่มคอลัมน์สำหรับคำนวณมิเตอร์น้ำ-ไฟ ในตาราง MonthlyExpense
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "MonthlyExpense" 
      ADD COLUMN IF NOT EXISTS "water_units" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "electricity_units" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "water_rate" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "electricity_rate" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "grease_trap_fee" DOUBLE PRECISION;
    `);
    
    // เพิ่มคอลัมน์รูปภาพศูนย์อาหารในตาราง FoodCourt
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "FoodCourt"
      ADD COLUMN IF NOT EXISTS "image_url" TEXT;
    `);
    console.log('[Database] Schema is up to date.');
  } catch (err) {
    console.error('[Database] Migration error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
runMigrations();

// -------------------------------------------------------
// การตั้งค่าความปลอดภัย (Security Headers ด้วย Helmet)
// -------------------------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // อนุญาตให้โหลดรูปภาพจากภายนอก (เช่น Cloudinary)
  contentSecurityPolicy: false // ปิด CSP ฝั่ง API ให้ Frontend จัดการเอง
}));

// -------------------------------------------------------
// การตั้งค่า CORS (Cross-Origin Resource Sharing)
// กำหนด Domain หรือ URL ฝั่ง Frontend ที่ได้รับอนุญาตให้เรียกใช้ API
// -------------------------------------------------------
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // โหมด Development: อนุญาตคำขอที่ไม่มี Origin (เช่น Postman, โมบายล์แอป)
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // ปฏิเสธคำขอที่ไม่ตรงกับ origin ที่อนุญาต (ส่ง false โดยไม่โยน error เพื่อไม่ให้เซิร์ฟเวอร์แครช)
    return callback(null, false);
  },
  credentials: true
}));

// รองรับ Reverse Proxy (เช่น Nginx หรือ Cloudflare) สำหรับ Rate Limiter
app.set('trust proxy', 1);

// -------------------------------------------------------
// การตั้งค่า Rate Limiting ป้องกันการยิงสแปม (Brute-force attack)
// -------------------------------------------------------
// จำกัดการล็อกอิน/สมัครสมาชิก: สูงสุด 20 ครั้ง ต่อ IP ในช่วง 15 นาที
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again after 15 minutes.' }
});

// จำกัดคำขอ API ทั่วไป: สูงสุด 300 ครั้ง ต่อ IP ในช่วง 15 นาที
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', generalLimiter);

// -------------------------------------------------------
// Body Parsers และ Request Logger
// -------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static files สำหรับรูปภาพที่อัปโหลดไว้ในโฟลเดอร์ uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// -------------------------------------------------------
// การเชื่อมต่อ Routes เข้ากับ URL Path หลัก
// -------------------------------------------------------
app.use("/api/auth", authRoutes);                  // ระบบยืนยันตัวตน (ล็อกอิน, ข้อมูลผู้ใช้ปัจจุบัน)
app.use("/api/users", userRoutes);                // ระบบจัดการข้อมูลผู้ใช้งาน (Admin จัดการผู้ใช้)
app.use("/api/stalls", stallRoutes);              // ระบบจัดการแผงร้านค้า และการบันทึกมิเตอร์
app.use("/api/bills", billRoutes);                // ระบบออกบิล ค่าน้ำ ค่าไฟ และการตรวจสอบสลิป
app.use("/api/contracts", contractRoutes);        // ระบบสัญญาเช่า และการขอยกเลิกสัญญา
app.use("/api/maintenance", maintenanceRoutes);  // ระบบแจ้งซ่อมและมอบหมายงานช่าง
app.use("/api/settings", settingsRoutes);          // ระบบตั้งค่าระบบและอัตราค่าน้ำ/ค่าไฟ/ค่าปรับ
app.use("/api/notifications", notificationRoutes);// ระบบรายการแจ้งเตือน
app.use("/api/shop-types", shopTypeRoutes);        // ระบบประเภทหมวดหมู่ร้านค้า
app.use("/api/food-courts", foodCourtRoutes);      // ระบบข้อมูลศูนย์อาหาร

// Health check endpoint สำหรับตรวจสอบสถานะการทำงานของเซิร์ฟเวอร์
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// -------------------------------------------------------
// Global Error Handling Middleware
// ดักจับข้อผิดพลาดทั้งหมดที่เกิดขึ้นในระบบและส่งกลับเป็น JSON
// -------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ดักจับ 404 Route Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5001;

// -------------------------------------------------------
// Daily Background Jobs (รันอัตโนมัติทุกเที่ยงคืน 00:00)
// -------------------------------------------------------
cron.schedule('0 0 * * *', async () => {
  console.log('[System] Running scheduled daily jobs...');
  try {
    // 1. ตรวจสอบบิลที่ใกล้ครบกำหนดชำระ และส่งการแจ้งเตือนไปยังผู้เช่า
    await notificationService.checkUpcomingBills();
    
    // 2. ยกเลิกสัญญาเช่าที่ค้างชำระเกิน 3 เดือนโดยอัตโนมัติ
    await autoTerminateContracts();
  } catch (err) {
    console.error('[System] Error running scheduled jobs:', err);
  }
});

// เริ่มต้นรันเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
