import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  Receipt,
  Wrench,
  TrendingUp,
  DollarSign,
  AlertCircle,
  FileBarChart,
} from "lucide-react";
import { stallsAPI, usersAPI, billsAPI, maintenanceAPI } from "../../api";

const Reports = () => {
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
  const [allBills, setAllBills] = useState([]); // Store all bills to filter locally

  // Filter States
  const [filterType, setFilterType] = useState("ALL"); // ALL, DAY, MONTH, YEAR
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );

  useEffect(() => {
    fetchData();
  }, []);

  // Re-calculate revenue when filter changes
  useEffect(() => {
    if (allBills.length > 0) {
      calculateStats(allBills);
    }
  }, [filterType, selectedDate, selectedMonth, selectedYear, allBills]);

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

      setAllBills(bills);
      setRecentBills(bills.slice(0, 5));

      const occupied = stalls.filter((s) => s.status === "OCCUPIED").length;

      // Initial stats (won't change with filter except revenue/bills)
      setStats((prev) => ({
        ...prev,
        totalStalls: stalls.length,
        occupiedStalls: occupied,
        vacantStalls: stalls.length - occupied,
        totalTenants: tenants.length,
        pendingRepairs: repairs.filter((r) => r.status === "PENDING").length,
        // pendingBills and totalRevenue will be updated by calculateStats
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bills) => {
    let filteredBills = bills;

    if (filterType === "DAY") {
      filteredBills = bills.filter((b) =>
        b.paymentDate?.startsWith(selectedDate),
      );
    } else if (filterType === "MONTH") {
      // Filter by bill cycle month (month field in DB is usually YYYY-MM-01)
      // OR by payment date? Usually Report means "Income received in that month"
      // Let's stick to Bill Month for now as it represents the cycle,
      // BUT user said "Summary Day/Month", implying Cash Flow?
      // "Total Payment" implies money received.
      // Let's filter by `paymentDate` if status is PAID, otherwise use `dueDate`?
      // Actually, for "Total Payment", we should only count PAID bills.
      // And we should filter by WHEN it was paid.
      // If the user wants to see "Bill for Jan", that's different from "Money received in Jan".
      // Given "ยอดชำระทั้งหมด" (Total Payment), I will filter PAID bills by their paymentDate if available,
      // or falling back to bill Month if we just want to track by cycle.
      // Let's use Bill Month for simplicity for now as Month/Year filter usually refers to the Accounting Period (The Bill's Month).

      filteredBills = bills.filter((b) => b.month.startsWith(selectedMonth));
    } else if (filterType === "YEAR") {
      filteredBills = bills.filter((b) => b.month.startsWith(selectedYear));
    }

    const paidBills = filteredBills.filter((b) => b.status === "PAID");
    const totalRevenue = paidBills.reduce(
      (sum, b) => sum + (b.total_amount || b.totalAmount || 0),
      0,
    );

    const pendingBills = filteredBills.filter(
      (b) => b.status === "PENDING",
    ).length;

    setStats((prev) => ({
      ...prev,
      totalRevenue,
      pendingBills,
    }));
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
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">รายงานสรุป</h1>
          <p className="text-gray-500 text-sm">ภาพรวมรายได้และสถานะของระบบ</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 flex flex-wrap items-center gap-2 shadow-sm">
          <select
            className="px-3 py-2 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-purple-100 text-sm font-medium text-gray-700 outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="DAY">รายวัน</option>
            <option value="MONTH">รายเดือน</option>
            <option value="YEAR">รายปี</option>
          </select>

          {filterType === "DAY" && (
            <input
              type="date"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-purple-400"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {filterType === "MONTH" && (
            <input
              type="month"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-purple-400"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          )}

          {filterType === "YEAR" && (
            <select
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-purple-400"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y + 543} ({y})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Revenue & Pending (High Priority) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {filterType === "ALL"
                  ? "ยอดชำระทั้งหมด"
                  : filterType === "DAY"
                    ? "ยอดชำระประจำวัน"
                    : filterType === "MONTH"
                      ? "ยอดชำระประจำเดือน"
                      : "ยอดชำระประจำปี"}
              </p>
              <h2 className="text-3xl font-bold text-green-600">
                ฿{stats.totalRevenue.toLocaleString()}
              </h2>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
            <p className="text-sm text-gray-400">
              จากบิลที่ชำระแล้วในช่วงเวลาที่เลือก
            </p>
            {filterType !== "ALL" && (
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                {filterType === "DAY"
                  ? new Date(selectedDate).toLocaleDateString("th-TH")
                  : filterType === "MONTH"
                    ? new Date(selectedMonth).toLocaleDateString("th-TH", {
                        month: "long",
                        year: "numeric",
                      })
                    : selectedYear}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">รายการที่ต้องดำเนินการ</p>
              <div className="flex gap-4 mt-1">
                <div>
                  <span className="text-2xl font-bold text-orange-500 block">
                    {stats.pendingBills}
                  </span>
                  <span className="text-xs text-gray-500">
                    บิลรอชำระ (ช่วงที่เลือก)
                  </span>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div>
                  <span className="text-2xl font-bold text-red-500 block">
                    {stats.pendingRepairs}
                  </span>
                  <span className="text-xs text-gray-500">
                    แจ้งซ่อมใหม่ (ทั้งหมด)
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-sm text-gray-400">สิ่งที่ต้องจัดการโดยเร็ว</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Building2 size={20} />
            </div>
            <span className="text-gray-500 text-sm">แผงค้าทั้งหมด</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {stats.totalStalls}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-gray-500 text-sm">กำลังเช่าอยู่</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {stats.occupiedStalls}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg">
              <Building2 size={20} />
            </div>
            <span className="text-gray-500 text-sm">ว่าง</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {stats.vacantStalls}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
            <span className="text-gray-500 text-sm">ผู้เช่า</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {stats.totalTenants}
          </p>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Receipt size={20} className="text-purple-500" /> บิลล่าสุดที่ออก
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">เดือน</th>
                <th className="px-4 py-3">ล็อก</th>
                <th className="px-4 py-3">ยอดเงิน</th>
                <th className="px-4 py-3 rounded-r-lg">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBills.map((bill) => (
                <tr key={bill.expense_id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {new Date(bill.billing_month).toLocaleDateString("th-TH", {
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold">
                      {bill.rental_slot?.slot_number ||
                        bill.rental_contract?.rental_slot?.slot_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    ฿{(bill.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        bill.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : bill.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {bill.status === "PAID"
                        ? "จ่ายแล้ว"
                        : bill.status === "PENDING"
                          ? "รอจ่าย"
                          : "เกินกำหนด"}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBills.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400">
                    ยังไม่มีข้อมูลบิล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
