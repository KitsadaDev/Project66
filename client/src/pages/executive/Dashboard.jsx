import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Receipt,
  Wrench,
  DollarSign,
  Calendar,
  RefreshCw,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { stallsAPI, usersAPI, billsAPI, maintenanceAPI } from "../../api";

const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [selectedFoodCourt, setSelectedFoodCourt] = useState("ALL"); // 'ALL' | '1' | '2'
  const [globalMonth, setGlobalMonth] = useState("ALL"); // 'ALL' | 'YYYY-MM'
  const [financeMonth, setFinanceMonth] = useState("SYNC"); // 'SYNC' | 'ALL' | 'YYYY-MM'

  // Month Picker Modal States
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState("FINANCE"); // 'FINANCE' | 'GLOBAL'
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Raw fetched data
  const [rawStalls, setRawStalls] = useState([]);
  const [rawTenants, setRawTenants] = useState([]);
  const [rawBills, setRawBills] = useState([]);
  const [rawRepairs, setRawRepairs] = useState([]);

  // Filtered / Computed Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState({
    totalStalls: 0,
    occupiedStalls: 0,
    vacantStalls: 0,
    maintenanceStalls: 0,
    occupancyRate: 0,
    totalTenants: 0,
    totalRevenue: 0,
    totalBilled: 0,
    pendingAmount: 0,
    collectionRate: 0,
    pendingBillsCount: 0,
    pendingRepairsCount: 0,
    finRevenue: 0,
    finBilled: 0,
    finPending: 0,
    finRate: 0,
    effectiveFinanceMonth: "ALL",
    // Food Court 1 Breakdown
    fc1Total: 0,
    fc1Occupied: 0,
    fc1Vacant: 0,
    fc1Maint: 0,
    fc1Rate: 0,
    // Food Court 2 Breakdown
    fc2Total: 0,
    fc2Occupied: 0,
    fc2Vacant: 0,
    fc2Maint: 0,
    fc2Rate: 0,
  });

  const [activeBillsList, setActiveBillsList] = useState([]);
  const [activeRepairsList, setActiveRepairsList] = useState([]);
  const [pendingBillsWatchlist, setPendingBillsWatchlist] = useState([]);
  const [pendingRepairsWatchlist, setPendingRepairsWatchlist] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      computeStats(rawStalls, rawTenants, rawBills, rawRepairs, selectedFoodCourt, globalMonth, financeMonth);
    }
  }, [selectedFoodCourt, globalMonth, financeMonth, loading]);

  const fetchData = async () => {
    setLoading(true);
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

      setRawStalls(stalls);
      setRawTenants(tenants);
      setRawBills(bills);
      setRawRepairs(repairs);

      computeStats(stalls, tenants, bills, repairs, selectedFoodCourt, globalMonth, financeMonth);
    } catch (error) {
      console.error("Error fetching executive dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSlotFoodCourtId = (item) => {
    return (
      item.rental_slot?.food_court_id ||
      item.slot?.food_court_id ||
      item.contract?.slot?.food_court_id ||
      item.rental_contract?.rental_slot?.food_court_id ||
      null
    );
  };

  const availableMonths = Array.from(
    new Set(
      rawBills
        .map((b) => {
          const dStr = b.billing_month || b.created_at;
          if (!dStr) return null;
          const d = new Date(dStr);
          return isNaN(d.getTime())
            ? null
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })
        .filter(Boolean)
    )
  ).sort().reverse();

  const formatMonthTH = (ym) => {
    if (ym === "ALL") return "ทุกช่วงเวลา (สะสม)";
    const [y, m] = ym.split("-");
    const monthNames = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${monthNames[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`;
  };

  const formatButtonMonth = (ym, isFinance = false) => {
    if (isFinance && ym === "SYNC") {
      return "ตามภาพรวม";
    }
    if (ym === "ALL") {
      return "ทุกช่วงเวลา";
    }
    const [y, m] = ym.split("-");
    const monthNames = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${monthNames[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`;
  };

  const openMonthPicker = (target) => {
    setPickerTarget(target);
    const activeVal = target === "GLOBAL" ? globalMonth : (financeMonth === "SYNC" ? globalMonth : financeMonth);
    if (activeVal !== "ALL" && activeVal !== "SYNC") {
      const [y] = activeVal.split("-");
      setPickerYear(parseInt(y, 10));
    } else {
      setPickerYear(new Date().getFullYear());
    }
    setIsMonthPickerOpen(true);
  };

  const handleSelectMonth = (monthIndex) => {
    const ym = `${pickerYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    if (pickerTarget === "GLOBAL") {
      setGlobalMonth(ym);
    } else {
      setFinanceMonth(ym);
    }
    setIsMonthPickerOpen(false);
  };

  const handleSelectAll = () => {
    if (pickerTarget === "GLOBAL") {
      setGlobalMonth("ALL");
    } else {
      setFinanceMonth("ALL");
    }
    setIsMonthPickerOpen(false);
  };

  const handleSelectSync = () => {
    setFinanceMonth("SYNC");
    setIsMonthPickerOpen(false);
  };

  const computeStats = (stalls, tenants, bills, repairs, fcFilter, gMonth = globalMonth, fMonth = financeMonth) => {
    // 1. Food Court 1 & 2 Static Breakdown
    const fc1Stalls = stalls.filter((s) => s.food_court_id === 1);
    const fc1Occupied = fc1Stalls.filter(
      (s) => (s.status || "").toUpperCase() === "OCCUPIED"
    ).length;
    const fc1Vacant = fc1Stalls.filter(
      (s) => (s.status || "").toUpperCase() === "VACANT"
    ).length;
    const fc1Maint = fc1Stalls.filter(
      (s) => (s.status || "").toUpperCase() === "MAINTENANCE"
    ).length;
    const fc1Rate =
      fc1Stalls.length > 0 ? Math.round((fc1Occupied / fc1Stalls.length) * 100) : 0;

    const fc2Stalls = stalls.filter((s) => s.food_court_id === 2);
    const fc2Occupied = fc2Stalls.filter(
      (s) => (s.status || "").toUpperCase() === "OCCUPIED"
    ).length;
    const fc2Vacant = fc2Stalls.filter(
      (s) => (s.status || "").toUpperCase() === "VACANT"
    ).length;
    const fc2Maint = fc2Stalls.filter(
      (s) => (s.status || "").toUpperCase() === "MAINTENANCE"
    ).length;
    const fc2Rate =
      fc2Stalls.length > 0 ? Math.round((fc2Occupied / fc2Stalls.length) * 100) : 0;

    // 2. Filtered subset according to selectedFoodCourt
    let currentStalls = stalls;
    let currentBills = bills;
    let currentRepairs = repairs;

    if (fcFilter === "1") {
      currentStalls = stalls.filter((s) => s.food_court_id === 1);
      currentBills = bills.filter((b) => getSlotFoodCourtId(b) === 1);
      currentRepairs = repairs.filter((r) => getSlotFoodCourtId(r) === 1);
    } else if (fcFilter === "2") {
      currentStalls = stalls.filter((s) => s.food_court_id === 2);
      currentBills = bills.filter((b) => getSlotFoodCourtId(b) === 2);
      currentRepairs = repairs.filter((r) => getSlotFoodCourtId(r) === 2);
    }

    // 3. Stalls Occupancy
    const occupied = currentStalls.filter(
      (s) => (s.status || "").toUpperCase() === "OCCUPIED"
    ).length;
    const vacant = currentStalls.filter(
      (s) => (s.status || "").toUpperCase() === "VACANT"
    ).length;
    const maintenance = currentStalls.filter(
      (s) => (s.status || "").toUpperCase() === "MAINTENANCE"
    ).length;
    const occupancyRate =
      currentStalls.length > 0
        ? Math.round((occupied / currentStalls.length) * 100)
        : 0;

    // Helper for month checking
    const isBillInMonth = (bill, ym) => {
      if (ym === "ALL") return true;
      const dStr = bill.billing_month || bill.created_at;
      if (!dStr) return false;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return false;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === ym;
    };

    // Global bills subset
    const globalBills = currentBills.filter((b) => isBillInMonth(b, gMonth));

    // Finance bills subset
    const effectiveFinanceMonth = fMonth === "SYNC" ? gMonth : fMonth;
    const financeBills = currentBills.filter((b) => isBillInMonth(b, effectiveFinanceMonth));

    // 4. Financial Calculations for Global (KPI 1)
    let totalRevenue = 0;
    let totalBilled = 0;
    let pendingAmount = 0;

    globalBills.forEach((b) => {
      const amount = Number(b.total_amount || b.totalAmount || 0);
      totalBilled += amount;
      if (b.status === "PAID") {
        totalRevenue += amount;
      } else if (
        b.status === "PENDING" ||
        b.status === "OVERDUE" ||
        b.status === "WAITING_VERIFICATION"
      ) {
        pendingAmount += amount;
      }
    });

    const collectionRate =
      totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : 0;

    // Financial Calculations for Finance Card (Card 3)
    let finRevenue = 0;
    let finBilled = 0;
    let finPending = 0;

    financeBills.forEach((b) => {
      const amount = Number(b.total_amount || b.totalAmount || 0);
      finBilled += amount;
      if (b.status === "PAID") {
        finRevenue += amount;
      } else if (
        b.status === "PENDING" ||
        b.status === "OVERDUE" ||
        b.status === "WAITING_VERIFICATION"
      ) {
        finPending += amount;
      }
    });

    const finRate =
      finBilled > 0 ? Math.round((finRevenue / finBilled) * 100) : 0;

    // 5. Pending items
    const pendingBills = globalBills.filter(
      (b) =>
        b.status === "PENDING" ||
        b.status === "OVERDUE" ||
        b.status === "WAITING_VERIFICATION"
    );
    const pendingRepairs = currentRepairs.filter(
      (r) => r.status === "PENDING" || r.status === "IN_PROGRESS"
    );

    setDashboardStats({
      totalStalls: currentStalls.length,
      occupiedStalls: occupied,
      vacantStalls: vacant,
      maintenanceStalls: maintenance,
      occupancyRate,
      totalTenants: tenants.length,
      totalRevenue,
      totalBilled,
      pendingAmount,
      collectionRate,
      pendingBillsCount: pendingBills.length,
      pendingRepairsCount: pendingRepairs.length,
      finRevenue,
      finBilled,
      finPending,
      finRate,
      effectiveFinanceMonth,
      fc1Total: fc1Stalls.length,
      fc1Occupied,
      fc1Vacant,
      fc1Maint,
      fc1Rate,
      fc2Total: fc2Stalls.length,
      fc2Occupied,
      fc2Vacant,
      fc2Maint,
      fc2Rate,
    });

    setActiveBillsList(currentBills.slice(0, 5));
    setActiveRepairsList(currentRepairs.slice(0, 5));
    setPendingBillsWatchlist(pendingBills.slice(0, 4));
    setPendingRepairsWatchlist(pendingRepairs.slice(0, 4));
  };

  // Conic Gradient for Donut Chart (Matching Admin)
  const getConicGradient = (slices, total) => {
    if (!total || total === 0)
      return "conic-gradient(#E5E7EB 100%, transparent 0)";
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
    { color: "#059669", value: dashboardStats.occupiedStalls },
    { color: "#D1FAE5", value: dashboardStats.vacantStalls },
    { color: "#F59E0B", value: dashboardStats.maintenanceStalls },
  ];

  const currentDateText = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">กำลังโหลดข้อมูลผู้บริหาร...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. Executive Header & Controls ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ระบบทำงานปกติ
            </span>
            <span className="text-gray-400 text-xs flex items-center gap-1">
              <Calendar size={13} /> {currentDateText}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-800 tracking-tight">
            ภาพรวมระบบบริหารจัดการ
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            รายงานตัวชี้วัดประสิทธิภาพ (KPIs)
          </p>
        </div>

        {/* Filter Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Food Court Switcher Tabs */}
          <div className="bg-gray-100/80 p-1 rounded-2xl flex items-center border border-gray-200/60">
            {[
              { key: "ALL", label: "ภาพรวมทั้งหมด" },
              { key: "1", label: "ศูนย์อาหาร 1" },
              { key: "2", label: "ศูนย์อาหาร 2" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedFoodCourt(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  selectedFoodCourt === tab.key
                    ? "bg-white text-purple-700 shadow-sm font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Global Month Filter Button */}
          <button
            type="button"
            onClick={() => openMonthPicker("GLOBAL")}
            className="bg-gray-100/80 hover:bg-gray-200/80 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 border border-gray-200/60 shadow-xs text-xs font-bold text-gray-700 transition-all cursor-pointer active:scale-95"
          >
            <Calendar size={14} className="text-purple-600" />
            <span className="text-[11px] text-gray-500 font-medium">รอบเดือน:</span>
            <span>{formatButtonMonth(globalMonth)}</span>
            <ChevronDown size={13} className="text-gray-400 ml-0.5" />
          </button>

          <button
            onClick={fetchData}
            title="รีเฟรชข้อมูล"
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* ─── 2. Key Performance Indicators (KPI Cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: รายได้ที่จัดเก็บได้ */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                รายได้ที่จัดเก็บได้
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                <DollarSign size={20} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">
              ฿{dashboardStats.totalRevenue.toLocaleString()}
            </h2>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">
                เป้าหมาย ฿{dashboardStats.totalBilled.toLocaleString()}
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                {dashboardStats.collectionRate}% สำเร็จ
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: อัตราการเช่าแผงค้า */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                อัตราการครองแผงค้า
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                <Building2 size={20} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">
              {dashboardStats.occupancyRate}%
            </h2>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">
                มีผู้เช่า {dashboardStats.occupiedStalls} จาก {dashboardStats.totalStalls} ล็อค
              </span>
              <span className="font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                ว่าง {dashboardStats.vacantStalls}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: ผู้เช่าในระบบ */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                ผู้เช่าในระบบ
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                <Users size={20} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">
              {dashboardStats.totalTenants}{" "}
              <span className="text-base font-normal text-gray-500">ราย</span>
            </h2>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">บัญชีผู้เช่าที่ลงทะเบียน</span>
              <Link
                to="/executive/tenants"
                className="font-bold text-blue-600 hover:underline flex items-center"
              >
                ดูทั้งหมด <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* KPI 4: รายการที่ต้องติดตาม */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                รายการที่ต้องติดตาม
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                <AlertTriangle size={20} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
              {dashboardStats.pendingBillsCount + dashboardStats.pendingRepairsCount}{" "}
              <span className="text-base font-normal text-gray-500">เรื่อง</span>
            </h2>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold">
              <span className="text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                บิลค้าง {dashboardStats.pendingBillsCount}
              </span>
              <span className="text-red-700 bg-red-100/70 px-2 py-0.5 rounded-md">
                งานซ่อม {dashboardStats.pendingRepairsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Core Analytics Grid (3 Columns) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Donut Chart สถานะล็อค (Occupancy) - Matching Admin */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-5">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap shrink-0">
                <Building2 size={18} className="text-purple-600 shrink-0" /> สถานะล็อค (Occupancy)
              </h2>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                {selectedFoodCourt === "ALL"
                  ? "ทุกศูนย์อาหาร"
                  : `ศูนย์อาหาร ${selectedFoodCourt}`}
              </span>
            </div>

            {/* Donut Graphic */}
            <div className="flex justify-center my-4">
              <div
                className="relative w-44 h-44 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105 shadow-sm"
                style={{
                  background: getConicGradient(
                    occupancySlices,
                    dashboardStats.totalStalls
                  ),
                }}
              >
                <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-3xl font-black text-gray-800">
                    {dashboardStats.occupancyRate}%
                  </span>
                  <span className="text-xs text-gray-400 font-medium">อัตราการเช่า</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-2.5 pt-2">
            {[
              {
                color: "bg-emerald-600",
                label: "มีผู้เช่าแล้ว",
                val: dashboardStats.occupiedStalls,
                total: dashboardStats.totalStalls,
              },
              {
                color: "bg-emerald-100 border border-emerald-300",
                label: "ว่าง (พร้อมเช่า)",
                val: dashboardStats.vacantStalls,
                total: dashboardStats.totalStalls,
              },
              {
                color: "bg-amber-400",
                label: "ปิดซ่อมบำรุง",
                val: dashboardStats.maintenanceStalls,
                total: dashboardStats.totalStalls,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className={"w-3.5 h-3.5 rounded-full " + row.color}></div>
                  <span className="text-gray-700">{row.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800">{row.val} ล็อค</span>
                  <span className="text-gray-400 text-xs w-10 text-right">
                    {pct(row.val, row.total)}%
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-3 mt-2 border-t border-gray-100 flex justify-between items-center text-sm font-semibold">
              <span className="text-gray-500">จำนวนแผงค้าทั้งหมด</span>
              <span className="text-gray-800 font-bold">{dashboardStats.totalStalls} ล็อค</span>
            </div>

            <Link
              to="/executive/stalls"
              className="mt-3 w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              ดูแผนผังแผงค้า <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: เปรียบเทียบศูนย์อาหาร 1 vs ศูนย์อาหาร 2 */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-5">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap shrink-0">
                <BarChart3 size={18} className="text-blue-600 shrink-0" /> เปรียบเทียบศูนย์อาหาร
              </h2>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">
                FC1 vs FC2
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              เปรียบเทียบสัดส่วนและอัตราการเช่าของศูนย์อาหารทั้งสองแห่งเพื่อประเมินผลการดำเนินงาน
            </p>

            {/* FC1 Comparison Box */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <span className="font-bold text-gray-800 text-sm">ศูนย์อาหาร 1</span>
                </div>
                <span className="text-sm font-extrabold text-purple-700">
                  {dashboardStats.fc1Rate}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${dashboardStats.fc1Rate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>มีผู้เช่า: <strong className="text-gray-700">{dashboardStats.fc1Occupied}</strong>/{dashboardStats.fc1Total}</span>
                <span>ว่าง: <strong className="text-gray-700">{dashboardStats.fc1Vacant}</strong></span>
                <span>ซ่อม: <strong className="text-gray-700">{dashboardStats.fc1Maint}</strong></span>
              </div>
            </div>

            {/* FC2 Comparison Box */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="font-bold text-gray-800 text-sm">ศูนย์อาหาร 2</span>
                </div>
                <span className="text-sm font-extrabold text-blue-700">
                  {dashboardStats.fc2Rate}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${dashboardStats.fc2Rate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>มีผู้เช่า: <strong className="text-gray-700">{dashboardStats.fc2Occupied}</strong>/{dashboardStats.fc2Total}</span>
                <span>ว่าง: <strong className="text-gray-700">{dashboardStats.fc2Vacant}</strong></span>
                <span>ซ่อม: <strong className="text-gray-700">{dashboardStats.fc2Maint}</strong></span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">ศูนย์อาหารที่มีอัตราเช่าสูงสุด:</span>
            <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
              {dashboardStats.fc1Rate >= dashboardStats.fc2Rate
                ? "ศูนย์อาหาร 1"
                : "ศูนย์อาหาร 2"}
            </span>
          </div>
        </div>

        {/* Card 3: สรุปสถานะการเงินและการจัดเก็บ (Financial Health) */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap shrink-0">
                <Receipt size={18} className="text-emerald-600 shrink-0" /> สถานะการเงิน & จัดเก็บ
              </h2>
              {/* Month Picker Button for Card 3 */}
              <button
                type="button"
                onClick={() => openMonthPicker("FINANCE")}
                className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
              >
                <Calendar size={13} className="text-emerald-600 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[110px]">
                  {formatButtonMonth(financeMonth, true)}
                </span>
                <ChevronDown size={13} className="text-emerald-600 shrink-0" />
              </button>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/70 mb-5">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-xs text-emerald-800 font-medium block">
                    ยอดจัดเก็บสำเร็จ {dashboardStats.effectiveFinanceMonth !== "ALL" ? `(${formatMonthTH(dashboardStats.effectiveFinanceMonth)})` : ""}
                  </span>
                  <h3 className="text-2xl font-extrabold text-emerald-700">
                    ฿{dashboardStats.finRevenue.toLocaleString()}
                  </h3>
                </div>
                <span className="text-lg font-black text-emerald-700">
                  {dashboardStats.finRate}%
                </span>
              </div>
              <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${dashboardStats.finRate}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-500" /> ชำระแล้ว
                </span>
                <span className="font-bold text-emerald-700">
                  ฿{dashboardStats.finRevenue.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Clock size={15} className="text-amber-500" /> ค้างชำระ / รอตรวจ
                </span>
                <span className="font-bold text-amber-600">
                  ฿{dashboardStats.finPending.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <DollarSign size={15} className="text-gray-400" /> ยอดเรียกเก็บทั้งหมด
                </span>
                <span className="font-bold text-gray-800">
                  ฿{dashboardStats.finBilled.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/executive/bills"
            className="mt-4 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            ดูรายงานบิลทั้งหมด <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* ─── 4. Executive Watchlist: สิ่งที่ต้องติดตาม (Pending Bills & Repairs) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* กล่องรายการบิลค้างชำระที่ต้องติดตาม */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                <AlertTriangle size={18} className="text-amber-500" /> บิลค้างชำระ / รอยืนยัน
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">รายการบิลที่ยังไม่ปิดยอดชำระ</p>
            </div>
            <Link
              to="/executive/bills"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center"
            >
              ดูทั้งหมด ({dashboardStats.pendingBillsCount}) <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {pendingBillsWatchlist.map((bill, index) => {
              const slotNo =
                bill.rental_slot?.slot_number ||
                bill.slot?.slot_number ||
                bill.contract?.slot?.slot_number ||
                bill.rental_contract?.rental_slot?.slot_number ||
                "-";
              const tenantName =
                bill.contract?.tenant?.first_name
                  ? `${bill.contract.tenant.first_name} ${bill.contract.tenant.last_name || ""}`.trim()
                  : bill.tenant_name || "ผู้เช่า";
              const isOverdue = bill.status === "OVERDUE";
              const isWaiting = bill.status === "WAITING_VERIFICATION";

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 hover:bg-amber-50/50 transition-colors border border-gray-100 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                      {slotNo}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800 text-xs sm:text-sm">{tenantName}</p>
                      <span className="text-[11px] text-gray-400 block">
                        เดือน{" "}
                        {bill.billing_month
                          ? new Date(bill.billing_month).toLocaleDateString("th-TH", {
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-gray-800 block text-xs sm:text-sm">
                      ฿{Number(bill.total_amount || bill.totalAmount || 0).toLocaleString()}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isOverdue
                          ? "bg-red-100 text-red-700"
                          : isWaiting
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isOverdue ? "เกินกำหนด" : isWaiting ? "รอตรวจสลิป" : "รอชำระ"}
                    </span>
                  </div>
                </div>
              );
            })}

            {pendingBillsWatchlist.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 size={28} className="text-emerald-500 opacity-60" />
                <span>ไม่มีบิลค้างชำระในขณะนี้</span>
              </div>
            )}
          </div>
        </div>

        {/* กล่องรายการงานซ่อมบำรุงที่รอดำเนินการ */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                <Wrench size={18} className="text-red-500" /> งานซ่อมที่รอดำเนินการ
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">คำร้องขอแจ้งซ่อมที่ยังไม่เสร็จสิ้น</p>
            </div>
            <Link
              to="/executive/repairs"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center"
            >
              ดูทั้งหมด ({dashboardStats.pendingRepairsCount}) <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {pendingRepairsWatchlist.map((repair, index) => {
              const slotNo =
                repair.slot?.slot_number ||
                repair.rental_slot?.slot_number ||
                "-";
              const inProgress = repair.status === "IN_PROGRESS";

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 hover:bg-red-50/40 transition-colors border border-gray-100 text-sm"
                >
                  <div className="flex items-center gap-3 max-w-[70%]">
                    <span className="w-9 h-9 rounded-xl bg-red-50 text-red-700 font-bold text-xs flex items-center justify-center">
                      {slotNo}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-gray-800 text-xs sm:text-sm truncate">
                        {repair.title}
                      </p>
                      <span className="text-[11px] text-gray-400 block">
                        หมวด: {repair.category || "ทั่วไป"} •{" "}
                        {repair.requested_at
                          ? new Date(repair.requested_at).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      inProgress
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {inProgress ? "กำลังซ่อม" : "รอดำเนินการ"}
                  </span>
                </div>
              );
            })}

            {pendingRepairsWatchlist.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 size={28} className="text-emerald-500 opacity-60" />
                <span>ไม่มีงานซ่อมค้างในขณะนี้</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 5. Recent Activity Logs (Tables) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* บิลล่าสุด */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-base">
            <Receipt size={18} className="text-purple-600" /> ประวัติบิลล่าสุด
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="pb-3 font-semibold">ล็อค</th>
                  <th className="pb-3 font-semibold">รอบเดือน</th>
                  <th className="pb-3 font-semibold">ยอดชำระ</th>
                  <th className="pb-3 font-semibold text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeBillsList.map((bill, index) => {
                  const slotNo =
                    bill.rental_slot?.slot_number ||
                    bill.slot?.slot_number ||
                    bill.contract?.slot?.slot_number ||
                    bill.rental_contract?.rental_slot?.slot_number ||
                    "-";
                  return (
                    <tr key={index} className="hover:bg-gray-50/60">
                      <td className="py-3 font-bold text-purple-700">ล็อค {slotNo}</td>
                      <td className="py-3 text-gray-600">
                        {bill.billing_month
                          ? new Date(bill.billing_month).toLocaleDateString("th-TH", {
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="py-3 font-bold text-gray-800">
                        ฿{Number(bill.total_amount || bill.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : bill.status === "OVERDUE"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {bill.status === "PAID"
                            ? "ชำระแล้ว"
                            : bill.status === "OVERDUE"
                            ? "เกินกำหนด"
                            : "รอชำระ"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {activeBillsList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      ไม่มีข้อมูลบิล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* งานซ่อมล่าสุด */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-base">
            <Wrench size={18} className="text-purple-600" /> ประวัติงานซ่อมล่าสุด
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="pb-3 font-semibold">ล็อค</th>
                  <th className="pb-3 font-semibold">รายการ</th>
                  <th className="pb-3 font-semibold">หมวดหมู่</th>
                  <th className="pb-3 font-semibold text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRepairsList.map((repair, index) => {
                  const slotNo =
                    repair.slot?.slot_number ||
                    repair.rental_slot?.slot_number ||
                    "-";
                  return (
                    <tr key={index} className="hover:bg-gray-50/60">
                      <td className="py-3 font-bold text-purple-700">ล็อค {slotNo}</td>
                      <td className="py-3 text-gray-800 font-medium max-w-[140px] truncate">
                        {repair.title}
                      </td>
                      <td className="py-3 text-gray-500">{repair.category || "ทั่วไป"}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            repair.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : repair.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {repair.status === "COMPLETED"
                            ? "เสร็จสิ้น"
                            : repair.status === "IN_PROGRESS"
                            ? "กำลังซ่อม"
                            : "รอดำเนินการ"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {activeRepairsList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      ไม่มีข้อมูลงานซ่อม
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 6. Quick Navigation Shortcuts ─── */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold">ระบบรายงานและเมนูลัดสำหรับผู้บริหาร</h4>
            <p className="text-purple-200 text-xs mt-1">
              เข้าถึงรายละเอียดข้อมูลแต่ละโมดูลได้โดยตรง
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/executive/stalls"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Building2 size={15} /> ผังแผงค้า
            </Link>
            <Link
              to="/executive/tenants"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Users size={15} /> ข้อมูลผู้เช่า
            </Link>
            <Link
              to="/executive/contracts"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Receipt size={15} /> สัญญาเช่า
            </Link>
            <Link
              to="/executive/bills"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <DollarSign size={15} /> บิลและรายได้
            </Link>
            <Link
              to="/executive/repairs"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Wrench size={15} /> งานซ่อมบำรุง
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Month Picker Modal ─── */}
      {isMonthPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMonthPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xs sm:max-w-sm p-6 relative border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <Calendar size={18} className="text-purple-600" />
                  เลือกช่วงเวลาเดือน
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pickerTarget === "FINANCE"
                    ? "สำหรับสถานะการเงินและการจัดเก็บ"
                    : "สำหรับภาพรวมระบบทั้งหมด"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2 mb-4">
              {pickerTarget === "FINANCE" && (
                <button
                  type="button"
                  onClick={handleSelectSync}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                    financeMonth === "SYNC"
                      ? "bg-purple-50 text-purple-700 border-purple-300 ring-2 ring-purple-100"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    🔗 อิงตามภาพรวมระบบ
                  </span>
                  <span className="text-[11px] font-normal text-gray-500">
                    ({formatMonthTH(globalMonth)})
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSelectAll}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                  (pickerTarget === "FINANCE" ? financeMonth : globalMonth) === "ALL"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                <span>ทุกช่วงเวลา (ยอดสะสมทั้งหมด)</span>
                {(pickerTarget === "FINANCE" ? financeMonth : globalMonth) === "ALL" && (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                )}
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl mb-4 border border-gray-100">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-gray-100 text-gray-600 shadow-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <span className="text-sm font-extrabold text-gray-800 block">
                  พ.ศ. {pickerYear + 543}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  (ค.ศ. {pickerYear})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-gray-100 text-gray-600 shadow-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.",
                "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.",
                "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
              ].map((mName, mIdx) => {
                const ym = `${pickerYear}-${String(mIdx + 1).padStart(2, "0")}`;
                const currentActive =
                  pickerTarget === "FINANCE"
                    ? (financeMonth === "SYNC" ? globalMonth : financeMonth)
                    : globalMonth;
                const isSelected = currentActive === ym && (pickerTarget !== "FINANCE" || financeMonth !== "SYNC");
                const hasData = availableMonths.includes(ym);

                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => handleSelectMonth(mIdx)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-md scale-105"
                        : hasData
                        ? "bg-white hover:bg-purple-50 text-gray-800 border border-gray-200 hover:border-purple-200"
                        : "bg-gray-50/70 hover:bg-gray-100 text-gray-400 border border-dashed border-gray-200"
                    }`}
                  >
                    <span>{mName}</span>
                    {hasData && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-3">
              🟢 จุดสีเขียวแสดงเดือนที่มีรายการบิลในระบบ
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
