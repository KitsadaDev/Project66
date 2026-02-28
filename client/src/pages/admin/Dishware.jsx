import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  ShoppingBag,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import { dishwareAPI, dishwareTypeAPI, contractsAPI } from "../../api";
import { useUIStore } from "../../store";

const CATEGORIES = [
  { value: "PLATE", label: "จาน" },
  { value: "BOWL", label: "ชาม" },
  { value: "OTHER", label: "อื่นๆ" },
];

// ─── Status Badge ─────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    PENDING: {
      label: "รอการอนุมัติ",
      cls: "bg-yellow-100 text-yellow-700",
      icon: <Clock size={12} />,
    },
    APPROVED: {
      label: "อนุมัติแล้ว",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle size={12} />,
    },
    REJECTED: {
      label: "ปฏิเสธ",
      cls: "bg-red-100 text-red-600",
      icon: <XCircle size={12} />,
    },
  }[status] || { label: status, cls: "bg-gray-100 text-gray-600", icon: null };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────
const AdminDishware = () => {
  const [usages, setUsages] = useState([]);
  const [types, setTypes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("PENDING");

  const decrementPendingDishware = useUIStore(
    (state) => state.decrementPendingDishware,
  );

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Type form
  const [typeForm, setTypeForm] = useState({
    name: "",
    category: "PLATE",
    size_label: "S",
    unit_price: "",
  });
  const [editingType, setEditingType] = useState(null); // { dishware_type_id, ... }
  const [typeSubmitting, setTypeSubmitting] = useState(false);

  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // qty per type for add-order form: { [dishware_type_id]: number }
  const [orderQtys, setOrderQtys] = useState({});
  const [orderForm, setOrderForm] = useState({
    contract_id: "",
    usage_date: new Date().toISOString().slice(0, 10),
  });

  // ─── Fetch ─────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usageRes, contractRes, typeRes] = await Promise.all([
        dishwareAPI.getAll({ month: filterMonth }),
        contractsAPI.getAll({ status: "ACTIVE" }),
        dishwareTypeAPI.getAll({ includeInactive: "true" }),
      ]);
      setUsages(usageRes.data.data || []);
      setContracts(contractRes.data.data || []);
      setTypes(typeRes.data.data || []);
      const init = {};
      (typeRes.data.data || []).forEach((t) => (init[t.dishware_type_id] = 0));
      setOrderQtys(init);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth]);

  // ─── Computed ───────────────────────────────────────────────────
  const filtered =
    activeTab === "ALL" ? usages : usages.filter((u) => u.status === activeTab);
  const pendingCount = usages.filter((u) => u.status === "PENDING").length;
  const totalCost = filtered.reduce((a, u) => a + u.total_cost, 0);
  const activeTypes = types.filter((t) => t.is_active);

  const calcOrderTotal = () =>
    activeTypes.reduce(
      (acc, t) => acc + (orderQtys[t.dishware_type_id] || 0) * t.unit_price,
      0,
    );

  // ─── Order Handlers ─────────────────────────────────────────────
  const handleOrderQty = (typeId, delta) => {
    setOrderQtys((prev) => ({
      ...prev,
      [typeId]: Math.max(0, (prev[typeId] || 0) + delta),
    }));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.contract_id) return toast.error("กรุณาเลือกสัญญาเช่า");
    const items = activeTypes
      .filter((t) => (orderQtys[t.dishware_type_id] || 0) > 0)
      .map((t) => ({
        dishware_type_id: t.dishware_type_id,
        quantity: orderQtys[t.dishware_type_id],
      }));
    if (items.length === 0)
      return toast.error("กรุณากรอกจำนวนอย่างน้อย 1 รายการ");

    setSubmitting(true);
    try {
      await dishwareAPI.create({ ...orderForm, items });
      toast.success("บันทึกรายการเรียบร้อยแล้ว");
      setShowForm(false);
      const reset = {};
      activeTypes.forEach((t) => (reset[t.dishware_type_id] = 0));
      setOrderQtys(reset);
      setOrderForm((p) => ({ ...p, contract_id: "" }));
      fetchData();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("ต้องการลบรายการนี้?")) return;
    try {
      await dishwareAPI.delete(id);
      toast.success("ลบรายการเรียบร้อย");
      fetchData();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleApprove = async (id) => {
    try {
      await dishwareAPI.approve(id);
      toast.success("อนุมัติรายการเรียบร้อย ✓");
      fetchData();
      decrementPendingDishware();
    } catch (err) {
      toast.error(err?.response?.data?.message || "อนุมัติไม่สำเร็จ");
    }
  };

  const openReject = (u) => {
    setRejectTarget({
      id: u.usage_id,
      slot: u.contract?.slot?.slot_number || "-",
      tenant: u.contract?.tenant
        ? `${u.contract.tenant.first_name} ${u.contract.tenant.last_name || ""}`.trim()
        : "-",
    });
    setRejectReason("");
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await dishwareAPI.reject(rejectTarget.id, {
        reject_reason: rejectReason,
      });
      toast.success("ปฏิเสธรายการเรียบร้อย");
      setRejectTarget(null);
      fetchData();
      decrementPendingDishware();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ปฏิเสธไม่สำเร็จ");
    } finally {
      setRejectLoading(false);
    }
  };

  // ─── Type Manager Handlers ──────────────────────────────────────
  const handleTypeFormChange = (e) =>
    setTypeForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveType = async () => {
    if (!typeForm.name || !typeForm.unit_price)
      return toast.error("กรุณากรอกชื่อและราคา");
    setTypeSubmitting(true);
    try {
      if (editingType) {
        await dishwareTypeAPI.update(editingType.dishware_type_id, typeForm);
        toast.success("แก้ไขเรียบร้อย");
      } else {
        await dishwareTypeAPI.create(typeForm);
        toast.success("เพิ่มประเภทเรียบร้อย");
      }
      setEditingType(null);
      setTypeForm({
        name: "",
        category: "PLATE",
        size_label: "S",
        unit_price: "",
      });
      fetchData();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setTypeSubmitting(false);
    }
  };

  const handleToggleType = async (t) => {
    try {
      await dishwareTypeAPI.update(t.dishware_type_id, {
        is_active: !t.is_active,
      });
      toast.success(t.is_active ? "ซ่อนแล้ว" : "แสดงแล้ว");
      fetchData();
    } catch {
      toast.error("ดำเนินการไม่สำเร็จ");
    }
  };

  const handleDeleteType = async (id) => {
    if (!confirm("ต้องการลบ/ซ่อนประเภทนี้?")) return;
    try {
      await dishwareTypeAPI.delete(id);
      toast.success("ดำเนินการเรียบร้อย");
      fetchData();
    } catch {
      toast.error("ดำเนินการไม่สำเร็จ");
    }
  };

  const startEdit = (t) => {
    setEditingType(t);
    setTypeForm({
      name: t.name,
      category: t.category,
      size_label: t.size_label,
      unit_price: String(t.unit_price),
    });
  };

  // ─── Month Nav ──────────────────────────────────────────────────
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

  const TABS = [
    { key: "PENDING", label: "รอการอนุมัติ" },
    { key: "APPROVED", label: "อนุมัติแล้ว" },
    { key: "REJECTED", label: "ปฏิเสธ" },
    { key: "ALL", label: "ทั้งหมด" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">จัดการภาชนะ</h1>
            <p className="text-sm text-gray-500">
              จัดการข้อมูลภาชนะ
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTypeManager(true)}
            className="flex items-center gap-2 px-4 py-2 border border-amber-400 text-amber-600 rounded-xl hover:bg-amber-50 transition font-medium"
          >
            <Package size={16} />
            จัดการประเภทภาชนะ
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-medium shadow-sm"
          >
            <Plus size={18} />
            บันทึกรายการ
          </button>
        </div>
      </div>

      {/* Month Filter */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-700 text-base w-44 text-center">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: "รายการทั้งหมด",
            value: usages.length,
            unit: "รายการ",
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "รอการอนุมัติ",
            value: pendingCount,
            unit: "รายการ",
            color: "bg-yellow-50 text-yellow-600",
          },
          {
            label: "อนุมัติแล้ว",
            value: usages.filter((u) => u.status === "APPROVED").length,
            unit: "รายการ",
            color: "bg-green-50 text-green-600",
          },
          {
            label: `ยอดรวม (${TABS.find((t) => t.key === activeTab)?.label || ""})`,
            value: `฿${totalCost.toLocaleString()}`,
            unit: "",
            color: "bg-amber-50 text-amber-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl p-4 ${s.color.split(" ")[0]}`}
          >
            <p className={`text-2xl font-bold ${s.color.split(" ")[1]}`}>
              {s.value} <span className="text-sm font-normal">{s.unit}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              activeTab === t.key
                ? "bg-white shadow text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.key === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-400 text-white text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-2 opacity-40" />
            <p>ไม่มีรายการในหมวดนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    "วันที่",
                    "ล็อค",
                    "ผู้เช่า",
                    "รายการ",
                    "ยอดรวม",
                    "สถานะ",
                    "จัดการ",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr
                    key={u.usage_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(u.usage_date).toLocaleDateString("th-TH")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {u.contract?.slot?.slot_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {u.contract?.tenant
                        ? `${u.contract.tenant.first_name} ${u.contract.tenant.last_name || ""}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {(u.items || []).map((i) => (
                          <span
                            key={i.item_id}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 rounded-lg text-xs whitespace-nowrap"
                          >
                            {i.dishware_type?.name} ×{i.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-600 whitespace-nowrap">
                      ฿{u.total_cost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                      {u.status === "REJECTED" && u.reject_reason && (
                        <p
                          className="text-xs text-red-400 mt-0.5 max-w-[140px] truncate"
                          title={u.reject_reason}
                        >
                          {u.reject_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(u.usage_id)}
                              className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition"
                              title="อนุมัติ"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => openReject(u)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                              title="ปฏิเสธ"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(u.usage_id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───────── Add Order Modal ───────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                บันทึกรายการซื้อถ้วยชาม
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleSubmitOrder}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ล็อค (สัญญาเช่า)
                </label>
                <select
                  value={orderForm.contract_id}
                  onChange={(e) =>
                    setOrderForm((p) => ({ ...p, contract_id: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="">-- เลือกล็อค --</option>
                  {contracts.map((c) => (
                    <option key={c.contract_id} value={c.contract_id}>
                      ล็อค {c.slot?.slot_number} — {c.tenant?.first_name}{" "}
                      {c.tenant?.last_name || ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่
                </label>
                <input
                  type="date"
                  value={orderForm.usage_date}
                  onChange={(e) =>
                    setOrderForm((p) => ({ ...p, usage_date: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  รายการภาชนะ
                </p>
                {activeTypes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">
                    ยังไม่มีประเภทภาชนะ — กรุณาเพิ่มก่อน
                  </p>
                ) : (
                  activeTypes.map((t) => (
                    <div
                      key={t.dishware_type_id}
                      className="flex items-center gap-3"
                    >
                      <span className="text-sm font-medium w-28 text-gray-700 truncate">
                        {t.name}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() => handleOrderQty(t.dishware_type_id, -1)}
                          className="w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-sm">
                          {orderQtys[t.dishware_type_id] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOrderQty(t.dishware_type_id, 1)}
                          className="w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm text-gray-400 w-20 text-right">
                        ×{t.unit_price} บาท
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between items-center bg-amber-50 rounded-xl px-4 py-3">
                <span className="font-semibold text-gray-700">ยอดรวม</span>
                <span className="text-xl font-bold text-amber-600">
                  ฿{calcOrderTotal().toLocaleString()}
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-medium disabled:opacity-60"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────── Type Manager Modal ───────── */}
      {showTypeManager && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                จัดการประเภทภาชนะ
              </h2>
              <button
                onClick={() => {
                  setShowTypeManager(false);
                  setEditingType(null);
                  setTypeForm({
                    name: "",
                    category: "PLATE",
                    size_label: "S",
                    unit_price: "",
                  });
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Add/Edit Form */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-sm font-semibold text-amber-700 mb-3">
                  {editingType ? "แก้ไขประเภทภาชนะ" : "เพิ่มประเภทใหม่"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      ชื่อ
                    </label>
                    <input
                      name="name"
                      value={typeForm.name}
                      onChange={handleTypeFormChange}
                      placeholder="เช่น จาน (S)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      หมวด
                    </label>
                    <select
                      name="category"
                      value={typeForm.category}
                      onChange={handleTypeFormChange}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      ขนาด
                    </label>
                    <input
                      name="size_label"
                      value={typeForm.size_label}
                      onChange={handleTypeFormChange}
                      placeholder="S / M / L / -"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      ราคา (บาท/ใบ)
                    </label>
                    <input
                      name="unit_price"
                      type="number"
                      min="0"
                      step="0.5"
                      value={typeForm.unit_price}
                      onChange={handleTypeFormChange}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {editingType && (
                    <button
                      onClick={() => {
                        setEditingType(null);
                        setTypeForm({
                          name: "",
                          category: "PLATE",
                          size_label: "S",
                          unit_price: "",
                        });
                      }}
                      className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    onClick={handleSaveType}
                    disabled={typeSubmitting}
                    className="px-5 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-60"
                  >
                    {typeSubmitting
                      ? "กำลังบันทึก..."
                      : editingType
                        ? "บันทึก"
                        : "เพิ่ม"}
                  </button>
                </div>
              </div>

              {/* Type List */}
              <div className="space-y-2">
                {types.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">
                    ยังไม่มีประเภทภาชนะ
                  </p>
                ) : (
                  types.map((t) => (
                    <div
                      key={t.dishware_type_id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${t.is_active ? "border-gray-100 bg-white" : "border-dashed border-gray-200 bg-gray-50 opacity-60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {t.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            ขนาด: {t.size_label} · ราคา: {t.unit_price} บาท
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleType(t)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                          title={t.is_active ? "ซ่อน" : "แสดง"}
                        >
                          {t.is_active ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteType(t.dishware_type_id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                          title="ลบ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Reject Modal ───────── */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                ยืนยันการปฏิเสธ
              </h2>
              <button
                onClick={() => setRejectTarget(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-gray-700">
                <p>
                  ล็อค:{" "}
                  <span className="font-semibold">{rejectTarget.slot}</span>
                </p>
                <p>
                  ผู้เช่า:{" "}
                  <span className="font-semibold">{rejectTarget.tenant}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เหตุผล{" "}
                  <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="ระบุเหตุผลในการปฏิเสธ..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectLoading}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium disabled:opacity-60"
                >
                  {rejectLoading ? "กำลังบันทึก..." : "ยืนยันปฏิเสธ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDishware;
