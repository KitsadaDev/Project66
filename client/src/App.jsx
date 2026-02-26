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
import Register from "./pages/auth/Register";
import Home from "./pages/Home";

// Tenant Pages
import TenantDashboard from "./pages/tenant/Dashboard";
import Expenses from "./pages/tenant/Expenses";
import Contracts from "./pages/tenant/Contracts";
import UploadBill from "./pages/tenant/UploadBill";
import PaymentHistory from "./pages/tenant/PaymentHistory";
import StallStatus from "./pages/tenant/StallStatus";
import ReportRepair from "./pages/tenant/ReportRepair";
import TrackRepairs from "./pages/tenant/TrackRepairs";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import Tenants from "./pages/admin/Tenants";
import MeterRecording from "./pages/admin/MeterRecording";
import Stalls from "./pages/admin/Stalls";
import AdminRepairs from "./pages/admin/Repairs";
import AdminSettings from "./pages/admin/Settings";
import AdminBills from "./pages/admin/Bills";
import AdminReports from "./pages/admin/Reports";

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

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
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

function App() {
  const { setAuth, setLoading, logout, token } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setAuth(response.data.data, token);
        } catch (error) {
          console.error("Auth init error:", error);
          logout(); // clear invalid/expired token ออกจาก store
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
        <Route path="/register" element={<Register />} />

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
          <Route path="upload-bill" element={<UploadBill />} />
          <Route path="payment-history" element={<PaymentHistory />} />
          <Route path="stall-status" element={<StallStatus />} />
          <Route path="report-repair" element={<ReportRepair />} />
          <Route path="track-repairs" element={<TrackRepairs />} />
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
          <Route path="meter-recording" element={<MeterRecording />} />
          <Route path="stalls" element={<Stalls />} />
          <Route path="bills" element={<AdminBills />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="repairs" element={<AdminRepairs />} />
          <Route path="settings" element={<AdminSettings />} />
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
