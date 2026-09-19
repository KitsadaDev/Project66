import { useState, useEffect } from "react";
import {
  Building2,
  DollarSign,
  Wrench,
  FileText,
  Droplets,
  Zap,
  Store,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { stallsAPI, billsAPI, maintenanceAPI } from "../../api";
import { exportMaintenanceReportPDF, exportBillsReportPDF, exportSlotIncomeReportPDF } from "../../utils/pdfExport";

/**
 * คอมโพเนนต์หน้ารายงานสรุปภาพรวมระบบสำหรับผู้ดูแลระบบ (Admin Reports)
 * 1. สรุปสถานะแผงค้า (Occupancy): จำนวนล็อกทั้งหมด, มีผู้เช่า, ว่าง, ซ่อมบำรุง, คิดเป็นร้อยละอัตราการเช่า
 * 2. สรุปบิลและการชำระเงิน: บิลที่ชำระแล้ว, รอยืนยันสลิป, รอชำระ, ยังไม่ออกบิล และอัตราการจัดเก็บรายได้
 * 3. สรุปงานแจ้งซ่อม: จำนวนงานรอดำเนินการ, งานที่เสร็จสิ้น, หมวดหมู่ปัญหาที่พบบ่อย, ล็อกที่แจ้งซ่อมบ่อย
 * 4. รองรับการกรองตามช่วงเวลา: รายวัน, รายเดือน, รายปี หรือ ทั้งหมด
 * 5. ส่งออกข้อมูลเป็นรายงานไฟล์ PDF ภาษาไทย (รายงานบิล และ รายงานแจ้งซ่อม)
 */
const Reports = () => {
  // ข้อมูลสถิติประมวลผลสำหรับนำไปแสดงบนหน้าจอและการ์ดต่างๆ
  const [data, setData] = useState({
    totalStalls: 0, occupied: 0, vacant: 0, maintenance: 0, occupancyRate: 0,
    totalBills: 0, paidBills: 0, waitingBills: 0, pendingBills: 0,
    unbilledBills: 0, targetBase: 0, paidRate: 0,
    rentPaid: 0, rentPending: 0, rentTotal: 0, rentRate: 0,
    waterPaid: 0, waterPending: 0, waterTotal: 0, waterRate: 0,
    elecPaid: 0, elecPending: 0, elecTotal: 0, elecRate: 0,
    occupiedSlotsCount: 0, paidSlotsCount: 0, pendingSlotsCount: 0, unbilledSlotsCount: 0,
    pendingRepairs: 0, completedRepairs: 0,
    categoryList: [], slotList: [], maxSlotCount: 1,
    tableBills: [], tableRepairs: [],
  });
  const [loading, setLoading] = useState(true);

  // สถานะตัวกรองช่วงเวลา (ประเภทตัวกรอง, วันที่, เดือน, ปี)
  const [filterType, setFilterType] = useState("MONTH");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // ข้อมูลดิบที่ดึงมาจาก API (สำหรับใช้คำนวณซ้ำเมื่อเปลี่ยนฟิลเตอร์)
  const [rawStalls, setRawStalls] = useState([]);
  const [rawBills, setRawBills] = useState([]);
  const [rawRepairs, setRawRepairs] = useState([]);

  // ดึงข้อมูลทั้งหมดจาก API ครั้งแรกเมื่อเข้าหน้าจอ
  useEffect(() => {
    fetchData();
  }, []);

  // คำนวณสถิติใหม่ทุกครั้งที่มีการเปลี่ยนเงื่อนไขฟิลเตอร์ หรือเมื่อข้อมูลดิบโหลดเสร็จ
  useEffect(() => {
    if (!loading) {
      processData(rawStalls, rawBills, rawRepairs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedDate, selectedMonth, selectedYear, loading]);

  /**
   * เรียก API ทั้ง 3 แหล่งข้อมูลแบบขนานกัน (แผงค้า, บิล, แจ้งซ่อม)
   */
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

  /**
   * ประมวลผลและคำนวณข้อมูลสถิติต่างๆ ตามช่วงเวลาที่ผู้ใช้เลือก
   * @param {Array} stalls - รายการแผงค้าทั้งหมด
   * @param {Array} allBills - รายการบิลทั้งหมด
   * @param {Array} allRepairs - รายการแจ้งซ่อมทั้งหมด
   */
  const processData = (stalls, allBills, allRepairs) => {
    // 1. คำนวณอัตราการเช่าพื้นที่ (Occupancy)
    const occ = stalls.filter((s) => s.status === "OCCUPIED").length;
    const vac = stalls.filter((s) => s.status === "VACANT").length;
    const maint = stalls.filter((s) => s.status === "MAINTENANCE").length;
    const occupancyRate = stalls.length > 0 ? Math.round((occ / stalls.length) * 100) : 0;

    // 2. กรองบิลและงานซ่อมตามช่วงเวลาที่กำหนดในฟิลเตอร์
    let currentBills = allBills;
    let currentRepairs = allRepairs;

    // Bug #9: ใช้ Date object เปรียบเทียบแทน startsWith เพื่อหลีกเลี่ยงปัญหา timezone
    const toLocalYMD = (dateStr) => {
      const d = new Date(dateStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`; // YYYY-MM-DD ตาม local time
    };
    const toLocalYM = (dateStr) => toLocalYMD(dateStr).slice(0, 7);  // YYYY-MM
    const toLocalY = (dateStr) => toLocalYMD(dateStr).slice(0, 4);   // YYYY

    if (filterType === "DAY") {
      currentBills = allBills.filter((b) => {
        const d = b.billing_month || b.created_at;
        return d && toLocalYMD(d) === selectedDate;
      });
      currentRepairs = allRepairs.filter((r) => {
        const d = r.requested_at;
        return d && toLocalYMD(d) === selectedDate;
      });
    } else if (filterType === "MONTH") {
      currentBills = allBills.filter((b) => {
        const d = b.billing_month || b.created_at;
        return d && toLocalYM(d) === selectedMonth;
      });
      currentRepairs = allRepairs.filter((r) => {
        const d = r.requested_at;
        return d && toLocalYM(d) === selectedMonth;
      });
    } else if (filterType === "YEAR") {
      currentBills = allBills.filter((b) => {
        const d = b.billing_month || b.created_at;
        return d && toLocalY(d) === selectedYear;
      });
      currentRepairs = allRepairs.filter((r) => {
        const d = r.requested_at;
        return d && toLocalY(d) === selectedYear;
      });
    }

    // 3. จำแนกสถานะบิลและการคำนวณอัตราการจัดเก็บเงิน
    const paidCount = currentBills.filter((b) => b.status === "PAID").length;
    const waitingCount = currentBills.filter((b) => b.status === "WAITING_VERIFICATION" || b.status === "WAITING").length;
    const pendingCount = currentBills.filter((b) => b.status === "PENDING" || b.status === "OVERDUE").length;
    const targetBase = Math.max(occ, currentBills.length);
    const unbilledCount = Math.max(0, targetBase - currentBills.length);
    const paidRate = targetBase > 0 ? Math.round((paidCount / targetBase) * 100) : 0;

    // 3.1 คำนวณรายได้แยกตามประเภท (ค่าเช่า, ค่าน้ำ, ค่าไฟ)
    let rentPaid = 0;
    let rentPending = 0;
    let rentTotal = 0;

    let waterPaid = 0;
    let waterPending = 0;
    let waterTotal = 0;

    let elecPaid = 0;
    let elecPending = 0;
    let elecTotal = 0;

    currentBills.forEach((b) => {
      const rent = Number(b.rent_amount || 0);
      const water = Number(b.water_cost || 0);
      const elec = Number(b.electricity_cost || 0);

      rentTotal += rent;
      waterTotal += water;
      elecTotal += elec;

      if (b.status === "PAID") {
        rentPaid += rent;
        waterPaid += water;
        elecPaid += elec;
      } else {
        rentPending += rent;
        waterPending += water;
        elecPending += elec;
      }
    });

    const rentRate = rentTotal > 0 ? Math.round((rentPaid / rentTotal) * 100) : 0;
    const waterRate = waterTotal > 0 ? Math.round((waterPaid / waterTotal) * 100) : 0;
    const elecRate = elecTotal > 0 ? Math.round((elecPaid / elecTotal) * 100) : 0;

    // 3.2 คำนวณสถานะรายล็อก (เช่ากี่ล็อก, จ่ายกี่ล็อก, ติดค้างกี่ล็อก)
    const occupiedSlotsList = stalls.filter((s) => (s.status || "").toUpperCase() === "OCCUPIED");
    const occupiedSlotsCount = occupiedSlotsList.length;

    const slotBillsMap = new Map();
    currentBills.forEach((b) => {
      const sId = b.contract?.slot?.slot_id || b.contract?.slot_id || b.slot_id;
      const sNum = b.contract?.slot?.slot_number || b.slot?.slot_number;
      const key = sId ? String(sId) : sNum;
      if (key) {
        if (!slotBillsMap.has(key)) slotBillsMap.set(key, []);
        slotBillsMap.get(key).push(b);
      }
    });

    let paidSlotsCount = 0;
    let pendingSlotsCount = 0;
    let unbilledSlotsCount = 0;

    occupiedSlotsList.forEach((slot) => {
      const sIdKey = slot.slot_id ? String(slot.slot_id) : null;
      const sNumKey = slot.slot_number;
      const slotBills = (sIdKey && slotBillsMap.get(sIdKey)) || (sNumKey && slotBillsMap.get(sNumKey)) || [];

      if (slotBills.length === 0) {
        unbilledSlotsCount++;
      } else {
        const allPaid = slotBills.every((b) => b.status === "PAID");
        if (allPaid) {
          paidSlotsCount++;
        } else {
          pendingSlotsCount++;
        }
      }
    });

    // 4. จำแนกสถานะงานซ่อม และจัดกลุ่มประเภทปัญหา/ล็อกที่พบบ่อย
    const pendingRepairs = currentRepairs.filter((r) => r.status === "PENDING").length;
    const completedRepairs = currentRepairs.filter((r) => r.status === "COMPLETED").length;

    const categoryMap = {};
    const slotMap = {};
    currentRepairs.forEach((r) => {
      const cat = r.category || "อื่นๆ";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      const slotNum = (r.rental_slot && r.rental_slot.slot_number)
        ? "ล็อค " + r.rental_slot.slot_number
        : (r.slot && r.slot.slot_number)
        ? "ล็อค " + r.slot.slot_number
        : "ไม่ระบุล็อค";
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
      rentPaid, rentPending, rentTotal, rentRate,
      waterPaid, waterPending, waterTotal, waterRate,
      elecPaid, elecPending, elecTotal, elecRate,
      occupiedSlotsCount, paidSlotsCount, pendingSlotsCount, unbilledSlotsCount,
      pendingRepairs, completedRepairs, categoryList, slotList, maxSlotCount,
      tableBills: currentBills, tableRepairs: currentRepairs,
    });
  };

  /**
   * ดึงข้อความแสดงรอบเวลาที่เลือกสำหรับใส่ในหัวรายงาน PDF
   */
  const getFilterLabel = () => {
    if (filterType === "ALL") return "ทั้งหมด";
    if (filterType === "DAY") return selectedDate;
    if (filterType === "MONTH") return selectedMonth;
    return selectedYear;
  };

  /**
   * ดำเนินการส่งออกรายงานบิลค่าเช่าเป็นไฟล์ PDF
   */
  const handleExportBills = () => {
    exportBillsReportPDF(
      data.tableBills, getFilterLabel(),
      data.paidBills, data.waitingBills, data.pendingBills,
      data.unbilledBills, data.targetBase, data.paidRate
    );
  };

  /**
   * ดำเนินการส่งออกรายงานแจ้งซ่อมเป็นไฟล์ PDF
   */
  const handleExportRepairs = () => {
    exportMaintenanceReportPDF(
      data.tableRepairs, getFilterLabel(),
      data.categoryList, data.slotList, data.maxSlotCount
    );
  };

  /**
   * ดำเนินการส่งออกรายงานรายได้แยกค่าน้ำ ค่าไฟ ค่าเช่า และสถานะรายล็อคเป็นไฟล์ PDF
   */
  const handleExportSlotIncome = () => {
    const occupiedSlots = rawStalls
      .filter((s) => (s.status || "").toUpperCase() === "OCCUPIED")
      .sort((a, b) => (a.slot_number || "").localeCompare(b.slot_number || "", undefined, { numeric: true }));

    const slotBillsMap = new Map();
    (data.tableBills || []).forEach((b) => {
      const sId = b.contract?.slot?.slot_id || b.contract?.slot_id || b.slot_id;
      const sNum = b.contract?.slot?.slot_number || b.slot?.slot_number;
      const key = sId ? String(sId) : sNum;
      if (key) {
        if (!slotBillsMap.has(key)) slotBillsMap.set(key, []);
        slotBillsMap.get(key).push(b);
      }
    });

    const reportRows = occupiedSlots.map((slot) => {
      const sIdKey = slot.slot_id ? String(slot.slot_id) : null;
      const sNumKey = slot.slot_number;
      const bills = (sIdKey && slotBillsMap.get(sIdKey)) || (sNumKey && slotBillsMap.get(sNumKey)) || [];

      // ดึงข้อมูลผู้เช่าจากสัญญาเช่าที่เปิดใช้งานอยู่ หรือจากบิล
      const activeContract =
        slot.rental_contracts?.find((c) => c.status === "ACTIVE") ||
        slot.rental_contracts?.[0];
      const contractTenant = activeContract?.tenant;
      const billTenant = bills[0]?.contract?.tenant || bills[0]?.tenant;
      let anyBillTenant = null;
      if (!contractTenant && !billTenant) {
        const anyBill = (rawBills || []).find(
          (b) =>
            (slot.slot_id &&
              (b.contract?.slot?.slot_id === slot.slot_id ||
                b.contract?.slot_id === slot.slot_id ||
                b.slot_id === slot.slot_id)) ||
            (slot.slot_number &&
              (b.contract?.slot?.slot_number === slot.slot_number ||
                b.slot?.slot_number === slot.slot_number))
        );
        anyBillTenant = anyBill?.contract?.tenant || anyBill?.tenant;
      }
      const tenant = contractTenant || billTenant || anyBillTenant || slot.tenant;
      let tenantName = "-";
      if (tenant) {
        if (typeof tenant === "string") {
          tenantName = tenant;
        } else if (tenant.first_name) {
          tenantName = `${tenant.first_name} ${tenant.last_name || ""}`.trim();
        } else if (tenant.name) {
          tenantName = tenant.name;
        }
      } else if (slot.tenant_name) {
        tenantName = slot.tenant_name;
      }

      if (bills.length === 0) {
        return {
          slot_number: slot.slot_number,
          tenant_name: tenantName,
          rent_amount: slot.rent != null ? Number(slot.rent) : null,
          water_cost: null,
          electricity_cost: null,
          grease_trap_fee: null,
          pending_amount: 0,
          status: "UNBILLED",
        };
      }

      let rent = 0;
      let water = 0;
      let elec = 0;
      let grease = 0;
      let pending = 0;
      let hasOverdue = false;
      let hasPending = false;
      let hasWaiting = false;
      let allPaid = true;

      bills.forEach((b) => {
        rent += Number(b.rent_amount || 0);
        water += Number(b.water_cost || 0);
        elec += Number(b.electricity_cost || 0);
        grease += Number(b.grease_trap_fee || 0);

        if (b.status !== "PAID") {
          allPaid = false;
          pending += Number(b.total_amount || 0);
          if (b.status === "OVERDUE") hasOverdue = true;
          else if (b.status === "WAITING_VERIFICATION" || b.status === "WAITING") hasWaiting = true;
          else hasPending = true;
        }
      });

      let status = "PAID";
      if (!allPaid) {
        if (hasOverdue) status = "OVERDUE";
        else if (hasWaiting) status = "WAITING_VERIFICATION";
        else if (hasPending) status = "PENDING";
      }

      return {
        slot_number: slot.slot_number,
        tenant_name: tenantName,
        rent_amount: rent,
        water_cost: water,
        electricity_cost: elec,
        grease_trap_fee: grease > 0 ? grease : null,
        pending_amount: pending,
        status,
      };
    });

    exportSlotIncomeReportPDF(reportRows, getFilterLabel(), {
      totalOccupied: occupiedSlots.length,
      paidSlots: data.paidSlotsCount,
      pendingSlots: data.pendingSlotsCount,
      unbilledSlots: data.unbilledSlotsCount,
    });
  };

  /**
   * ฟังก์ชันสร้างสไตล์พื้นหลัง Conic Gradient จำลอง Donut Chart
   * @param {Array} slices - ชิ้นส่วนของกราฟ แต่ละชิ้นมี color และ value
   * @param {number} total - ผลรวมทั้งหมด
   */
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
            <Building2 size={18} className="text-gray-500" /> สถานะล็อค (Occupancy)
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
              <span className="text-gray-500">ล็อคทั้งหมด</span>
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
                <h3 className="text-sm font-bold text-gray-700 mb-3">ล็อคที่แจ้งซ่อมบ่อยที่สุด</h3>
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

      {/* ─── ส่วนรายงานสรุปรายได้แยกตามประเภท & สถานะการชำระรายล็อก ─── */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Receipt size={20} className="text-purple-600" />
              รายงานรายได้แยกค่าน้ำ ค่าไฟ ค่าเช่า และสถานะรายล็อค
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              สรุปภาพรวมรายรับตามประเภทค่าใช้จ่ายและจำนวนล็อคตามสถานะการชำระเงิน
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
              รอบเวลา: {getFilterLabel()}
            </span>
            <button
              onClick={handleExportSlotIncome}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FileText size={14} /> ส่งออก PDF
            </button>
          </div>
        </div>

        {/* สรุปสถานะรายล็อก */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Store size={14} className="text-purple-600" />
            <span>สถานะการชำระเงินรายล็อค</span>
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-100">
              <span className="text-xs text-purple-700 font-semibold block mb-1">เช่าทั้งหมด</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-purple-900">{data.occupiedSlotsCount}</span>
                <span className="text-xs text-purple-600">/ {data.totalStalls} ล็อค</span>
              </div>
              <span className="text-[11px] text-purple-600 mt-1 block">ครองแผง {data.occupancyRate}%</span>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
              <span className="text-xs text-emerald-700 font-semibold block mb-1">จ่ายค่าต่างๆ แล้ว</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-700">{data.paidSlotsCount}</span>
                <span className="text-xs text-emerald-600">ล็อค</span>
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">ชำระครบถ้วน</span>
            </div>

            <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-100">
              <span className="text-xs text-rose-700 font-semibold block mb-1">ติดค้างชำระ</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-600">{data.pendingSlotsCount}</span>
                <span className="text-xs text-rose-600">ล็อค</span>
              </div>
              <span className="text-[11px] text-rose-600 mt-1 block">รอชำระ / รอยืนยัน</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <span className="text-xs text-gray-600 font-semibold block mb-1">ยังไม่ออกบิล</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-gray-700">{data.unbilledSlotsCount}</span>
                <span className="text-xs text-gray-500">ล็อค</span>
              </div>
              <span className="text-[11px] text-gray-500 mt-1 block">ไม่มีบิลในรอบนี้</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
              <span>สัดส่วนล็อคที่มีผู้เช่า ({data.occupiedSlotsCount} ล็อค)</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> จ่ายแล้ว ({data.paidSlotsCount})
                </span>
                <span className="flex items-center gap-1 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> ติดค้าง ({data.pendingSlotsCount})
                </span>
                {data.unbilledSlotsCount > 0 && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span> ยังไม่ออกบิล ({data.unbilledSlotsCount})
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden flex">
              {data.occupiedSlotsCount > 0 ? (
                <>
                  <div
                    style={{ width: `${(data.paidSlotsCount / data.occupiedSlotsCount) * 100}%` }}
                    className="h-full bg-emerald-500 transition-all duration-500"
                  ></div>
                  <div
                    style={{ width: `${(data.pendingSlotsCount / data.occupiedSlotsCount) * 100}%` }}
                    className="h-full bg-rose-500 transition-all duration-500"
                  ></div>
                  <div
                    style={{ width: `${(data.unbilledSlotsCount / data.occupiedSlotsCount) * 100}%` }}
                    className="h-full bg-gray-400 transition-all duration-500"
                  ></div>
                </>
              ) : (
                <div className="h-full w-full bg-gray-300"></div>
              )}
            </div>
          </div>
        </div>

        {/* การ์ดรายงานรายได้แยก 3 หมวด */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-600" />
            <span>รายได้แยกตามประเภทค่าใช้จ่าย</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ค่าเช่าแผง */}
            <div className="bg-gradient-to-br from-purple-50/50 to-white rounded-2xl p-5 border border-purple-100 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Store size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">ค่าเช่าล็อค</h4>
                    <span className="text-[11px] text-gray-400">Stall Rent</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                  {data.rentRate}%
                </span>
              </div>
              <div className="mb-2">
                <span className="text-xs text-gray-500 block">รายได้ที่จัดเก็บได้</span>
                <span className="text-2xl font-black text-purple-700">฿{Number(data.rentPaid || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${data.rentRate}%` }}></div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600 border-t border-purple-50 pt-2.5">
                <div className="flex justify-between">
                  <span>ยอดเรียกเก็บรวม</span>
                  <span className="font-bold text-gray-800">฿{Number(data.rentTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดค้างชำระ</span>
                  <span className="font-bold text-rose-600">฿{Number(data.rentPending || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ค่าน้ำประปา */}
            <div className="bg-gradient-to-br from-sky-50/50 to-white rounded-2xl p-5 border border-sky-100 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                    <Droplets size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">ค่าน้ำประปา</h4>
                    <span className="text-[11px] text-gray-400">Water Cost</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md">
                  {data.waterRate}%
                </span>
              </div>
              <div className="mb-2">
                <span className="text-xs text-gray-500 block">รายได้ที่จัดเก็บได้</span>
                <span className="text-2xl font-black text-sky-600">฿{Number(data.waterPaid || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-sky-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${data.waterRate}%` }}></div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600 border-t border-sky-50 pt-2.5">
                <div className="flex justify-between">
                  <span>ยอดเรียกเก็บรวม</span>
                  <span className="font-bold text-gray-800">฿{Number(data.waterTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดค้างชำระ</span>
                  <span className="font-bold text-rose-600">฿{Number(data.waterPending || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ค่าไฟฟ้า */}
            <div className="bg-gradient-to-br from-amber-50/50 to-white rounded-2xl p-5 border border-amber-100 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">ค่าไฟฟ้า</h4>
                    <span className="text-[11px] text-gray-400">Electricity Cost</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                  {data.elecRate}%
                </span>
              </div>
              <div className="mb-2">
                <span className="text-xs text-gray-500 block">รายได้ที่จัดเก็บได้</span>
                <span className="text-2xl font-black text-amber-600">฿{Number(data.elecPaid || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${data.elecRate}%` }}></div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600 border-t border-amber-50 pt-2.5">
                <div className="flex justify-between">
                  <span>ยอดเรียกเก็บรวม</span>
                  <span className="font-bold text-gray-800">฿{Number(data.elecTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดค้างชำระ</span>
                  <span className="font-bold text-rose-600">฿{Number(data.elecPending || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Reports;
