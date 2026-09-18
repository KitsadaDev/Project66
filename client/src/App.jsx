import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect } from "react";
import { useAuthStore } from "./store";
import { authAPI } from "./api";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout";

// Auth Pages
import Login from "./pages/auth/Login";
import Home from "./pages/Home";

// Tenant Pages
import TenantDashboard from "./pages/tenant/Dashboard";
import Expenses from "./pages/tenant/Expenses";
import Contracts from "./pages/tenant/Contracts";
import PaymentHistory from "./pages/tenant/PaymentHistory";
import StallStatus from "./pages/tenant/StallStatus";
import ReportRepair from "./pages/tenant/ReportRepair";
import TrackRepairs from "./pages/tenant/TrackRepairs";
import Notifications from "./pages/tenant/Notifications";
import UploadBill from "./pages/tenant/UploadBill";
import CancelContract from "./pages/tenant/CancelContract";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import Tenants from "./pages/admin/Tenants";
import AdminMechanics from "./pages/admin/Mechanics";
import MeterRecording from "./pages/admin/MeterRecording";
import Stalls from "./pages/admin/Stalls";
import AdminRepairs from "./pages/admin/Repairs";
import AdminSettings from "./pages/admin/Settings";
import AdminBills from "./pages/admin/Bills";
import AdminReports from "./pages/admin/Reports";
import AdminContracts from "./pages/admin/Contracts";
import CreateContract from "./pages/admin/CreateContract";
import AdminCancelContracts from "./pages/admin/CancelContracts";

// Maintenance Pages
import MaintenanceDashboard from "./pages/maintenance/Dashboard";
import Jobs from "./pages/maintenance/Jobs";
import JobDetail from "./pages/maintenance/JobDetail";

// Executive Pages
import ExecutiveDashboard from "./pages/executive/Dashboard";
import ExecutiveStalls from "./pages/executive/Stalls";
import ExecutiveTenants from "./pages/executive/Tenants";
import ExecutiveBills from "./pages/executive/Bills";
import ExecutiveRepairs from "./pages/executive/Repairs";

/**
 * คอมโพเนนต์ป้องกันการเข้าถึงหน้าเว็บ (Protected Route Guard)
 * - ตรวจสอบว่าผู้ใช้ผ่านการเข้าสู่ระบบแล้วหรือไม่ (isAuthenticated)
 * - ตรวจสอบว่าบทบาทของผู้ใช้ (user.role) มีสิทธิ์เข้าถึงหน้านี้หรือไม่ (allowedRoles)
 * - หากยังไม่เข้าสู่ระบบ จะ Redirect ไปยังหน้า /login
 * - หากสิทธิ์ไม่ถูกต้อง จะ Redirect ไปยังหน้า Dashboard ที่ตรงกับบทบาทของผู้ใช้
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  // แสดงหน้าโหลดขณะกำลังตรวจสอบสถานะการเข้าสู่ระบบ
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  // หากไม่มีการเข้าสู่ระบบ ให้นำทางไปยังหน้า Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // หากบทบาทไม่ตรงกับหน้าที่อนุญาต ให้นำทางไปยังหน้า Dashboard ของบทบาทตนเอง
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const dashboardRoutes = {
      ADMIN: "/admin",
      TENANT: "/tenant",
      MAINTENANCE: "/maintenance",
      EXECUTIVE: "/executive",
    };
    return <Navigate to={dashboardRoutes[user?.role] || "/login"} replace />;
  }

  return children;
};

/**
 * คอมโพเนนต์หลักของแอปพลิเคชัน (Root Application Component)
 * - ตรวจสอบ Token ที่บันทึกไว้ใน LocalStorage เมื่อเริ่มต้นแอป
 * - ดึงข้อมูลโปรไฟล์ผู้ใช้ล่าสุดเพื่อยืนยันความถูกต้องของ Token
 * - กำหนดการกำหนดเส้นทาง (Routing) ของทั้ง 4 บทบาท: Tenant, Admin, Maintenance, Executive
 * - ติดตั้ง ToastContainer สำหรับแสดงการแจ้งเตือน Pop-up ทั่วทั้งระบบ
 */
function App() {
  const { setAuth, setLoading, logout, token } = useAuthStore();

  // ตรวจสอบความถูกต้องของ Token เมื่อแอปพลิเคชันเริ่มต้นทำงาน
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // ยืนยัน Token กับเซิร์ฟเวอร์
          const response = await authAPI.getProfile();
          setAuth(response.data.data, token);
        } catch (error) {
          console.error("Auth init error:", error);
          // หาก Token หมดอายุหรือไม่ถูกต้อง ให้ล้างออกจาก Store
          logout();
        }
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Tenant Routes */}
        <Route
          path="/tenant"
          element={
            <ProtectedRoute allowedRoles={["TENANT"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TenantDashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="cancel-contract" element={<CancelContract />} />
          <Route path="payment-history" element={<PaymentHistory />} />
          <Route path="stall-status" element={<StallStatus />} />
          <Route path="report-repair" element={<ReportRepair />} />
          <Route path="track-repairs" element={<TrackRepairs />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="upload-bill" element={<UploadBill />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<Tenants />} />
          <Route path="mechanics" element={<AdminMechanics />} />
          <Route path="meter-recording" element={<MeterRecording />} />
          <Route path="stalls" element={<Stalls />} />
          <Route path="bills" element={<AdminBills />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="repairs" element={<AdminRepairs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="contracts" element={<AdminContracts />} />
          <Route path="create-contract" element={<CreateContract />} />
          <Route path="cancel-contracts" element={<AdminCancelContracts />} />
        </Route>

        {/* Maintenance Routes */}
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute allowedRoles={["MAINTENANCE"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MaintenanceDashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
        </Route>

        {/* Executive Routes */}
        <Route
          path="/executive"
          element={
            <ProtectedRoute allowedRoles={["EXECUTIVE"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ExecutiveDashboard />} />
          <Route path="stalls" element={<ExecutiveStalls />} />
          <Route path="tenants" element={<ExecutiveTenants />} />
          <Route path="bills" element={<ExecutiveBills />} />
          <Route path="repairs" element={<ExecutiveRepairs />} />
          <Route path="contracts" element={<AdminContracts />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </BrowserRouter>
  );
}

export default App;
