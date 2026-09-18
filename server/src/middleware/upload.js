// ======================================================
// upload.js - Middleware สำหรับรับและจัดการไฟล์ที่อัปโหลด
// ใช้ multer + Cloudinary เก็บไฟล์บน Cloud แทนการเก็บในเซิร์ฟเวอร์
// ======================================================

// multer คือ middleware สำหรับรับ multipart/form-data (การส่งไฟล์)
const multer = require('multer');

// CloudinaryStorage คือ multer storage adapter สำหรับ Cloudinary
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// cloudinary SDK สำหรับอัปโหลดไฟล์ไปยัง Cloudinary cloud storage
const cloudinary = require('cloudinary').v2;

// path ใช้สำหรับดึงนามสกุลไฟล์ (extension)
const path = require('path');

// -------------------------------------------------------
// ตั้งค่าการเชื่อมต่อ Cloudinary
// ดึง credentials จาก environment variables (.env)
// ประกอบด้วย: cloud_name, api_key, api_secret
// -------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -------------------------------------------------------
// ตั้งค่า Cloudinary Storage
// กำหนดว่าไฟล์แต่ละประเภทจะถูกเก็บไว้ใน folder ใดบน Cloudinary
// โดยแยก folder ตาม URL path ที่ request มา
// -------------------------------------------------------
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // ตรวจสอบ URL ของ request เพื่อเลือก folder ปลายทาง
    let folderName = 'general'; // default folder

    if (req.baseUrl.includes('bills')) {
      folderName = 'payments';       // บิล/ใบเสร็จ → เก็บใน Project/payments
    } else if (req.baseUrl.includes('maintenance')) {
      folderName = 'maintenance';    // รูปแจ้งซ่อม → เก็บใน Project/maintenance
    } else if (req.baseUrl.includes('contracts')) {
      folderName = 'contracts';      // ไฟล์สัญญา → เก็บใน Project/contracts
    }

    // ดึงนามสกุลไฟล์จากชื่อไฟล์ต้นฉบับ และแปลงเป็นตัวพิมพ์เล็ก
    const ext = path.extname(file.originalname).substring(1).toLowerCase();

    // แปลงไฟล์ HEIC/HEIF (iPhone photo format) → JPG เพื่อความเข้ากันได้
    const format = (ext === 'heic' || ext === 'heif') ? 'jpg' : ext;

    return {
      folder: `Project/${folderName}`,           // path folder บน Cloudinary
      format: format,                             // นามสกุลที่จะบันทึก
      // สร้าง unique public_id จาก fieldname + timestamp + random เพื่อป้องกันชื่อซ้ำ
      public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

// -------------------------------------------------------
// กำหนดประเภทไฟล์ที่อนุญาต (Allowlist)
// ใช้ Set เพื่อการค้นหาที่รวดเร็วกว่า Array
// ตรวจสอบจาก MIME type (ไม่ใช่นามสกุล) เพื่อป้องกัน extension spoofing
// -------------------------------------------------------
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',   // iPhone รุ่นใหม่
  'image/heif',   // iPhone รุ่นใหม่ (อีกรูปแบบ)
  'application/pdf'
]);

// -------------------------------------------------------
// fileFilter - ตรวจสอบประเภทไฟล์ก่อนอัปโหลด
// ถ้าไฟล์ไม่อยู่ใน allowlist → ปฏิเสธทันที
// cb(null, true)  = อนุญาต
// cb(error)       = ปฏิเสธพร้อม error message
// -------------------------------------------------------
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(null, true); // ประเภทไฟล์ถูกต้อง → อนุญาต
  }
  // ประเภทไฟล์ไม่อนุญาต → ส่ง error กลับ
  cb(new Error('Only images (jpeg, jpg, png, gif, webp, heic) and PDF files are allowed!'));
};

// -------------------------------------------------------
// สร้าง multer instance พร้อมกำหนด:
// - storage: ใช้ CloudinaryStorage (อัปโหลดไปที่ Cloud)
// - fileFilter: กรองประเภทไฟล์ที่ไม่อนุญาต
// - limits.fileSize: จำกัดขนาดไฟล์ (default 5MB, ปรับได้ผ่าน .env)
// -------------------------------------------------------
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  }
});

// Export upload instance เพื่อให้ routes นำไปใช้
// เช่น: upload.single('contractFile'), upload.array('images', 5)
module.exports = upload;
