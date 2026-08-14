import { useEffect, useState } from "react";
import {
  Search,
  Droplets,
  Zap,
  Save,
  Edit,
  X,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { toast } from "react-toastify";
import { stallsAPI, settingsAPI } from "../../api";

const MeterRecording = () => {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [foodCourtFilter, setFoodCourtFilter] = useState("ALL");
  const [meterReadings, setMeterReadings] = useState({});
  const [editingStalls, setEditingStalls] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState({});
  const [rates, setRates] = useState({ water: 14, electric: 6 });

  useEffect(() => {
    fetchStalls();
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const res = await settingsAPI.getUtilityRates();
      setRates({
        water: res.data.data.waterRatePerUnit,
        electric: res.data.data.electricRatePerUnit,
      });
    } catch {
      // use default
    }
  };

  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      const occupiedStalls = (response.data.data || []).filter(
        (s) => s.status === "OCCUPIED"
      );
      setStalls(occupiedStalls);

      const readings = {};
      occupiedStalls.forEach((stall) => {
        const lastWater = stall.utility_meters?.find(
          (m) => m.meter_type === "WATER"
        );
        const lastElec = stall.utility_meters?.find(
          (m) => m.meter_type === "ELECTRICITY"
        );
        readings[stall.slot_id] = {
          waterMeter: "",
          electricMeter: "",
          waterMeterNumber: lastWater?.meter_number || "",
          electricMeterNumber: lastElec?.meter_number || "",
        };
      });
      setMeterReadings(readings);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (stallId, field, value) => {
    setMeterReadings((prev) => ({
      ...prev,
      [stallId]: { ...prev[stallId], [field]: value },
    }));
  };

  const getPreview = (stallId, stall) => {
    const reading = meterReadings[stallId] || {};
    const lastWater = stall.utility_meters?.find((m) => m.meter_type === "WATER");
    const lastElec = stall.utility_meters?.find((m) => m.meter_type === "ELECTRICITY");

    const prevWater = lastWater ? parseFloat(lastWater.current_reading) : 0;
    const prevElec = lastElec ? parseFloat(lastElec.current_reading) : 0;

    const currWater = parseFloat(reading.waterMeter) || 0;
    const currElec = parseFloat(reading.electricMeter) || 0;

    const usedWater = reading.waterMeter !== "" ? Math.max(0, currWater - prevWater) : null;
    const usedElec = reading.electricMeter !== "" ? Math.max(0, currElec - prevElec) : null;

    return {
      prevWater,
      prevElec,
      usedWater,
      usedElec,
      costWater: usedWater !== null ? usedWater * rates.water : null,
      costElec: usedElec !== null ? usedElec * rates.electric : null,
    };
  };

  const handleSave = async (stallId) => {
    setSaving(true);
    try {
      const reading = meterReadings[stallId];
      await stallsAPI.recordMeterReading(stallId, {
        waterMeter: reading.waterMeter !== "" ? parseFloat(reading.waterMeter) : undefined,
        electricMeter: reading.electricMeter !== "" ? parseFloat(reading.electricMeter) : undefined,
        waterMeterNumber: reading.waterMeterNumber || undefined,
        electricMeterNumber: reading.electricMeterNumber || undefined,
      });
      toast.success("บันทึกมิเตอร์สำเร็จ");
      setEditingStalls((prev) => ({ ...prev, [stallId]: false }));
      fetchStalls();
    } catch (error) {
      toast.error(error.response?.data?.message || "ไม่สามารถบันทึกมิเตอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const toSave = Object.entries(editingStalls).filter(([, v]) => v);
    if (toSave.length === 0) {
      toast.info("ไม่มีแผงค้าที่อยู่ในโหมดแก้ไข");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(toSave.map(([stallId]) => {
        const reading = meterReadings[stallId];
        return stallsAPI.recordMeterReading(stallId, {
          waterMeter: reading.waterMeter !== "" ? parseFloat(reading.waterMeter) : undefined,
          electricMeter: reading.electricMeter !== "" ? parseFloat(reading.electricMeter) : undefined,
          waterMeterNumber: reading.waterMeterNumber || undefined,
          electricMeterNumber: reading.electricMeterNumber || undefined,
        });
      }));
      toast.success("บันทึกมิเตอร์ทั้งหมดสำเร็จ");
      setEditingStalls({});
      fetchStalls();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const filteredStalls = stalls.filter((stall) => {
    const tenant = stall.rental_contracts?.[0]?.tenant;
    const tenantName = tenant
      ? `${tenant.first_name} ${tenant.last_name || ""}`.toLowerCase()
      : "";
    const matchesSearch =
      stall.slot_number?.toLowerCase().includes(search.toLowerCase()) ||
      tenantName.includes(search.toLowerCase());
    const matchesFoodCourt =
      foodCourtFilter === "ALL" ||
      stall.food_court_id?.toString() === foodCourtFilter;
    return matchesSearch && matchesFoodCourt;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            บันทึกมิเตอร์น้ำ / ไฟ
          </h1>
          <p className="text-gray-500 text-sm">
            กรอกค่ามิเตอร์ประจำเดือนของแต่ละแผงค้า
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Rate display */}
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-100 font-medium">
              <Droplets size={13} /> น้ำ {rates.water} ฿/หน่วย
            </span>
            <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-lg border border-yellow-100 font-medium">
              <Zap size={13} /> ไฟ {rates.electric} ฿/หน่วย
            </span>
          </div>
          <button
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-md shadow-purple-200 text-sm"
            onClick={handleSaveAll}
            disabled={saving}
          >
            <Save size={16} /> บันทึกทั้งหมด
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-sm"
              placeholder="ค้นหาหมายเลขแผงค้า หรือชื่อผู้เช่า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white text-sm"
            value={foodCourtFilter}
            onChange={(e) => setFoodCourtFilter(e.target.value)}
          >
            <option value="ALL">ทุกศูนย์อาหาร</option>
            <option value="1">ศูนย์อาหาร 1</option>
            <option value="2">ศูนย์อาหาร 2</option>
          </select>
        </div>

        {/* Stall Cards */}
        <div className="space-y-4">
          {filteredStalls.map((stall) => {
            const isEditing = editingStalls[stall.slot_id];
            const reading = meterReadings[stall.slot_id] || {};
            const preview = getPreview(stall.slot_id, stall);
            const tenant = stall.rental_contracts?.[0]?.tenant;
            const allMeters = stall.utility_meters || [];
            const waterHistory = allMeters.filter((m) => m.meter_type === "WATER").slice(0, 3);
            const elecHistory = allMeters.filter((m) => m.meter_type === "ELECTRICITY").slice(0, 3);
            const showHistory = expandedHistory[stall.slot_id];

            return (
              <div
                key={stall.slot_id}
                className={`rounded-2xl border-2 transition-all ${
                  isEditing
                    ? "border-purple-300 bg-purple-50/40 shadow-md"
                    : "border-gray-100 bg-white hover:border-purple-200"
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold">
                      {stall.slot_number}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {tenant
                          ? `${tenant.first_name} ${tenant.last_name || ""}`
                          : "ไม่มีข้อมูลผู้เช่า"}
                      </p>
                      <p className="text-xs text-gray-400">ศูนย์อาหาร {stall.food_court_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2 py-1"
                      onClick={() =>
                        setExpandedHistory((prev) => ({
                          ...prev,
                          [stall.slot_id]: !prev[stall.slot_id],
                        }))
                      }
                    >
                      <History size={14} />
                      ประวัติ
                      {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {isEditing ? (
                      <>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                          onClick={() => handleSave(stall.slot_id)}
                          disabled={saving}
                        >
                          <Save size={14} /> บันทึก
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors"
                          onClick={() =>
                            setEditingStalls((prev) => ({ ...prev, [stall.slot_id]: false }))
                          }
                          disabled={saving}
                        >
                          <X size={14} /> ยกเลิก
                        </button>
                      </>
                    ) : (
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-semibold transition-colors"
                        onClick={() =>
                          setEditingStalls((prev) => ({ ...prev, [stall.slot_id]: true }))
                        }
                      >
                        <Edit size={14} /> แก้ไข
                      </button>
                    )}
                  </div>
                </div>

                {/* Meter Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4">
                  {/* Water */}
                  <div className={`rounded-xl p-3 border ${isEditing ? "bg-white border-blue-200" : "bg-blue-50/50 border-blue-100"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets size={16} className="text-blue-500" />
                      <span className="text-sm font-semibold text-blue-700">มิเตอร์น้ำ</span>
                    </div>
                    {isEditing && (
                      <div className="mb-2">
                        <label className="text-xs text-gray-500 mb-0.5 block">เลขมิเตอร์ (หมายเลขประจำมิเตอร์)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                          placeholder="เช่น W-001"
                          value={reading.waterMeterNumber || ""}
                          onChange={(e) =>
                            handleInputChange(stall.slot_id, "waterMeterNumber", e.target.value)
                          }
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-0.5 block">
                          ค่ามิเตอร์ปัจจุบัน (หน่วย)
                        </label>
                        <input
                          type="number"
                          disabled={!isEditing}
                          className={`w-full px-3 py-2 border rounded-lg text-right font-bold text-lg focus:outline-none focus:border-blue-400 transition-colors ${
                            !isEditing
                              ? "bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500"
                              : "bg-white border-blue-300"
                          }`}
                          placeholder={preview.prevWater.toString()}
                          value={reading.waterMeter}
                          onChange={(e) =>
                            handleInputChange(stall.slot_id, "waterMeter", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>ค่าก่อนหน้า: <strong className="text-gray-700">{preview.prevWater}</strong></span>
                      {preview.usedWater !== null && (
                        <span className="text-blue-600 font-semibold">
                          ใช้ {preview.usedWater} หน่วย ≈ {preview.costWater?.toLocaleString()} ฿
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Electric */}
                  <div className={`rounded-xl p-3 border ${isEditing ? "bg-white border-yellow-200" : "bg-yellow-50/50 border-yellow-100"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={16} className="text-yellow-500" />
                      <span className="text-sm font-semibold text-yellow-700">มิเตอร์ไฟฟ้า</span>
                    </div>
                    {isEditing && (
                      <div className="mb-2">
                        <label className="text-xs text-gray-500 mb-0.5 block">เลขมิเตอร์ (หมายเลขประจำมิเตอร์)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-400"
                          placeholder="เช่น E-001"
                          value={reading.electricMeterNumber || ""}
                          onChange={(e) =>
                            handleInputChange(stall.slot_id, "electricMeterNumber", e.target.value)
                          }
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-0.5 block">
                          ค่ามิเตอร์ปัจจุบัน (หน่วย)
                        </label>
                        <input
                          type="number"
                          disabled={!isEditing}
                          className={`w-full px-3 py-2 border rounded-lg text-right font-bold text-lg focus:outline-none focus:border-yellow-400 transition-colors ${
                            !isEditing
                              ? "bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500"
                              : "bg-white border-yellow-300"
                          }`}
                          placeholder={preview.prevElec.toString()}
                          value={reading.electricMeter}
                          onChange={(e) =>
                            handleInputChange(stall.slot_id, "electricMeter", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>ค่าก่อนหน้า: <strong className="text-gray-700">{preview.prevElec}</strong></span>
                      {preview.usedElec !== null && (
                        <span className="text-yellow-600 font-semibold">
                          ใช้ {preview.usedElec} หน่วย ≈ {preview.costElec?.toLocaleString()} ฿
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* History Panel */}
                {showHistory && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <History size={12} /> ประวัติมิเตอร์ล่าสุด
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Water history */}
                      <div>
                        <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                          <Droplets size={11} /> น้ำ
                        </p>
                        {waterHistory.length > 0 ? (
                          <div className="space-y-1">
                            {waterHistory.map((m) => (
                              <div key={m.meter_id} className="flex justify-between text-xs bg-blue-50 rounded-lg px-2.5 py-1.5">
                                <span className="text-gray-500">
                                  {new Date(m.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                                </span>
                                <span className="text-gray-700">
                                  {m.previous_reading} → <strong>{m.current_reading}</strong>
                                </span>
                                <span className="text-blue-600 font-medium">{m.unit_used} หน่วย</span>
                                <span className="text-green-600 font-semibold">{m.total_cost.toLocaleString()} ฿</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">ยังไม่มีประวัติ</p>
                        )}
                      </div>
                      {/* Electric history */}
                      <div>
                        <p className="text-xs text-yellow-600 font-medium mb-1 flex items-center gap-1">
                          <Zap size={11} /> ไฟฟ้า
                        </p>
                        {elecHistory.length > 0 ? (
                          <div className="space-y-1">
                            {elecHistory.map((m) => (
                              <div key={m.meter_id} className="flex justify-between text-xs bg-yellow-50 rounded-lg px-2.5 py-1.5">
                                <span className="text-gray-500">
                                  {new Date(m.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                                </span>
                                <span className="text-gray-700">
                                  {m.previous_reading} → <strong>{m.current_reading}</strong>
                                </span>
                                <span className="text-yellow-600 font-medium">{m.unit_used} หน่วย</span>
                                <span className="text-green-600 font-semibold">{m.total_cost.toLocaleString()} ฿</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">ยังไม่มีประวัติ</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredStalls.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Droplets size={40} className="mx-auto mb-3 opacity-30" />
              <p>ไม่พบแผงค้าที่มีผู้เช่า</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeterRecording;
