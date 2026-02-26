import { useEffect, useState } from "react";
import { Search, Droplets, Zap, Save, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import { stallsAPI } from "../../api";

const MeterRecording = () => {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [foodCourtFilter, setFoodCourtFilter] = useState("ALL");
  const [meterReadings, setMeterReadings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStalls();
  }, []);

  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      const occupiedStalls = (response.data.data || []).filter(
        (s) => s.status === "OCCUPIED",
      );
      setStalls(occupiedStalls);

      const readings = {};
      occupiedStalls.forEach((stall) => {
        readings[stall.slot_id] = {
          waterMeter: stall.currentWaterMeter || "",
          electricMeter: stall.currentElectricMeter || "",
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
      [stallId]: {
        ...prev[stallId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (stallId) => {
    setSaving(true);
    try {
      const reading = meterReadings[stallId];
      await stallsAPI.recordMeterReading(stallId, {
        waterMeter: parseFloat(reading.waterMeter) || 0,
        electricMeter: parseFloat(reading.electricMeter) || 0,
        recordedAt: new Date().toISOString(),
      });
      toast.success("บันทึกมิเตอร์สำเร็จ");
    } catch (error) {
      toast.error("ไม่สามารถบันทึกมิเตอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises = Object.keys(meterReadings).map((stallId) => {
        const reading = meterReadings[stallId];
        return stallsAPI.recordMeterReading(stallId, {
          waterMeter: parseFloat(reading.waterMeter) || 0,
          electricMeter: parseFloat(reading.electricMeter) || 0,
          recordedAt: new Date().toISOString(),
        });
      });
      await Promise.all(promises);
      toast.success("บันทึกมิเตอร์ทั้งหมดสำเร็จ");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const filteredStalls = stalls.filter((stall) => {
    const matchesSearch = stall.slot_number
      ?.toLowerCase()
      .includes(search.toLowerCase());
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            บันทึกมิเตอร์น้ำ / ไฟ
          </h1>
          <p className="text-gray-500 text-sm">
            กรอกค่ามิเตอร์ประจำเดือนของแต่ละล็อก
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
          onClick={handleSaveAll}
          disabled={saving}
        >
          <Save size={18} /> บันทึกทั้งหมด
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              placeholder="ค้นหาหมายเลขล็อค..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
            value={foodCourtFilter}
            onChange={(e) => setFoodCourtFilter(e.target.value)}
          >
            <option value="ALL">ทุกศูนย์อาหาร</option>
            <option value="1">ศูนย์อาหาร 1</option>
            <option value="2">ศูนย์อาหาร 2</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  ล็อค
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  ศูนย์อาหาร
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  ผู้เช่า
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Droplets size={16} className="text-blue-500" />
                    มิเตอร์น้ำ (หน่วย)
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-yellow-500" />
                    มิเตอร์ไฟ (หน่วย)
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStalls.map((stall) => (
                <tr
                  key={stall.slot_id}
                  className="border-b border-gray-50 hover:bg-purple-50/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold">
                      {stall.slot_number}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    ศูนย์อาหาร {stall.food_court_id}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {stall.tenant?.name || "-"}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-right"
                      placeholder="0"
                      value={meterReadings[stall.slot_id]?.waterMeter || ""}
                      onChange={(e) =>
                        handleInputChange(
                          stall.slot_id,
                          "waterMeter",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 text-right"
                      placeholder="0"
                      value={meterReadings[stall.slot_id]?.electricMeter || ""}
                      onChange={(e) =>
                        handleInputChange(
                          stall.slot_id,
                          "electricMeter",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      className="p-2 rounded-lg border border-green-300 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                      onClick={() => handleSave(stall.slot_id)}
                      disabled={saving}
                      title="บันทึก"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStalls.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              ไม่พบล็อคที่มีผู้เช่า
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeterRecording;
