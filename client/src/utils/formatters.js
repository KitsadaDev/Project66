// ======================================================
// utils/formatters.js - เครื่องมือจัดรูปแบบข้อความ (Text Formatters)
// รับผิดชอบ: จัดรูปแบบเบอร์โทรศัพท์ (ใส่เครื่องหมายขีด -) และแปลงกลับเป็นตัวเลขล้วน
// ======================================================

/**
 * ฟังก์ชัน: formatPhoneNumber
 * หน้าที่: แปลงตัวเลขเบอร์โทรศัพท์ให้อยู่ในรูปแบบ 0xx-xxx-xxxx
 * @param {string} value - ข้อความหรือตัวเลขเบอร์โทรศัพท์
 * @returns {string} เบอร์โทรศัพท์ที่ใส่เครื่องหมายขีด เช่น "081-234-5678"
 */
export const formatPhoneNumber = (value) => {
  if (!value) return "";
  // ลบตัวอักษรที่ไม่ใช่ตัวเลขออกทั้งหมด
  const cleaned = value.replace(/\D/g, "");
  let formatted = cleaned;
  if (cleaned.length > 0) {
    // แบ่งกลุ่มเป็น 3-3-4 ตัวเลข
    const matches = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!matches) return cleaned;
    formatted =
      matches[1] +
      (matches[2] ? "-" + matches[2] : "") +
      (matches[3] ? "-" + matches[3] : "");
  }
  return formatted;
};

/**
 * ฟังก์ชัน: unformatPhoneNumber
 * หน้าที่: ลบเครื่องหมายขีด (-) ออก ให้เหลือเฉพาะตัวเลขล้วนสำหรับส่งบันทึกลงฐานข้อมูล
 * @param {string} value - เบอร์โทรศัพท์ที่มีขีด
 * @returns {string} ตัวเลขล้วน เช่น "0812345678"
 */
export const unformatPhoneNumber = (value) => {
  return value ? value.replace(/-/g, "") : "";
};
