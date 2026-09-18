// ======================================================
// api/index.js - ศูนย์รวม Service เรียกใช้ API ทุกโมดูลในระบบ Pro-66
// รับผิดชอบ: จัดกลุ่มฟังก์ชันยิง HTTP Request (GET, POST, PUT, DELETE) แยกตามโมดูล
// ======================================================

import api from './axios';

// -------------------------------------------------------
// 1. ระบบยืนยันตัวตน (Authentication API)
// -------------------------------------------------------
export const authAPI = {
  // เข้าสู่ระบบด้วย username, password
  login: (credentials) => api.post('/auth/login', credentials),
  // สมัครสมาชิกใหม่ (รองรับ FormData ถ้ามีรูปภาพ)
  register: (userData) => api.post('/auth/register', userData, userData instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  // ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
  getProfile: () => api.get('/auth/me'),
  // แก้ไขข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
  updateProfile: (data) => api.put('/auth/me', data)
};

// -------------------------------------------------------
// 2. ระบบจัดการผู้ใช้งาน (Users API - สำหรับ Admin)
// -------------------------------------------------------
export const usersAPI = {
  // ดึงรายชื่อผู้ใช้ทั้งหมด (กรองตาม role, search)
  getAll: (params) => api.get('/users', { params }),
  // ดึงข้อมูลผู้ใช้รายบุคคลตาม ID
  getById: (id) => api.get(`/users/${id}`),
  // สร้างผู้ใช้ใหม่พร้อมอัปโหลดรูปโปรไฟล์
  create: (formData) => api.post('/users', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // แก้ไขข้อมูลผู้ใช้ทั่วไป
  update: (id, data) => api.put(`/users/${id}`, data),
  // แก้ไขข้อมูลผู้ใช้พร้อมอัปโหลดรูปโปรไฟล์ใหม่
  updateWithPhoto: (id, formData) => api.put(`/users/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // ลบผู้ใช้ออกจากระบบ
  delete: (id) => api.delete(`/users/${id}`),
  // รีเซ็ตรหัสผ่านของผู้ใช้
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data)
};

// -------------------------------------------------------
// 3. ระบบจัดการแผงร้านค้า (Stalls / Rental Slots API)
// -------------------------------------------------------
export const stallsAPI = {
  // ดึงรายการแผงค้าทั้งหมด
  getAll: (params) => api.get('/stalls', { params }),
  // ดึงรายละเอียดแผงค้าตาม ID
  getById: (id) => api.get(`/stalls/${id}`),
  // สร้างแผงค้าใหม่
  create: (data) => api.post('/stalls', data),
  // แก้ไขข้อมูลแผงค้า
  update: (id, data) => api.put(`/stalls/${id}`, data),
  // ลบแผงค้า
  delete: (id) => api.delete(`/stalls/${id}`),
  // ดึงสถิติภาพรวมแผงค้าสำหรับแดชบอร์ด
  getDashboard: () => api.get('/stalls/dashboard'),
  // ดึงประวัติการจดมิเตอร์น้ำไฟของแผง
  getMeterReadings: (id) => api.get(`/stalls/${id}/meters`),
  // บันทึกเลขมิเตอร์น้ำไฟของแผง
  recordMeterReading: (id, data) => api.post(`/stalls/${id}/meters`, data)
};

// -------------------------------------------------------
// 4. ระบบจัดการบิลและค่าใช้จ่าย (Bills & Payments API)
// -------------------------------------------------------
export const billsAPI = {
  // ดึงรายการบิลทั้งหมด
  getAll: (params) => api.get('/bills', { params }),
  // ดึงรายละเอียดบิลตาม ID
  getById: (id) => api.get(`/bills/${id}`),
  // สร้างบิลรายเดือนใหม่
  create: (data) => api.post('/bills', data),
  // แก้ไขบิล
  update: (id, data) => api.put(`/bills/${id}`, data),
  // ผู้เช่าอัปโหลดสลิปหลักฐานการชำระเงิน
  uploadPayment: (id, formData) => api.post(`/bills/${id}/payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Admin ตรวจสอบอนุมัติหรือปฏิเสธสลิปการชำระเงิน
  verifyPayment: (paymentId, data) => api.post(`/bills/payment/${paymentId}/verify`, data),
  // ดึงประวัติการชำระเงิน
  getHistory: () => api.get('/bills/history'),
  // จำลองการคำนวณยอดเงินค่าน้ำไฟและค่าปรับ
  calculate: (data) => api.post('/bills/calculate', data),
  // ดึงรายการบิลที่ใกล้ถึงกำหนดชำระ
  getDueBills: () => api.get('/bills/due-soon')
};

// -------------------------------------------------------
// 5. ระบบจัดการสัญญาเช่า (Contracts API)
// -------------------------------------------------------
export const contractsAPI = {
  // ดึงรายการสัญญาเช่าทั้งหมด
  getAll: (params) => api.get('/contracts', { params }),
  // ดึงรายละเอียดสัญญาตาม ID
  getById: (id) => api.get(`/contracts/${id}`),
  // สร้างสัญญาเช่าใหม่พร้อมอัปโหลดไฟล์เอกสารสัญญา
  create: (formData) => api.post('/contracts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // แก้ไขสัญญาเช่า
  update: (id, formData) => api.put(`/contracts/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // ยกเลิกสัญญาเช่าโดยตรง (Admin)
  terminate: (id) => api.post(`/contracts/${id}/terminate`),
  // ผู้เช่าส่งคำขอยกเลิกสัญญาเช่า
  requestTermination: (id, data) => api.post(`/contracts/${id}/request-termination`, data),
  // Admin ปฏิเสธคำขอยกเลิกสัญญา
  rejectTermination: (id) => api.post(`/contracts/${id}/reject-termination`),
  // ดึงรายการคำขอยกเลิกสัญญาทั้งหมด (Admin ดูรายการ)
  getCancellations: () => api.get('/contracts/cancellations')
};

// -------------------------------------------------------
// 6. ระบบแจ้งซ่อมและงานช่าง (Maintenance API)
// -------------------------------------------------------
export const maintenanceAPI = {
  // ดึงรายการแจ้งซ่อมทั้งหมด
  getAll: (params) => api.get('/maintenance', { params }),
  // ดึงรายละเอียดการแจ้งซ่อมตาม ID
  getById: (id) => api.get(`/maintenance/${id}`),
  // ผู้เช่าสร้างคำขอแจ้งซ่อมพร้อมแนบรูปถ่าย
  create: (formData) => api.post('/maintenance', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // แก้ไขคำขอแจ้งซ่อม
  update: (id, formData) => api.put(`/maintenance/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // ลบคำขอแจ้งซ่อม
  delete: (id) => api.delete(`/maintenance/${id}`),
  // Admin มอบหมายงานให้ช่าง
  assignStaff: (id, data) => api.post(`/maintenance/${id}/assign`, data),
  // อัปเดตสถานะงานซ่อม
  updateStatus: (id, data) => api.put(`/maintenance/${id}/status`, data),
  // ช่างอัปโหลดภาพผลงานซ่อมเสร็จสิ้น
  uploadCompletion: (id, formData) => api.post(`/maintenance/${id}/completion`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// -------------------------------------------------------
// 7. ระบบตั้งค่าระบบ (Settings API)
// -------------------------------------------------------
export const settingsAPI = {
  // ดึงการตั้งค่าทั้งหมด
  getAll: () => api.get('/settings'),
  // ดึงอัตราค่าน้ำ ค่าไฟ ค่าดักไขมัน ค่าปรับ
  getUtilityRates: () => api.get('/settings/utility-rates'),
  // อัปเดตอัตราค่าน้ำ ค่าไฟ ค่าดักไขมัน ค่าปรับ
  updateUtilityRates: (data) => api.put('/settings/utility-rates', data),
  // อัปเดตการตั้งค่าทั่วไป
  update: (settings) => api.put('/settings', { settings })
};

// -------------------------------------------------------
// 8. ระบบการแจ้งเตือน (Notifications API)
// -------------------------------------------------------
export const notificationsAPI = {
  // ดึงรายการแจ้งเตือนทั้งหมด
  getAll: () => api.get('/notifications'),
  // ทำเครื่องหมายว่าอ่านแล้ว
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  // ลบการแจ้งเตือน
  delete: (id) => api.delete(`/notifications/${id}`)
};

// -------------------------------------------------------
// 9. ระบบข้อมูลศูนย์อาหาร (Food Courts API)
// -------------------------------------------------------
export const foodCourtsAPI = {
  // ดึงข้อมูลศูนย์อาหารทั้งหมด
  getAll: () => api.get('/food-courts'),
  // อัปเดตรูปภาพแผนผังหรือรูปภาพศูนย์อาหาร
  updateImage: (id, formData) => api.put(`/food-courts/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// -------------------------------------------------------
// 10. ระบบหมวดหมู่ประเภทร้านค้า (Shop Types API)
// -------------------------------------------------------
export const shopTypesAPI = {
  // ดึงรายการประเภทหมวดหมู่อาหาร/ร้านค้าทั้งหมด
  getAll: () => api.get('/shop-types')
};
