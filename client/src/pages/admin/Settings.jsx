import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Droplets,
  Zap,
  Save,
  History,
  AlertTriangle,
  AlertCircle,
  Image as ImageIcon,
  Upload
} from "lucide-react";
import { toast } from "react-toastify";
import { settingsAPI, foodCourtsAPI } from "../../api";

const Settings = () => {
  const [waterRate, setWaterRate] = useState("");
  const [electricRate, setElectricRate] = useState("");
  const [greaseTrapFee, setGreaseTrapFee] = useState("");
  const [lateRentFine, setLateRentFine] = useState("");
  const [lateUtilityFine, setLateUtilityFine] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Food Court Images State
  const [foodCourts, setFoodCourts] = useState([]);
  const [uploadingImageId, setUploadingImageId] = useState(null);

  useEffect(() => {
    fetchRates();
    fetchFoodCourts();
  }, []);

  const fetchFoodCourts = async () => {
    try {
      const response = await foodCourtsAPI.getAll();
      setFoodCourts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching food courts:", error);
    }
  };

  const fetchRates = async () => {
    try {
      const response = await settingsAPI.getUtilityRates();
      const {
        waterRatePerUnit,
        electricRatePerUnit,
        greaseTrapFee,
        lateRentFine,
        lateUtilityFine,
        lateFineDelayDays,
      } = response.data.data;
      setWaterRate(waterRatePerUnit.toString());
      setElectricRate(electricRatePerUnit.toString());
      setGreaseTrapFee((greaseTrapFee || 500).toString());
      setLateRentFine((lateRentFine || 100).toString());
      setLateUtilityFine((lateUtilityFine || 50).toString());
    } catch (error) {
      console.error("Error fetching rates:", error);
      // Use defaults
      setWaterRate("14");
      setElectricRate("6");
      setGreaseTrapFee("500");
      setLateRentFine("100");
      setLateUtilityFine("50");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (
      !waterRate ||
      !electricRate ||
      !greaseTrapFee ||
      !lateRentFine ||
      !lateUtilityFine
    ) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const waterNum = parseFloat(waterRate);
    const electricNum = parseFloat(electricRate);
    const greaseTrapNum = parseFloat(greaseTrapFee);
    const lateRentNum = parseFloat(lateRentFine);
    const lateUtilityNum = parseFloat(lateUtilityFine);

    if (
      isNaN(waterNum) ||
      isNaN(electricNum) ||
      isNaN(greaseTrapNum) ||
      isNaN(lateRentNum) ||
      isNaN(lateUtilityNum) ||
      waterNum < 0 ||
      electricNum < 0 ||
      greaseTrapNum < 0 ||
      lateRentNum < 0 ||
      lateUtilityNum < 0
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
        lateRentFine: lateRentNum,
        lateUtilityFine: lateUtilityNum,
      });
      toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      setLastUpdated(new Date());
    } catch (error) {
      toast.error("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (foodCourtId, file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setUploadingImageId(foodCourtId);
    const formData = new FormData();
    formData.append("image", file);

    try {
      await foodCourtsAPI.updateImage(foodCourtId, formData);
      toast.success("อัปเดตรูปภาพสำเร็จ");
      fetchFoodCourts();
    } catch (error) {
      toast.error("ไม่สามารถอัปเดตรูปภาพได้");
    } finally {
      setUploadingImageId(null);
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
    <div className="max-w-3xl mx-auto w-full">
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

      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6">
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
            <p className="text-xs text-gray-400">ค่าเริ่มต้น: 14 บาท/หน่วย</p>
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
            <p className="text-xs text-gray-400">ค่าเริ่มต้น: 6 บาท/หน่วย</p>
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

          {/* Late Rent Fine */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <AlertTriangle size={18} className="text-red-500" />
              ค่าปรับจ่ายค่าเช่าล่าช้า (บาท/วัน/บิล)
            </label>
            <div className="relative">
              <input
                type="number"
                className="w-full pl-4 pr-12 py-3 text-xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50 transition-all placeholder-gray-300"
                value={lateRentFine}
                onChange={(e) => setLateRentFine(e.target.value)}
                min="0"
                step="1"
                placeholder="100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                ฿/วัน
              </span>
            </div>
            <p className="text-xs text-gray-400">
              ค่าเริ่มต้น: 100 บาท/วัน (นับต่อ 1 บิลที่ค้าง)
            </p>
          </div>

          {/* Late Utility Fine */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <AlertCircle size={18} className="text-pink-500" />
              ค่าปรับจ่ายค่าน้ำ-ไฟล่าช้า (บาท/วัน/บิล)
            </label>
            <div className="relative">
              <input
                type="number"
                className="w-full pl-4 pr-12 py-3 text-xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50 transition-all placeholder-gray-300"
                value={lateUtilityFine}
                onChange={(e) => setLateUtilityFine(e.target.value)}
                min="0"
                step="1"
                placeholder="50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                ฿/วัน
              </span>
            </div>
            <p className="text-xs text-gray-400">
              ค่าเริ่มต้น: 50 บาท/วัน (นับต่อ 1 บิลที่ค้าง)
            </p>
          </div>

        </div>

        {/* Payment Policy Info */}
        <div className="mt-8 p-5 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="font-semibold text-indigo-800 mb-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-indigo-500" />
            นโยบายการชำระและค่าปรับ (คงที่)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-indigo-100 text-center">
              <p className="text-xs text-gray-500 mb-1">กำหนดจ่ายทุกเดือน</p>
              <p className="text-2xl font-extrabold text-indigo-600">วันที่ 10</p>
              <p className="text-xs text-gray-400 mt-1">ของทุกเดือน</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-red-100 text-center">
              <p className="text-xs text-gray-500 mb-1">ค่าปรับค่าเช่า</p>
              <p className="text-2xl font-extrabold text-red-500">100 ฿/วัน</p>
              <p className="text-xs text-gray-400 mt-1">หากเกินกำหนด</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-pink-100 text-center">
              <p className="text-xs text-gray-500 mb-1">ค่าปรับค่าน้ำ-ไฟ</p>
              <p className="text-2xl font-extrabold text-pink-500">50 ฿/วัน</p>
              <p className="text-xs text-gray-400 mt-1">หากเกินกำหนด</p>
            </div>
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

      {/* Food Court Images Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6 mt-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <ImageIcon size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              รูปภาพหน้าปกศูนย์อาหาร
            </h2>
            <p className="text-sm text-gray-500">
              จัดการรูปภาพที่แสดงผลในหน้าแรกของเว็บไซต์
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {foodCourts.map((fc) => (
            <div key={fc.food_court_id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="w-full sm:w-48 h-32 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 relative border border-gray-200 shadow-sm">
                <img 
                  src={fc.image_url || `/Food-court-${fc.food_court_id}.png`} 
                  alt={fc.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/bru-logo.png'; }}
                />
                {uploadingImageId === fc.food_court_id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center flex-1">
                <h3 className="font-bold text-gray-800">{fc.name}</h3>
                <p className="text-sm text-gray-500 mb-4">รองรับแผงค้า: {fc.total_slots} ล็อก</p>
                
                <div>
                  <input
                    type="file"
                    id={`upload-img-${fc.food_court_id}`}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(fc.food_court_id, e.target.files[0])}
                    disabled={uploadingImageId === fc.food_court_id}
                  />
                  <label
                    htmlFor={`upload-img-${fc.food_court_id}`}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer shadow-sm ${
                      uploadingImageId === fc.food_court_id
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 hover:-translate-y-0.5"
                    }`}
                  >
                    <Upload size={16} />
                    {uploadingImageId === fc.food_court_id ? "กำลังอัปโหลด..." : "เปลี่ยนรูปภาพ"}
                  </label>
                </div>
              </div>
            </div>
          ))}
          {foodCourts.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-4">ไม่พบข้อมูลศูนย์อาหาร</p>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
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
