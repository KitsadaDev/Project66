import { useEffect, useState } from "react";
import {
  Search,
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Calculator,
  Save,
  Trash2,
  Eye,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { billsAPI, stallsAPI } from "../../api";

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stalls, setStalls] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    slot_id: "",
    billing_month: new Date().toISOString().slice(0, 7),
    water_cost: "",
    electricity_cost: "",
    rent_amount: "",
    grease_trap_fee: 0,
    total_amount: 0,
  });

  const [calculationResult, setCalculationResult] = useState(null);

  // Slip & Status State
  const [selectedBill, setSelectedBill] = useState(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchBills();
    fetchStalls();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await billsAPI.getAll();
      setBills(response.data.data || []);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลบิลได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      setStalls(
        (response.data.data || []).filter((s) => s.status === "OCCUPIED"),
      );
    } catch (error) {
      console.error("Error fetching stalls:", error);
    }
  };

  const handleCalculate = async () => {
    if (!formData.slot_id || !formData.billing_month) {
      toast.error("กรุณาเลือกล็อคและเดือน");
      return;
    }

    setCalculating(true);
    setCalculationResult(null);
    try {
      const response = await billsAPI.calculate({
        slot_id: formData.slot_id,
        month: formData.billing_month + "-01",
      });

      const { amounts, units, rates } = response.data.data;

      setFormData((prev) => ({
        ...prev,
        water_cost: amounts.water,
        electricity_cost: amounts.electric,
        rent_amount: amounts.rent,
        grease_trap_fee: amounts.greaseTrapFee || 0,
        total_amount: amounts.total,
      }));

      setCalculationResult(response.data.data);
      toast.success("คำนวณยอดเงินเรียบร้อยแล้ว");
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          "ไม่สามารถคำนวณยอดเงินได้ (อาจยังไม่ได้บันทึกมิเตอร์)",
      );
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await billsAPI.create({
        slot_id: formData.slot_id,
        billing_month: formData.billing_month + "-01",
        water_cost: formData.water_cost,
        electricity_cost: formData.electricity_cost,
        water_units: calculationResult?.units?.water,
        electricity_units: calculationResult?.units?.electric,
        water_rate: calculationResult?.rates?.water,
        electricity_rate: calculationResult?.rates?.electric,
        grease_trap_fee: formData.grease_trap_fee,
      });
      toast.success("สร้างบิลสำเร็จ");
      setIsModalOpen(false);
      fetchBills();
      setFormData({
        slot_id: "",
        billing_month: new Date().toISOString().slice(0, 7),
        water_cost: "",
        electricity_cost: "",
        rent_amount: "",
        grease_trap_fee: 0,
        total_amount: 0,
      });
      setCalculationResult(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "สร้างบิลไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (billId, newStatus) => {
    try {
      await billsAPI.update(billId, { status: newStatus });
      toast.success("อัปเดตสถานะสำเร็จ");
      fetchBills();
    } catch (error) {
      toast.error("ไม่สามารถอัปเดตสถานะได้");
    }
  };

  const handleVerifyPayment = async (bill) => {
    const paymentId = bill.payments?.[0]?.payment_id;
    if (!paymentId) {
      toast.error("ไม่พบข้อมูลการชำระเงิน");
      return;
    }

    setVerifying(true);
    try {
      await billsAPI.verifyPayment(paymentId, { approved: true });
      toast.success("ยืนยันการชำระเงินเรียบร้อย");
      setIsSlipModalOpen(false);
      fetchBills();
    } catch (error) {
      toast.error("ยืนยันการชำระเงินไม่สำเร็จ");
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle size={14} /> ชำระแล้ว
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1">
            <Clock size={14} /> รอชำระ
          </span>
        );
      case "OVERDUE":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
            <XCircle size={14} /> เกินกำหนด
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      (bill.contract?.slot?.slot_number || bill.rental_slot?.slot_number)
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      (
        bill.contract?.tenant?.first_name ||
        bill.rental_contract?.tenant?.first_name
      )
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            จัดการบิลการชำระเงิน
          </h1>
          <p className="text-gray-500 text-sm">
            ออกบิล ตรวจสอบสถานะการชำระเงิน
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-lg shadow-purple-200"
        >
          <Plus size={20} /> ออกบิลใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            placeholder="ค้นหา ล็อค, ชื่อผู้เช่า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">สถานะทั้งหมด</option>
          <option value="PENDING">รอชำระ</option>
          <option value="PAID">ชำระแล้ว</option>
          <option value="OVERDUE">เกินกำหนด</option>
        </select>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">
                  บิลประจำเดือน
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">
                  แผงค้า
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">
                  ผู้เช่า
                </th>
                <th className="text-right py-4 px-6 font-semibold text-gray-600">
                  ยอดรวม
                </th>
                <th className="text-center py-4 px-6 font-semibold text-gray-600">
                  สถานะ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => (
                <tr
                  key={bill.expense_id}
                  className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                >
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-800">
                      {new Date(bill.billing_month).toLocaleDateString(
                        "th-TH",
                        {
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold w-fit">
                        {bill.contract?.slot?.slot_number ||
                          bill.rental_slot?.slot_number ||
                          bill.rental_contract?.rental_slot?.slot_number}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {bill.contract?.slot?.food_court_id
                          ? `ศูนย์อาหาร ${bill.contract.slot.food_court_id}`
                          : bill.rental_contract?.rental_slot?.food_court_id
                            ? `ศูนย์อาหาร ${bill.rental_contract.rental_slot.food_court_id}`
                            : ""}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {bill.contract?.tenant?.first_name ||
                      bill.rental_contract?.tenant?.first_name ||
                      "-"}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-gray-800">
                    ฿{(bill.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={bill.status}
                      onChange={(e) =>
                        handleStatusUpdate(bill.expense_id, e.target.value)
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold focus:outline-none border-0 cursor-pointer ${
                        bill.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : bill.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      <option value="PENDING">รอชำระ</option>
                      <option value="PAID">ชำระแล้ว</option>
                      <option value="OVERDUE">เกินกำหนด</option>
                    </select>
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {bill.payments && bill.payments.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setIsSlipModalOpen(true);
                          }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          แสดงสลิป
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    ไม่พบข้อมูลบิล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText size={24} className="text-purple-500" />
                ออกบิลการชำระเงิน
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เลือกแผงค้า *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                    value={formData.slot_id}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        slot_id: e.target.value,
                      }));
                      setCalculationResult(null); // Reset calc when stall changes
                    }}
                  >
                    <option value="">-- กรุณาเลือก --</option>
                    {stalls.map((stall) => {
                      const fcName =
                        stall.food_court?.name ||
                        `ศูนย์อาหาร ${stall.food_court_id}`;
                      const tenantName =
                        stall.rental_contracts?.[0]?.tenant?.first_name;
                      const display = tenantName
                        ? `${fcName} - ${tenantName}`
                        : fcName;
                      return (
                        <option key={stall.slot_id} value={stall.slot_id}>
                          {stall.slot_number} ({display})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ประจำเดือน *
                  </label>
                  <input
                    type="month"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={formData.billing_month}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        billing_month: e.target.value,
                      }));
                      setCalculationResult(null);
                    }}
                  />
                </div>
              </div>

              {/* Auto Calculate Button */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-800 text-sm">
                    คำนวณอัตโนมัติจากมิเตอร์
                  </h3>
                  <p className="text-xs text-blue-600">
                    ระบบจะดึงค่ามิเตอร์ล่าสุดมาคำนวณค่าน้ำ/ไฟให้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={calculating || !formData.slot_id}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {calculating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Calculator size={16} />
                  )}
                  {calculating ? "กำลังคำนวณ..." : "ดึงยอดเงิน"}
                </button>
              </div>

              {/* Amount Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    ค่าเช่า
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    value={formData.rent_amount}
                    readOnly
                    placeholder="รอการคำนวณ..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ค่าน้ำ (บาท)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={formData.water_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, water_cost: e.target.value })
                    }
                  />
                  {calculationResult && (
                    <span className="text-[10px] text-gray-400">
                      ใช้ไป {calculationResult.units.water} หน่วย x{" "}
                      {calculationResult.rates.water} บาท
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ค่าไฟ (บาท)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100"
                    value={formData.electricity_cost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        electricity_cost: e.target.value,
                      })
                    }
                  />
                  {calculationResult && (
                    <span className="text-[10px] text-gray-400">
                      ใช้ไป {calculationResult.units.electric} หน่วย x{" "}
                      {calculationResult.rates.electric} บาท
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    ค่าดักไขมัน (บาท)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    value={formData.grease_trap_fee}
                    readOnly
                    placeholder="รอการคำนวณ..."
                  />
                </div>
              </div>

              {/* Total */}
              <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                  <span className="block text-sm text-purple-600 mb-1">
                    ยอดรวมทั้งสิ้น
                  </span>
                  <span className="text-2xl font-bold text-purple-700">
                    ฿{parseFloat(formData.total_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? "กำลังสร้างบิล..." : "บันทึกและสร้างบิล"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Payment Slip Modal */}
      {isSlipModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <Eye size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    หลักฐานการชำระเงิน
                  </h2>
                  <p className="text-sm text-gray-500">
                    ล็อค{" "}
                    {selectedBill.contract?.slot?.slot_number ||
                      selectedBill.rental_slot?.slot_number ||
                      "-"}{" "}
                    |{" "}
                    {selectedBill.contract?.tenant?.first_name ||
                      selectedBill.rental_contract?.tenant?.first_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSlipModalOpen(false);
                  setSelectedBill(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                title="ปิด"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {selectedBill.payments?.[0]?.payment_slip_url ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50 flex justify-center">
                    <img
                      src={selectedBill.payments[0].payment_slip_url}
                      alt="Payment Slip"
                      className="max-w-full max-h-[450px] object-contain"
                      onClick={() =>
                        window.open(
                          selectedBill.payments[0].payment_slip_url,
                          "_blank",
                        )
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-gray-500 mb-1">วันที่อัปโหลด</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(
                          selectedBill.payments[0].payment_date ||
                            selectedBill.payments[0].created_at,
                        ).toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-gray-500 mb-1">จำนวนเงินที่แจ้ง</p>
                      <p className="font-semibold text-green-600 text-lg">
                        ฿
                        {parseFloat(
                          selectedBill.payments[0].payment_amount ||
                            selectedBill.total_amount,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedBill.status !== "PAID" && (
                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100 text-sm">
                        <AlertCircle size={18} />
                        <span>
                          กรุณาตรวจสอบยอดเงินในบัญชีของท่านให้ตรงกับสลิปก่อนกดยืนยัน
                        </span>
                      </div>
                      <button
                        onClick={() => handleVerifyPayment(selectedBill)}
                        disabled={verifying}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-100 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {verifying ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckCircle size={20} />
                        )}
                        ยืนยันการชำระเงิน (ปรับสถานะเป็นชำระแล้ว)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Eye size={48} className="mb-4 opacity-20" />
                  <p>ไม่พบรูปภาพหลักฐานการชำระเงิน</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;
