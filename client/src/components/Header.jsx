import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuthStore, useUIStore } from "../store";

const Header = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const { toggleMobileMenu } = useUIStore();

  const handleLogout = () => {
    if (window.confirm("ต้องการออกจากระบบหรือไม่?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm transition-colors duration-300">
      <div className="bg-linear-to-r from-purple-200 via-purple-100 to-purple-200 px-4 py-3 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 -ml-2 text-purple-700 hover:bg-purple-200/50 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>

          <img
            src="/bru-logo.png"
            alt="BRU Logo"
            className="w-10 h-10 md:w-14 md:h-14 object-contain"
          />
          <div>
            <h1 className="text-sm md:text-base font-bold text-gray-800">
              มหาวิทยาลัย
            </h1>
            <h1 className="text-sm md:text-base font-semibold text-gray-800">
              ราชภัฏบุรีรัมย์
            </h1>
            <p className="text-xs text-gray-600 hidden md:block">
              Buriram Rajabhat University
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <span className="hidden md:inline text-sm text-gray-700">
                สวัสดี, คุณ{user.first_name || user.username}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-full font-semibold text-sm transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
      <div className="h-2 bg-linear-to-r from-purple-500 via-purple-400 to-purple-500"></div>
    </header>
  );
};

export default Header;
