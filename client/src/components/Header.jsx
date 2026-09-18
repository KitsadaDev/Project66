// ======================================================
// components/Header.jsx - คอมโพเนนต์แถบส่วนหัวด้านบน (Top Header Bar)
// รับผิดชอบ:
//   - แสดงชื่อมหาวิทยาลัยราชภัฏบุรีรัมย์
//   - ปุ่มแฮมเบอร์เกอร์ (Menu) สำหรับเปิด/ปิดเมนู Sidebar บนจอมือถือ
//   - แสดงชื่อทักทายผู้ใช้งานที่เข้าสู่ระบบ (สวัสดี, คุณ...) หรือปุ่ม Login
// ======================================================

import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuthStore, useUIStore } from "../store";

const Header = () => {
  // ดึงข้อมูลสถานะผู้ใช้จาก Auth Store
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // ดึงฟังก์ชันสลับเมนูบนมือถือจาก UI Store
  const { toggleMobileMenu } = useUIStore();

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm transition-colors duration-300">
      <div className="bg-linear-to-r from-purple-200 via-purple-100 to-purple-200 px-4 py-3 flex justify-between items-center transition-all duration-300">
        {/* ส่วนซ้าย: ปุ่มเมนูมือถือ และชื่อมหาวิทยาลัย */}
        <div className="flex items-center gap-3">
          {/* ปุ่มเปิดปิดเมนูสำหรับหน้าจอมือถือ (แสดงเฉพาะหน้าจอต่ำกว่า md) */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 -ml-2 text-purple-700 hover:bg-purple-200/50 rounded-lg transition-colors cursor-pointer"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">
              มหาวิทยาลัย
            </h1>
            <h1 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">
              ราชภัฏบุรีรัมย์
            </h1>
            <p className="text-xs md:text-sm text-gray-600 hidden md:block mt-0.5">
              Buriram Rajabhat University
            </p>
          </div>
        </div>

        {/* ส่วนขวา: ข้อความต้อนรับผู้ใช้งาน หรือปุ่มเข้าสู่ระบบ */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <span className="hidden md:inline text-sm text-gray-700">
              สวัสดี, คุณ{user.first_name || user.username}
            </span>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-full font-semibold text-sm transition-colors cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </div>
      {/* เส้นแถบสีม่วงตกแต่งด้านล่าง Header */}
      <div className="h-2 bg-linear-to-r from-purple-500 via-purple-400 to-purple-500"></div>
    </header>
  );
};

export default Header;
