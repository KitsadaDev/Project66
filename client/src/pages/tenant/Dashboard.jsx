import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Receipt,
  FileText,
  Wrench,
  Upload,
  History,
  Store,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  ShoppingBag,
} from "lucide-react";
import { useAuthStore } from "../../store";
import { stallsAPI, billsAPI } from "../../api";

const TenantDashboard = () => {
  const { user } = useAuthStore();
  const [stall, setStall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dueBills, setDueBills] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stallsRes, billsRes] = await Promise.all([
          stallsAPI.getAll(),
          billsAPI.getDueBills(), // Fetch bills due in 7 days
        ]);
        setStall(stallsRes.data.data?.[0]);
        setDueBills(billsRes.data.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 pb-20">
      {/* Notifications */}
      {dueBills.length > 0 && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-800 text-lg mb-1">
              แจ้งเตือนการชำระเงิน
            </h3>
            <p className="text-red-600 mb-3">
              คุณมีบิลที่ต้องชำระภายใน 7 วัน จำนวน {dueBills.length} รายการ
            </p>
            <div className="space-y-2">
              {dueBills.map((bill) => (
                <div
                  key={bill.expense_id || bill.id}
                  className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100"
                >
                  <span className="text-gray-700 font-medium">
                    บิลเดือน{" "}
                    {new Date(
                      bill.billing_month || bill.month,
                    ).toLocaleDateString("th-TH", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-red-600">
                      ฿
                      {(
                        bill.total_amount ||
                        bill.total_amount ||
                        bill.totalAmount ||
                        0
                      ).toLocaleString()}
                    </span>
                    <Link
                      to="/tenant/payment-history"
                      className="text-sm text-red-500 hover:text-red-700 underline"
                    >
                      ไปชำระเงิน
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Food Court Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
        <Link
          to="/tenant/stall-status?foodCourt=1"
          className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
        >
          <div className="h-40 overflow-hidden relative">
            <img
              src="/Food-court-1.png"
              alt="ศูนย์อาหาร 1"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                ศูนย์อาหาร 1
              </h3>
              <ArrowRight
                size={20}
                className="text-gray-300 group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all"
              />
            </div>
          </div>
        </Link>

        <Link
          to="/tenant/stall-status?foodCourt=2"
          className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
        >
          <div className="h-40 overflow-hidden relative">
            <img
              src="/Food-court-2.png"
              alt="ศูนย์อาหาร 2"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                ศูนย์อาหาร 2
              </h3>
              <ArrowRight
                size={20}
                className="text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all"
              />
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Menu Below */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-center text-gray-500 mb-8 font-medium">เมนูด่วน</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <Link
            to="/tenant/expenses"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group gap-4 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-500 group-hover:scale-110 transition-transform shadow-sm">
              <Receipt size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-orange-600">
              ค่าใช้จ่าย
            </span>
          </Link>

          <Link
            to="/tenant/contracts"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group gap-4 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
              <FileText size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-blue-600">
              สัญญาเช่า
            </span>
          </Link>

          <Link
            to="/tenant/upload-bill"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group gap-4 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-green-50 text-green-500 group-hover:scale-110 transition-transform shadow-sm">
              <Upload size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-green-600">
              อัปโหลดบิล
            </span>
          </Link>

          <Link
            to="/tenant/payment-history"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group gap-4 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-50 text-purple-500 group-hover:scale-110 transition-transform shadow-sm">
              <History size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-purple-600">
              ประวัติชำระ
            </span>
          </Link>

          <Link
            to="/tenant/report-repair"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group gap-4 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50 text-red-500 group-hover:scale-110 transition-transform shadow-sm">
              <Wrench size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-red-600">
              แจ้งซ่อม
            </span>
          </Link>

          <Link
            to="/tenant/track-repairs"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group gap-4 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-100 text-gray-600 group-hover:scale-110 transition-transform shadow-sm">
              <ClipboardList size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-gray-900">
              ติดตามซ่อม
            </span>
          </Link>

          <Link
            to="/tenant/dishware"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group gap-4 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-500 group-hover:scale-110 transition-transform shadow-sm">
              <ShoppingBag size={28} />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-amber-600">
              ถ้วยชาม
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
