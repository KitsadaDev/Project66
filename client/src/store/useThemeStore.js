// ======================================================
// store/useThemeStore.js - Store จัดการธีม (Light / Dark Mode)
// รับผิดชอบ: สลับธีมหน้าจอระหว่างโหมดสว่าง (Light) และโหมดมืด (Dark) พร้อมผูกกับ class ใน <html>
// ======================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// -------------------------------------------------------
// Helper ฟังก์ชัน: ปรับปรุง class บนแท็ก <html> ของ Document
// -------------------------------------------------------
const updateDocumentClass = (theme) => {
  const root = window.document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light', // ค่าเริ่มต้น: 'light' หรือ 'dark'
      
      // สลับธีมไปมาระหว่าง light และ dark
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        updateDocumentClass(newTheme);
        return { theme: newTheme };
      }),
      
      // กำหนดธีมตามค่าที่ระบุ
      setTheme: (theme) => {
        updateDocumentClass(theme);
        set({ theme });
      },
      
      initializeTheme: () => {
        // ฟังก์ชันเสริมสำหรับ Sync ค่าธีมเริ่มต้น
      }
    }),
    {
      name: 'theme-storage',
      // เมื่อโหลดค่าจาก LocalStorage กลับเข้ามา ให้ Sync class ไปยังแท็ก <html> ทันที
      onRehydrateStorage: () => (state) => {
        if (state) {
          updateDocumentClass(state.theme);
        }
      }
    }
  )
);

export default useThemeStore;
