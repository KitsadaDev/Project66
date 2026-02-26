import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  Receipt,
  Wrench,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { stallsAPI, usersAPI, billsAPI, maintenanceAPI } from "../../api";

const ExecutiveDashboard = () => {
  const [stats, setStats] = useState({
    totalStalls: 0,
    occupiedStalls: 0,
    vacantStalls: 0,
    totalTenants: 0,
    totalRevenue: 0,
    pendingRepairs: 0,
    pendingBills: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentBills, setRecentBills] = useState([]);
  const [recentRepairs, setRecentRepairs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stallsRes, usersRes, billsRes, repairsRes] = await Promise.all([
        stallsAPI.getAll(),
        usersAPI.getAll({ role: "TENANT" }),
        billsAPI.getAll(),
        maintenanceAPI.getAll(),
      ]);

      const stalls = stallsRes.data.data || [];
      const tenants = usersRes.data.data || [];
      const bills = billsRes.data.data || [];
      const repairs = repairsRes.data.data || [];

      const occupied = stalls.filter((s) => s.status === "OCCUPIED").length;
      const paidBills = bills.filter((b) => b.status === "PAID");
      const totalRevenue = paidBills.reduce(
        (sum, b) => sum + (b.total_amount || b.totalAmount || 0),
        0,
      );

      setStats({
        totalStalls: stalls.length,
        occupiedStalls: occupied,
        vacantStalls: stalls.length - occupied,
        totalTenants: tenants.length,
        totalRevenue: totalRevenue,
        pendingRepairs: repairs.filter((r) => r.status === "PENDING").length,
        pendingBills: bills.filter((b) => b.status === "PENDING").length,
      });

      setRecentBills(bills.slice(0, 5));
      setRecentRepairs(repairs.slice(0, 5));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ</h1>
        <p className="text-gray-500 text-sm">
          ข้อมูลสรุปสำหรับผู้บริหาร (ดูได้อย่างเดียว)
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {stats.totalStalls}
            </h3>
            <p className="text-sm text-gray-500">ล็อคทั้งหมด</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {stats.occupiedStalls}
            </h3>
            <p className="text-sm text-gray-500">ล็อคที่เช่าอยู่</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {stats.vacantStalls}
            </h3>
            <p className="text-sm text-gray-500">ล็อคว่าง</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {stats.totalTenants}
            </h3>
            <p className="text-sm text-gray-500">ผู้เช่าทั้งหมด</p>
          </div>
        </div>
      </div>

      {/* Revenue & Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">ยอดชำระทั้งหมด</p>
              <h2 className="text-3xl font-bold text-green-600">
                ฿{stats.totalRevenue.toLocaleString()}
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">รอดำเนินการ</p>
              <p className="text-lg">
                <span className="font-bold text-orange-500">
                  {stats.pendingBills}
                </span>{" "}
                บิลค้างชำระ |{" "}
                <span className="font-bold text-red-500">
                  {stats.pendingRepairs}
                </span>{" "}
                งานซ่อม
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Bills */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Receipt size={20} className="text-purple-500" /> บิลล่าสุด
          </h3>
          <div className="space-y-3">
            {recentBills.map((bill, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors"
              >
                <span className="text-gray-700">
                  ล็อค{" "}
                  {bill.rental_slot?.slot_number ||
                    bill.rental_contract?.rental_slot?.slot_number ||
                    "-"}
                </span>
                <span className="font-semibold text-purple-600">
                  ฿
                  {(
                    bill.total_amount ||
                    bill.totalAmount ||
                    0
                  ).toLocaleString()}
                </span>
              </div>
            ))}
            {recentBills.length === 0 && (
              <p className="text-center py-4 text-gray-400">ไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        {/* Recent Repairs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Wrench size={20} className="text-purple-500" /> งานซ่อมล่าสุด
          </h3>
          <div className="space-y-3">
            {recentRepairs.map((repair, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <span className="text-gray-700 truncate max-w-[60%]">
                  {repair.title}
                </span>
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    repair.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : repair.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {repair.status === "COMPLETED"
                    ? "เสร็จ"
                    : repair.status === "IN_PROGRESS"
                      ? "กำลังซ่อม"
                      : "รอ"}
                </span>
              </div>
            ))}
            {recentRepairs.length === 0 && (
              <p className="text-center py-4 text-gray-400">ไม่มีข้อมูล</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
