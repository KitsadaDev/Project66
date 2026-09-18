// ======================================================
// pages/tenant/Expenses.jsx - หน้าแสดงค่าใช้จ่ายประจำเดือนของผู้เช่า (Tenant Expenses View)
// รับผิดชอบ:
//   - ดึงข้อมูลสัญญาเช่าที่เปิดใช้งานอยู่ (ACTIVE) เพื่อทราบข้อมูลแผงร้านค้าที่เช่า
//   - ดึงและกรองบิลค่าใช้จ่ายตามเดือนและปีที่ผู้เช่าเลือก (เดือนภาษาไทย, ปี พ.ศ.)
//   - แสดงการ์ดสรุปค่าใช้จ่ายแต่ละประเภท: ค่าเช่าแผง, ค่าน้ำประปา, ค่าไฟฟ้า, ค่าดักไขมัน, ค่าปรับล่าช้า
//   - แสดงยอดเงินรวมทั้งหมด และสถานะการชำระเงิน (ชำระแล้ว, รอตรวจสอบสลิป, ยังไม่ออกบิล)
//   - Modal อัปโหลดสลิปหลักฐานการโอนเงิน (Slip Upload Modal) พร้อมรูปตัวอย่างก่อนส่ง
//   - ปุ่มดาวน์โหลดเอกสารใบแจ้งหนี้ในรูปแบบไฟล์ PDF (generateBillPDF)
// ======================================================

import { useEffect, useState } from "react";
import {
  Receipt,
  Droplets,
  Zap,
  Home,
  FileText,
  AlertTriangle,
  Upload,
  CheckCircle,
  X,
} from "lucide-react";
import { billsAPI, contractsAPI } from "../../api";
import { generateBillPDF } from "../../utils/pdfGenerator";
import { useAuthStore } from "../../store";
import { toast } from "react-toastify";

const Expenses = () => {
  const { user } = useAuthStore();

  // -------------------------------------------------------
  // Component States
  // -------------------------------------------------------
  const [expenses, setExpenses] = useState(null);         // ข้อมูลบิลประจำเดือนที่เลือก
  const [stall, setStall] = useState(null);               // ข้อมูลแผงค้าของผู้เช่า (ดึงจากสัญญาที่ ACTIVE)
  const [loading, setLoading] = useState(true);           // สถานะกำลังโหลดข้อมูล
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // เดือนที่เลือก (1-12)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());    // ปี ค.ศ. ที่เลือก

  // State สำหรับการอัปโหลดสลิปโอนเงิน
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false); // สถานะเปิด/ปิด Modal อัปโหลดสลิป
  const [uploading, setUploading] = useState(false);             // สถานะกำลังอัปโหลด
  const [selectedFile, setSelectedFile] = useState(null);        // ไฟล์รูปภาพสลิปที่เลือก
  const [previewUrl, setPreviewUrl] = useState(null);            // URL สำหรับ Preview รูปสลิป

  // ดึงข้อมูลใหม่ทุกครั้งที่ผู้เช่าเปลี่ยนเดือนหรือปี
  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  // -------------------------------------------------------
  // ฟังก์ชัน: fetchData
  // หน้าที่: 
  //   1. ดึงสัญญาเช่า ACTIVE ของผู้เช่า เพื่อหา slot_id แผงที่เช่า
  //   2. ดึงรายการบิลทั้งหมดของแผงค้านั้น
  //   3. กรองหาบิลที่ตรงกับ selectedMonth และ selectedYear
  // -------------------------------------------------------
  const fetchData = async () => {
    try {
      // 1. ดึงสัญญาเช่าปัจจุบันของผู้เช่า
      const contractsRes = await contractsAPI.getAll({ status: 'ACTIVE' });
      const activeContract = contractsRes.data.data?.[0];

      if (activeContract?.slot) {
        const myStall = activeContract.slot;
        setStall(myStall);

        // 2. ดึงบิลทั้งหมดของแผงนี้
        const billsRes = await billsAPI.getAll({ slot_id: myStall.slot_id });
        const bills = billsRes.data.data || [];

        // 3. กรองหาบิลของเดือนและปีที่เลือก
        const monthBill = bills.find((b) => {
          const billDate = new Date(b.billing_month);
          return (
            billDate.getMonth() + 1 === selectedMonth &&
            billDate.getFullYear() === selectedYear
          );
        });

        setExpenses(monthBill);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // ฟังก์ชัน: handleFileChange
  // หน้าที่: รับไฟล์รูปภาพสลิปที่เลือก และสร้าง URL ชั่วคราวสำหรับ Preview
  // -------------------------------------------------------
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // -------------------------------------------------------
  // ฟังก์ชัน: handleUploadSlip
  // หน้าที่: ส่งไฟล์รูปภาพสลิปโอนเงินขึ้น Server ผ่าน FormData
  // -------------------------------------------------------
  const handleUploadSlip = async (e) => {
    e.preventDefault();
    if (!selectedFile || !expenses) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("paymentProof", selectedFile);
    formData.append("payment_date", new Date().toISOString());
    formData.append("payment_amount", expenses.total_amount);

    try {
      // เรียก API บันทึกการชำระเงิน
      await billsAPI.uploadPayment(expenses.expense_id, formData);
      toast.success("อัปโหลดหลักฐานการชำระเงินเรียบร้อยแล้ว");
      setIsSlipModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchData(); // ดึงข้อมูลใหม่เพื่อแสดงสถานะ 'รอตรวจสอบ'
    } catch (error) {
      toast.error(
        error.response?.data?.message || "ไม่สามารถอัปโหลดได้ กรุณาลองใหม่",
      );
    } finally {
      setUploading(false);
    }
  };

  // รายชื่อเดือนภาษาไทย
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* ส่วนหัวหน้าจอ: ชื่อหน้า, ปุ่มดาวน์โหลด PDF, Dropdown เลือกเดือน/ปี */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            ค่าใช้จ่ายประจำเดือน
          </h1>
          <p className="text-gray-500 text-sm">
            ตรวจสอบค่าน้ำ ค่าไฟ และค่าเช่า
          </p>
          {/* ปุ่มดาวน์โหลดบิล PDF */}
          {expenses && (
            <button
              onClick={() => generateBillPDF(expenses)}
              className="mt-2 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors cursor-pointer"
            >
              <FileText size={16} /> ดาวน์โหลดบิล (PDF)
            </button>
          )}
        </div>
        {/* ตัวเลือกเดือนและปี */}
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
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
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            <option value={2026}>2569</option>
            <option value={2025}>2568</option>
            <option value={2024}>2567</option>
          </select>
        </div>
      </div>

      {/* การ์ดแสดงข้อมูลแผงร้านค้าปัจจุบันของผู้เช่า */}
      {stall && (
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <Home size={24} />
          </div>
          <div>
            <p className="xl font-bold text-gray-800">
              ล็อค {stall.slot_number}
            </p>
            <p className="text-gray-500 text-sm">
              {stall.food_court?.name || `ศูนย์อาหาร ${stall.food_court_id}`}
            </p>
          </div>
        </div>
      )}

      {/* กริดการ์ดจำแนกค่าใช้จ่าย 4 หมวดหลัก (+ ค่าปรับ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* การ์ดที่ 1: ค่าเช่ารายเดือน */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[4rem] transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                <Receipt size={20} />
              </div>
              <h3 className="font-semibold text-gray-700">ค่าเช่ารายเดือน</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              ฿{(expenses?.rent_amount || stall?.rent || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* การ์ดที่ 2: ค่าน้ำประปา */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem] transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-500">
                <Droplets size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">ค่าน้ำ</h3>
                {(expenses?.water_units || 0) > 0 && (
                  <p className="text-xs text-gray-400">
                    {expenses.water_units} หน่วย
                  </p>
                )}
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-500">
              ฿{(expenses?.water_cost || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* การ์ดที่ 3: ค่าไฟฟ้า */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[4rem] transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-500">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">ค่าไฟ</h3>
                {(expenses?.electricity_units || 0) > 0 && (
                  <p className="text-xs text-gray-400">
                    {expenses.electricity_units} หน่วย
                  </p>
                )}
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-500">
              ฿{(expenses?.electricity_cost || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* การ์ดที่ 4: ค่าถังดักไขมัน */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-[4rem] transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-500">
                <Receipt size={20} />
              </div>
              <h3 className="font-semibold text-gray-700">ค่าดักไขมัน</h3>
            </div>
            <p className="text-3xl font-bold text-green-500">
              ฿{(expenses?.grease_trap_fee || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* การ์ดพิเศษ: ค่าปรับล่าช้า (แสดงเฉพาะเมื่อมียอดค่าปรับ > 0) */}
        {expenses?.late_fee > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[4rem] transition-transform group-hover:scale-110"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="font-semibold text-gray-700">ค่าปรับล่าช้า</h3>
              </div>
              <p className="text-3xl font-bold text-red-500">
                ฿{(expenses.late_fee || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* แถบสรุปยอดรวมทั้งสิ้นและปุ่มแจ้งชำระเงิน */}
      <div className="mt-8 bg-linear-to-r from-purple-500 to-indigo-600 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/pattern.png')] opacity-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-purple-100 mb-2 font-medium">ยอดรวมทั้งหมด</p>
            <p className="text-5xl font-bold drop-shadow-sm">
              ฿
              {(
                expenses?.total_amount ||
                (expenses?.rent_amount || stall?.rent || 0) +
                  (expenses?.water_cost || 0) +
                  (expenses?.electricity_cost || 0) +
                  (expenses?.grease_trap_fee || 0) +
                  (expenses?.late_fee || 0)
              ).toLocaleString()}
            </p>
            <p className="text-purple-200 text-sm mt-2">
              ประจำเดือน {thaiMonths[selectedMonth - 1]} {selectedYear + 543}
            </p>
          </div>

          {/* ป้ายแสดงสถานะการชำระ หรือ ปุ่มกดแจ้งชำระเงิน */}
          <div className="flex flex-col gap-3 min-w-[200px]">
            {expenses ? (
              expenses.status === "PAID" ? (
                // กรณีชำระเงินเรียบร้อยแล้ว
                <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-3 border border-white/30">
                  <CheckCircle size={24} className="text-green-300" />
                  <span className="font-bold text-lg">
                    ชำระเงินเรียบร้อยแล้ว
                  </span>
                </div>
              ) : expenses.payments?.length > 0 ? (
                // กรณีส่งสลิปแล้ว กำลังรอ Admin ตรวจสอบ
                <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-3 border border-white/30">
                  <Receipt size={24} className="text-yellow-300" />
                  <span className="font-bold text-lg">รอตรวจสอบ</span>
                </div>
              ) : (
                // กรณียังไม่ได้ชำระเงิน -> ปุ่มเปิด Modal อัปโหลดสลิป
                <button
                  onClick={() => setIsSlipModalOpen(true)}
                  className="bg-white text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                >
                  แจ้งชำระเงิน
                </button>
              )
            ) : (
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl text-center italic text-purple-100">
                ยังไม่ออกบิลสำหรับเดือนนี้
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- */}
      {/* Modal อัปโหลดหลักฐานสลิปการโอนเงิน (Slip Upload Modal) */}
      {/* ------------------------------------------------------- */}
      {isSlipModalOpen && expenses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* ส่วนหัว Modal */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                อัปโหลดหลักฐานการชำระเงิน
              </h2>
              <button
                onClick={() => setIsSlipModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {/* แบบฟอร์มอัปโหลดสลิป */}
            <form onSubmit={handleUploadSlip} className="p-6 space-y-6">
              {/* ข้อมูลสรุปยอดที่ต้องโอน */}
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">ยอดเงินที่ต้องชำระ:</span>
                  <span className="font-bold text-purple-700">
                    ฿{expenses.total_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ประจำเดือน:</span>
                  <span className="font-medium text-gray-700">
                    {thaiMonths[selectedMonth - 1]} {selectedYear + 543}
                  </span>
                </div>
              </div>

              {/* กล่องเลือกไฟล์รูปภาพสลิป หรือ แสดงรูป Preview */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  เลือกรูปภาพสลิป *
                </label>
                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 text-gray-400 mb-3" />
                      <p className="text-sm text-gray-500">
                        คลิกเพื่อเลือกไฟล์รูปภาพ
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                      required
                    />
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-auto max-h-64 object-contain"
                    />
                    {/* ปุ่มลบรูปภาพที่เลือก เพื่อเลือกใหม่ */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* ปุ่มบันทึกส่งหลักฐาน */}
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Upload size={20} />
                )}
                {uploading ? "กำลังส่งข้อมูล..." : "ส่งหลักฐานการชำระเงิน"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
