import { useEffect, useState } from "react";
import { Receipt, Droplets, Zap, Home, FileText } from "lucide-react";
import { billsAPI, stallsAPI } from "../../api";
import { generateBillPDF } from "../../utils/pdfGenerator";
import { useAuthStore } from "../../store";

const Expenses = () => {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState(null);
  const [stall, setStall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const stallsRes = await stallsAPI.getAll();
      const myStall = stallsRes.data.data?.[0];
      setStall(myStall);

      if (myStall) {
        const billsRes = await billsAPI.getByStall(myStall.slot_id);
        const bills = billsRes.data.data || [];

        // Find bill for selected month/year
        const monthBill = bills.find((b) => {
          const billDate = new Date(b.billing_month || b.createdAt);
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
              className="mt-2 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
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
            <p className="text-xl font-bold text-gray-800">
              ล็อค {stall.slot_number}
            </p>
            <p className="text-gray-500 text-sm">
              ศูนย์อาหาร {stall.food_court_id}
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
                {expenses?.waterUnits && (
                  <p className="text-xs text-gray-400">
                    {expenses.waterUnits} หน่วย
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
                {expenses?.electricUnits && (
                  <p className="text-xs text-gray-400">
                    {expenses.electricUnits} หน่วย
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
              ฿{(expenses?.greaseTrapFee || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="mt-8 bg-linear-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/pattern.png')] opacity-10"></div>
        <div className="relative z-10">
          <p className="text-purple-100 mb-2 font-medium">ยอดรวมทั้งหมด</p>
          <p className="text-5xl font-bold mb-4 drop-shadow-sm">
            ฿
            {(
              expenses?.total_amount ||
              (expenses?.rent_amount || stall?.rent || 0) +
                (expenses?.water_cost || 0) +
                (expenses?.electricity_cost || 0) +
                (expenses?.greaseTrapFee || 0)
            ).toLocaleString()}
          </p>
          <p className="text-purple-200 text-sm">
            ประจำเดือน {thaiMonths[selectedMonth - 1]} {selectedYear + 543}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
