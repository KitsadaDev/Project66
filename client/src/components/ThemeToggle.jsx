// ======================================================
// components/ThemeToggle.jsx - ปุ่มสลับธีม สว่าง/มืด (Theme Toggle Button)
// รับผิดชอบ: แสดงไอคอนพระอาทิตย์/พระจันทร์ และเรียกใช้ toggleTheme จาก useThemeStore
// ======================================================

import { Moon, Sun } from "lucide-react";
import useThemeStore from "../store/useThemeStore";

const ThemeToggle = () => {
  // ดึงสถานะธีมและฟังก์ชันสลับธีมจาก Theme Store
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {/* สลับไอคอนตามสถานะธีมปัจจุบัน */}
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

export default ThemeToggle;
