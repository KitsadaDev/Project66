import { useState } from "react";
import {
  Upload,
  Camera,
  X,
  CheckCircle,
  Receipt,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import { billsAPI, stallsAPI } from "../../api";
import { convertHeicToJpeg } from "../../utils/heicConverter";

/**
 * คอมโพเนนต์หน้าจออัปโหลดหลักฐานการชำระเงิน (สำหรับผู้เช่าแผงค้า)
 * - เลือกรอบบิลประจำเดือน/ปี
 * - กรอกจำนวนเงินที่โอน และหมายเหตุเพิ่มเติม
 * - อัปโหลดไฟล์ภาพสลิป (รองรับ HEIC, JPG, PNG, PDF)
 * - ตรวจสอบความถูกต้องและส่งข้อมูลหลักฐานไปยังเซิร์ฟเวอร์
 */
const UploadBill = () => {
  // สถานะการจัดเก็บไฟล์หลักฐานและ URL จำลองสำหรับแสดงพรีวิว
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  // สถานะการโหลดขณะกำลังส่งข้อมูลไปยังเซิร์ฟเวอร์
  const [uploading, setUploading] = useState(false);
  // สถานะเดือนและปีที่ต้องการชำระ (ค่าเริ่มต้นเป็นเดือนและปีปัจจุบัน)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // จำนวนเงินที่ชำระ และหมายเหตุประกอบ
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // รายชื่อเดือนภาษาไทยสำหรับแสดงในเมนู Dropdown
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  /**
   * จัดการเมื่อผู้ใช้เลือกไฟล์หลักฐานจากเครื่อง
   * - ตรวจสอบและแปลงไฟล์ภาพฟอร์แมต HEIC (เช่น จาก iPhone) ให้เป็น JPEG อัตโนมัติ
   * - สร้าง Object URL เพื่อใช้พรีวิวรูปภาพ
   */
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const toastId = toast.info("กำลังประมวลผลไฟล์...", { autoClose: false });
      try {
        // ทำการแปลงไฟล์ภาพ (ถ้าเป็น HEIC)
        const convertedFile = await convertHeicToJpeg(selectedFile);
        setFile(convertedFile);
        setPreview(URL.createObjectURL(convertedFile));
      } catch (err) {
        console.error(err);
        toast.error("เกิดข้อผิดพลาดในการประมวลผลไฟล์");
      } finally {
        toast.dismiss(toastId);
      }
    }
  };

  /**
   * ล้างไฟล์หลักฐานและพรีวิวที่เลือกไว้ออก
   */
  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  /**
   * ฟังก์ชันดำเนินการส่งหลักฐานการชำระเงิน
   * 1. ตรวจสอบข้อมูลนำเข้า (ไฟล์ และ จำนวนเงิน)
   * 2. ดึงข้อมูลแผงค้าของผู้เช่า (Slot)
   * 3. ดึงรายการบิลเพื่อค้นหาบิลที่ตรงกับเดือน/ปีที่เลือก
   * 4. ตรวจสอบสถานะว่ายังค้างชำระหรือไม่
   * 5. ส่งไฟล์ผ่าน FormData ไปยัง billsAPI.uploadPayment
   */
  const handleUpload = async () => {
    // ตรวจสอบว่าเลือกไฟล์หรือยัง
    if (!file) {
      toast.error("กรุณาเลือกไฟล์หลักฐานการชำระ");
      return;
    }

    // ตรวจสอบว่ากรอกจำนวนเงินหรือยัง
    if (!amount) {
      toast.error("กรุณากรอกยอดที่ชำระ");
      return;
    }

    setUploading(true);
    try {
      // 1. ดึงข้อมูลแผงค้าของผู้เช่าเพื่อหา slot_id
      const stallsRes = await stallsAPI.getAll();
      const myStall = stallsRes.data.data?.[0];
      if (!myStall) {
        toast.error("ไม่พบข้อมูลแผงค้าของคุณ");
        setUploading(false);
        return;
      }

      // 2. ดึงรายการบิลทั้งหมดของแผงค้านี้
      const billsRes = await billsAPI.getAll({ slot_id: myStall.slot_id });
      const bills = billsRes.data.data || [];

      // 3. ค้นหาบิลที่ตรงกับรอบเดือนและปีที่ระบุ
      const bill = bills.find((b) => {
        const billDate = new Date(b.billing_month);
        return (
          billDate.getMonth() + 1 === selectedMonth &&
          billDate.getFullYear() === selectedYear
        );
      });

      // หากไม่พบบิลในรอบเดือนนั้น แจ้งเตือนผู้ใช้
      if (!bill) {
        toast.error(`ไม่พบข้อมูลบิลสำหรับเดือน ${thaiMonths[selectedMonth - 1]} ${selectedYear + 543}`);
        setUploading(false);
        return;
      }

      // หากบิลชำระแล้ว ไม่ต้องอัปโหลดซ้ำ
      if (bill.status === "PAID") {
        toast.warning("บิลสำหรับเดือนนี้ได้รับการชำระเรียบร้อยแล้ว");
        setUploading(false);
        return;
      }

      // 4. บรรจุข้อมูลใส่ FormData สำหรับอัปโหลดไฟล์ Multipart
      const formData = new FormData();
      formData.append("paymentProof", file);
      formData.append("payment_date", new Date().toISOString());
      formData.append("payment_amount", amount);
      if (note) {
        formData.append("note", note);
      }

      // ยิง API บันทึกหลักฐานการชำระ
      await billsAPI.uploadPayment(bill.expense_id, formData);
      toast.success("อัปโหลดหลักฐานสำเร็จ รอการตรวจสอบ");

      // ล้างค่าฟอร์มกลับสู่สถานะเริ่มต้น
      setFile(null);
      setPreview(null);
      setAmount("");
      setNote("");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "ไม่สามารถอัปโหลดได้ กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* หัวข้อหน้าจอ */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          อัปโหลดหลักฐานการชำระ
        </h1>
        <p className="text-gray-500 text-sm">
          แนบสลิปหรือหลักฐานการโอนเงินค่าเช่า
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ฝั่งซ้าย - พื้นที่สำหรับลากวางหรือเลือกไฟล์ภาพสลิป */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 order-2 lg:order-1 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Camera size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">แนบหลักฐาน</h3>
          </div>

          {!preview ? (
            /* กล่อง Drag-and-Drop หรือคลิกเพื่ออัปโหลด */
            <div
              className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer min-h-[300px] flex flex-col items-center justify-center p-8 group"
              onClick={() => document.getElementById("bill-upload").click()}
            >
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-gray-400 group-hover:text-purple-500">
                <Upload size={28} />
              </div>
              <p className="font-semibold text-gray-600 mb-1 group-hover:text-purple-600">
                คลิกเพื่ออัปโหลดรูปภาพ
              </p>
              <p className="text-xs text-gray-400">
                รองรับ JPG, PNG, PDF (สูงสุด 5MB)
              </p>
              <input
                id="bill-upload"
                type="file"
                accept="image/*,.pdf"
                hidden
                onChange={handleFileChange}
              />
            </div>
          ) : (
            /* แสดงภาพตัวอย่างเมื่อเลือกไฟล์แล้ว พร้อมปุ่มยกเลิก */
            <div className="relative rounded-2xl overflow-hidden border border-gray-200">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-[400px] object-contain bg-gray-50"
              />
              <button
                onClick={removeFile}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ฝั่งขวา - ฟอร์มระบุรายละเอียดการชำระเงิน */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 order-1 lg:order-2 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <Receipt size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              รายละเอียดการชำระ
            </h3>
          </div>

          <div className="space-y-6">
            {/* เลือกเดือนและปีรอบบิล */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                ประจำเดือน
              </label>
              <div className="flex gap-3">
                <select
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {thaiMonths.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  <option value={2026}>2569</option>
                  <option value={2025}>2568</option>
                  <option value={2024}>2567</option>
                </select>
              </div>
            </div>

            {/* ช่องกรอกจำนวนเงิน */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                ยอดเงินที่ชำระ (บาท)
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 text-lg font-medium"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  ฿
                </div>
              </div>
            </div>

            {/* ช่องกรอกหมายเหตุ */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                หมายเหตุ (ถ้ามี)
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 resize-none h-24"
                placeholder="ระบุหมายเหตุเพิ่มเติม..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* ปุ่มกดยืนยันการส่งสลิป */}
            <button
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              onClick={handleUpload}
              disabled={uploading || !file}
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังอัปโหลด...
                </>
              ) : (
                <>
                  <CheckCircle size={20} /> ยืนยันการชำระ
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              * กรุณาตรวจสอบความถูกต้องก่อนยืนยัน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadBill;
