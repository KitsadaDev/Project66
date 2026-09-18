// ======================================================
// axios.js - ตัวตั้งค่า Axios Client สำหรับเรียกใช้งาน API
// รับผิดชอบ:
//   - กำหนด baseURL ของ API เป็น '/api'
//   - Request Interceptor: แนบ JWT Token จาก localStorage ใน Header (Authorization: Bearer <token>)
//   - Response Interceptor: ดักจับ Error 401 (Unauthorized/Token หมดอายุ) ล้างข้อมูล Session และพาไปหน้า Login
// ======================================================

import axios from 'axios';

// สร้างอินสแตนซ์ของ axios พร้อมกำหนด header เริ่มต้น
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// -------------------------------------------------------
// Request Interceptor: ทำงานก่อนที่คำขอ (Request) จะถูกส่งไปยัง Server
// หน้าที่: ตรวจสอบ token ใน localStorage และแนบเข้าไปใน Authorization Header
// -------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------
// Response Interceptor: ทำงานทันทีเมื่อได้รับคำตอบ (Response) กลับมาจาก Server
// หน้าที่: ดักจับกรณีที่ Token หมดอายุ หรือไม่ได้รับอนุญาต (HTTP 401)
//         จะทำการเคลียร์ข้อมูลใน LocalStorage และ Redirect ไปยังหน้า /login
// -------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    // หากได้รับ 401 และไม่ใช่กรณีที่พยายามล็อกอินซ้ำที่ /auth/login
    if (error.response?.status === 401 && !originalRequest.url.includes('/auth/login')) {
      // ลบ Token และข้อมูลผู้ใช้ออกจาก LocalStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // นำทางผู้ใช้กลับไปหน้าเข้าสู่ระบบ
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
