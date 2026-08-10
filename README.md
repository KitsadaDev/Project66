# BRU Food Court Management System
> ระบบจัดการร้านค้าและค่าเช่าศูนย์อาหาร มหาวิทยาลัยราชภัฏบุรีรัมย์ (Buriram Rajabhat University)

ระบบเว็บแอปพลิเคชันสำหรับบริหารจัดการพื้นที่เช่า, บันทึกมิเตอร์สาธารณูปโภค (น้ำ-ไฟ), แจ้งหนี้, อัปโหลดหลักฐานการชำระเงิน, ระบบจัดการภาชนะ และแจ้งซ่อมบำรุงในศูนย์อาหารอย่างครบวงจร

---

## 🚀 คุณสมบัติของระบบ (System Features)

ระบบรองรับการทำงาน 4 บทบาทหลัก (Roles):

### 1. ผู้ดูแลระบบ (Admin)
- **จัดการแผงค้าและสถานะ:** แผนผังจำลองสถานะแผงค้า (Stall Map) แบบ Interactive แสดงสถานะการจอง/ว่าง/ชำรุด
- **บันทึกมิเตอร์น้ำ-ไฟ:** บันทึกเลขมิเตอร์เพื่อคำนวณค่าน้ำค่าไฟของร้านค้าแต่ละรายโดยอัตโนมัติ
- **จัดการค่าเช่าและบิล:** ตรวจสอบยอดชำระเงิน ตรวจสอบสลิปโอนเงิน (Verify Payment Slip)
- **จัดการสัญญาเช่า:** ควบคุมข้อมูลการเริ่มสัญญา/สิ้นสุดสัญญาเช่า
- **ระบบแจ้งซ่อม:** มอบหมายงานให้ช่างเทคนิค และติดตามสถานะการซ่อมบำรุง
- **จัดการถ้วยชาม/ภาชนะ:** ตรวจสอบยอดภาชนะของร้านค้าแต่ละร้าน

### 2. ผู้ประกอบการ/ผู้เช่า (Tenant)
- **แดชบอร์ดค่าใช้จ่าย:** ตรวจสอบรายละเอียดค่าเช่า ค่าน้ำ ค่าไฟ และค่าดักไขมันประจำเดือน
- **แจ้งชำระเงิน:** อัปโหลดหลักฐานการโอนเงิน (Slip Upload) และดาวน์โหลดบิลใบแจ้งหนี้เป็น PDF
- **ประวัติการชำระเงิน:** ตรวจสอบและย้อนดูประวัติการเงินย้อนหลัง
- **แจ้งซ่อมบำรุง:** เขียนใบคำร้องแจ้งซ่อมจุดชำรุดในแผงค้าของตนเอง
- **ระบบตรวจสอบภาชนะ:** รายงานจำนวนถ้วยชามและสถานะการล้างภาชนะ

### 3. ช่างซ่อมบำรุง (Maintenance Staff)
- **ดูรายการงานที่ได้รับมอบหมาย:** รายการงานซ่อมแซมพร้อมรายละเอียดและพิกัดแผงค้า
- **อัปเดตสถานะงาน:** รายงานความคืบหน้าการทำงาน และอัปโหลดภาพหลังการซ่อมแซมสำเร็จ

### 4. ผู้บริหาร (Executive)
- **Dashboard ภาพรวม:** สรุปยอดรายได้ ค้างชำระ อัตราการเช่าพื้นที่ และสถิติงานซ่อมบำรุง
- **รายงานสรุป:** ดูรายงานสรุปทางการเงินและประสิทธิภาพการดำเนินงาน

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend (Client)
- **React 19** & **Vite** (Build Tool ความเร็วสูง)
- **Tailwind CSS v4** (สำหรับการทำ UI และ Utility Classes)
- **Zustand** (สำหรับ State Management)
- **Lucide React** (ไอคอนสไตล์ Modern)
- **Axios** (สำหรับ HTTP Requests)
- **jsPDF** & **jsPDF-Autotable** (สำหรับการเจนเอกสาร PDF ใบเสร็จ)
- **React Toastify** (ระบบแจ้งเตือนแบบ Pop-up)

### Backend (Server)
- **Node.js** & **Express** (API Gateway & Routing)
- **Prisma ORM** (การเชื่อมต่อและสืบค้นฐานข้อมูลอย่างปลอดภัย)
- **PostgreSQL** (ระบบฐานข้อมูลหลัก)
- **Cloudinary** (สำหรับฝากไฟล์รูปภาพสลิปและใบเสร็จ)
- **Multer** & **Multer Storage Cloudinary** (จัดการไฟล์อัปโหลด)
- **Bcrypt.js** (การเข้ารหัสรหัสผ่าน)
- **JSON Web Token (JWT)** (ระบบ Authentication)
- **Node-Cron** (การตั้งตารางเวลาทำงานเบื้องหลังอัตโนมัติ)

---

## 📦 การติดตั้งและการรันระบบในเครื่อง (Local Setup)

### 1. ดาวน์โหลดโปรเจกต์ (Clone Project)
```bash
git clone https://github.com/KitsadaDev/Project66.git
cd Project66
```

### 2. ตั้งค่าและรันฝั่ง Server (Backend)
1. เข้าไปที่โฟลเดอร์ `server`
   ```bash
   cd server
   ```
2. ติดตั้ง Dependencies
   ```bash
   npm install
   ```
3. สร้างไฟล์ `.env` ในโฟลเดอร์ `server` และกรอกข้อมูลต่อไปนี้:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"
   JWT_SECRET="your_jwt_secret_key"
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   ```
4. ซิงค์ฐานข้อมูลด้วย Prisma
   ```bash
   # ทำการ Migrate ฐานข้อมูล
   npm run db:migrate
   
   # หรือใช้คำสั่ง db push
   npm run db:push
   
   # รันข้อมูลเริ่มต้น (Seeding)
   npm run db:seed
   ```
5. รันเซิร์ฟเวอร์
   ```bash
   npm run dev
   ```

### 3. ตั้งค่าและรันฝั่ง Client (Frontend)
1. เปิด Terminal ใหม่แล้วเข้าไปที่โฟลเดอร์ `client`
   ```bash
   cd client
   ```
2. ติดตั้ง Dependencies
   ```bash
   npm install
   ```
3. สร้างไฟล์ `.env` ในโฟลเดอร์ `client` เพื่อกำหนด API URL:
   ```env
   VITE_API_URL="http://localhost:5000/api"
   ```
4. รันระบบ Client
   ```bash
   npm run dev
   ```

---

## 📂 โครงสร้างของโปรเจกต์ (Project Structure)
```text
Project66/
├── client/              # โค้ดส่วน Frontend (React + Vite)
│   ├── src/
│   │   ├── api/         # Axios API Services
│   │   ├── components/  # Components ส่วนกลาง เช่น Sidebar, Header
│   │   ├── layouts/     # โครงสร้าง Layout (DashboardLayout)
│   │   ├── pages/       # หน้าหลักแยกตามบทบาท (tenant, admin, executive, auth)
│   │   ├── store/       # Zustand Stores (AuthStore, UIStore)
│   │   └── utils/       # ฟังก์ชันอำนวยความสะดวก เช่น PDF Generator
├── server/              # โค้ดส่วน Backend (Express + Prisma)
│   ├── prisma/          # Prisma Schema & Database Seeder
│   ├── src/
│   │   ├── controllers/ # คอนโทรลเลอร์ควบคุม Logic การทำงาน
│   │   ├── middleware/  # มิดเดิ้ลแวร์ เช่น ตรวจสอบสิทธิ์ (Auth), อัปโหลดรูปภาพ
│   │   ├── routes/      # เส้นทางการรับ-ส่งข้อมูล API Endpoints
│   │   └── index.js     # จุดเริ่มต้นของระบบ Backend
```

