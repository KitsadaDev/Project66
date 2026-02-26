import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useUIStore } from "../store";

const DashboardLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  return (
    <div className="flex min-h-screen bg-gray-50 transition-colors duration-300 relative">
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
