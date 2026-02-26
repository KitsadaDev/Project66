import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Wrench,
  CheckCircle,
  Calendar,
  MapPin,
  User,
  Camera,
  Bell,
  Save,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { maintenanceAPI } from "../../api";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await maintenanceAPI.getById(id);
      const jobData = response.data.data;
      setJob(jobData);
      setStatus(jobData.status);
      setScheduledDate(
        jobData.scheduledDate ? jobData.scheduledDate.split("T")[0] : "",
      );
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setCompletionPhotos((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index) => {
    setCompletionPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, you would upload photos first to get URLs,
      // then send the data. This is a simplified example.
      await maintenanceAPI.updateStatus(id, {
        status,
        scheduledDate,
      });

      toast.success("บันทึกข้อมูลสำเร็จ");
      fetchJob();
    } catch (error) {
      toast.error("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  const handleNotifyTenant = async () => {
    try {
      await maintenanceAPI.notifyTenant(id);
      toast.success("แจ้งเตือนผู้เช่าสำเร็จ");
    } catch (error) {
      toast.error("ไม่สามารถแจ้งเตือนได้");
    }
  };

  const getStatusConfig = (s) => {
    const config = {
      PENDING: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "รอดำเนินการ",
        icon: Clock,
      },
      IN_PROGRESS: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        label: "กำลังดำเนินการ",
        icon: Wrench,
      },
      COMPLETED: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "เสร็จสิ้น",
        icon: CheckCircle,
      },
    };
    return config[s] || config.PENDING;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">ไม่พบข้อมูลงานซ่อม</p>
        <button
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={() => navigate("/maintenance/jobs")}
        >
          กลับหน้ารายการ
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(job.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm"
            onClick={() => navigate("/maintenance/jobs")}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Calendar size={14} />
              <span>
                แจ้งเมื่อ: {new Date(job.createdAt).toLocaleDateString("th-TH")}
              </span>
            </div>
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-xl flex items-center gap-2 font-semibold ${statusConfig.bg} ${statusConfig.text}`}
        >
          <StatusIcon size={18} />
          {statusConfig.label}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Job Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Detail Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Wrench size={20} className="text-purple-500" /> รายละเอียดงาน
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shadow-sm">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">สถานที่ / ล็อค</p>
                  <p className="font-bold text-gray-800">
                    {job.slot_number || job.stall?.slot_number || "?"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shadow-sm">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">ผู้แจ้ง</p>
                  <p className="font-bold text-gray-800">
                    {job.reporter?.name || job.tenant?.name || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shadow-sm">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">ความเร่งด่วน</p>
                  <p className="font-bold text-gray-800">
                    {job.urgency === "HIGH"
                      ? "เร่งด่วน"
                      : job.urgency === "LOW"
                        ? "ไม่เร่งด่วน"
                        : "ปกติ"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                รายละเอียดปัญหา
              </h4>
              <div className="bg-gray-50 p-4 rounded-xl text-gray-600 border border-gray-100 leading-relaxed">
                {job.description}
              </div>
            </div>

            {/* Reported Photos */}
            {job.images && job.images.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  รูปภาพที่แจ้ง
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {job.images.map((img, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-xl overflow-hidden border border-gray-200"
                    >
                      <img
                        src={img}
                        alt={`Problem ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6">
              อัปเดตงานซ่อม
            </h3>

            <div className="space-y-6">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  สถานะการดำเนินงาน
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PENDING">รอดำเนินการ</option>
                  <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                  <option value="COMPLETED">ซ่อมเสร็จสิ้น</option>
                </select>
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  วันที่เข้าซ่อม
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  รูปภาพหลังซ่อม (ถ้ามี)
                </label>

                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {previewUrls.map((url, index) => (
                      <div
                        key={index}
                        className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 group"
                      >
                        <img
                          src={url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer p-4 flex flex-col items-center justify-center text-center gap-2"
                  onClick={() =>
                    document.getElementById("photo-upload").click()
                  }
                >
                  <Camera size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-500 font-medium">
                    เพิ่มรูปภาพ
                  </span>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save size={20} />
                  )}
                  บันทึกการเปลี่ยนแปลง
                </button>

                {status === "COMPLETED" && (
                  <button
                    className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-purple-600 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    onClick={handleNotifyTenant}
                  >
                    <Bell size={20} /> แจ้งเตือนผู้เช่า
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
