// ======================================================
// pages/tenant/Contracts.jsx - หน้ารายละเอียดสัญญาเช่าของผู้เช่า (Tenant Lease Agreement View)
// รับผิดชอบ:
//   - ดึงข้อมูลสัญญาเช่าปัจจุบันของผู้เช่า (สถานะ ACTIVE หรือ PENDING_TERMINATION)
//   - ดึงอัตราค่าสาธารณูปโภค ค่าน้ำ/ค่าไฟ/ค่าปรับ จาก settingsAPI.getUtilityRates
//   - คำนวณระยะเวลาสัญญาเช่า (จำนวนเดือน) จาก start_date และ end_date
//   - แสดงข้อมูลสัญญา: ล็อคที่เช่า, วันที่เริ่ม-สิ้นสุด, ข้อมูลผู้เช่า, ใบเสร็จรับเงิน, อัตราค่าใช้จ่าย
//   - ปุ่มนำทางไปหน้าขอยกเลิกสัญญา (/tenant/cancel-contract)
//   - Modal ดูเอกสารสัญญาฉบับจริง (ภาพที่อัปโหลดไว้)
// ======================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FileText,
  Calendar,
  Home,
  Clock,
  CheckCircle,
  Info,
  CreditCard,
  X,
} from "lucide-react";
import { formatPhoneNumber } from "../../utils/formatters";
import { contractsAPI, stallsAPI, settingsAPI } from "../../api";

// รายชื่อล็อคที่ต้องจ่ายค่าดักไขมัน (แผงขายอาหารปรุงสด / ของคาว)
const GREASE_TRAP_TARGET_SLOTS = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','B1','B2','B3','B4','B5','B6','B7','B8'];

const Contracts = () => {
  const navigate = useNavigate();

  // -------------------------------------------------------
  // Component States
  // -------------------------------------------------------
  const [contract, setContract] = useState(null);           // ข้อมูลสัญญาเช่าของผู้เช่า
  const [settings, setSettings] = useState(null);           // อัตราค่าน้ำ ค่าไฟ ค่าปรับ จากการตั้งค่าระบบ
  const [loading, setLoading] = useState(true);             // สถานะกำลังโหลดข้อมูล
  const [showImageModal, setShowImageModal] = useState(false); // สถานะเปิดดูรูปภาพสัญญาฉบับจริง

  useEffect(() => {
    fetchData();
  }, []);

  // -------------------------------------------------------
  // ฟังก์ชัน: fetchData
  // หน้าที่: ดึงข้อมูลสัญญาเช่าของผู้เช่าและอัตราค่าบริการจากเซิร์ฟเวอร์
  // -------------------------------------------------------
  const fetchData = async () => {
    try {
      // ดึงข้อมูลสัญญาเช่าและอัตราค่าบริการพร้อมกัน
      const [response, settingsRes] = await Promise.all([
        contractsAPI.getAll(),
        settingsAPI.getUtilityRates()
      ]);
      const contracts = response.data.data || [];
      const settingsData = settingsRes.data.data || null;

      if (settingsData) {
        setSettings(settingsData);
      }
      
      // ค้นหาสัญญาที่มีผลใช้งานอยู่ (ACTIVE) หรืออยู่ในระหว่างขอยกเลิก (PENDING_TERMINATION)
      const myContract = contracts.find(c => c.status === "ACTIVE" || c.status === "PENDING_TERMINATION");

      if (myContract) {
        // คำนวณระยะเวลาสัญญาเช่าเป็นจำนวนเดือน
        const start = new Date(myContract.start_date);
        const end = new Date(myContract.end_date);
        const diffMonths =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());

        setContract({
          ...myContract,
          contractDisplayNumber: myContract.contract_number,
          duration: diffMonths || 12,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // จัดรูปแบบวันที่ให้อ่านง่ายเป็นภาษาไทย เช่น 1 มกราคม 2567
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ฟังก์ชันส่งคำขอยกเลิกสัญญา (กรณีเรียกตรงจากหน้านี้)
  const handleRequestTermination = async () => {
    if (window.confirm("คุณต้องการส่งคำขอยกเลิกสัญญาเช่าใช่หรือไม่?\nหากยืนยัน แอดมินจะทำการตรวจสอบและอนุมัติ")) {
      try {
        setLoading(true);
        await contractsAPI.requestTermination(contract.contract_id);
        toast.success("ส่งคำขอยกเลิกสัญญาเรียบร้อยแล้ว");
        fetchData(); // รีเฟรชข้อมูลเพื่ออัปเดตสถานะ
      } catch (error) {
        toast.error(error.response?.data?.message || "ไม่สามารถส่งคำขอได้");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* ส่วนหัวหน้าจอ และป้ายสถานะสัญญา */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            สัญญาเช่า
          </h1>
          <p className="text-gray-500 text-sm">รายละเอียดสัญญาเช่าล็อคของคุณ</p>
        </div>

        {/* กรณีสัญญามีผลบังคับใช้งาน (ACTIVE) -> แสดงปุ่มขอยกเลิกสัญญา */}
        {contract && contract.status === 'ACTIVE' && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              <CheckCircle size={16} /> สัญญามีผลบังคับ
            </span>
            <button
              onClick={() => navigate("/tenant/cancel-contract")}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-full text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Info size={16} /> ขอยกเลิกสัญญา
            </button>
          </div>
        )}

        {/* กรณีส่งคำขอยกเลิกสัญญาแล้ว รอ Admin อนุมัติ */}
        {contract && contract.status === 'PENDING_TERMINATION' && (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold shadow-sm">
            <Clock size={16} /> รอดำเนินการยกเลิก
          </span>
        )}
      </div>

      {contract ? (
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          {/* Header การ์ดสัญญา: แสดงเลขที่สัญญาและปุ่มดูฉบับจริง */}
          <div className="bg-purple-50 p-6 md:p-8 flex items-center justify-between border-b border-purple-100">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-purple-600">
                <FileText size={32} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
                  {contract.contractDisplayNumber}
                </h2>
                <p className="text-gray-500 text-sm">เลขที่สัญญา</p>
              </div>
            </div>
            {/* ปุ่มเปิดดูรูปถ่ายเอกสารสัญญาฉบับจริง */}
            {contract.contractImage && (
              <button
                onClick={() => setShowImageModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <FileText size={16} /> ดูสัญญาฉบับจริง
              </button>
            )}
          </div>

          {/* ปุ่มดูสัญญาฉบับจริงบนจอมือถือ */}
          {contract.contractImage && (
            <div className="sm:hidden mx-6 mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-purple-600 shrink-0" />
                <span className="text-xs font-semibold text-gray-800">สัญญาฉบับจริง</span>
              </div>
              <button
                onClick={() => setShowImageModal(true)}
                className="px-3 py-1.5 bg-purple-600 text-white font-medium text-xs rounded-lg cursor-pointer"
              >
                เปิดดู
              </button>
            </div>
          )}

          {/* กริดสรุปข้อมูลสำคัญ: ล็อคที่เช่า, วันเริ่ม, วันสิ้นสุด, ระยะเวลา */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* ล็อคที่เช่า */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Home size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">ล็อคที่เช่า</p>
                <p className="text-lg font-bold text-gray-800">
                  {contract.slot?.slot_number}
                </p>
                <p className="text-xs text-gray-500">
                  ศูนย์อาหาร {contract.slot?.food_court?.name}
                </p>
              </div>
            </div>

            {/* วันเริ่มสัญญา */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">วันเริ่มสัญญา</p>
                <p className="font-semibold text-gray-800">
                  {formatDate(contract.start_date)}
                </p>
              </div>
            </div>

            {/* วันสิ้นสุดสัญญา */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">วันสิ้นสุดสัญญา</p>
                <p className="font-semibold text-gray-800">
                  {formatDate(contract.end_date)}
                </p>
              </div>
            </div>

            {/* ระยะเวลาสัญญา */}
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">ระยะเวลาสัญญา</p>
                <p className="font-semibold text-gray-800">
                  {contract.duration} เดือน
                </p>
              </div>
            </div>
          </div>

          {/* รายละเอียดเพิ่มเติม แบ่ง 2 คอลัมน์ */}
          <div className="px-6 pb-6 md:px-8 md:pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* คอลัมน์ซ้าย: ข้อมูลผู้เช่า และหลักฐานการชำระเงินค่าประกัน */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Info size={18} className="text-purple-500" /> ข้อมูลผู้เช่า
                  (ตามสัญญา)
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ชื่อ-นามสกุล</span>
                    <span className="font-medium text-gray-800">
                      {contract.tenant?.first_name} {contract.tenant?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">เลขบัตรประชาชน</span>
                    <span className="font-medium text-gray-800">
                      {contract.idCard || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">เบอร์โทรศัพท์</span>
                    <span className="font-medium text-gray-800">
                      {formatPhoneNumber(contract.phone) || "-"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="block text-gray-500 mb-1">ที่อยู่</span>
                    <p className="font-medium text-gray-800 leading-relaxed">
                      {contract.address || "-"}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="block text-gray-500 mb-1">
                      ประเภทเมนูอาหาร
                    </span>
                    <p className="font-medium text-gray-800 leading-relaxed">
                      {contract.menuType || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ข้อมูลใบเสร็จรับเงินเงินประกันสัญญา */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />{" "}
                  หลักฐานการชำระเงิน
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">เลขที่ใบเสร็จรับเงิน</span>
                    <span className="font-medium text-gray-800 font-mono">
                      {contract.receiptNumber || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">วันที่ชำระ</span>
                    <span className="font-medium text-gray-800">
                      {formatDate(contract.receiptDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* คอลัมน์ขวา: รายละเอียดอัตราค่าใช้จ่ายและค่าปรับ */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 h-fit">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-green-500" />{" "}
                รายละเอียดค่าใช้จ่าย
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                  <span className="text-gray-600">ค่าเช่ารายเดือน</span>
                  <span className="font-bold text-gray-800">
                    ฿{contract.slot?.rent?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                  <span className="text-gray-600">เงินประกันสัญญา</span>
                  <span className="font-bold text-gray-800">
                    ฿{contract.deposit_amount?.toLocaleString() || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                  <span className="text-gray-600">ค่าดักไขมัน</span>
                  <span className="font-bold text-gray-800">
                    {(contract.menuType === "ของคาว" || (contract.slot?.slot_number && GREASE_TRAP_TARGET_SLOTS.includes(contract.slot.slot_number))) ? `${settings?.greaseTrapFee || 500} ฿/เดือน` : "ฟรี"}
                  </span>
                </div>

                {settings && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                      <span className="text-gray-600">ค่าน้ำประปา</span>
                      <span className="font-bold text-gray-800">
                        {settings.waterRatePerUnit} ฿/หน่วย
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                      <span className="text-gray-600">ค่าไฟฟ้า</span>
                      <span className="font-bold text-gray-800">
                        {settings.electricRatePerUnit} ฿/หน่วย
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                      <span className="text-gray-600">ค่าปรับล่าช้า (ค่าเช่า)</span>
                      <span className="font-bold text-gray-800">
                        {settings.lateRentFine} ฿/วัน
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                      <span className="text-gray-600">ค่าปรับล่าช้า (น้ำไฟ)</span>
                      <span className="font-bold text-gray-800">
                        {settings.lateUtilityFine} ฿/วัน
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // กรณีไม่พบข้อมูลสัญญาเช่า
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">ไม่พบข้อมูลสัญญาเช่า</p>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* Modal ดูรูปภาพเอกสารสัญญาเช่าฉบับจริง (Contract Image Viewer) */}
      {/* ------------------------------------------------------- */}
      {showImageModal && contract?.contractImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X size={32} />
            </button>
            <img 
              src={contract.contractImage} 
              alt="Contract" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
