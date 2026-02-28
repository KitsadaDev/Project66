import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Droplets,
  Zap,
  Save,
  History,
} from "lucide-react";
import { toast } from "react-toastify";
import { settingsAPI } from "../../api";

const Settings = () => {
  const [waterRate, setWaterRate] = useState("");
  const [electricRate, setElectricRate] = useState("");
  const [greaseTrapFee, setGreaseTrapFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await settingsAPI.getUtilityRates();
      const { waterRatePerUnit, electricRatePerUnit, greaseTrapFee } =
        response.data.data;
      setWaterRate(waterRatePerUnit.toString());
      setElectricRate(electricRatePerUnit.toString());
      setGreaseTrapFee((greaseTrapFee || 500).toString());
    } catch (error) {
      console.error("Error fetching rates:", error);
      // Use defaults
      setWaterRate("18");
      setElectricRate("7");
      setGreaseTrapFee("500");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!waterRate || !electricRate || !greaseTrapFee) {
      toast.error("กรุณากรอกราคาให้ครบถ้วน");
      return;
    }

    const waterNum = parseFloat(waterRate);
    const electricNum = parseFloat(electricRate);
    const greaseTrapNum = parseFloat(greaseTrapFee);

    if (
      isNaN(waterNum) ||
      isNaN(electricNum) ||
      isNaN(greaseTrapNum) ||
      waterNum < 0 ||
      electricNum < 0 ||
      greaseTrapNum < 0
    ) {
      toast.error("กรุณากรอกราคาที่ถูกต้อง");
      return;
    }

    setSaving(true);
    try {
      await settingsAPI.updateUtilityRates({
        waterRatePerUnit: waterNum,
        electricRatePerUnit: electricNum,
        greaseTrapFee: greaseTrapNum,
      });
      toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      setLastUpdated(new Date());
    } catch (error) {
      toast.error("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
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
            ตั้งค่าระบบ
          </h1>
          <p className="text-gray-500 text-sm">
            จัดการราคาค่าสาธารณูปโภคและการตั้งค่าอื่นๆ
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              ราคาค่าสาธารณูปโภค
            </h2>
            <p className="text-sm text-gray-500">
              กำหนดราคาต่อหน่วย สำหรับคำนวณค่าใช้จ่ายรายเดือน
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Water Rate */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Droplets size={18} className="text-blue-500" />
              ค่าน้ำ (บาท/หน่วย)
            </label>
            <div className="relative">
              <input
                type="number"
                className="w-full pl-4 pr-12 py-3 text-xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder-gray-300"
                value={waterRate}
                onChange={(e) => setWaterRate(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                ฿
              </span>
            </div>
            <p className="text-xs text-gray-400">ค่าเริ่มต้น: 18 บาท/หน่วย</p>
          </div>

          {/* Electric Rate */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Zap size={18} className="text-yellow-500" />
              ค่าไฟฟ้า (บาท/หน่วย)
            </label>
            <div className="relative">
              <input
                type="number"
                className="w-full pl-4 pr-12 py-3 text-xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-50 transition-all placeholder-gray-300"
                value={electricRate}
                onChange={(e) => setElectricRate(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                ฿
              </span>
            </div>
            <p className="text-xs text-gray-400">ค่าเริ่มต้น: 7 บาท/หน่วย</p>
          </div>

          {/* Grease Trap Fee */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Droplets size={18} className="text-orange-500" />
              ค่าดักไขมันรายเดือน (บาท)
            </label>
            <div className="relative">
              <input
                type="number"
                className="w-full pl-4 pr-12 py-3 text-xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-50 transition-all placeholder-gray-300"
                value={greaseTrapFee}
                onChange={(e) => setGreaseTrapFee(e.target.value)}
                min="0"
                step="0.01"
                placeholder="500.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                ฿
              </span>
            </div>
            <p className="text-xs text-gray-400">ค่าเริ่มต้น: 500 บาท/เดือน</p>
          </div>
        </div>

        {/* Preview Calculation */}
        <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
          <p className="font-medium text-gray-700 mb-2 text-sm">
            ตัวอย่างการคำนวณ
          </p>
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
            <span>
              ค่าน้ำ 10 หน่วย ={" "}
              <strong className="text-blue-600">
                {(parseFloat(waterRate || 0) * 10).toFixed(2)} บาท
              </strong>
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span>
              ค่าไฟ 50 หน่วย ={" "}
              <strong className="text-yellow-600">
                {(parseFloat(electricRate || 0) * 50).toFixed(2)} บาท
              </strong>
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex items-center gap-4">
          <button
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={20} />
            )}
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>

          {lastUpdated && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <History size={14} />
              อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500 max-w-2xl">
        <p className="text-xs md:text-sm text-blue-800">
          <strong>หมายเหตุ:</strong>{" "}
          การเปลี่ยนแปลงราคาจะมีผลกับบิลที่สร้างใหม่เท่านั้น
          บิลที่ออกไปแล้วจะไม่ถูกเปลี่ยนแปลง
        </p>
      </div>
    </div>
  );
};

export default Settings;
