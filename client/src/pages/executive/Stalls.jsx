import { useEffect, useState } from "react";
import {
  Search,
  Building2,
  User,
  Store,
  MapPin,
  X,
  FileText,
  Phone,
  Mail,
  Calendar,
  Eye,
  Info,
} from "lucide-react";
import { stallsAPI } from "../../api";
import { formatPhoneNumber } from "../../utils/formatters";

const ExecutiveStalls = () => {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFoodCourt, setSelectedFoodCourt] = useState("1");
  const [search, setSearch] = useState("");
  const [filterFoodCourt, setFilterFoodCourt] = useState("ALL");

  // View-Only Modal State
  const [selectedStall, setSelectedStall] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchStalls();
  }, []);

  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      setStalls(response.data.data || []);
    } catch (error) {
      console.error("Error fetching stalls:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStallStatus = (slot_number) => {
    const stall = stalls.find(
      (s) =>
        s.slot_number === slot_number &&
        s.food_court_id === parseInt(selectedFoodCourt)
    );
    if (!stall) return "empty";
    return stall.status.toLowerCase();
  };

  const handleStallClick = (slot_number) => {
    const existingStall = stalls.find(
      (s) =>
        s.slot_number === slot_number &&
        s.food_court_id === parseInt(selectedFoodCourt)
    );

    if (existingStall) {
      setSelectedStall(existingStall);
    } else {
      setSelectedStall({
        slot_number: slot_number,
        food_court_id: parseInt(selectedFoodCourt),
        status: "VACANT",
        rent: 0,
      });
    }
    setIsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      OCCUPIED: { bg: "bg-red-100", text: "text-red-700", label: "มีผู้เช่า" },
      VACANT: { bg: "bg-green-100", text: "text-green-700", label: "ว่าง" },
      MAINTENANCE: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "ซ่อมบำรุง",
      },
    };
    const { bg, text, label } = config[status] || config.VACANT;
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bg} ${text} inline-flex items-center gap-1`}>
        {label}
      </span>
    );
  };

  const StallCell = ({ id, small = false, w = 44, h = 44, fixedSize = false }) => {
    const status = getStallStatus(id);
    let colorClass = "";
    const sizeClass = small ? "w-12 h-12 text-xs" : "w-16 h-16 text-sm";

    switch (status) {
      case "occupied":
        colorClass = "bg-red-100 border-red-300 text-red-700";
        break;
      case "vacant":
        colorClass = "bg-green-100 border-green-300 text-green-700";
        break;
      case "maintenance":
        colorClass = "bg-yellow-100 border-yellow-300 text-yellow-700";
        break;
      default:
        colorClass =
          "bg-gray-50 border-dashed border-gray-300 text-gray-400 hover:border-purple-400 hover:text-purple-500";
    }

    return (
      <div
        onClick={() => handleStallClick(id)}
        style={fixedSize ? { width: w, height: h } : {}}
        className={`${fixedSize ? "text-xs font-bold" : sizeClass} rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md flex-shrink-0 ${colorClass}`}
        title={`ล็อค ${id} (คลิกเพื่อดูรายละเอียด)`}
      >
        <span className="font-bold">{id}</span>
      </div>
    );
  };

  // Filtered stalls for the table below
  const filteredStalls = stalls.filter((stall) => {
    const matchSearch =
      stall.slot_number?.toLowerCase().includes(search.toLowerCase()) ||
      stall.rental_contracts?.[0]?.tenant?.first_name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      stall.rental_contracts?.[0]?.tenant?.last_name
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchFoodCourt =
      filterFoodCourt === "ALL" ||
      stall.food_court_id?.toString() === filterFoodCourt;
    return matchSearch && matchFoodCourt;
  });

  // Current Food Court stats for summary
  const currentFCStalls = stalls.filter(
    (s) => s.food_court_id === parseInt(selectedFoodCourt)
  );
  const occupiedCount = currentFCStalls.filter((s) => s.status === "OCCUPIED").length;
  const vacantCount = currentFCStalls.filter((s) => s.status === "VACANT").length;
  const maintenanceCount = currentFCStalls.filter((s) => s.status === "MAINTENANCE").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            ข้อมูลและสถานะแผงค้า
          </h1>
          <p className="text-gray-500 text-sm">
            ดูข้อมูลและสถานะแผงค้าตามผังศูนย์อาหาร (ดูได้อย่างเดียว)
          </p>
        </div>

        {/* Food Court Selector */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setSelectedFoodCourt("1")}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                selectedFoodCourt === "1"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              ศูนย์อาหาร 1
            </button>
            <button
              onClick={() => setSelectedFoodCourt("2")}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                selectedFoodCourt === "2"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              ศูนย์อาหาร 2
            </button>
          </div>
        </div>
      </div>

      {/* Visual Map Card (Placed on Top) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
        {/* Map Top Bar: Title & Legend & Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Store size={20} className="text-purple-600" />
              ผังศูนย์อาหาร {selectedFoodCourt}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              คลิกที่แผงค้าในผังเพื่อดูรายละเอียดข้อมูลและผู้เช่า
            </p>
          </div>

          {/* Quick Summary Counts & Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 font-medium">
              <span>ทั้งหมด:</span>
              <span className="font-bold text-gray-900">{currentFCStalls.length}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 text-red-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
              <span>มีผู้เช่า:</span>
              <span>{occupiedCount}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200 text-green-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
              <span>ว่าง:</span>
              <span>{vacantCount}</span>
            </div>
            {maintenanceCount > 0 && (
              <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-200 text-yellow-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
                <span>ซ่อมบำรุง:</span>
                <span>{maintenanceCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Map Content */}
        {selectedFoodCourt === "1" ? (
          /* ===== ผังศูนย์อาหาร 1 ===== */
          <div className="w-full overflow-x-auto pb-4">
            {/* Mobile scroll hint */}
            <div className="lg:hidden text-center text-xs text-purple-600 font-semibold mb-3 flex items-center justify-center gap-1.5 bg-purple-50/80 py-2 px-3 rounded-xl border border-purple-100 shadow-sm">
              <span>👈</span> เลื่อน ซ้าย-ขวา เพื่อดูผังทั้งหมด <span>👉</span>
            </div>

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
                  className="absolute flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-100/80 text-gray-500 text-sm font-medium"
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
          </div>
        ) : (
          /* ===== ผังศูนย์อาหาร 2 ===== */
          <div className="w-full overflow-x-auto pb-4">
            {/* Mobile scroll hint */}
            <div className="lg:hidden text-center text-xs text-purple-600 font-semibold mb-3 flex items-center justify-center gap-1.5 bg-purple-50/80 py-2 px-3 rounded-xl border border-purple-100 shadow-sm">
              <span>👈</span> เลื่อน ซ้าย-ขวา เพื่อดูผังทั้งหมด <span>👉</span>
            </div>

            <div className="min-w-[650px] w-[650px] mx-auto">
              <div style={{ position: "relative", width: 650, height: 540, border: "3px solid #4B5563", borderRadius: 16 }}>
                {/* ── Stall Column F (F10 down to F1) ── */}
                <div style={{ position: "absolute", top: 24, left: 24, display: "flex", flexDirection: "column", gap: 5 }}>
                  {["F10", "F9", "F8", "F7", "F6", "F5", "F4", "F3", "F2", "F1"].map((id) => (
                    <StallCell key={id} id={id} fixedSize w={44} h={44} />
                  ))}
                </div>

                {/* ── Dining zone ── */}
                <div
                  className="absolute flex items-center justify-center rounded-2xl bg-gray-100/90 border-2 border-dashed border-gray-300 text-gray-600 text-base font-semibold"
                  style={{ top: 24, left: 120, width: 495, height: 485 }}
                >
                  โซนโต๊ะนั่งทานอาหาร
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Section (Moved below the map) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              ตารางข้อมูลแผงค้าทั้งหมด
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              รายการแผงค้าและข้อมูลผู้เช่าในระบบ ({filteredStalls.length} รายการ)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                className="w-full sm:w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm bg-gray-50 focus:bg-white transition-colors"
                placeholder="ค้นหาล็อคหรือชื่อผู้เช่า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm cursor-pointer"
              value={filterFoodCourt}
              onChange={(e) => setFilterFoodCourt(e.target.value)}
            >
              <option value="ALL">ทุกศูนย์อาหาร</option>
              <option value="1">ศูนย์อาหาร 1</option>
              <option value="2">ศูนย์อาหาร 2</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tl-xl text-sm">
                  ล็อค
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ศูนย์อาหาร
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  สถานะ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ผู้เช่า
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ค่าเช่า/เดือน
                </th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700 rounded-tr-xl text-sm">
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStalls.map((stall) => (
                <tr
                  key={stall.slot_id}
                  className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                        {stall.slot_number}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Store size={16} className="text-gray-400" />
                      ศูนย์อาหาร {stall.food_court_id}
                    </div>
                  </td>
                  <td className="py-4 px-6">{getStatusBadge(stall.status)}</td>
                  <td className="py-4 px-6">
                    {stall.rental_contracts?.[0]?.tenant ? (
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-800 text-sm font-medium">
                          {stall.rental_contracts[0].tenant.first_name}{" "}
                          {stall.rental_contracts[0].tenant.last_name || ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-800 text-sm">
                    ฿{(stall.rent || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => {
                        setSelectedStall(stall);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-sm"
                    >
                      <Eye size={13} /> ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStalls.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400 text-sm">
                    ไม่พบข้อมูลล็อคที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View-Only Detail Modal */}
      {isModalOpen && selectedStall && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl border border-gray-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-xl shadow-sm">
                  {selectedStall.slot_number}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    ข้อมูลแผงค้า {selectedStall.slot_number}
                  </h2>
                  <p className="text-xs text-gray-500">
                    ศูนย์อาหาร {selectedStall.food_court_id || selectedFoodCourt}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stall Details Grid */}
            <div className="grid grid-cols-2 gap-3.5 mb-6">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">สถานะปัจจุบัน</span>
                {getStatusBadge(selectedStall.status)}
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">ค่าเช่าต่อเดือน</span>
                <span className="font-bold text-purple-700 text-base">
                  ฿{(selectedStall.rent || 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">ขนาดพื้นที่</span>
                <span className="font-semibold text-gray-700 text-sm">
                  {selectedStall.slot_size ? `${selectedStall.slot_size} ตร.ม.` : "-"}
                </span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">ศูนย์อาหาร</span>
                <span className="font-semibold text-gray-700 text-sm">
                  ศูนย์อาหาร {selectedStall.food_court_id || selectedFoodCourt}
                </span>
              </div>
            </div>

            {/* Tenant Info Section */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <User size={16} className="text-purple-600" />
                ข้อมูลผู้เช่าปัจจุบัน
              </h3>
              {selectedStall.rental_contracts?.[0]?.tenant ? (
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">ชื่อ-นามสกุล:</span>
                    <span className="font-bold text-gray-800">
                      {selectedStall.rental_contracts[0].tenant.first_name}{" "}
                      {selectedStall.rental_contracts[0].tenant.last_name || ""}
                    </span>
                  </div>
                  {selectedStall.rental_contracts[0].tenant.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">เบอร์โทรศัพท์:</span>
                      <span className="font-medium text-gray-700">
                        {formatPhoneNumber(selectedStall.rental_contracts[0].tenant.phone)}
                      </span>
                    </div>
                  )}
                  {selectedStall.rental_contracts[0].tenant.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">อีเมล:</span>
                      <span className="font-medium text-gray-700">
                        {selectedStall.rental_contracts[0].tenant.email}
                      </span>
                    </div>
                  )}
                  {selectedStall.rental_contracts[0].contract_number && (
                    <div className="flex justify-between items-center pt-2 border-t border-purple-100/60">
                      <span className="text-gray-500 text-xs">เลขที่สัญญา:</span>
                      <span className="font-semibold text-purple-700 text-xs">
                        #{selectedStall.rental_contracts[0].contract_number}
                      </span>
                    </div>
                  )}
                  {selectedStall.rental_contracts[0].start_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">ระยะเวลาสัญญา:</span>
                      <span className="text-gray-600 text-xs">
                        {formatDate(selectedStall.rental_contracts[0].start_date)} -{" "}
                        {formatDate(selectedStall.rental_contracts[0].end_date)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center text-gray-400 text-sm">
                  ปัจจุบันไม่มีผู้เช่า (แผงค้าว่าง)
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer text-sm"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveStalls;
