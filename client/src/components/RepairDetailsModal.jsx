import {
  X,
  MapPin,
  User,
  Calendar,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

const RepairDetailsModal = ({ repair, onClose }) => {
  if (!repair) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-purple-500" />
              รายละเอียดแจ้งซ่อม
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  หัวข้อ
                </label>
                <p className="text-lg font-medium text-gray-800 mt-1">
                  {repair.title}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  สถานะ
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                    ${
                      repair.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : repair.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {repair.status === "PENDING"
                      ? "รอดำเนินการ"
                      : repair.status === "IN_PROGRESS"
                        ? "กำลังดำเนินการ"
                        : "เสร็จสิ้น"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={14} /> สถานที่
                </label>
                <p className="text-gray-700 mt-1 flex gap-3">
                  <span>
                    โรงอาหาร:{" "}
                    <span className="font-semibold text-purple-600">
                      {repair.slot?.food_court_id || "-"}
                    </span>
                  </span>
                  <span>
                    ล็อก:{" "}
                    <span className="font-semibold text-purple-600">
                      {repair.slot?.slot_number || repair.slot_number || "-"}
                    </span>
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <User size={14} /> ผู้แจ้ง
                </label>
                <p className="text-gray-700 mt-1">
                  {repair.reporter?.name || repair.tenant?.first_name || "-"}
                </p>
                <p className="text-xs text-gray-400">
                  {repair.reporter?.phone || repair.tenant?.phone || ""}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={14} /> วันที่แจ้ง
                </label>
                <p className="text-gray-700 mt-1">
                  {new Date(
                    repair.requested_at || repair.createdAt,
                  ).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              รายละเอียดเพิ่มเติม
            </label>
            <p className="text-gray-700 mt-2 bg-gray-50 p-4 rounded-xl leading-relaxed">
              {repair.description || "-"}
            </p>
          </div>

          {/* Images */}
          <div className="border-t border-gray-100 pt-6">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <ImageIcon size={16} /> รูปภาพประกอบ
            </label>

            {repair.images && repair.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {repair.images.map((imgObj, index) => {
                  const img = imgObj.image_url || imgObj;
                  return (
                    <div
                      key={index}
                      className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-100"
                    >
                      <img
                        src={
                          img.startsWith("http")
                            ? img
                            : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${img}`
                        }
                        alt={`Repair ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                        onClick={() =>
                          window.open(
                            img.startsWith("http")
                              ? img
                              : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${img}`,
                            "_blank",
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <p className="text-sm">ไม่มีรูปภาพประกอบ</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors shadow-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepairDetailsModal;
