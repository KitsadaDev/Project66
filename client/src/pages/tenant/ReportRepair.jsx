import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Camera, X, Send, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import { maintenanceAPI } from "../../api";
import { useAuthStore } from "../../store";

const ReportRepair = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("NORMAL");
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { value: "PLUMBING", label: "ปัญหาระบบประปา" },
    { value: "ELECTRICAL", label: "ปัญหาระบบไฟฟ้า" },
    { value: "STRUCTURAL", label: "ปัญหาโครงสร้าง/อาคาร" },
    { value: "EQUIPMENT", label: "เครื่องใช้/อุปกรณ์ชำรุด" },
    { value: "OTHER", label: "อื่นๆ" },
  ];

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.warning("สามารถแนบรูปได้สูงสุด 5 รูป");
      return;
    }

    setPhotos((prev) => [...prev, ...files]);
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPhotoUrls((prev) => [...prev, ...newUrls]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("กรุณากรอกหัวข้อปัญหา");
      return;
    }
    if (!description.trim()) {
      toast.error("กรุณาอธิบายรายละเอียดปัญหา");
      return;
    }
    if (!category) {
      toast.error("กรุณาเลือกประเภทปัญหา");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("urgency", urgency);

      photos.forEach((photo) => {
        formData.append("photos", photo);
      });

      await maintenanceAPI.create({
        title,
        description,
        category,
        urgency,
      });

      toast.success("แจ้งซ่อมสำเร็จ รอการดำเนินการ");
      navigate("/tenant/track-repairs");
    } catch (error) {
      toast.error("ไม่สามารถแจ้งซ่อมได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">แจ้งซ่อม</h1>
        <p className="text-gray-500 text-sm">
          แจ้งปัญหาหรือการชำรุดในล็อคของคุณ
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          <div className="bg-purple-50 p-6 border-b border-purple-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shadow-sm">
              <Wrench size={20} />
            </div>
            <h2 className="font-bold text-gray-800">แบบฟอร์มแจ้งซ่อม</h2>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Section 1: Basic Info */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    หัวข้อปัญหา <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50"
                    placeholder="เช่น ก๊อกน้ำรั่ว, ไฟไม่ติด..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    ประเภทปัญหา <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 bg-white"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">-- เลือกประเภท --</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  ความเร่งด่วน
                </label>
                <div className="flex flex-wrap gap-4">
                  {[
                    {
                      value: "LOW",
                      label: "ไม่เร่งด่วน",
                      color: "bg-green-100 text-green-700 border-green-200",
                    },
                    {
                      value: "NORMAL",
                      label: "ปกติ",
                      color: "bg-orange-100 text-orange-700 border-orange-200",
                    },
                    {
                      value: "HIGH",
                      label: "เร่งด่วน",
                      color: "bg-red-100 text-red-700 border-red-200",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        urgency === opt.value
                          ? opt.color
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={opt.value}
                        checked={urgency === opt.value}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="hidden"
                      />
                      <div
                        className={`w-3 h-3 rounded-full ${urgency === opt.value ? "bg-current" : "bg-gray-300"}`}
                      ></div>
                      <span className="font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  รายละเอียดปัญหา <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 resize-none h-32"
                  placeholder="อธิบายปัญหาอย่างละเอียด เช่น ตำแหน่งที่พบปัญหา, อาการของปัญหา..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                แนบรูปภาพ (ถ้ามี)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center p-2 text-center"
                  onClick={() =>
                    document.getElementById("repair-photos").click()
                  }
                >
                  <Camera size={24} className="text-gray-400 mb-2" />
                  <span className="text-xs text-gray-500 font-medium">
                    เพิ่มรูปภาพ
                  </span>
                  <span className="text-[10px] text-gray-400">
                    (สูงสุด 5 รูป)
                  </span>
                  <input
                    id="repair-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handlePhotoUpload}
                  />
                </div>

                {photoUrls.map((url, index) => (
                  <div
                    key={index}
                    className="aspect-square relative rounded-xl overflow-hidden border border-gray-200 group"
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
            <button
              className="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              onClick={() => navigate(-1)}
            >
              ยกเลิก
            </button>
            <button
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send size={18} /> ส่งแจ้งซ่อม
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportRepair;
