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
  ChevronUp,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Droplets,
  Zap,
  Search,
  Store,
} from "lucide-react";
import { stallsAPI, usersAPI, billsAPI, maintenanceAPI } from "../../api";

/**
 * คอมโพเนนต์แดชบอร์ดรายงานผลสำหรับผู้บริหารระดับสูง (Executive Dashboard)
 * - รวบรวมตัวชี้วัดประสิทธิภาพหลัก (KPIs) ของโครงการ:
 *   1. อัตราการเช่าพื้นที่ (Occupancy Rate) พร้อมการแจกแจงศูนย์อาหาร 1 และ 2
 *   2. สถานะทางการเงิน: รายได้รวม, ยอดเรียกเก็บ, ยอดค้างชำระ และอัตราการจัดเก็บ (Collection Rate)
 *   3. แผนภูมิวงแหวน (Donut Chart) แสดงสัดส่วนสถานะแผงค้า (มีผู้เช่า / ว่าง / ซ่อมบำรุง)
 *   4. รายการเฝ้าระวัง (Watchlist): บิลที่รอชำระ/เกินกำหนด และงานแจ้งซ่อมที่รอดำเนินการ
 * - ตัวกรองแบบไดนามิก: สลับศูนย์อาหาร (ทั้งหมด, ศูนย์ 1, ศูนย์ 2) และตัวเลือกเดือน (Global Month & Finance Month)
 */
const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  // ตัวกรองศูนย์อาหารที่เลือก ('ALL', '1', '2')
  const [selectedFoodCourt, setSelectedFoodCourt] = useState("ALL");
  // ตัวกรองเดือนภาพรวม ('ALL' หรือ 'YYYY-MM')
  const [globalMonth, setGlobalMonth] = useState("ALL");
  // ตัวกรองเดือนการเงิน ('SYNC' คือตามภาพรวม, 'ALL', หรือ 'YYYY-MM')
  const [financeMonth, setFinanceMonth] = useState("SYNC");

  // สถานะสำหรับตารางรายละเอียดสถานะรายล็อก
  const [stallStatusFilter, setStallStatusFilter] = useState("ALL"); // 'ALL' | 'PAID' | 'PENDING' | 'UNBILLED'
  const [stallSearchQuery, setStallSearchQuery] = useState("");
  const [isStallTableExpanded, setIsStallTableExpanded] = useState(true);

  // สถานะสำหรับหน้าต่างเลือกเดือน (Month Picker Modal)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState("FINANCE"); // 'FINANCE' | 'GLOBAL'
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // ข้อมูลดิบจาก API ทั้ง 4 ส่วน
  const [rawStalls, setRawStalls] = useState([]);
  const [rawTenants, setRawTenants] = useState([]);
  const [rawBills, setRawBills] = useState([]);
  const [rawRepairs, setRawRepairs] = useState([]);

  // ข้อมูลสถิติและ KPIs ที่ผ่านการประมวลผลแล้ว
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
    // สถิติแยกย่อยสำหรับศูนย์อาหาร 1
    fc1Total: 0,
    fc1Occupied: 0,
    fc1Vacant: 0,
    fc1Maint: 0,
    fc1Rate: 0,
    // สถิติแยกย่อยสำหรับศูนย์อาหาร 2
    fc2Total: 0,
    fc2Occupied: 0,
    fc2Vacant: 0,
    fc2Maint: 0,
    fc2Rate: 0,
    // รายได้แยกตามประเภท (ค่าเช่า, ค่าน้ำ, ค่าไฟ)
    rentRevenue: 0,
    rentBilled: 0,
    rentPending: 0,
    rentRate: 0,
    waterRevenue: 0,
    waterBilled: 0,
    waterPending: 0,
    waterRate: 0,
    elecRevenue: 0,
    elecBilled: 0,
    elecPending: 0,
    elecRate: 0,
    greaseRevenue: 0,
    greaseBilled: 0,
    greasePending: 0,
    // สถานะรายล็อก
    occupiedSlotsCount: 0,
    paidSlotsCount: 0,
    pendingSlotsCount: 0,
    unbilledSlotsCount: 0,
    stallPaymentList: [],
  });

  // รายการบิลและงานซ่อมล่าสุด และรายการเฝ้าระวัง
  const [activeBillsList, setActiveBillsList] = useState([]);
  const [activeRepairsList, setActiveRepairsList] = useState([]);
  const [pendingBillsWatchlist, setPendingBillsWatchlist] = useState([]);
  const [pendingRepairsWatchlist, setPendingRepairsWatchlist] = useState([]);

  // โหลดข้อมูลเริ่มต้นเมื่อเปิดหน้าจอ
  useEffect(() => {
    fetchData();
  }, []);

  // คำนวณสถิติใหม่ทุกครั้งที่ผู้บริหารเปลี่ยนตัวกรองศูนย์อาหาร หรือตัวกรองเดือน
  useEffect(() => {
    if (!loading) {
      computeStats(rawStalls, rawTenants, rawBills, rawRepairs, selectedFoodCourt, globalMonth, financeMonth);
    }
  }, [selectedFoodCourt, globalMonth, financeMonth, loading]);

  /**
   * ดึงข้อมูลพร้อมกัน (Parallel) จาก API 4 แหล่ง:
   * 1. แผงค้าทั้งหมด
   * 2. ผู้เช่าทั้งหมด
   * 3. บิลค่าใช้จ่ายทั้งหมด
   * 4. งานซ่อมบำรุงทั้งหมด
   */
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

  /**
   * ฟังก์ชันช่วยเหลือในการดึงรหัสศูนย์อาหารจากออบเจกต์บิลหรืองานซ่อม
   * @param {Object} item - บิลหรืองานซ่อม
   */
  const getSlotFoodCourtId = (item) => {
    return (
      item.rental_slot?.food_court_id ||
      item.slot?.food_court_id ||
      item.contract?.slot?.food_court_id ||
      item.rental_contract?.rental_slot?.food_court_id ||
      null
    );
  };

  // รวบรวมเดือนที่มีข้อมูลบิลทั้งหมดเรียงลำดับจากใหม่ไปเก่า
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

  /**
   * จัดรูปแบบเดือนและปี พ.ศ. ภาษาไทย เช่น "ม.ค. 2567"
   * @param {string} ym - ปี-เดือน ในรูปแบบ 'YYYY-MM'
   */
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

  /**
   * คำนวณและประมวลผลตัวชี้วัดสถิติทั้งหมด (KPIs) จากข้อมูลดิบ:
   * 1. สรุปสถานะแผงค้ารายศูนย์อาหาร (ศูนย์ 1 และ ศูนย์ 2)
   * 2. กรองข้อมูลตามศูนย์อาหารที่ผู้ใช้เลือก (fcFilter)
   * 3. คำนวณอัตราการเช่าพื้นที่ (Occupancy Rate)
   * 4. คำนวณรายได้ทางการเงิน: รายรับที่ชำระแล้ว (Total Revenue), ยอดเรียกเก็บรวม (Total Billed), ยอดค้างชำระ (Pending Amount), และอัตราการจัดเก็บ (Collection Rate)
   * 5. สรุปรายการเฝ้าระวัง: บิลที่ค้างชำระ และงานแจ้งซ่อมที่ยังไม่แล้วเสร็จ
   */
  const computeStats = (stalls, tenants, bills, repairs, fcFilter, gMonth = globalMonth, fMonth = financeMonth) => {
    // 1. สรุปสถานะแผงค้าของศูนย์อาหาร 1 และ 2 แบบแยกศูนย์
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

    // 2. กรองข้อมูลแผงค้า บิล และงานซ่อมตามศูนย์อาหารที่ผู้บริหารเลือก
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

    // 3. สรุปอัตราการเช่าแผงค้า (Occupancy Rate)
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

    // ฟังก์ชันตรวจสอบว่าบิลอยู่ในเดือนที่เลือกหรือไม่
    const isBillInMonth = (bill, ym) => {
      if (ym === "ALL") return true;
      const dStr = bill.billing_month || bill.created_at;
      if (!dStr) return false;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return false;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === ym;
    };

    // ชุดข้อมูลบิลตามตัวกรองเดือนภาพรวม (Global Month)
    const globalBills = currentBills.filter((b) => isBillInMonth(b, gMonth));

    // ชุดข้อมูลบิลตามตัวกรองเดือนการเงิน (Finance Month)
    const effectiveFinanceMonth = fMonth === "SYNC" ? gMonth : fMonth;
    const financeBills = currentBills.filter((b) => isBillInMonth(b, effectiveFinanceMonth));

    // 4. คำนวณตัวเลขทางการเงินสำหรับภาพรวม (Global Financial KPIs)
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

    // คำนวณตัวเลขทางการเงินสำหรับการ์ดการเงิน (Finance Card)
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

    // 5. รายการบิลค้างชำระและงานซ่อมที่ต้องเฝ้าระวัง (Watchlist)
    const pendingBills = globalBills.filter(
      (b) =>
        b.status === "PENDING" ||
        b.status === "OVERDUE" ||
        b.status === "WAITING_VERIFICATION"
    );
    const pendingRepairs = currentRepairs.filter(
      (r) => r.status === "PENDING" || r.status === "IN_PROGRESS"
    );

    // 6. คำนวณรายได้แยกตามประเภท (ค่าเช่า, ค่าน้ำ, ค่าไฟ) จาก globalBills
    let rentRevenue = 0;
    let rentBilled = 0;
    let rentPending = 0;

    let waterRevenue = 0;
    let waterBilled = 0;
    let waterPending = 0;

    let elecRevenue = 0;
    let elecBilled = 0;
    let elecPending = 0;

    let greaseRevenue = 0;
    let greaseBilled = 0;
    let greasePending = 0;

    globalBills.forEach((b) => {
      const rent = Number(b.rent_amount || 0);
      const water = Number(b.water_cost || 0);
      const elec = Number(b.electricity_cost || 0);
      const grease = Number(b.grease_trap_fee || 0);

      rentBilled += rent;
      waterBilled += water;
      elecBilled += elec;
      greaseBilled += grease;

      if (b.status === "PAID") {
        rentRevenue += rent;
        waterRevenue += water;
        elecRevenue += elec;
        greaseRevenue += grease;
      } else {
        rentPending += rent;
        waterPending += water;
        elecPending += elec;
        greasePending += grease;
      }
    });

    const rentRate = rentBilled > 0 ? Math.round((rentRevenue / rentBilled) * 100) : 0;
    const waterRate = waterBilled > 0 ? Math.round((waterRevenue / waterBilled) * 100) : 0;
    const elecRate = elecBilled > 0 ? Math.round((elecRevenue / elecBilled) * 100) : 0;

    // 7. คำนวณสถานะรายล็อก (เช่ากี่ล็อก, จ่ายกี่ล็อก, ติดค้างกี่ล็อก, ยังไม่ออกบิลกี่ล็อก)
    const occupiedSlotsList = currentStalls.filter(
      (s) => (s.status || "").toUpperCase() === "OCCUPIED"
    );
    const occupiedSlotsCount = occupiedSlotsList.length;

    // รวบรวมบิลตามล็อก (slot_id หรือ slot_number)
    const slotBillsMap = new Map();
    globalBills.forEach((b) => {
      const sId = b.contract?.slot?.slot_id || b.contract?.slot_id || b.slot_id;
      const sNum = b.contract?.slot?.slot_number || b.slot?.slot_number;
      const key = sId ? String(sId) : sNum;
      if (key) {
        if (!slotBillsMap.has(key)) {
          slotBillsMap.set(key, []);
        }
        slotBillsMap.get(key).push(b);
      }
    });

    let paidSlotsCount = 0;
    let pendingSlotsCount = 0;
    let unbilledSlotsCount = 0;
    const stallPaymentList = [];
    const processedSlotNumbers = new Set();

    occupiedSlotsList.forEach((slot) => {
      const sIdKey = slot.slot_id ? String(slot.slot_id) : null;
      const sNumKey = slot.slot_number;
      const slotBills = (sIdKey && slotBillsMap.get(sIdKey)) || (sNumKey && slotBillsMap.get(sNumKey)) || [];
      processedSlotNumbers.add(slot.slot_number);

      const firstBill = slotBills[0];
      const tenantName = firstBill?.contract?.tenant?.first_name
        ? `${firstBill.contract.tenant.first_name} ${firstBill.contract.tenant.last_name || ""}`.trim()
        : slot.tenant?.name || slot.tenant_name || "-";

      if (slotBills.length === 0) {
        unbilledSlotsCount++;
        stallPaymentList.push({
          slot_id: slot.slot_id,
          slot_number: slot.slot_number,
          food_court_id: slot.food_court_id,
          tenantName,
          status: "UNBILLED",
          statusText: "ยังไม่ออกบิล",
          rent: Number(slot.rent || 0),
          water: 0,
          electricity: 0,
          total: Number(slot.rent || 0),
          paid: 0,
          pending: 0,
        });
      } else {
        const hasPending = slotBills.some((b) => b.status !== "PAID");
        const allPaid = slotBills.every((b) => b.status === "PAID");

        const slotRent = slotBills.reduce((acc, b) => acc + Number(b.rent_amount || 0), 0);
        const slotWater = slotBills.reduce((acc, b) => acc + Number(b.water_cost || 0), 0);
        const slotElec = slotBills.reduce((acc, b) => acc + Number(b.electricity_cost || 0), 0);
        const slotTotal = slotBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
        const slotPaid = slotBills
          .filter((b) => b.status === "PAID")
          .reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
        const slotPending = slotBills
          .filter((b) => b.status !== "PAID")
          .reduce((acc, b) => acc + Number(b.total_amount || 0), 0);

        if (allPaid) {
          paidSlotsCount++;
          stallPaymentList.push({
            slot_id: slot.slot_id,
            slot_number: slot.slot_number,
            food_court_id: slot.food_court_id,
            tenantName,
            status: "PAID",
            statusText: "จ่ายแล้ว",
            rent: slotRent,
            water: slotWater,
            electricity: slotElec,
            total: slotTotal,
            paid: slotPaid,
            pending: 0,
          });
        } else {
          pendingSlotsCount++;
          stallPaymentList.push({
            slot_id: slot.slot_id,
            slot_number: slot.slot_number,
            food_court_id: slot.food_court_id,
            tenantName,
            status: "PENDING",
            statusText: "ติดค้าง",
            rent: slotRent,
            water: slotWater,
            electricity: slotElec,
            total: slotTotal,
            paid: slotPaid,
            pending: slotPending,
          });
        }
      }
    });

    // ตรวจสอบล็อกที่มีบิลแต่ไม่ได้อยู่ใน occupiedSlotsList (ถ้ามี)
    slotBillsMap.forEach((billsList) => {
      const b = billsList[0];
      const sNum = b.contract?.slot?.slot_number || b.slot?.slot_number;
      if (sNum && !processedSlotNumbers.has(sNum)) {
        processedSlotNumbers.add(sNum);
        const sFcId = getSlotFoodCourtId(b);
        const hasPending = billsList.some((item) => item.status !== "PAID");
        const allPaid = billsList.every((item) => item.status === "PAID");

        const slotRent = billsList.reduce((acc, item) => acc + Number(item.rent_amount || 0), 0);
        const slotWater = billsList.reduce((acc, item) => acc + Number(item.water_cost || 0), 0);
        const slotElec = billsList.reduce((acc, item) => acc + Number(item.electricity_cost || 0), 0);
        const slotTotal = billsList.reduce((acc, item) => acc + Number(item.total_amount || 0), 0);
        const slotPaid = billsList.filter((item) => item.status === "PAID").reduce((acc, item) => acc + Number(item.total_amount || 0), 0);
        const slotPending = billsList.filter((item) => item.status !== "PAID").reduce((acc, item) => acc + Number(item.total_amount || 0), 0);

        const tenantName = b.contract?.tenant?.first_name
          ? `${b.contract.tenant.first_name} ${b.contract.tenant.last_name || ""}`.trim()
          : b.tenant_name || "-";

        if (allPaid) {
          paidSlotsCount++;
          stallPaymentList.push({
            slot_id: b.contract?.slot?.slot_id,
            slot_number: sNum,
            food_court_id: sFcId,
            tenantName,
            status: "PAID",
            statusText: "จ่ายแล้ว",
            rent: slotRent,
            water: slotWater,
            electricity: slotElec,
            total: slotTotal,
            paid: slotPaid,
            pending: 0,
          });
        } else {
          pendingSlotsCount++;
          stallPaymentList.push({
            slot_id: b.contract?.slot?.slot_id,
            slot_number: sNum,
            food_court_id: sFcId,
            tenantName,
            status: "PENDING",
            statusText: "ติดค้าง",
            rent: slotRent,
            water: slotWater,
            electricity: slotElec,
            total: slotTotal,
            paid: slotPaid,
            pending: slotPending,
          });
        }
      }
    });

    stallPaymentList.sort((a, b) => {
      return (a.slot_number || "").localeCompare(b.slot_number || "", undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

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
      rentRevenue,
      rentBilled,
      rentPending,
      rentRate,
      waterRevenue,
      waterBilled,
      waterPending,
      waterRate,
      elecRevenue,
      elecBilled,
      elecPending,
      elecRate,
      greaseRevenue,
      greaseBilled,
      greasePending,
      occupiedSlotsCount,
      paidSlotsCount,
      pendingSlotsCount,
      unbilledSlotsCount,
      stallPaymentList,
    });

    setActiveBillsList(currentBills.slice(0, 5));
    setActiveRepairsList(currentRepairs.slice(0, 5));
    setPendingBillsWatchlist(pendingBills.slice(0, 4));
    setPendingRepairsWatchlist(pendingRepairs.slice(0, 4));
  };

  /**
   * คำนวณรหัสสี CSS Conic Gradient เพื่อวาด Donut Chart แสดงสัดส่วนสถานะ
   * @param {Array} slices - อาร์เรย์ของสัดส่วน { color, value }
   * @param {number} total - ผลรวมทั้งหมด
   */
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

  // คำนวณเปอร์เซ็นต์
  const pct = (val, total) => (total > 0 ? Math.round((val / total) * 100) : 0);

  // ข้อมูลสัดส่วนสำหรับแผนภูมิวงแหวนแสดงสถานะแผงค้า (มีผู้เช่า, ว่าง, ซ่อมบำรุง)
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

      {/* ─── รายงานรายได้แยกประเภท & สถานะการชำระรายล็อก ─── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
        {/* หัวข้อส่วนรายงาน */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 shadow-xs">
                <Receipt size={20} />
              </span>
              <div>
                <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">
                  รายงานรายได้แยกประเภท & สถานะการชำระรายล็อก
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  แจกแจงรายได้ค่าน้ำ ค่าไฟ ค่าเช่า และสถานะการชำระเงินของแต่ละแผงค้า
                  {globalMonth !== "ALL" ? ` • รอบเดือน ${formatMonthTH(globalMonth)}` : " • ยอดสะสมทุกช่วงเวลา"}
                  {selectedFoodCourt !== "ALL" ? ` (ศูนย์อาหาร ${selectedFoodCourt})` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
              {globalMonth === "ALL" ? "ข้อมูลทั้งหมด" : formatButtonMonth(globalMonth)}
            </span>
          </div>
        </div>

        {/* 1. สรุปสถานะรายล็อก (เช่ากี่ล็อก / จ่ายกี่ล็อก / ติดค้างกี่ล็อก) */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Store size={14} className="text-purple-600" />
            <span>สรุปสถานะการชำระรายล็อก (Occupancy & Payment Status)</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
            {/* เช่ากี่ล็อก */}
            <div className="bg-purple-50/70 border border-purple-100/80 rounded-2xl p-4 transition-all hover:shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-purple-700">เช่าทั้งหมด</span>
                <span className="w-7 h-7 rounded-lg bg-purple-200/70 text-purple-800 flex items-center justify-center text-xs font-bold">
                  <Store size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-purple-900">{dashboardStats.occupiedSlotsCount}</span>
                <span className="text-xs text-purple-600 font-medium">จาก {dashboardStats.totalStalls} ล็อค</span>
              </div>
              <span className="text-[11px] text-purple-600 mt-1 block">
                อัตราครองแผง {dashboardStats.occupancyRate}%
              </span>
            </div>

            {/* จ่ายแล้วกี่ล็อก */}
            <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-4 transition-all hover:shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-emerald-700">จ่ายค่าต่างๆ แล้ว</span>
                <span className="w-7 h-7 rounded-lg bg-emerald-200/70 text-emerald-800 flex items-center justify-center text-xs font-bold">
                  <CheckCircle2 size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700">{dashboardStats.paidSlotsCount}</span>
                <span className="text-xs text-emerald-600 font-medium">ล็อค</span>
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                ชำระครบถ้วน {dashboardStats.occupiedSlotsCount > 0 ? Math.round((dashboardStats.paidSlotsCount / dashboardStats.occupiedSlotsCount) * 100) : 0}%
              </span>
            </div>

            {/* ติดค้างกี่ล็อก */}
            <div className="bg-rose-50/70 border border-rose-100/80 rounded-2xl p-4 transition-all hover:shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-rose-700">ติดค้างชำระ</span>
                <span className="w-7 h-7 rounded-lg bg-rose-200/70 text-rose-800 flex items-center justify-center text-xs font-bold">
                  <Clock size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-600">{dashboardStats.pendingSlotsCount}</span>
                <span className="text-xs text-rose-600 font-medium">ล็อค</span>
              </div>
              <span className="text-[11px] text-rose-600 mt-1 block">
                ค้างชำระ / รอตรวจสลิป
              </span>
            </div>

            {/* ยังไม่ออกบิลกี่ล็อก */}
            <div className="bg-gray-50/90 border border-gray-200/70 rounded-2xl p-4 transition-all hover:shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-600">ยังไม่ออกบิล</span>
                <span className="w-7 h-7 rounded-lg bg-gray-200/70 text-gray-600 flex items-center justify-center text-xs font-bold">
                  <AlertTriangle size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-700">{dashboardStats.unbilledSlotsCount}</span>
                <span className="text-xs text-gray-500 font-medium">ล็อค</span>
              </div>
              <span className="text-[11px] text-gray-500 mt-1 block">
                {globalMonth === "ALL" ? "ไม่มีรายการบิล" : "รอบเดือนนี้ยังไม่ออกบิล"}
              </span>
            </div>
          </div>

          {/* หลอดสีแสดงสัดส่วนรายล็อก (Multi-segment bar) */}
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
              <span>สัดส่วนสถานะการชำระของล็อกที่เช่า ({dashboardStats.occupiedSlotsCount} ล็อค)</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> จ่ายแล้ว ({dashboardStats.paidSlotsCount})
                </span>
                <span className="flex items-center gap-1 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> ติดค้าง ({dashboardStats.pendingSlotsCount})
                </span>
                {dashboardStats.unbilledSlotsCount > 0 && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span> ยังไม่ออกบิล ({dashboardStats.unbilledSlotsCount})
                  </span>
                )}
              </div>
            </div>
            <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden flex">
              {dashboardStats.occupiedSlotsCount > 0 ? (
                <>
                  <div
                    style={{ width: `${(dashboardStats.paidSlotsCount / dashboardStats.occupiedSlotsCount) * 100}%` }}
                    className="h-full bg-emerald-500 transition-all duration-500"
                    title={`จ่ายแล้ว: ${dashboardStats.paidSlotsCount} ล็อค`}
                  ></div>
                  <div
                    style={{ width: `${(dashboardStats.pendingSlotsCount / dashboardStats.occupiedSlotsCount) * 100}%` }}
                    className="h-full bg-rose-500 transition-all duration-500"
                    title={`ติดค้าง: ${dashboardStats.pendingSlotsCount} ล็อค`}
                  ></div>
                  <div
                    style={{ width: `${(dashboardStats.unbilledSlotsCount / dashboardStats.occupiedSlotsCount) * 100}%` }}
                    className="h-full bg-gray-400 transition-all duration-500"
                    title={`ยังไม่ออกบิล: ${dashboardStats.unbilledSlotsCount} ล็อค`}
                  ></div>
                </>
              ) : (
                <div className="h-full w-full bg-gray-300"></div>
              )}
            </div>
          </div>
        </div>

        {/* 2. การ์ดรายงานรายได้แยก 3 หมวด (ค่าเช่า, ค่าน้ำ, ค่าไฟ) */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-600" />
            <span>รายงานรายได้แยกตามประเภท (Revenue Breakdown by Utility & Rent)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: ค่าเช่าแผง */}
            <div className="bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100/50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
                      <Store size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">ค่าเช่าแผง</h3>
                      <span className="text-[11px] text-gray-400">Stall Rental Revenue</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-lg">
                    {dashboardStats.rentRate}% สำเร็จ
                  </span>
                </div>

                <div className="mt-4 mb-3">
                  <span className="text-xs text-gray-500 block font-medium">รายได้ค่าเช่าที่จัดเก็บได้</span>
                  <h4 className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight mt-0.5">
                    ฿{dashboardStats.rentRevenue.toLocaleString()}
                  </h4>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${dashboardStats.rentRate}%` }}
                  ></div>
                </div>

                <div className="space-y-2 text-xs border-t border-purple-50 pt-3">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span> ยอดเรียกเก็บรวม
                    </span>
                    <span className="font-bold text-gray-800">
                      ฿{dashboardStats.rentBilled.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> ค่าเช่าค้างชำระ
                    </span>
                    <span className="font-bold text-rose-600">
                      ฿{dashboardStats.rentPending.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: ค่าน้ำประปา */}
            <div className="bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30 rounded-3xl p-6 border border-sky-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-100/50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-200">
                      <Droplets size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">ค่าน้ำประปา</h3>
                      <span className="text-[11px] text-gray-400">Water Utility Revenue</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-sky-700 bg-sky-100/80 px-2.5 py-1 rounded-lg">
                    {dashboardStats.waterRate}% สำเร็จ
                  </span>
                </div>

                <div className="mt-4 mb-3">
                  <span className="text-xs text-gray-500 block font-medium">รายได้ค่าน้ำที่จัดเก็บได้</span>
                  <h4 className="text-2xl sm:text-3xl font-black text-sky-600 tracking-tight mt-0.5">
                    ฿{dashboardStats.waterRevenue.toLocaleString()}
                  </h4>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-sky-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${dashboardStats.waterRate}%` }}
                  ></div>
                </div>

                <div className="space-y-2 text-xs border-t border-sky-50 pt-3">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span> ยอดเรียกเก็บรวม
                    </span>
                    <span className="font-bold text-gray-800">
                      ฿{dashboardStats.waterBilled.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> ค่าน้ำค้างชำระ
                    </span>
                    <span className="font-bold text-rose-600">
                      ฿{dashboardStats.waterPending.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: ค่าไฟฟ้า */}
            <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-3xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">ค่าไฟฟ้า</h3>
                      <span className="text-[11px] text-gray-400">Electricity Utility Revenue</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                    {dashboardStats.elecRate}% สำเร็จ
                  </span>
                </div>

                <div className="mt-4 mb-3">
                  <span className="text-xs text-gray-500 block font-medium">รายได้ค่าไฟที่จัดเก็บได้</span>
                  <h4 className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight mt-0.5">
                    ฿{dashboardStats.elecRevenue.toLocaleString()}
                  </h4>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${dashboardStats.elecRate}%` }}
                  ></div>
                </div>

                <div className="space-y-2 text-xs border-t border-amber-50 pt-3">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> ยอดเรียกเก็บรวม
                    </span>
                    <span className="font-bold text-gray-800">
                      ฿{dashboardStats.elecBilled.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> ค่าไฟค้างชำระ
                    </span>
                    <span className="font-bold text-rose-600">
                      ฿{dashboardStats.elecPending.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ตาราง/รายการแจกแจงสถานะรายล็อก (Stall Breakdown List) */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/40">
          <div className="p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsStallTableExpanded(!isStallTableExpanded)}
                className="flex items-center gap-2 font-bold text-gray-800 text-sm hover:text-purple-600 transition-colors cursor-pointer"
              >
                <span>รายละเอียดสถานะรายล็อก ({dashboardStats.stallPaymentList.length} แผง)</span>
                {isStallTableExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* กรองแท็บ & ค้นหา */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => setStallStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    stallStatusFilter === "ALL" ? "bg-white text-purple-700 shadow-xs font-bold" : "hover:text-gray-900"
                  }`}
                >
                  ทั้งหมด ({dashboardStats.stallPaymentList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStallStatusFilter("PAID")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    stallStatusFilter === "PAID" ? "bg-white text-emerald-700 shadow-xs font-bold" : "hover:text-gray-900"
                  }`}
                >
                  จ่ายแล้ว ({dashboardStats.paidSlotsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStallStatusFilter("PENDING")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    stallStatusFilter === "PENDING" ? "bg-white text-rose-700 shadow-xs font-bold" : "hover:text-gray-900"
                  }`}
                >
                  ติดค้าง ({dashboardStats.pendingSlotsCount})
                </button>
                {dashboardStats.unbilledSlotsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStallStatusFilter("UNBILLED")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      stallStatusFilter === "UNBILLED" ? "bg-white text-gray-700 shadow-xs font-bold" : "hover:text-gray-900"
                    }`}
                  >
                    ยังไม่ออกบิล ({dashboardStats.unbilledSlotsCount})
                  </button>
                )}
              </div>

              {/* ค้นหา */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาล็อก/ผู้เช่า..."
                  value={stallSearchQuery}
                  onChange={(e) => setStallSearchQuery(e.target.value)}
                  className="pl-8 pr-6 py-1 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400 w-36 sm:w-44"
                />
                {stallSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStallSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ตารางข้อมูลรายล็อก */}
          {isStallTableExpanded && (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">รหัสล็อก</th>
                    <th className="py-3 px-3">ศูนย์อาหาร</th>
                    <th className="py-3 px-3">ผู้เช่า</th>
                    <th className="py-3 px-3 text-right">ค่าเช่า</th>
                    <th className="py-3 px-3 text-right">ค่าน้ำ</th>
                    <th className="py-3 px-3 text-right">ค่าไฟ</th>
                    <th className="py-3 px-3 text-right">ยอดรวม</th>
                    <th className="py-3 px-4 text-center">สถานะการชำระ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {dashboardStats.stallPaymentList
                    .filter((item) => {
                      if (stallStatusFilter !== "ALL" && item.status !== stallStatusFilter) {
                        return false;
                      }
                      if (stallSearchQuery.trim()) {
                        const q = stallSearchQuery.toLowerCase().trim();
                        const sNum = (item.slot_number || "").toLowerCase();
                        const tName = (item.tenantName || "").toLowerCase();
                        return sNum.includes(q) || tName.includes(q);
                      }
                      return true;
                    })
                    .map((item, idx) => {
                      const isPaid = item.status === "PAID";
                      const isPending = item.status === "PENDING";
                      return (
                        <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 text-xs">
                              {item.slot_number}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">
                            ศ.อาหาร {item.food_court_id || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-800">
                            {item.tenantName}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700 font-semibold">
                            ฿{Number(item.rent || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-sky-600 font-semibold">
                            ฿{Number(item.water || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">
                            ฿{Number(item.electricity || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-gray-800">
                            ฿{Number(item.total || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} /> จ่ายแล้ว
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                <Clock size={12} /> ติดค้าง (฿{Number(item.pending || 0).toLocaleString()})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                ยังไม่ออกบิล
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {dashboardStats.stallPaymentList.filter((item) => {
                    if (stallStatusFilter !== "ALL" && item.status !== stallStatusFilter) return false;
                    if (stallSearchQuery.trim()) {
                      const q = stallSearchQuery.toLowerCase().trim();
                      return (item.slot_number || "").toLowerCase().includes(q) || (item.tenantName || "").toLowerCase().includes(q);
                    }
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-400 text-xs">
                        ไม่พบรายการแผงค้าตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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
