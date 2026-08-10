import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Store,
  ArrowRight,
  MapPin,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import { stallsAPI } from "../../api";

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const foodCourt = searchParams.get("foodCourt") || null;
  const navigate = useNavigate();

  const [stalls, setStalls] = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStalls();
  }, [foodCourt]);

  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      let data = response.data.data || [];

      // Filter by food court if selected
      if (foodCourt) {
        data = data.filter((s) => s.food_court_id === parseInt(foodCourt));
      }

      setStalls(data);
    } catch (error) {
      console.error("Error fetching stalls:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStallColor = (status, isSelected) => {
    const baseClasses =
      "transition-all duration-300 cursor-pointer border-2 shadow-sm relative";
    const selectedClasses = isSelected
      ? "ring-4 ring-purple-200 scale-110 z-10 shadow-xl"
      : "hover:scale-105 hover:shadow-md";

    switch (status) {
      case "occupied":
      case "pending":
        return `${baseClasses} ${selectedClasses} bg-red-100 border-red-300 text-red-700 hover:bg-red-200`;
      case "vacant":
        return `${baseClasses} ${selectedClasses} bg-green-100 border-green-300 text-green-700 hover:bg-green-200`;
      case "maintenance":
        return `${baseClasses} ${selectedClasses} bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200`;
      default: // empty / non-existent
        return `${baseClasses} ${selectedClasses} bg-gray-50 border-dashed border-gray-300 text-gray-400 hover:bg-gray-100`;
    }
  };

  const getStallData = (slot_number) => {
    const fcId = foodCourt ? parseInt(foodCourt) : 1;
    return stalls.find((s) => s.slot_number === slot_number && s.food_court_id === fcId);
  };

  const getStallStatus = (slot_number) => {
    const stall = getStallData(slot_number);
    if (!stall) return "empty";
    if (stall.status === "OCCUPIED" && stall.hasPendingPayment) return "pending";
    return stall.status.toLowerCase();
  };

  const handleStallClick = (slot_number) => {
    const stall = getStallData(slot_number);
    setSelectedStall(stall ?? { slot_number, status: "EMPTY" });
  };

  // Food Court Selection View
  if (!foodCourt) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            เลือกศูนย์อาหาร
          </h1>
        </div>

        {/* Food Court Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Link
            to="/admin?foodCourt=1"
            className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src="/Food-court-1.png"
                alt="ศูนย์อาหาร 1"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
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
            to="/admin?foodCourt=2"
            className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src="/Food-court-2.png"
                alt="ศูนย์อาหาร 2"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
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
      </div>
    );
  }

  // Common Stall Cell Component
  const StallCell = ({ id, fixedSize = false, w = 44, h = 44 }) => (
    <div
      style={fixedSize ? { width: w, height: h } : {}}
      className={`${fixedSize ? "text-xs font-bold" : "w-14 h-14 md:w-16 md:h-16 text-sm md:text-base"} rounded-xl flex items-center justify-center font-bold ${getStallColor(getStallStatus(id), selectedStall?.slot_number === id)}`}
      onClick={() => handleStallClick(id)}
    >
      {id}
    </div>
  );

  // Layout for Food Court 1 & 2
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.20))] md:h-[calc(100vh-theme(spacing.24))] -m-4 md:-m-6 overflow-hidden">
      {/* Sidebar Menu - Desktop */}
      <div className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-100 p-6 h-full overflow-y-auto z-20 shadow-lg">
        <Link
          to="/admin"
          className="flex items-center gap-2 mb-8 text-gray-500 hover:text-purple-600 transition-colors"
        >
          ← กลับหน้าเลือกศูนย์
        </Link>
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">เมนูลัด</h2>
        <div className="space-y-2">
          <Link
            to="/admin/tenants"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors"
          >
            <User size={18} />
            <span className="font-medium">ข้อมูลผู้เช่า</span>
          </Link>
          <Link
            to="/admin/stalls"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors"
          >
            <Store size={18} />
            <span className="font-medium">แก้ไขสถานะล็อก</span>
          </Link>
        </div>

        <div className="mt-auto">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
            สถานะ
          </h3>
          <div className="space-y-3 px-2">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span>ว่าง (พร้อมเช่า)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span>มีผู้เช่าแล้ว</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
              <span>ปิดปรับปรุง</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-gray-50/50 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white p-4 shadow-sm flex items-center justify-between z-20">
          <Link
            to="/admin"
            className="text-sm font-medium text-gray-500 hover:text-purple-600"
          >
            ← เลือกศูนย์
          </Link>
          <h1 className="font-bold text-gray-800">ศูนย์อาหาร {foodCourt}</h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        {/* Scrollable Grid Area */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-8 flex items-start justify-center">
          <div className="bg-white p-3 sm:p-6 md:p-12 rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-purple-100/50 border border-white relative w-full">
            <h2 className="absolute top-6 left-8 text-2xl font-bold text-gray-800 hidden lg:block">
              ผังศูนย์อาหาร {foodCourt}
            </h2>

            {/* Mobile scroll hint */}
            <div className="lg:hidden text-center text-xs text-purple-600 font-semibold mb-2 flex items-center justify-center gap-1.5 bg-purple-50/80 py-2 px-3 rounded-xl border border-purple-100 shadow-sm">
              <span>👈</span> เลื่อน ซ้าย-ขวา เพื่อดูผังทั้งหมด <span>👉</span>
            </div>

            <div className="mt-2 lg:mt-12 w-full overflow-x-auto pb-4 pt-1">
              {foodCourt === "1" ? (
                <div className="min-w-[920px] w-[920px] mx-auto">
                  <div style={{ position: "relative", width: 920, height: 660 }}>
                    {/* ── Room walls ── */}
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderLeft: "3px solid #4B5563" }} />
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderBottom: "3px solid #4B5563" }} />
                    <div style={{ position: "absolute", top: 0, left: 0, width: 810, borderTop: "3px solid #4B5563" }} />
                    <div style={{ position: "absolute", left: 810, top: 0, height: 100, borderLeft: "3px solid #4B5563" }} />
                    <div style={{ position: "absolute", top: 100, left: 810, right: 0, borderTop: "3px solid #4B5563" }} />
                    <div style={{ position: "absolute", right: 0, top: 100, bottom: 0, borderRight: "3px solid #4B5563" }} />

                    {/* ── B row ── */}
                    <div style={{ position: "absolute", top: 10, left: 330, display: "flex", gap: 5 }}>
                      {["B1","B2","B3","B4","B5","B6","B7","B8"].map((id) => (
                        <StallCell key={id} id={id} fixedSize w={44} h={44} />
                      ))}
                    </div>

                    {/* ── C row ── */}
                    <div style={{ position: "absolute", top: 115, left: 134, display: "flex", gap: 5 }}>
                      {["C1","C2","C3","C4","C5","C6"].map((id) => (
                        <StallCell key={id} id={id} fixedSize w={44} h={44} />
                      ))}
                    </div>

                    {/* ── Dining zone ── */}
                    <div
                      className="absolute flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 text-gray-500 text-sm font-medium"
                      style={{ top: 175, left: 100, width: 640, height: 315 }}
                    >
                      โซนโต๊ะนั่งทานอาหาร
                    </div>

                    {/* ── A column ── */}
                    <div style={{ position: "absolute", top: 110, right: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                      {["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11"].map((id) => (
                        <StallCell key={id} id={id} fixedSize w={44} h={44} />
                      ))}
                    </div>

                    {/* ── D row ── */}
                    <div style={{ position: "absolute", top: 606, left: 294, display: "flex", gap: 5 }}>
                      {["D1","D2","D3","D4","D5","D6"].map((id) => (
                        <StallCell key={id} id={id} fixedSize w={44} h={44} />
                      ))}
                    </div>
                  </div>

                  {/* ═══ E row — OUTSIDE room ═══ */}
                  <div style={{ marginTop: 10, display: "flex", gap: 5 }}>
                    {["E1","E2","E3","E4","E5","E6","E7","E8","E9","E10","E11","E12"].map((id) => (
                      <StallCell key={id} id={id} fixedSize w={44} h={44} />
                    ))}
                  </div>
                </div>
              ) : (
                /* ===== ผังศูนย์อาหาร 2 ===== */
                <div className="min-w-[650px] w-[650px] mx-auto">
                  <div style={{ position: "relative", width: 650, height: 540, border: "3px solid #4B5563" }}>
                    {/* ── Stall Column A (A10 down to A1) ── */}
                    <div style={{ position: "absolute", top: 24, left: 24, display: "flex", flexDirection: "column", gap: 5 }}>
                      {["A10", "A9", "A8", "A7", "A6", "A5", "A4", "A3", "A2", "A1"].map((id) => (
                        <StallCell key={id} id={id} fixedSize w={44} h={44} />
                      ))}
                    </div>

                    {/* ── Dining zone ── */}
                    <div
                      className="absolute flex items-center justify-center rounded-xl bg-gray-200/80 border border-gray-300 text-gray-700 text-base font-semibold shadow-inner"
                      style={{ top: 24, left: 120, width: 495, height: 485 }}
                    >
                      โซนโต๊ะนั่งทานอาหาร
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 sm:gap-6 border-t border-gray-100 pt-4 sm:pt-6">
              {[
                ["border-green-300 bg-green-100", "ว่าง (พร้อมเช่า)"],
                ["border-red-300 bg-red-100", "มีผู้เช่าแล้ว"],
                ["border-yellow-300 bg-yellow-100", "ปิดปรับปรุง"],
                ["border-dashed border-gray-300 bg-gray-50", "ยังไม่เปิดบริการ"],
              ].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border ${c}`} />
                  <span className="text-xs sm:text-sm text-gray-600">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      {selectedStall && (() => {
        const activeContract = selectedStall.rental_contracts?.[0];
        const tenant = activeContract?.tenant;
        const tenantName = tenant
          ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
          : activeContract?.phone
          ? "ผู้เช่า"
          : "ไม่มีข้อมูลชื่อผู้เช่า";
        const tenantPhone = tenant?.phone || activeContract?.phone || "-";
        const tenantEmail = tenant?.email || "-";
        const menuType = activeContract?.menuType || "ไม่ระบุประเภท";
        const contractNum = activeContract?.contract_number || "-";
        const monthlyRent = activeContract?.monthly_rent || selectedStall.rent;
        const formatDate = (dStr) => {
          if (!dStr) return "-";
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
        };
        const startDate = formatDate(activeContract?.start_date);
        const endDate = formatDate(activeContract?.end_date);
        const isOccupied = selectedStall.status === "OCCUPIED" || selectedStall.status === "occupied";
        const isMaintenance = selectedStall.status === "MAINTENANCE" || selectedStall.status === "maintenance";
        const isVacant = selectedStall.status === "VACANT" || selectedStall.status === "vacant";

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedStall(null)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 md:p-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedStall(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex flex-col items-center mb-6">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 text-2xl font-bold shadow-md ${
                    isOccupied
                      ? "bg-red-100 text-red-600"
                      : isMaintenance
                      ? "bg-yellow-100 text-yellow-600"
                      : isVacant
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {selectedStall.slot_number}
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {isOccupied
                    ? "มีผู้เช่าแล้ว"
                    : isMaintenance
                    ? "ปิดปรับปรุง"
                    : isVacant
                    ? "ว่าง"
                    : "ยังไม่เปิดบริการ"}
                </h3>
                <span
                  className={`mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${
                    isOccupied
                      ? "bg-red-100 text-red-700"
                      : isMaintenance
                      ? "bg-yellow-100 text-yellow-700"
                      : isVacant
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isOccupied
                    ? "สถานะปกติ"
                    : isMaintenance
                    ? "ปิดชั่วคราว"
                    : isVacant
                    ? "พร้อมเช่า"
                    : "ยังไม่เปิด"}
                </span>
              </div>

              {isOccupied ? (
                <div className="space-y-3 bg-red-50/60 p-4 rounded-2xl border border-red-100 text-left text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-red-100 font-bold text-red-800 text-sm">
                    <span className="flex items-center gap-1.5">
                      <User size={16} /> ข้อมูลผู้เช่า
                    </span>
                    <span className="text-[10px] font-mono font-normal text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                      {contractNum}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <div>
                      <span className="text-gray-400 block text-[11px]">ชื่อผู้เช่า</span>
                      <span className="font-semibold text-gray-800">{tenantName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">เบอร์โทรศัพท์</span>
                      <a href={`tel:${tenantPhone}`} className="font-semibold text-purple-600 hover:underline">
                        {tenantPhone}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">ประเภทร้านอาหาร</span>
                      <span className="font-semibold text-gray-800">{menuType}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">ค่าเช่ารายเดือน</span>
                      <span className="font-semibold text-gray-800">
                        {monthlyRent ? `${Number(monthlyRent).toLocaleString()} ฿` : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">วันเริ่มสัญญา</span>
                      <span className="font-semibold text-gray-800">{startDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">วันสิ้นสุดสัญญาเช่า</span>
                      <span className="font-semibold text-gray-800">{endDate}</span>
                    </div>
                    {tenantEmail !== "-" && (
                      <div className="col-span-2">
                        <span className="text-gray-400 block text-[11px]">อีเมล</span>
                        <span className="font-medium text-gray-700">{tenantEmail}</span>
                      </div>
                    )}
                    {activeContract?.contractImage && (
                      <div className="col-span-2 pt-1">
                        <a
                          href={activeContract.contractImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs rounded-lg transition-colors border border-purple-200"
                        >
                          <FileText size={14} /> ดูรูป/ไฟล์สัญญาฉบับจริง ↗
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => navigate("/admin/tenants")}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileText size={14} /> ดูรายละเอียดผู้เช่าทั้งหมด
                    </button>
                  </div>
                </div>
              ) : isMaintenance ? (
                <div className="text-center p-5 bg-yellow-50 rounded-2xl border border-yellow-100 space-y-2">
                  <p className="text-yellow-700 font-medium text-sm">ล็อกนี้ปิดปรับปรุงชั่วคราว</p>
                  <p className="text-xs text-yellow-600">
                    ค่าเช่า: {selectedStall.rent ? `${Number(selectedStall.rent).toLocaleString()} ฿/เดือน` : "-"}
                  </p>
                  <button
                    onClick={() => navigate("/admin/stalls")}
                    className="mt-2 w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-medium text-xs shadow-sm transition-colors"
                  >
                    จัดการสถานะแผงค้า
                  </button>
                </div>
              ) : isVacant ? (
                <div className="text-center p-5 border-2 border-dashed border-green-200 rounded-2xl bg-green-50/50 space-y-2">
                  <p className="text-green-700 font-medium text-sm">ล็อกนี้ยังว่างอยู่ (พร้อมเช่า)</p>
                  <p className="text-xs text-green-600">
                    ค่าเช่า: {selectedStall.rent ? `${Number(selectedStall.rent).toLocaleString()} ฿/เดือน` : "-"}
                  </p>
                  <button
                    onClick={() => navigate("/admin/stalls")}
                    className="mt-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium text-xs shadow-sm transition-colors"
                  >
                    ทำสัญญา / แก้ไขแผงค้า
                  </button>
                </div>
              ) : (
                <div className="text-center p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 font-medium">ยังไม่เปิดให้บริการ</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminDashboard;
