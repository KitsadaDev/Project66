// ======================================================
// components/ImageModal.jsx - คอมโพเนนต์แสดงรูปภาพขนาดใหญ่ (LightBox / Full-Screen Image Modal)
// รับผิดชอบ:
//   - แสดงรูปภาพขนาดเต็มบนพื้นหลังมืดแบบโปร่งแสง (Backdrop Blur)
//   - รองรับการปิดด้วยการกดปุ่ม Esc บนคีย์บอร์ด หรือคลิกที่พื้นหลัง
//   - ล็อกการเลื่อนหน้าจอ (overflow: hidden) ขณะเปิด Modal
// ======================================================

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * คอมโพเนนต์: ImageModal
 * @param {boolean} isOpen - สถานะเปิด/ปิด Modal
 * @param {string} src - URL ของรูปภาพที่จะแสดง
 * @param {function} onClose - ฟังก์ชันเรียกกลับเมื่อต้องการปิด Modal
 */
const ImageModal = ({ isOpen, src, onClose }) => {
  // ดักจับการกดปุ่ม Escape และจัดการล็อก scroll ของ body
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // ปิดการเลื่อนหน้าจอพื้นหลัง
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset"; // คืนค่าการเลื่อนหน้าจอ
    };
  }, [isOpen, onClose]);

  // หากไม่ได้เปิด หรือไม่มี URL รูปภาพ ไม่ต้อง Render
  if (!isOpen || !src) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-out"
      onClick={onClose}
    >
      {/* ปุ่มกากบาทปิด Modal (มุมขวาบน) */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all cursor-pointer z-50 shadow-md"
      >
        <X size={28} />
      </button>

      {/* กรอบแสดงรูปภาพ (คลิกที่ตัวรูปจะไม่ปิด Modal ด้วย stopPropagation) */}
      <div
        className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Full Size View"
          className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
        />
      </div>
    </div>
  );
};

export default ImageModal;
