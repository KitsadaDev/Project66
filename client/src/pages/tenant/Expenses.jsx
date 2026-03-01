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
import { billsAPI, stallsAPI } from "../../api";
import { generateBillPDF } from "../../utils/pdfGenerator";
import { useAuthStore } from "../../store";
import { toast } from "react-toastify";

const Expenses = () => {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState(null);
  const [stall, setStall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Payment states
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const stallsRes = await stallsAPI.getAll();
      const myStall = stallsRes.data.data?.[0];
      setStall(myStall);

      if (myStall) {
        // Use getAll with slot_id filter
        const billsRes = await billsAPI.getAll({ slot_id: myStall.slot_id });
        const bills = billsRes.data.data || [];

        // Find bill for selected month/year
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadSlip = async (e) => {
    e.preventDefault();
    if (!selectedFile || !expenses) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("paymentProof", selectedFile);
    formData.append("payment_date", new Date().toISOString());
    formData.append("payment_amount", expenses.total_amount);

    try {
      await billsAPI.uploadPayment(expenses.expense_id, formData);
      toast.success("อัปโหลดหลักฐานการชำระเงินเรียบร้อยแล้ว");
      setIsSlipModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchData(); // Refresh to show pending status
    } catch (error) {
      toast.error(
        error.response?.data?.message || "ไม่สามารถอัปโหลดได้ กรุณาลองใหม่",
      );
    } finally {
      setUploading(false);
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            ค่าใช้จ่ายประจำเดือน
          </h1>
          <p className="text-gray-500 text-sm">
            ตรวจสอบค่าน้ำ ค่าไฟ และค่าเช่า
          </p>
          {expenses && (
            <button
              onClick={() => generateBillPDF(expenses)}
              className="mt-2 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors cursor-pointer"
            >
              <FileText size={16} /> ดาวน์โหลดบิล (PDF)
            </button>
          )}
        </div>
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

      {/* Stall Info */}
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

      {/* Expenses Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Rent */}
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

        {/* Water */}
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

        {/* Electric */}
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

        {/* Late Fee (Conditional) */}
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

      {/* Total & Action */}
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

          <div className="flex flex-col gap-3 min-w-[200px]">
            {expenses ? (
              expenses.status === "PAID" ? (
                <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-3 border border-white/30">
                  <CheckCircle size={24} className="text-green-300" />
                  <span className="font-bold text-lg">
                    ชำระเงินเรียบร้อยแล้ว
                  </span>
                </div>
              ) : expenses.payments?.length > 0 ? (
                <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-3 border border-white/30">
                  <Receipt size={24} className="text-yellow-300" />
                  <span className="font-bold text-lg">รอตรวจสอบ</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsSlipModalOpen(true)}
                  className="bg-white text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:scale-105 active:scale-95"
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

      {/* Slip Upload Modal */}
      {isSlipModalOpen && expenses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                อัปโหลดหลักฐานการชำระเงิน
              </h2>
              <button
                onClick={() => setIsSlipModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUploadSlip} className="p-6 space-y-6">
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
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
