import { useState, useEffect } from "react";
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { dishwareAPI, dishwareTypeAPI } from "../../api";
import { toast } from "react-toastify";

// ─── Status Badge ─────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    PENDING: {
      label: "รอการอนุมัติ",
      cls: "bg-yellow-100 text-yellow-700",
      icon: <Clock size={11} />,
    },
    APPROVED: {
      label: "อนุมัติแล้ว",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle size={11} />,
    },
    REJECTED: {
      label: "ปฏิเสธ",
      cls: "bg-red-100 text-red-600",
      icon: <XCircle size={11} />,
    },
  }[status] || { label: status, cls: "bg-gray-100 text-gray-500", icon: null };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const categoryColor = {
  PLATE: "border-orange-200 bg-orange-50 text-orange-600",
  BOWL: "border-green-200 bg-green-50 text-green-600",
  OTHER: "border-purple-200 bg-purple-50 text-purple-600",
};

const TenantDishware = () => {
  const [types, setTypes] = useState([]);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // qty per type: { [dishware_type_id]: number }
  const [qtys, setQtys] = useState({});
  const [usageDate, setUsageDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const fetchTypes = async () => {
    try {
      const res = await dishwareTypeAPI.getAll();
      setTypes(res.data.data || []);
      // init qtys
      const init = {};
      (res.data.data || []).forEach((t) => (init[t.dishware_type_id] = 0));
      setQtys(init);
    } catch {
      toast.error("โหลดประเภทภาชนะไม่สำเร็จ");
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await dishwareAPI.getAll({ month: filterMonth });
      setUsages(res.data.data || []);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [filterMonth]);

  const prevMonth = () => {
    const [y, m] = filterMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setFilterMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  const nextMonth = () => {
    const [y, m] = filterMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setFilterMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const monthLabel = new Date(filterMonth + "-01").toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  const handleQty = (typeId, delta) => {
    setQtys((prev) => ({
      ...prev,
      [typeId]: Math.max(0, (prev[typeId] || 0) + delta),
    }));
  };

  const calcTotal = () =>
    types.reduce(
      (acc, t) => acc + (qtys[t.dishware_type_id] || 0) * t.unit_price,
      0,
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = types
      .filter((t) => (qtys[t.dishware_type_id] || 0) > 0)
      .map((t) => ({
        dishware_type_id: t.dishware_type_id,
        quantity: qtys[t.dishware_type_id],
      }));

    if (items.length === 0)
      return toast.error("กรุณาเลือกจำนวนอย่างน้อย 1 รายการ");

    setSubmitting(true);
    try {
      await dishwareAPI.create({ usage_date: usageDate, items });
      toast.success("ส่งคำสั่งซื้อแล้ว — รอ Admin อนุมัติ 🕐");
      setSubmitted(true);
      const reset = {};
      types.forEach((t) => (reset[t.dishware_type_id] = 0));
      setQtys(reset);
      fetchHistory();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.message || "สั่งซื้อไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = usages.reduce((acc, u) => acc + u.total_cost, 0);

  return (
    <div className="max-w-2xl mx-auto p-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
          <ShoppingBag size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">สั่งซื้อถ้วยชาม</h1>
          <p className="text-sm text-gray-500">
            ซื้อภาชนะจากมหาวิทยาลัยประจำวัน
          </p>
        </div>
      </div>

      {/* Order Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-700 text-base">
            รายการสั่งซื้อวันนี้
          </h2>
          <input
            type="date"
            value={usageDate}
            onChange={(e) => setUsageDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        {types.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">
            ยังไม่มีประเภทภาชนะในระบบ
          </p>
        ) : (
          <div className="space-y-3">
            {types.map((t) => {
              const colors =
                categoryColor[t.category] ||
                "border-gray-200 bg-gray-50 text-gray-600";
              const [border, bg, text] = colors.split(" ");
              return (
                <div
                  key={t.dishware_type_id}
                  className={`flex items-center justify-between rounded-xl border p-4 ${border} ${bg}`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{t.name}</p>
                      <p className="text-sm text-gray-500">
                        ราคา {t.unit_price.toLocaleString()} บาท/ใบ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQty(t.dishware_type_id, -1)}
                      className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition shadow-sm"
                    >
                      −
                    </button>
                    <span
                      className={`w-10 text-center text-lg font-bold px-2 py-1 rounded-lg bg-white ${text}`}
                    >
                      {qtys[t.dishware_type_id] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQty(t.dishware_type_id, 1)}
                      className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Total + Submit */}
        <div className="mt-6 flex items-center justify-between bg-amber-50 rounded-xl px-5 py-4 border border-amber-100">
          <div>
            <p className="text-sm text-gray-500">ยอดรวม</p>
            <p className="text-2xl font-bold text-amber-600">
              ฿{calcTotal().toLocaleString()}
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting || calcTotal() === 0}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitted ? (
              <>
                <CheckCircle size={18} />
                สั่งซื้อแล้ว!
              </>
            ) : submitting ? (
              "กำลังส่ง..."
            ) : (
              <>
                <ShoppingCart size={18} />
                สั่งซื้อ
              </>
            )}
          </button>
        </div>
      </form>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700">ประวัติการซื้อ</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-600 w-36 text-center">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Month Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            {
              label: "รายการ",
              value: usages.length,
              unit: "วัน",
              color: "text-blue-600",
            },
            {
              label: "ยอดรวม",
              value: `฿${totalCost.toLocaleString()}`,
              unit: "",
              color: "text-amber-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center"
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : usages.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingBag size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">ยังไม่มีรายการในเดือนนี้</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {usages.map((u) => (
                <div
                  key={u.usage_id}
                  className="px-5 py-4 hover:bg-amber-50/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {new Date(u.usage_date).toLocaleDateString("th-TH", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      {/* items */}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(u.items || [])
                          .map(
                            (i) =>
                              `${i.dishware_type?.name || ""} ×${i.quantity}`,
                          )
                          .join("  ")}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <StatusBadge status={u.status} />
                        {u.status === "REJECTED" && u.reject_reason && (
                          <span
                            className="text-xs text-red-400 truncate max-w-[160px]"
                            title={u.reject_reason}
                          >
                            {u.reject_reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-amber-600">
                      ฿{u.total_cost.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantDishware;
