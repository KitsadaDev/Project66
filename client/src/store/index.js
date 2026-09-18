// ======================================================
// store/index.js - State Management ส่วนกลางด้วย Zustand
// รับผิดชอบ:
//   - useAuthStore: จัดการสถานะการเข้าสู่ระบบ (User, Token, Login Status) พร้อมบันทึกลง LocalStorage (Persist)
//   - useUIStore: จัดการสถานะหน้าจอ UI (Sidebar, เมนูมือถือ, Modal, ตัวเลขแจ้งเตือนที่ยังไม่ได้อ่าน)
// ======================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// -------------------------------------------------------
// Store: useAuthStore
// หน้าที่: จัดเก็บและจัดการสถานะการล็อกอินของผู้ใช้
//   - user: ข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
//   - token: JWT Token สำหรับใช้ส่งคู่กับ API
//   - isAuthenticated: สถานะ boolean ว่าล็อกอินอยู่หรือไม่
//   - isLoading: สถานะว่ากำลังโหลดข้อมูลผู้ใช้อยู่หรือไม่
// -------------------------------------------------------
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      
      // บันทึกข้อมูลเมื่อล็อกอินสำเร็จ
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true, isLoading: false });
      },
      
      // ล้างข้อมูลเมื่อออกจากระบบ (Logout)
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },
      
      // อัปเดตข้อมูลผู้ใช้บางส่วน (เช่น เมื่อเปลี่ยนชื่อหรือรูปโปรไฟล์)
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },
      
      // ตั้งค่าสถานะ Loading
      setLoading: (loading) => set({ isLoading: loading }),
      
      // ฟังก์ชันเริ่มต้นทำงานเมื่อโหลดเว็บ: ตรวจสอบ token จาก localStorage
      initialize: () => {
        const token = localStorage.getItem('token');
        if (token) {
          set({ token, isLoading: true });
        } else {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage', // ชื่อ key ใน localStorage
      // เลือกเก็บเฉพาะฟิลด์ที่จำเป็น ไม่เก็บ loading state
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated })
    }
  )
);

// -------------------------------------------------------
// Store: useUIStore
// หน้าที่: จัดการสถานะการแสดงผลของหน้าจอ (UI State) ทั่วทั้งระบบ
// -------------------------------------------------------
export const useUIStore = create((set) => ({
  sidebarCollapsed: false, // สถานะย่อ/ขยาย Sidebar บนจอเดสก์ท็อป
  mobileMenuOpen: false,   // สถานะเปิด/ปิดเมนู Sidebar บนจอมือถือ
  modalOpen: null,         // ID หรือชื่อของ Modal ที่กำลังเปิดอยู่ (null = ปิด)
  
  // สลับสถานะย่อ/ขยาย Sidebar
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  // สลับสถานะเมนูบนจอมือถือ
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  
  // เปิด/ปิด Modal
  openModal: (modalId) => set({ modalOpen: modalId }),
  closeModal: () => set({ modalOpen: null }),

  // ตัวนับงานแจ้งซ่อมที่รอดำเนินการ (สำหรับ Badge แจ้งเตือนของ Admin)
  pendingRepairsCount: 0,
  // ตัวนับแจ้งเตือนที่ยังไม่ได้อ่าน
  unreadNotificationsCount: 0,

  setPendingRepairsCount: (count) => set({ pendingRepairsCount: count }),
  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),

  // ลดจำนวนงานแจ้งซ่อมค้างลง 1 เมื่อทำงานเสร็จ (ไม่ให้ต่ำกว่า 0)
  decrementPendingRepairs: () => set((state) => ({ pendingRepairsCount: Math.max(0, state.pendingRepairsCount - 1) })),
}));
