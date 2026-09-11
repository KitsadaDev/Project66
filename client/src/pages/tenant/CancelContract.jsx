import { useState, useEffect } from "react";
import { contractsAPI } from "../../api";
import { toast } from "react-toastify";
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  History,
  Store,
  Calendar,
} from "lucide-react";

const REASON_OPTIONS = [
  "ยอดขายไม่ตรงตามเป้าหมาย",
  "ต้องการย้ายสถานที่",
  "เปลี่ยนประเภทธุรกิจ",
  "ปัญหาเรื่องสุขภาพ/ส่วนตัว",
  "เหตุผลอื่นๆ",
];

const CancelContract = () => {
  const [contract, setContract] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsRes, cancellationsRes] = await Promise.all([
        contractsAPI.getAll(),
        contractsAPI.getCancellations().catch(() => ({ data: { data: [] } })),
      ]);

      const contracts = contractsRes.data?.data || [];
      // Find current active or pending contract
      const activeContract = contracts.find(
        (c) => c.status === "ACTIVE" || c.status === "PENDING_TERMINATION"
      );
      setContract(activeContract || null);

      setRequests(cancellationsRes.data?.data || []);
    } catch (error) {
      console.error("Error loading cancellation data:", error);
      toast.error("ไม่สามารถโหลดข้อมูลสัญญาหรือประวัติคำร้องได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contract) {
      toast.error("ไม่พบสัญญาเช่าที่สามารถขอยกเลิกได้");
      return;
    }

    if (contract.status !== "ACTIVE") {
      toast.error("สัญญานี้มีคำขอยกเลิกอยู่แล้วหรือไม่อยู่ในสถานะที่ขอยกเลิกได้");
      return;
    }

    if (!selectedReason) {
      toast.error("กรุณาเลือกเหตุผลที่ขอยกเลิก");
      return;
    }

    if (!window.confirm("คุณต้องการส่งคำขอยกเลิกสัญญาเช่านี้ใช่หรือไม่?")) {
      return;
    }

    try {
      setSubmitting(true);
      await contractsAPI.requestTermination(contract.contract_id, {
        cancellation_reason: selectedReason,
        cancellation_note: additionalNote.trim() || undefined,
      });

      toast.success("ส่งคำร้องขอยกเลิกสัญญาเรียบร้อยแล้ว กรุณารอการตรวจสอบ");
      setSelectedReason("");
      setAdditionalNote("");
      fetchData();
    } catch (error) {
      console.error("Submit termination error:", error);
      toast.error(
        error.response?.data?.message || "ไม่สามารถส่งคำขอยกเลิกสัญญาได้"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
      case "PENDING_TERMINATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
            <Clock size={13} /> รอการอนุมัติ
          </span>
        );
      case "APPROVED":
      case "TERMINATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <CheckCircle size={13} /> อนุมัติแล้ว
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-semibold">
            <XCircle size={13} /> ปฏิเสธคำขอ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-9 h-9 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPending = contract?.status === "PENDING_TERMINATION";
  const canSubmit = contract && contract.status === "ACTIVE";

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Form Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
          แบบฟอร์มขอยกเลิกสัญญาเช่า
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          กรอกรายละเอียดและเหตุผลในการขอยกเลิกสัญญาเช่าเพื่อส่งให้ผู้ดูแลระบบพิจารณา
        </p>

        {/* Contract Info Banner */}
        {contract ? (
          <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-purple-600" />
              <span className="text-gray-600">เลขที่สัญญา:</span>
              <span className="font-bold text-gray-800">
                {contract.contract_number}
              </span>
            </div>
            {contract.slot && (
              <div className="flex items-center gap-2">
                <Store size={18} className="text-purple-600" />
                <span className="text-gray-600">ล็อค:</span>
                <span className="font-bold text-purple-700">
                  {contract.slot.slot_number}
                </span>
              </div>
            )}
            <div>
              {contract.status === "ACTIVE" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle size={13} /> สัญญามีผลบังคับ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock size={13} /> อยู่ระหว่างรอดำเนินการยกเลิก
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-amber-800 text-sm">
            <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">ไม่พบสัญญาเช่าที่เปิดใช้งาน</p>
              <p className="text-xs text-amber-700 mt-0.5">
                คุณไม่มีสัญญาเช่าที่อยู่ในสถานะที่สามารถขอยกเลิกได้ในขณะนี้
              </p>
            </div>
          </div>
        )}

        {/* Warning if already pending */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-amber-900 text-sm">
            <Clock size={20} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">ส่งคำร้องแล้ว อยู่ระหว่างรอการตรวจสอบ</p>
              <p className="text-xs text-amber-700 mt-0.5">
                คุณได้ส่งคำร้องขอยกเลิกสัญญานี้แล้ว เจ้าหน้าที่กำลังดำเนินการตรวจสอบ
                กรุณาติดตามสถานะจากประวัติด้านล่าง
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              เหตุผลที่ขอยกเลิก <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2.5">
              {REASON_OPTIONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <label
                    key={reason}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-purple-500 bg-purple-50/40 text-purple-900 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 text-gray-700"
                    } ${!canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="cancellationReason"
                      value={reason}
                      checked={isSelected}
                      disabled={!canSubmit}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="sr-only"
                    />
                    {/* Custom Radio Button */}
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? "border-purple-600 bg-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{reason}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              รายละเอียดเพิ่มเติม (ถ้ามี)
            </label>
            <textarea
              rows={3}
              value={additionalNote}
              disabled={!canSubmit}
              onChange={(e) => setAdditionalNote(e.target.value)}
              placeholder="อธิบายรายละเอียดเพิ่มเติม..."
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm text-gray-700 placeholder-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit || !selectedReason || submitting}
            className="w-full py-3.5 px-6 rounded-2xl font-semibold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-lg shadow-rose-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send size={18} />
                <span>ส่งคำร้องขอยกเลิกเช่า</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <History size={20} className="text-purple-600" />
          ประวัติคำร้องของฉัน
        </h3>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center shadow-sm">
            <p className="text-sm text-gray-400">ยังไม่มีประวัติการส่งคำร้อง</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => (
              <div
                key={item.id || item.request_id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">
                      {item.cancellation_reason || "ขอยกเลิกสัญญาเช่า"}
                    </span>
                    {item.slot?.slot_number && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium border border-purple-100">
                        ล็อค {item.slot.slot_number}
                      </span>
                    )}
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                {item.cancellation_note && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl mb-2.5">
                    {item.cancellation_note}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {formatDate(item.cancellation_requested_at || item.requested_at)}
                  </span>
                  {item.contract?.contract_number && (
                    <span>สัญญา #{item.contract.contract_number}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CancelContract;
