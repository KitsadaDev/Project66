// ======================================================
// components/Sidebar.jsx - แถบเมนูด้านข้างของระบบ (Sidebar Navigation)
// รับผิดชอบ:
//   - แสดงเมนูนำทางตามบทบาทของผู้ใช้ (Role-based Navigation): TENANT, ADMIN, MAINTENANCE, EXECUTIVE
//   - แสดงตัวเลขแจ้งเตือน (Badges): จำนวนแจ้งเตือนที่ยังไม่ได้อ่านของผู้เช่า และจำนวนงานแจ้งซ่อมค้างของช่าง/Admin
//   - ระบบ Modal ยืนยันการออกจากระบบ (Logout Modal)
//   - ระบบ Modal เปลี่ยนรหัสผ่านส่วนตัว (Change Password Modal)
//   - รองรับการย่อ/ขยาย (Collapsed) บนเดสก์ท็อป และเลื่อนสไลด์บนจอมือถือ
// ======================================================

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  FilePlus,
  Store,
  Wrench,
  Upload,
  History,
  ClipboardList,
  Users,
  Building2,
  Gauge,
  Settings,
  FileBarChart,
  Bell,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Ban,
} from "lucide-react";
import { useAuthStore, useUIStore } from "../store";
import { maintenanceAPI, notificationsAPI, authAPI } from "../api";
import { toast } from "react-toastify";

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // State สำหรับ Modal ยืนยันออกจากระบบ
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ฟังก์ชันดำเนินการออกจากระบบ และนำทางกลับไปหน้า Login
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // -------------------------------------------------------
  // State สำหรับ Modal เปลี่ยนรหัสผ่าน
  // -------------------------------------------------------
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ฟังก์ชันส่งคำขอเปลี่ยนรหัสผ่าน
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSubmitting(true);
    try {
      await authAPI.updateProfile({
        currentPassword,
        newPassword,
      });
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ!");
      setShowChangePasswordModal(false);
      // ล้างค่าในฟอร์ม
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
    } finally {
      setSubmitting(false);
    }
  };

  // ดึงตัวแปรและฟังก์ชันจัดการ UI จาก useUIStore
  const {
    sidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    pendingRepairsCount,
    setPendingRepairsCount,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
  } = useUIStore();

  // -------------------------------------------------------
  // ดึงจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน (เฉพาะผู้เช่า TENANT)
  // -------------------------------------------------------
  useEffect(() => {
    if (user?.role === "TENANT") {
      fetchUnreadNotifications();
      // ดึงข้อมูลซ้ำทุกๆ 5 นาที
      const interval = setInterval(fetchUnreadNotifications, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      const notifications = response.data.data || [];
      const unreadCount = notifications.filter(
        (n) => n.status === "UNREAD",
      ).length;
      setUnreadNotificationsCount(unreadCount);
    } catch (error) {
      console.error("Failed to fetch unread notifications count:", error);
    }
  };

  // -------------------------------------------------------
  // ดึงจำนวนงานแจ้งซ่อมที่รอค้างอยู่ (สำหรับ ADMIN, EXECUTIVE, MAINTENANCE)
  // -------------------------------------------------------
  useEffect(() => {
    if (
      user?.role === "ADMIN" ||
      user?.role === "EXECUTIVE" ||
      user?.role === "MAINTENANCE"
    ) {
      fetchPendingRepairs();
    }
  }, [user]);

  const fetchPendingRepairs = async () => {
    try {
      const response = await maintenanceAPI.getAll();
      const repairs = response.data.data || [];
      const pendingCount = repairs.filter((r) => r.status === "PENDING").length;
      setPendingRepairsCount(pendingCount);
    } catch (error) {
      console.error("Failed to fetch pending repairs count:", error);
    }
  };

  // -------------------------------------------------------
  // กำหนดรายการเมนูแยกตามบทบาท (Role-based Navigation Items)
  // -------------------------------------------------------
  const menuItems = {
    // เมนูสำหรับผู้เช่า (TENANT)
    TENANT: [
      { to: "/tenant", icon: LayoutDashboard, label: "หน้าหลัก", end: true },
      { to: "/tenant/expenses", icon: Receipt, label: "ค่าใช้จ่าย" },
      { to: "/tenant/contracts", icon: FileText, label: "สัญญาเช่า" },
      { to: "/tenant/cancel-contract", icon: Ban, label: "แบบฟอร์มยกเลิกสัญญา" },
      { to: "/tenant/payment-history", icon: History, label: "ประวัติชำระ" },
      { to: "/tenant/stall-status", icon: Store, label: "สถานะล็อค" },
      { to: "/tenant/report-repair", icon: Wrench, label: "แจ้งซ่อม" },
      { to: "/tenant/track-repairs", icon: ClipboardList, label: "ติดตามซ่อม" },
      {
        to: "/tenant/notifications",
        icon: Bell,
        label: "การแจ้งเตือน",
        badge: unreadNotificationsCount,
      },
    ],
    // เมนูสำหรับผู้ดูแลระบบ (ADMIN)
    ADMIN: [
      { to: "/admin", icon: LayoutDashboard, label: "หน้าแรก", end: true },
      { to: "/admin/tenants", icon: Users, label: "ข้อมูลผู้เช่า" },
      { to: "/admin/mechanics", icon: Wrench, label: "ข้อมูลเจ้าหน้าที่ฝ่ายซ่อม" },
      { to: "/admin/contracts", icon: FileText, label: "ข้อมูลสัญญาเช่า" },
      { to: "/admin/create-contract", icon: FilePlus, label: "สร้างสัญญา" },
      { to: "/admin/cancel-contracts", icon: Ban, label: "คำร้องขอยกเลิกสัญญา" },
      { to: "/admin/stalls", icon: Building2, label: "ข้อมูลสถานะแผงค้า" },
      { to: "/admin/meter-recording", icon: Gauge, label: "บันทึกมิเตอร์" },
      { to: "/admin/bills", icon: Receipt, label: "ออกบิลและจัดการบิล" },
      { to: "/admin/reports", icon: FileBarChart, label: "รายงานสรุป" },
      {
        to: "/admin/repairs",
        icon: Wrench,
        label: "คำร้องขอซ่อม",
        badge: pendingRepairsCount,
      },
      { to: "/admin/settings", icon: Settings, label: "ตั้งค่าระบบ" },
    ],
    // เมนูสำหรับช่างซ่อมบำรุง (MAINTENANCE)
    MAINTENANCE: [
      {
        to: "/maintenance",
        icon: LayoutDashboard,
        label: "หน้าหลัก",
        end: true,
      },
      {
        to: "/maintenance/jobs",
        icon: ClipboardList,
        label: "งานซ่อมทั้งหมด",
        badge: pendingRepairsCount,
      },
    ],
    // เมนูสำหรับผู้บริหาร (EXECUTIVE - ดูข้อมูลได้อย่างเดียว)
    EXECUTIVE: [
      { to: "/executive", icon: LayoutDashboard, label: "ภาพรวม", end: true },
      { to: "/executive/stalls", icon: Building2, label: "ข้อมูลแผงค้า" },
      { to: "/executive/tenants", icon: Users, label: "ข้อมูลผู้เช่า" },
      { to: "/executive/contracts", icon: FileText, label: "ข้อมูลสัญญาเช่า" },
      { to: "/executive/bills", icon: Receipt, label: "ข้อมูลบิล" },
      {
        to: "/executive/repairs",
        icon: Wrench,
        label: "ข้อมูลงานซ่อม",
        badge: pendingRepairsCount,
      },
    ],
  };

  // เลือกรายการเมนูตาม role ของ user ปัจจุบัน
  const items = menuItems[user?.role] || [];

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen bg-purple-50 border-r border-purple-100 flex flex-col z-50 transition-all duration-300 shadow-xl md:shadow-none
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} 
        ${sidebarCollapsed ? "md:w-16" : "md:w-56"}
        w-64`}
      >
        {/* ส่วนหัวของ Sidebar (โลโก้ BRU และชื่อระบบ) */}
        <div className="p-4 border-b border-purple-100 flex items-center gap-3">
          <img
            src="/bru-logo.png"
            alt="BRU Logo"
            className="w-9 h-9 object-contain shrink-0"
          />
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-gray-800 whitespace-nowrap">
                Food Court
              </h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          )}
        </div>

        {/* รายการลิงก์เมนูนำทาง (Navigation Links) */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-200"
                    : "text-gray-600 hover:bg-purple-100 hover:text-purple-700"
                }`
              }
              title={sidebarCollapsed && !mobileMenuOpen ? item.label : ""}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="shrink-0" />
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </div>
              {/* ตัวเลข Badge แจ้งเตือน */}
              {item.badge > 0 && (!sidebarCollapsed || mobileMenuOpen) && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {item.badge > 0 && sidebarCollapsed && !mobileMenuOpen && (
                <span className="absolute right-2 top-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ส่วนท้ายของ Sidebar - ปุ่มเปลี่ยนรหัสผ่าน และปุ่มออกจากระบบ */}
        <div className="p-3 border-t border-purple-100 flex flex-col gap-2">
          {/* ปุ่มเปิด Modal เปลี่ยนรหัสผ่าน */}
          <button
            type="button"
            onClick={() => setShowChangePasswordModal(true)}
            className={`flex items-center gap-3 cursor-pointer ${
              !sidebarCollapsed || mobileMenuOpen
                ? "justify-start px-3 py-2.5"
                : "justify-center p-2"
            } rounded-xl transition-all text-purple-600 hover:bg-purple-50 hover:text-purple-700 w-full`}
            title="เปลี่ยนรหัสผ่าน"
          >
            <Lock size={20} className="shrink-0" />
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <span className="text-sm font-medium">เปลี่ยนรหัสผ่าน</span>
            )}
          </button>

          {/* ปุ่มเปิด Modal ยืนยันออกจากระบบ */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className={`flex items-center gap-3 cursor-pointer ${
              !sidebarCollapsed || mobileMenuOpen
                ? "justify-start px-3 py-2.5"
                : "justify-center p-2"
            } rounded-xl transition-all text-red-500 hover:bg-red-50 hover:text-red-700 w-full`}
            title="ออกจากระบบ"
          >
            <LogOut size={20} className="shrink-0" />
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <span className="text-sm font-medium">ออกจากระบบ</span>
            )}
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------- */}
      {/* Modal ยืนยันการออกจากระบบ (Logout Confirmation Modal) */}
      {/* ------------------------------------------------------- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-sm p-6 transform transition-all duration-300 scale-100 relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <LogOut size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                ยืนยันการออกจากระบบ
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบในขณะนี้?
              </p>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutModal(false);
                    handleLogout();
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-200 transition-colors cursor-pointer"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* Modal เปลี่ยนรหัสผ่าน (Change Password Modal) */}
      {/* ------------------------------------------------------- */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all duration-300 scale-100 relative border border-gray-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-3">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                เปลี่ยนรหัสผ่าน
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                กรุณาป้อนรหัสผ่านปัจจุบันและรหัสผ่านใหม่เพื่อทำการเปลี่ยนแปลง
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสผ่านปัจจุบัน *</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                    placeholder="ป้อนรหัสผ่านปัจจุบัน"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสผ่านใหม่ *</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    minLength={6}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ยืนยันรหัสผ่านใหม่ *</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={6}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                    placeholder="ป้อนรหัสผ่านใหม่อีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex w-full gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 transition-colors cursor-pointer text-sm disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
