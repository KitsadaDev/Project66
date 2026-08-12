import { useEffect } from "react";
import { X } from "lucide-react";

const ImageModal = ({ isOpen, src, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-out"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all cursor-pointer z-50 shadow-md"
      >
        <X size={28} />
      </button>

      {/* Image container */}
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
