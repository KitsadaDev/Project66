import { useEffect, useState } from "react";
import {
  Search,
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Plus,
} from "lucide-react";
import { toast } from "react-toastify";
import { stallsAPI } from "../../api";

const Stalls = () => {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFoodCourt, setSelectedFoodCourt] = useState("1");
  const [search, setSearch] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [formData, setFormData] = useState({
    slot_id: "",
    slot_number: "",
    food_court_id: "1",
    size: "",
    rent: "",
    status: "VACANT",
  });

  useEffect(() => {
    fetchStalls();
  }, []);

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

  const handleStallClick = (slot_number) => {
    const existingStall = stalls.find(
      (s) =>
        s.slot_number === slot_number &&
        s.food_court_id === parseInt(selectedFoodCourt),
    );

    if (existingStall) {
      // Edit Mode
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
      // Create Mode
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

  const getStallStatus = (slot_number) => {
    const stall = stalls.find(
      (s) =>
        s.slot_number === slot_number &&
        s.food_court_id === parseInt(selectedFoodCourt),
    );
    if (!stall) return "empty";
    return stall.status.toLowerCase();
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
      >
        <span className="font-bold">{id}</span>
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
        /* ===== ผังศูนย์อาหาร 2 (เดิม) ===== */
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-8 flex justify-center overflow-x-auto">
          <div className="flex flex-col gap-6 min-w-[600px]">
            {/* Row B + D1 */}
            <div className="flex gap-4">
              {["B1", "B2", "B3", "B4", "B5", "B6"].map((id) => (
                <StallCell key={id} id={id} />
              ))}
              <div className="w-10"></div>
              <StallCell id="D1" />
            </div>

            {/* Spacer + D2 */}
            <div className="flex gap-4">
              <div className="flex-1"></div>
              <div className="w-10"></div>
              <StallCell id="D2" />
            </div>

            {/* Row A + D3 */}
            <div className="flex gap-4">
              {["A1", "A2", "A3", "A4", "A5", "A6"].map((id) => (
                <StallCell key={id} id={id} />
              ))}
              <div className="w-10"></div>
              <StallCell id="D3" />
            </div>

            <div className="h-4"></div>

            {/* Row C */}
            <div className="flex gap-4">
              {["C1", "C2", "C3", "C4", "C5", "C6"].map((id) => (
                <StallCell key={id} id={id} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
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

            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Food Court Selector Removed as per request */}
              <input type="hidden" value={formData.foodCourt} />

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
