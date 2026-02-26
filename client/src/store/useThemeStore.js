import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light', // 'light' or 'dark'
      
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        updateDocumentClass(newTheme);
        return { theme: newTheme };
      }),
      
      setTheme: (theme) => {
        updateDocumentClass(theme);
        set({ theme });
      },
      
      initializeTheme: () => {
        // Check localStorage or system preference if needed (handled by persist usually, but we need to sync class)
        // But persist rehydrates asynchronously sometimes or we need to check initial value.
        // We can use onRehydrateStorage or just rely on the component using it to sync.
        // Or better: manual init.
      }
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          updateDocumentClass(state.theme);
        }
      }
    }
  )
);

// Helper to toggle class on html tag
const updateDocumentClass = (theme) => {
  const root = window.document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export default useThemeStore;
