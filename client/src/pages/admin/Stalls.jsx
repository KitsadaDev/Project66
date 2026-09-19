import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Wrench,
  Gauge,
  Receipt,
  UserPlus,
  XCircle,
  Edit,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { stallsAPI } from "../../api";

/**
 * คอมโพเนนต์หน้าจัดการสถานะและข้อมูลแผงค้า (Admin Stall Management)
 * - แสดงผังจำลองตำแหน่งแผงค้าของศูนย์อาหาร 1 และ 2
 * - คลิกที่แผงค้าเพื่อสร้างข้อมูลแผงค้าใหม่ (Create) หรือแก้ไขข้อมูลเดิม (Edit)
 * - กำหนดขนาดพื้นที่ (ตร.ม.), ค่าเช่ารายเดือน (บาท), และสถานะ (ว่าง, มีผู้เช่า, ปิดปรับปรุง)
 */
const Stalls = () => {
  // สถานะข้อมูลแผงค้าทั้งหมด และสถานะการโหลด
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  // ศูนย์อาหารที่เลือกดูผัง — อ่านจาก URL query ?foodCourt= หากมี, ค่าเริ่มต้นคือ 1
  const [selectedFoodCourt, setSelectedFoodCourt] = useState(
    searchParams.get("foodCourt") ?? "1"
  );
  const [search, setSearch] = useState("");

  // สถานะสำหรับควบคุมหน้าต่างป๊อปอัป (Modal) สร้าง/แก้ไขข้อมูลแผงค้า
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' หรือ 'edit'
  const [formData, setFormData] = useState({
    slot_id: "",
    slot_number: "",
    food_court_id: "1",
    size: "",
    rent: "",
    status: "VACANT",
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchStalls();
  }, []);

  /**
   * ดึงข้อมูลแผงค้าทั้งหมดจาก API
   */
  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      setStalls(response.data.data || []);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลล็อคได้");
    } finally {
      setLoading(false);
    }
  };

  /**
   * จัดการเมื่อผู้ใช้คลิกล็อกแผงค้าบนผัง
   * - หากมีข้อมูลแผงค้าอยู่แล้วในระบบ -> เปิด Modal ในโหมด "แก้ไข" (Edit) พร้อมดึงข้อมูลเดิมมาแสดง
   * - หากยังไม่มีข้อมูล -> เปิด Modal ในโหมด "สร้างใหม่" (Create)
   * @param {string} slot_number - หมายเลขล็อก เช่น 'A1', 'B2', 'F1'
   */
  const handleStallClick = (slot_number) => {
    const existingStall = stalls.find(
      (s) =>
        s.slot_number === slot_number &&
        s.food_court_id === parseInt(selectedFoodCourt),
    );

    if (existingStall) {
      // โหมดแก้ไขข้อมูลเดิม
      setModalMode("edit");
      setFormData({
        slot_id: existingStall.slot_id,
        slot_number: existingStall.slot_number,
        food_court_id: existingStall.food_court_id?.toString() || "1",
        size: existingStall.slot_size || "",
        rent: existingStall.rent,
        status: existingStall.status,
      });
    } else {
      // โหมดสร้างข้อมูลล็อกใหม่
      setModalMode("create");
      setFormData({
        slot_id: "",
        slot_number: slot_number,
        food_court_id: selectedFoodCourt,
        size: "",
        rent: "",
        status: "VACANT",
      });
    }
    setIsModalOpen(true);
  };

  /**
   * ส่งข้อมูลบันทึกแผงค้าไปยังเซิร์ฟเวอร์ (สร้างใหม่ หรือ อัปเดต)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        slot_number: formData.slot_number,
        food_court_id: parseInt(formData.food_court_id),
        slot_size: parseFloat(formData.size).toString(),
        rent: parseFloat(formData.rent),
        status: formData.status,
      };

      if (modalMode === "create") {
        await stallsAPI.create(payload);
        toast.success("เพิ่มล็อคสำเร็จ");
      } else {
        await stallsAPI.update(formData.slot_id, payload);
        toast.success("แก้ไขข้อมูลสำเร็จ");
      }

      setIsModalOpen(false);
      fetchStalls();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `ไม่สามารถ${modalMode === "create" ? "เพิ่ม" : "แก้ไข"}ล็อคได้`,
      );
    }
  };

  /**
   * ตรวจสอบสถานะของแผงค้าเพื่อใช้กำหนดสี
   * @param {string} slot_number - หมายเลขล็อก
   */
  const getStallStatus = (slot_number) => {
    const stall = stalls.find(
      (s) =>
        s.slot_number === slot_number &&
        s.food_court_id === parseInt(selectedFoodCourt),
    );
    if (!stall) return "empty";
    return stall.status.toLowerCase();
  };

  /**
   * คอมโพเนนต์ย่อยแสดงช่องเซลล์แผงค้าแต่ละช่องในผัง
   */
  const [hoveredStall, setHoveredStall] = useState(null);
  const hoverTimerRef = useRef(null);

  /**
   * เมาส์เข้าแผงค้า หรือ Popover -> เคลียร์ timer เพื่อให้เปิดค้างไว้
   */
  const handleStallMouseEnter = (id) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredStall(id);
  };

  /**
   * เมาส์ออกจากแผงค้า หรือ Popover -> ค้างไว้ 2 วินาทีค่อยหายไป เพื่อให้เลื่อนไปกดเมนูลัดทัน
   */
  const handleStallMouseLeave = () => {
    if (editingStall) return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setHoveredStall(null);
      hoverTimerRef.current = null;
    }, 2000);
  };

  // ล้าง timer เมื่อ unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  // สถานะของแผงที่กำลังแก้ไข inline
  const [editingStall, setEditingStall] = useState(null);
  // ข้อมูลฟอร์มสำหรับการแก้ไข inline
  const [inlineForm, setInlineForm] = useState({ size: "", rent: "", status: "VACANT" });
  const [inlineSaving, setInlineSaving] = useState(false);

  /**
   * ดึงข้อมูลรายละเอียดแผงค้าเพื่อแสดงใน Tooltip
   */
  const getStallInfo = (slot_number) => {
    return stalls.find(
      (s) =>
        s.slot_number === slot_number &&
        s.food_court_id === parseInt(selectedFoodCourt),
    );
  };

  /**
   * แปลงสถานะเป็นข้อความภาษาไทยและสีสำหรับ Tooltip
   */
  const getStatusLabel = (status) => {
    switch (status?.toUpperCase()) {
      case "OCCUPIED":
        return { label: "มีผู้เช่า", color: "bg-red-100 text-red-700" };
      case "VACANT":
        return { label: "ว่าง", color: "bg-green-100 text-green-700" };
      case "MAINTENANCE":
        return { label: "ปิดปรับปรุง", color: "bg-yellow-100 text-yellow-700" };
      default:
        return { label: "ไม่ทราบสถานะ", color: "bg-gray-100 text-gray-600" };
    }
  };

  /**
   * เปิดโหมดแก้ไข inline สำหรับแผงที่มีข้อมูลแล้ว
   */
  const handleInlineEdit = (e, stallInfo) => {
    e.stopPropagation();
    setEditingStall(stallInfo.slot_number);
    setInlineForm({
      size: stallInfo.slot_size ?? "",
      rent: stallInfo.rent ?? "",
      status: stallInfo.status ?? "VACANT",
    });
  };

  /**
   * บันทึกการแก้ไข inline ไปยัง API
   */
  const handleInlineSave = async (e, stallInfo) => {
    e.stopPropagation();
    setInlineSaving(true);
    try {
      await stallsAPI.update(stallInfo.slot_id, {
        slot_number: stallInfo.slot_number,
        food_court_id: stallInfo.food_court_id,
        slot_size: parseFloat(inlineForm.size).toString(),
        rent: parseFloat(inlineForm.rent),
        status: inlineForm.status,
      });
      toast.success("แก้ไขข้อมูลสำเร็จ");
      setEditingStall(null);
      setHoveredStall(null);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      fetchStalls();
    } catch (error) {
      toast.error(error.response?.data?.message || "ไม่สามารถแก้ไขข้อมูลได้");
    } finally {
      setInlineSaving(false);
    }
  };

  const StallCell = ({ id, small = false, w = 44, h = 44, fixedSize = false }) => {
    const status = getStallStatus(id);
    const stallInfo = getStallInfo(id);
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

    const isHovered = hoveredStall === id;
    const isEditing = editingStall === id;
    const statusInfo = stallInfo ? getStatusLabel(stallInfo.status) : null;

    // สำหรับแถวด้านล่าง ให้เปิดป๊อปอัปขึ้นด้านบน เพื่อไม่ให้ล้นตกขอบล่าง
    const isBottomStall = id.startsWith("D") || id.startsWith("E") || id === "F1" || id === "F2" || id === "F3" || id === "A10" || id === "A11";

    return (
      <div
        style={fixedSize ? { width: w, height: h } : {}}
        className={`${fixedSize ? "text-xs font-bold" : sizeClass} relative rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md flex-shrink-0 ${colorClass} ${(isHovered || isEditing) ? "z-30 ring-2 ring-purple-300" : ""}`}
        onClick={() => !isEditing && handleStallClick(id)}
        onMouseEnter={() => handleStallMouseEnter(id)}
        onMouseLeave={handleStallMouseLeave}
      >
        <span className="font-bold">{id}</span>

        {/* ── Hover Popover (ค้างไว้ 2 วินาทีเมื่อเลื่อนเมาส์ออก เพื่อให้กดเมนูลัดได้ทัน) ── */}
        {(isHovered || isEditing) && (
          <div
            className={`absolute z-50 ${isBottomStall ? "bottom-full mb-2 before:-bottom-3" : "top-full mt-2 before:-top-3"} left-1/2 -translate-x-1/2 pointer-events-auto before:content-[''] before:absolute before:left-0 before:right-0 before:h-3`}
            style={{ minWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => handleStallMouseEnter(id)}
            onMouseLeave={handleStallMouseLeave}
          >
            <div className="bg-white border border-gray-200 text-gray-800 text-xs rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2">

              {/* ── หัว popover ── */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-0.5">
                <span className="font-bold text-sm text-gray-900">แผงที่ {id}</span>
                {stallInfo && !isEditing && (
                  <button
                    onClick={(e) => handleInlineEdit(e, stallInfo)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold transition-colors"
                  >
                    <Edit size={11} /> แก้ไข
                  </button>
                )}
              </div>

              {/* ── โหมดดูข้อมูล ── */}
              {!isEditing && stallInfo && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">สถานะ</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">ขนาด</span>
                    <span className="font-medium">{stallInfo.slot_size ?? "-"} ตร.ม.</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">ค่าเช่า</span>
                    <span className="font-medium">
                      {stallInfo.rent != null ? stallInfo.rent.toLocaleString("th-TH") : "-"} บาท/เดือน
                    </span>
                  </div>

                  {/* ── ปุ่ม Shortcut ── */}
                  <div className="border-t border-gray-100 pt-2 mt-0.5">
                    <p className="text-gray-400 text-[10px] mb-1.5 font-medium">ทางลัดไป</p>
                    <div className="grid grid-cols-2 gap-1.5">

                      {/* สัญญา - แสดงเมื่อมีผู้เช่า */}
                      {stallInfo.status === "OCCUPIED" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/contracts?slot=${encodeURIComponent(stallInfo.slot_number || id)}`); }}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium text-[11px]"
                        >
                          <FileText size={12} /> สัญญา
                        </button>
                      )}

                      {/* สร้างสัญญา - แสดงเมื่อว่าง */}
                      {stallInfo.status === "VACANT" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/admin/create-contract"); }}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium text-[11px]"
                        >
                          <UserPlus size={12} /> สร้างสัญญา
                        </button>
                      )}

                      {/* แจ้งซ่อม */}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate("/admin/repairs"); }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors font-medium text-[11px]"
                      >
                        <Wrench size={12} /> แจ้งซ่อม
                      </button>

                      {/* บันทึกมิเตอร์ */}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/meter-recording?slot=${encodeURIComponent(stallInfo.slot_number || id)}`); }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors font-medium text-[11px]"
                      >
                        <Gauge size={12} /> บันทึกมิเตอร์
                      </button>

                      {/* ใบแจ้งหนี้ */}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/bills?slot=${encodeURIComponent(stallInfo.slot_number || id)}`); }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-medium text-[11px]"
                      >
                        <Receipt size={12} /> ใบแจ้งหนี้
                      </button>

                      {/* ยกเลิกสัญญา - แสดงเมื่อมีผู้เช่า */}
                      {stallInfo.status === "OCCUPIED" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/admin/cancel-contracts"); }}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors font-medium text-[11px]"
                        >
                          <XCircle size={12} /> ยกเลิกสัญญา
                        </button>
                      )}

                    </div>
                  </div>
                </>
              )}

              {/* ── โหมดแก้ไข inline ── */}
              {isEditing && stallInfo && (
                <>
                  {/* ขนาด */}
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">ขนาด (ตร.ม.)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={inlineForm.size}
                      onChange={(e) => setInlineForm({ ...inlineForm, size: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
                    />
                  </div>
                  {/* ค่าเช่า */}
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">ค่าเช่า (บาท/เดือน)</label>
                    <input
                      type="number"
                      min="0"
                      value={inlineForm.rent}
                      onChange={(e) => setInlineForm({ ...inlineForm, rent: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
                    />
                  </div>
                  {/* สถานะ */}
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-medium">สถานะ</label>
                    <select
                      value={inlineForm.status}
                      onChange={(e) => setInlineForm({ ...inlineForm, status: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
                    >
                      <option value="VACANT">ว่าง (Vacant)</option>
                      <option value="OCCUPIED">มีผู้เช่า (Occupied)</option>
                      <option value="MAINTENANCE">ปิดปรับปรุง (Maintenance)</option>
                    </select>
                  </div>
                  {/* ปุ่ม */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingStall(null); }}
                      className="flex-1 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium text-xs transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={(e) => handleInlineSave(e, stallInfo)}
                      disabled={inlineSaving}
                      className="flex-1 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-xs transition-colors disabled:opacity-60"
                    >
                      {inlineSaving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </>
              )}

              {/* ── แผงที่ยังไม่ได้กำหนด ── */}
              {!stallInfo && (
                <div className="text-gray-400 italic text-center py-1">ยังไม่ได้กำหนดข้อมูล</div>
              )}

              {/* ปลาย popover */}
              {isBottomStall ? (
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white drop-shadow-sm" />
              ) : (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-white drop-shadow-sm" />
              )}
            </div>
          </div>
        )}
      </div>
    );
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            จัดการสถานะแผงค้า
          </h1>
          <p className="text-gray-500 text-sm">
            คลิกที่แผงค้าในผังเพื่อ เพิ่ม หรือ แก้ไข ข้อมูล
          </p>
        </div>

        {/* Food Court Selector */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedFoodCourt("1")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedFoodCourt === "1"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ศูนย์อาหาร 1
          </button>
          <button
            onClick={() => setSelectedFoodCourt("2")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedFoodCourt === "2"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ศูนย์อาหาร 2
          </button>
        </div>
      </div>

      {/* Visual Map */}
      {selectedFoodCourt === "1" ? (
        /* ===== ผังศูนย์อาหาร 1 ===== */
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-3 sm:p-6 w-full overflow-x-auto">
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
        </div>
      ) : (
        /* ===== ผังศูนย์อาหาร 2 ===== */
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-3 sm:p-6 w-full overflow-x-auto">
          {/* Mobile scroll hint */}
          <div className="lg:hidden text-center text-xs text-purple-600 font-semibold mb-3 flex items-center justify-center gap-1.5 bg-purple-50/80 py-2 px-3 rounded-xl border border-purple-100 shadow-sm">
            <span>👈</span> เลื่อน ซ้าย-ขวา เพื่อดูผังทั้งหมด <span>👉</span>
          </div>

          <div className="min-w-[650px] w-[650px] mx-auto">
            <div style={{ position: "relative", width: 650, height: 540, border: "3px solid #4B5563" }}>
              {/* ── Stall Column F (F10 down to F1) ── */}
              <div style={{ position: "absolute", top: 24, left: 24, display: "flex", flexDirection: "column", gap: 5 }}>
                {["F10", "F9", "F8", "F7", "F6", "F5", "F4", "F3", "F2", "F1"].map((id) => (
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
        </div>
      )}

      {/* หน้าต่าง Modal สำหรับเพิ่มล็อกใหม่ หรือ แก้ไขข้อมูลล็อกเดิม */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {/* ส่วนหัว Modal */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === "create" ? "เพิ่มล็อกใหม่" : "แก้ไขข้อมูลล็อก"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* ฟอร์มกรอกข้อมูล */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ช่องแสดงหมายเลขแผงค้า (Readonly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเลขแผงค้า
                </label>
                <input
                  type="text"
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={formData.slot_number}
                />
              </div>

              {/* ซ่อนค่า foodCourt เพื่อรักษาความเข้ากันได้ */}
              <input type="hidden" value={formData.food_court_id} />

              {/* ช่องกรอกขนาดและค่าเช่า */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ขนาด (ตร.ม.)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค่าเช่า (บาท/เดือน)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={formData.rent}
                    onChange={(e) =>
                      setFormData({ ...formData, rent: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* ตัวเลือกสถานะ (แสดงเฉพาะในโหมดแก้ไข) */}
              {modalMode === "edit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    สถานะ
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="VACANT">ว่าง (Vacant)</option>
                    <option value="OCCUPIED">มีผู้เช่า (Occupied)</option>
                    <option value="MAINTENANCE">
                      ปิดปรับปรุง (Maintenance)
                    </option>
                  </select>
                </div>
              )}

              {/* ปุ่มยกเลิก และบันทึก */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium shadow-sm"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stalls;
