import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useUIStore, useAuthStore } from "../store";
import { authAPI } from "../api";
import { toast } from "react-toastify";
import { Lock, Eye, EyeOff, LogOut } from "lucide-react";

const DashboardLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { user, updateUser, logout } = useAuthStore();

  // Password change modal state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordSubmit = async (e) => {
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
      updateUser({ must_change_password: false });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 transition-colors duration-300 relative">
      {/* Forced Change Password Modal */}
      {user?.must_change_password && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-3">
                <Lock size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">เปลี่ยนรหัสผ่านเพื่อเริ่มต้นใช้งาน</h2>
              <p className="text-gray-500 text-xs mt-2 px-4">
                เนื่องจากเป็นการเข้าสู่ระบบครั้งแรก หรือรหัสผ่านของคุณถูกตั้งค่าใหม่โดยผู้ดูแลระบบ 
                กรุณาตั้งรหัสผ่านใหม่ส่วนตัวเพื่อความปลอดภัย
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
                </button>
              </div>

              <div className="pt-1 text-center border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center justify-center gap-1 mx-auto mt-3 bg-transparent border-0 cursor-pointer"
                >
                  <LogOut size={14} />
                  ออกจากระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar />

      <div
        className={`flex-1 transition-all duration-300 w-full ${
          sidebarCollapsed ? "md:ml-16" : "md:ml-56"
        }`}
      >
        <Header />
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
