import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { useAuthStore, useUIStore } from "../store";
import { maintenanceAPI } from "../api";

const Sidebar = () => {
  const { user } = useAuthStore();
  const {
    sidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    setSidebarCollapsed,
  } = useUIStore();
  const [pendingRepairsCount, setPendingRepairsCount] = useState(0);

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

  const menuItems = {
    TENANT: [
      { to: "/tenant", icon: LayoutDashboard, label: "หน้าหลัก", end: true },
      { to: "/tenant/expenses", icon: Receipt, label: "ค่าใช้จ่าย" },
      { to: "/tenant/contracts", icon: FileText, label: "สัญญาเช่า" },
      { to: "/tenant/upload-bill", icon: Upload, label: "อัปโหลดบิล" },
      { to: "/tenant/payment-history", icon: History, label: "ประวัติชำระ" },
      { to: "/tenant/stall-status", icon: Store, label: "สถานะล็อค" },
      { to: "/tenant/dishware", icon: ShoppingBag, label: "ถ้วยชาม" },
      { to: "/tenant/report-repair", icon: Wrench, label: "แจ้งซ่อม" },
      { to: "/tenant/track-repairs", icon: ClipboardList, label: "ติดตามซ่อม" },
    ],
    ADMIN: [
      { to: "/admin", icon: LayoutDashboard, label: "หน้าแรก", end: true },
      { to: "/admin/tenants", icon: Users, label: "แก้ไขข้อมูลผู้เช่า" },
      { to: "/admin/stalls", icon: Building2, label: "แก้ไขสถานะล็อก" },
      { to: "/admin/meter-recording", icon: Gauge, label: "บันทึกมิเตอร์" },
      { to: "/admin/bills", icon: Receipt, label: "จัดการบิล" },
      { to: "/admin/dishware", icon: ShoppingBag, label: "ถ้วยชามรายวัน" },
      { to: "/admin/reports", icon: FileBarChart, label: "รายงานสรุป" },
      {
        to: "/admin/repairs",
        icon: Wrench,
        label: "งานซ่อม",
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
      { to: "/executive/stalls", icon: Building2, label: "ข้อมูลล็อค" },
      { to: "/executive/tenants", icon: Users, label: "ข้อมูลผู้เช่า" },
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

      {/* Footer - User Info */}
      <div className="p-3 border-t border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
