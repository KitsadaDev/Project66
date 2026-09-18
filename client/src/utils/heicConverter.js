// ======================================================
// utils/heicConverter.js - ตัวแปลงไฟล์ภาพ HEIC/HEIF เป็น JPEG
// รับผิดชอบ: แปลงรูปภาพที่ถ่ายจาก iPhone (.heic/.heif) ให้กลายเป็น .jpg อัตโนมัติก่อนอัปโหลดขึ้น Server
// ======================================================

import heic2any from "heic2any";

/**
 * ฟังก์ชัน: convertHeicToJpeg
 * หน้าที่: ตรวจสอบและแปลงไฟล์ภาพ HEIC/HEIF ให้เป็น JPEG เพื่อให้เบราว์เซอร์ทั่วไปแสดงผลได้
 * @param {File} file - ไฟล์ภาพต้นฉบับที่ผู้ใช้อัปโหลด
 * @returns {Promise<File>} ไฟล์รูปภาพที่แปลงเป็น JPEG แล้ว (หรือไฟล์เดิมหากไม่ใช่ HEIC)
 */
export const convertHeicToJpeg = async (file) => {
  if (!file) return file;
  
  // ตรวจสอบนามสกุลและ MIME type ของไฟล์
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === "heic" || extension === "heif" || file.type === "image/heic" || file.type === "image/heif") {
    try {
      // ใช้ library heic2any เพื่อแปลงเป็น JPEG (คุณภาพ 80%)
      const convertedBlob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8
      });
      
      // กรณี heic2any คืนค่าเป็น array ให้ใช้ตัวแรก
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      // เปลี่ยนนามสกุลไฟล์เป็น .jpg
      const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
      
      // สร้าง File object ใหม่ในรูปแบบ image/jpeg
      return new File([blob], newName, {
        type: "image/jpeg",
        lastModified: new Date().getTime(),
      });
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      return file; // หากแปลงไม่สำเร็จ ให้ใช้ไฟล์ต้นฉบับเดิมเป็น fallback
    }
  }
  return file;
};
