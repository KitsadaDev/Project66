import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  FileText,
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
  ShoppingBag,
  Bell,
  LogOut,
} from "lucide-react";
import { useAuthStore, useUIStore } from "../store";
import { maintenanceAPI, notificationsAPI, dishwareAPI } from "../api";

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const {
    sidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    setSidebarCollapsed,
    pendingRepairsCount,
    setPendingRepairsCount,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
    pendingDishwareCount,
    setPendingDishwareCount,
  } = useUIStore();

  useEffect(() => {
    if (user?.role === "TENANT") {
      fetchUnreadNotifications();
      // Optional: Refresh count every 5 minutes
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

  useEffect(() => {
    if (
      user?.role === "ADMIN" ||
      user?.role === "EXECUTIVE" ||
      user?.role === "MAINTENANCE"
    ) {
      fetchPendingRepairs();
    }
    if (user?.role === "ADMIN" || user?.role === "EXECUTIVE") {
      fetchPendingDishware();
    }
  }, [user]);

  const fetchPendingDishware = async () => {
    try {
      const response = await dishwareAPI.getAll({ status: "PENDING" });
      const items = response.data.data || [];
      const pendingCount = items.filter((d) => d.status === "PENDING").length;
      setPendingDishwareCount(pendingCount);
    } catch (error) {
      console.error("Failed to fetch pending dishware count:", error);
    }
  };

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

  const menuItems = {
    TENANT: [
      { to: "/tenant", icon: LayoutDashboard, label: "หน้าหลัก", end: true },
      { to: "/tenant/expenses", icon: Receipt, label: "ค่าใช้จ่าย" },
      { to: "/tenant/contracts", icon: FileText, label: "สัญญาเช่า" },
      { to: "/tenant/payment-history", icon: History, label: "ประวัติชำระ" },
      { to: "/tenant/stall-status", icon: Store, label: "สถานะล็อค" },
      { to: "/tenant/dishware", icon: ShoppingBag, label: "ถ้วยชาม" },
      { to: "/tenant/report-repair", icon: Wrench, label: "แจ้งซ่อม" },
      { to: "/tenant/track-repairs", icon: ClipboardList, label: "ติดตามซ่อม" },
      {
        to: "/tenant/notifications",
        icon: Bell,
        label: "การแจ้งเตือน",
        badge: unreadNotificationsCount,
      },
    ],
    ADMIN: [
      { to: "/admin", icon: LayoutDashboard, label: "หน้าแรก", end: true },
      { to: "/admin/tenants", icon: Users, label: "ข้อมูลผู้เช่า" },
      { to: "/admin/contracts", icon: FileText, label: "ข้อมูลสัญญาเช่า" },
      { to: "/admin/stalls", icon: Building2, label: "ข้อมูลสถานะแผงค้า" },
      { to: "/admin/meter-recording", icon: Gauge, label: "บันทึกมิเตอร์" },
      { to: "/admin/bills", icon: Receipt, label: "ข้อมูลการชำระเงิน" },
      {
        to: "/admin/dishware",
        icon: ShoppingBag,
        label: "ข้อมูลภาชนะ",
        badge: pendingDishwareCount,
      },
      { to: "/admin/reports", icon: FileBarChart, label: "รายงานสรุป" },
      {
        to: "/admin/repairs",
        icon: Wrench,
        label: "ข้อมูลงานซ่อม",
        badge: pendingRepairsCount,
      },
      { to: "/admin/settings", icon: Settings, label: "ตั้งค่าระบบ" },
    ],
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

  const items = menuItems[user?.role] || [];

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen bg-purple-50 border-r border-purple-100 flex flex-col z-50 transition-all duration-300 shadow-xl md:shadow-none
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} 
        ${sidebarCollapsed ? "md:w-16" : "md:w-56"}
        w-64`}
      >
        {/* Header */}
        <div className="p-4 border-b border-purple-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-500 rounded-xl flex items-center justify-center text-white shrink-0">
            <Building2 size={20} />
          </div>
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-gray-800 whitespace-nowrap">
                Food Court
              </h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          )}
        </div>

        {/* Navigation */}
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

        {/* Footer - Logout Only */}
        <div className="p-3 border-t border-purple-100 flex flex-col gap-2">
          <button
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

      {/* Custom Logout Modal */}
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
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
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
    </>
  );
};

export default Sidebar;
