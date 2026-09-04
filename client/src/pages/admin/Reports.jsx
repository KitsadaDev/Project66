import { useEffect, useState } from "react";
import {
  Building2,
  DollarSign,
  Wrench,
  FileText,
} from "lucide-react";
import { stallsAPI, billsAPI, maintenanceAPI } from "../../api";
import { exportMaintenanceReportPDF, exportBillsReportPDF } from "../../utils/pdfExport";

const Reports = () => {
  const [data, setData] = useState({
    totalStalls: 0, occupied: 0, vacant: 0, maintenance: 0, occupancyRate: 0,
    totalBills: 0, paidBills: 0, waitingBills: 0, pendingBills: 0,
    unbilledBills: 0, targetBase: 0, paidRate: 0,
    pendingRepairs: 0, completedRepairs: 0,
    categoryList: [], slotList: [], maxSlotCount: 1,
    tableBills: [], tableRepairs: [],
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState("MONTH");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [rawStalls, setRawStalls] = useState([]);
  const [rawBills, setRawBills] = useState([]);
  const [rawRepairs, setRawRepairs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      processData(rawStalls, rawBills, rawRepairs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedDate, selectedMonth, selectedYear, loading]);

  const fetchData = async () => {
    try {
      const [stallsRes, billsRes, repairsRes] = await Promise.all([
        stallsAPI.getAll(),
        billsAPI.getAll(),
        maintenanceAPI.getAll(),
      ]);
      const stalls = stallsRes.data.data || [];
      const bills = billsRes.data.data || [];
      const repairs = repairsRes.data.data || [];
      setRawStalls(stalls);
      setRawBills(bills);
      setRawRepairs(repairs);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (stalls, allBills, allRepairs) => {
    // 1. Occupancy
    const occ = stalls.filter((s) => s.status === "OCCUPIED").length;
    const vac = stalls.filter((s) => s.status === "VACANT").length;
    const maint = stalls.filter((s) => s.status === "MAINTENANCE").length;
    const occupancyRate = stalls.length > 0 ? Math.round((occ / stalls.length) * 100) : 0;

    // 2. Filter by date range
    let currentBills = allBills;
    let currentRepairs = allRepairs;

    if (filterType === "DAY") {
      currentBills = allBills.filter((b) => (b.billing_month || b.created_at || "").startsWith(selectedDate));
      currentRepairs = allRepairs.filter((r) => (r.requested_at || "").startsWith(selectedDate));
    } else if (filterType === "MONTH") {
      currentBills = allBills.filter((b) => (b.billing_month || b.created_at || "").startsWith(selectedMonth));
      currentRepairs = allRepairs.filter((r) => (r.requested_at || "").startsWith(selectedMonth));
    } else if (filterType === "YEAR") {
      currentBills = allBills.filter((b) => (b.billing_month || b.created_at || "").startsWith(selectedYear));
      currentRepairs = allRepairs.filter((r) => (r.requested_at || "").startsWith(selectedYear));
    }

    // 3. Bills breakdown
    const paidCount = currentBills.filter((b) => b.status === "PAID").length;
    const waitingCount = currentBills.filter((b) => b.status === "WAITING_VERIFICATION" || b.status === "WAITING").length;
    const pendingCount = currentBills.filter((b) => b.status === "PENDING" || b.status === "OVERDUE").length;
    const targetBase = Math.max(occ, currentBills.length);
    const unbilledCount = Math.max(0, targetBase - currentBills.length);
    const paidRate = targetBase > 0 ? Math.round((paidCount / targetBase) * 100) : 0;

    // 4. Repairs breakdown
    const pendingRepairs = currentRepairs.filter((r) => r.status === "PENDING").length;
    const completedRepairs = currentRepairs.filter((r) => r.status === "COMPLETED").length;

    const categoryMap = {};
    const slotMap = {};
    currentRepairs.forEach((r) => {
      const cat = r.category || "อื่นๆ";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      const slotNum = (r.rental_slot && r.rental_slot.slot_number)
        ? "ล็อก " + r.rental_slot.slot_number
        : (r.slot && r.slot.slot_number)
        ? "ล็อก " + r.slot.slot_number
        : "ไม่ระบุล็อก";
      slotMap[slotNum] = (slotMap[slotNum] || 0) + 1;
    });

    const colorMap = {
      "ระบบน้ำ": "#3B82F6", "ประปา": "#3B82F6",
      "ระบบไฟ": "#F59E0B", "ไฟฟ้า": "#F59E0B",
      "อุปกรณ์": "#8B5CF6", "โครงสร้าง": "#6B7280", "อื่นๆ": "#10B981",
    };

    const categoryList = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      count: categoryMap[cat],
      percent: currentRepairs.length > 0 ? Math.round((categoryMap[cat] / currentRepairs.length) * 100) : 0,
      color: colorMap[cat] || "#80639A",
    })).sort((a, b) => b.count - a.count);

    const slotList = Object.keys(slotMap).map((slot_number) => ({
      slot_number,
      count: slotMap[slot_number],
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    const maxSlotCount = slotList.length > 0 ? Math.max(...slotList.map((s) => s.count)) : 1;

    setData({
      totalStalls: stalls.length, occupied: occ, vacant: vac, maintenance: maint, occupancyRate,
      totalBills: currentBills.length, paidBills: paidCount, waitingBills: waitingCount,
      pendingBills: pendingCount, unbilledBills: unbilledCount, targetBase, paidRate,
      pendingRepairs, completedRepairs, categoryList, slotList, maxSlotCount,
      tableBills: currentBills, tableRepairs: currentRepairs,
    });
  };

  const getFilterLabel = () => {
    if (filterType === "ALL") return "ทั้งหมด";
    if (filterType === "DAY") return selectedDate;
    if (filterType === "MONTH") return selectedMonth;
    return selectedYear;
  };

  const handleExportBills = () => {
    exportBillsReportPDF(
      data.tableBills, getFilterLabel(),
      data.paidBills, data.waitingBills, data.pendingBills,
      data.unbilledBills, data.targetBase, data.paidRate
    );
  };

  const handleExportRepairs = () => {
    exportMaintenanceReportPDF(
      data.tableRepairs, getFilterLabel(),
      data.categoryList, data.slotList, data.maxSlotCount
    );
  };

  // CSS Conic Gradient helper (for live UI)
  const getConicGradient = (slices, total) => {
    if (!total || total === 0) return "conic-gradient(#E5E7EB 100%, transparent 0)";
    let cumulative = 0;
    const stops = slices.map((slice) => {
      const start = cumulative;
      const pct = (slice.value / total) * 100;
      cumulative += pct;
      return slice.color + " " + start + "% " + cumulative + "%";
    });
    return "conic-gradient(" + stops.join(", ") + ")";
  };

  const pct = (val, total) => (total > 0 ? Math.round((val / total) * 100) : 0);

  const occupancySlices = [
    { color: "#059669", value: data.occupied },
    { color: "#D1FAE5", value: data.vacant },
    { color: "#F59E0B", value: data.maintenance },
  ];
  const billSlices = [
    { color: "#10B981", value: data.paidBills },
    { color: "#F59E0B", value: data.waitingBills },
    { color: "#EF4444", value: data.pendingBills },
    { color: "#9CA3AF", value: data.unbilledBills },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">รายงานสรุป</h1>
          <p className="text-gray-500 text-sm">ภาพรวมรายได้และสถานะของระบบ</p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 flex flex-wrap items-center gap-2 shadow-sm">
          <select
            className="px-3 py-2 rounded-lg bg-gray-50 text-sm font-medium text-gray-700 outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="DAY">รายวัน</option>
            <option value="MONTH">รายเดือน</option>
            <option value="YEAR">รายปี</option>
          </select>
          {filterType === "DAY" && (
            <input type="date" className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none"
              value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          )}
          {filterType === "MONTH" && (
            <input type="month" className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none"
              value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          )}
          {filterType === "YEAR" && (
            <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none"
              value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y + 543} ({y})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Card 1: สถานะล็อก ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Building2 size={18} className="text-gray-500" /> สถานะล็อก (Occupancy)
          </h2>
          <div className="flex justify-center mb-6">
            <div
              className="relative w-40 h-40 rounded-full flex items-center justify-center"
              style={{ background: getConicGradient(occupancySlices, data.totalStalls) }}
            >
              <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-gray-800">{data.occupancyRate}%</span>
                <span className="text-xs text-gray-500">อัตราการเช่า</span>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { color: "bg-emerald-600", label: "มีผู้เช่า", val: data.occupied, total: data.totalStalls },
              { color: "bg-emerald-100", label: "ว่าง", val: data.vacant, total: data.totalStalls },
              { color: "bg-amber-400", label: "ซ่อมบำรุง", val: data.maintenance, total: data.totalStalls },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className={"w-3 h-3 rounded-full " + row.color}></div>
                  <span className="text-gray-700">{row.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800">{row.val}</span>
                  <span className="text-gray-400 text-xs w-8 text-right">{pct(row.val, row.total)}%</span>
                </div>
              </div>
            ))}
            <div className="pt-3 mt-1 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-500">ล็อกทั้งหมด</span>
              <span className="font-bold text-gray-800">{data.totalStalls}</span>
            </div>
          </div>
        </div>

        {/* ─── Card 2: บิลและการชำระเงิน ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
            <DollarSign size={18} className="text-yellow-500" /> บิลและการชำระเงิน
          </h2>
          <div className="flex justify-center mb-6">
            <div
              className="relative w-40 h-40 rounded-full flex items-center justify-center"
              style={{ background: getConicGradient(billSlices, data.targetBase) }}
            >
              <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-gray-800">{data.paidRate}%</span>
                <span className="text-xs text-gray-500">อัตราจัดเก็บ</span>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { color: "bg-emerald-500", label: "ชำระแล้ว", val: data.paidBills, total: data.targetBase },
              { color: "bg-amber-400", label: "รอยืนยันสลิป", val: data.waitingBills, total: data.targetBase },
              { color: "bg-red-500", label: "รอชำระ", val: data.pendingBills, total: data.targetBase },
              { color: "bg-gray-400", label: "ยังไม่ออกบิล", val: data.unbilledBills, total: data.targetBase },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className={"w-3 h-3 rounded-full " + row.color}></div>
                  <span className="text-gray-700">{row.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800">{row.val}</span>
                  <span className="text-gray-400 text-xs w-8 text-right">{pct(row.val, row.total)}%</span>
                </div>
              </div>
            ))}
            <div className="pt-3 mt-1 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-500">บิลที่ออกแล้ว</span>
              <span className="font-bold text-gray-800">{data.totalBills}</span>
            </div>
          </div>
          <button
            onClick={handleExportBills}
            className="w-full mt-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-200 flex items-center justify-center gap-2 transition-colors"
          >
            <FileText size={16} /> ส่งออก PDF รายงานบิลค่าเช่า
          </button>
        </div>

        {/* ─── Card 3: งานซ่อม ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Wrench size={18} className="text-gray-500" /> งานซ่อม
          </h2>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
              <span className="text-gray-500">รอดำเนินการ</span>
              <span className={data.pendingRepairs > 0 ? "font-bold text-red-500" : "font-bold text-gray-800"}>
                {data.pendingRepairs}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
              <span className="text-gray-500">เสร็จสิ้น</span>
              <span className="font-bold text-gray-800">{data.completedRepairs}</span>
            </div>
          </div>

          <div className="flex-1">
            {data.categoryList.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-4 rounded-full bg-amber-200"></div>
                  <h3 className="text-sm font-bold text-gray-700">ประเภทงานที่แจ้งซ่อมบ่อย</h3>
                </div>
                {data.categoryList.map((item) => (
                  <div key={item.category} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700">{item.category} ({item.count} ครั้ง)</span>
                      <span className="text-gray-500 font-bold">{item.percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: item.percent + "%", backgroundColor: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data.slotList.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">ล็อกที่แจ้งซ่อมบ่อยที่สุด</h3>
                {data.slotList.map((item, index) => (
                  <div key={item.slot_number} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700">{index + 1}. {item.slot_number}</span>
                      <span className="text-purple-600 font-bold">{item.count} ครั้ง</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full"
                        style={{ width: pct(item.count, data.maxSlotCount) + "%" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleExportRepairs}
            className="w-full mt-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold rounded-xl border border-purple-200 flex items-center justify-center gap-2 transition-colors"
          >
            <FileText size={16} /> ส่งออก PDF รายงานแจ้งซ่อม
          </button>
        </div>

      </div>
    </div>
  );
};

export default Reports;
