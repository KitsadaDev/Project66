import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Receipt,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  Eye,
  X,
  FileText,
} from "lucide-react";
import { billsAPI } from "../../api";

/**
 * คอมโพเนนต์แสดงข้อมูลบิลค่าใช้จ่ายและรายรับสำหรับผู้บริหาร (Executive Bills - Read Only)
 * - แสดงสถิติภาพรวม: บิลทั้งหมด, ชำระแล้ว, รอชำระ, เกินกำหนด, และยอดรวมรายได้ที่ได้รับชำระแล้ว
 * - ตารางรายการบิลค่าเช่าและค่าน้ำ-ไฟ พร้อมตัวกรองสถานะและการค้นหา
 * - รองรับ ?slot=... เพื่อกรองและเปิดดูรายละเอียดบิลของแผงค้านั้นอัตโนมัติ
 */
const ExecutiveBills = () => {
  // รายการบิลทั้งหมด
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  // ตัวกรองสถานะบิล (ALL, PAID, PENDING, OVERDUE) และคำค้นหา
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  // สถานะสำหรับ Modal รายละเอียดบิล
  const [selectedBillDetail, setSelectedBillDetail] = useState(null);

  // รองรับ Query Parameter เช่น ?slot=B2
  const [searchParams, setSearchParams] = useSearchParams();
  const slotParam = searchParams.get("slot");

  const handleCloseBillDetail = () => {
    setSelectedBillDetail(null);
    if (slotParam) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("slot");
      setSearchParams(newParams, { replace: true });
    }
  };

  const clearSlotFilter = () => {
    setSearch("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("slot");
    setSearchParams(newParams, { replace: true });
  };

  // โหลดข้อมูลบิลเมื่อเปิดหน้าจอ
  useEffect(() => {
    fetchBills();
  }, []);

  // เมื่อเปิดหน้ามาพร้อมกับ Query ?slot=... ให้ค้นหาและเปิดดูบิลล่าสุดของแผงค้านั้นทันที
  useEffect(() => {
    if (bills.length > 0 && slotParam) {
      const cleanSlot = slotParam
        .replace(/^(แผงที่|แผง)\s*/i, "")
        .trim()
        .toLowerCase();

      const slotBills = bills.filter((b) => {
        const sNum =
          b.contract?.slot?.slot_number ||
          b.rental_slot?.slot_number ||
          b.rental_contract?.rental_slot?.slot_number ||
          "";
        return sNum.trim().toLowerCase() === cleanSlot;
      });

      setSearch(slotParam);

      if (slotBills.length > 0) {
        const sorted = [...slotBills].sort(
          (a, b) => new Date(b.billing_month) - new Date(a.billing_month)
        );
        setSelectedBillDetail(sorted[0]);
      }
    }
  }, [bills, slotParam]);

  /**
   * ดึงรายการบิลค่าใช้จ่ายทั้งหมดจาก API
   */
  const fetchBills = async () => {
    try {
      const response = await billsAPI.getAll();
      setBills(response.data.data || []);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  // คัดกรองบิลตามสถานะและคำค้นหา
  const filteredBills = bills.filter((bill) => {
    const matchesStatus =
      filterStatus === "ALL" || bill.status === filterStatus;
    const searchLower = search.toLowerCase();
    const slotNumber =
      bill.contract?.slot?.slot_number ||
      bill.rental_slot?.slot_number ||
      bill.rental_contract?.rental_slot?.slot_number ||
      "";
    const tenantFirstName =
      bill.contract?.tenant?.first_name ||
      bill.rental_contract?.tenant?.first_name ||
      "";
    const tenantLastName =
      bill.contract?.tenant?.last_name ||
      bill.rental_contract?.tenant?.last_name ||
      "";

    const matchesSearch =
      slotNumber.toLowerCase().includes(searchLower) ||
      tenantFirstName.toLowerCase().includes(searchLower) ||
      tenantLastName.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  /**
   * กำหนดไอคอน สีพื้นหลัง และข้อความภาษาไทยของ Badge สถานะบิล
   */
  const getStatusBadge = (status) => {
    const config = {
      PAID: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "ชำระแล้ว",
        icon: CheckCircle,
      },
      PENDING: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "รอชำระ",
        icon: Clock,
      },
      OVERDUE: {
        bg: "bg-red-100",
        text: "text-red-700",
        label: "เกินกำหนด",
        icon: AlertTriangle,
      },
    };
    const { bg, text, label, icon: Icon } = config[status] || config.PENDING;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${bg} ${text}`}
      >
        <Icon size={14} /> {label}
      </span>
    );
  };

  // คำนวณสรุปสถิติจำนวนบิลแต่ละสถานะ และยอดเงินรวมที่ชำระแล้ว (Total Revenue)
  const stats = {
    total: bills.length,
    paid: bills.filter((b) => b.status === "PAID").length,
    pending: bills.filter((b) => b.status === "PENDING").length,
    overdue: bills.filter((b) => b.status === "OVERDUE").length,
    totalRevenue: bills
      .filter((b) => b.status === "PAID")
      .reduce((sum, b) => sum + (b.total_amount || b.totalAmount || 0), 0),
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ข้อมูลบิลทั้งหมด</h1>
        <p className="text-gray-500 text-sm">
          ดูข้อมูลบิลและการชำระเงิน (ดูได้อย่างเดียว)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <Receipt size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
            <p className="text-sm text-gray-500">บิลทั้งหมด</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.paid}</h3>
            <p className="text-sm text-gray-500">ชำระแล้ว</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {stats.pending}
            </h3>
            <p className="text-sm text-gray-500">รอชำระ</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <Receipt size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-green-600">
              ฿{stats.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-sm text-gray-500">รายได้รวม</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-sm"
              placeholder="ค้นหา หมายเลขแผงค้า หรือชื่อผู้เช่า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="PAID">ชำระแล้ว</option>
              <option value="PENDING">รอชำระ</option>
              <option value="OVERDUE">เกินกำหนด</option>
            </select>
          </div>
        </div>

        {/* Active Slot Banner */}
        {slotParam && (
          <div className="mb-4 flex items-center justify-between p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs sm:text-sm text-purple-800 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="font-semibold">กำลังแสดงบิลของแผง:</span>
              <span className="px-2.5 py-0.5 bg-purple-600 text-white font-bold rounded-lg font-mono">
                {slotParam}
              </span>
            </div>
            <button
              onClick={clearSlotFilter}
              className="text-purple-600 hover:text-purple-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X size={14} /> แสดงบิลทั้งหมด
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tl-xl text-sm">
                  แผงค้า
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ผู้เช่า
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  เดือน
                </th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700 text-sm">
                  ยอดรวม
                </th>
                <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm">
                  สถานะ
                </th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700 rounded-tr-xl text-sm">
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => (
                <tr
                  key={bill.expense_id}
                  className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-gray-800">
                    <div className="flex flex-col">
                      <span className="font-bold text-purple-700">
                        {bill.contract?.slot?.slot_number || bill.rental_slot?.slot_number || "-"}
                      </span>
                      <span className="text-xs text-gray-500 font-normal">
                        {bill.contract?.slot?.food_court_id
                          ? `ศูนย์อาหาร ${bill.contract.slot.food_court_id}`
                          : ""}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    {bill.contract?.tenant?.first_name ||
                      bill.rental_contract?.tenant?.first_name ||
                      "-"}
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      {new Date(bill.billing_month).toLocaleDateString(
                        "th-TH",
                        {
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-green-600">
                    ฿{(bill.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-center">{getStatusBadge(bill.status)}</td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedBillDetail(bill)}
                      className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-purple-200/60"
                    >
                      <Eye size={13} />
                      <span>รายละเอียด</span>
                    </button>
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

      {/* ------------------------------------------------------- */}
      {/* Modal รายละเอียดบิลสำหรับผู้บริหาร (Executive Bill Detail Modal) */}
      {/* ------------------------------------------------------- */}
      {selectedBillDetail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseBillDetail}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-600 text-white p-5 sm:p-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20">
                  <Receipt size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">รายละเอียดใบแจ้งหนี้</h2>
                  <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
                    แผงค้า {selectedBillDetail.contract?.slot?.slot_number || selectedBillDetail.rental_slot?.slot_number || "-"} •{" "}
                    รอบเดือน {new Date(selectedBillDetail.billing_month).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseBillDetail}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Quick Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-xs text-gray-500 block">ผู้เช่า:</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {selectedBillDetail.contract?.tenant?.first_name || selectedBillDetail.rental_contract?.tenant?.first_name || "-"} {selectedBillDetail.contract?.tenant?.last_name || ""}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    โทร: {selectedBillDetail.contract?.tenant?.phone || selectedBillDetail.contract?.phone || "-"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block mb-1">สถานะบิล:</span>
                  {getStatusBadge(selectedBillDetail.status)}
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 text-sm">
                <div className="p-3.5 bg-gray-50 font-semibold text-gray-700 flex justify-between text-xs">
                  <span>รายการค่าใช้จ่าย</span>
                  <span>จำนวนเงิน</span>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-gray-600">ค่าเช่าพื้นที่แผงค้า</span>
                  <span className="font-semibold text-gray-800">
                    ฿{Number(selectedBillDetail.rent_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-gray-600">ค่าน้ำประปา</span>
                  <span className="font-semibold text-blue-600">
                    ฿{Number(selectedBillDetail.water_cost || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-gray-600">ค่าไฟฟ้า</span>
                  <span className="font-semibold text-amber-600">
                    ฿{Number(selectedBillDetail.electricity_cost || 0).toLocaleString()}
                  </span>
                </div>
                {selectedBillDetail.grease_trap_fee > 0 && (
                  <div className="p-3.5 flex justify-between">
                    <span className="text-gray-600">ค่าบำบัดน้ำเสีย / ดักไขมัน</span>
                    <span className="font-semibold text-gray-800">
                      ฿{Number(selectedBillDetail.grease_trap_fee).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="p-4 bg-purple-50/60 flex justify-between items-center">
                  <span className="font-bold text-gray-900">ยอดรวมทั้งสิ้น</span>
                  <span className="font-extrabold text-xl text-purple-700">
                    ฿{Number(selectedBillDetail.total_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Slip Preview (if exists) */}
              {selectedBillDetail.payments && selectedBillDetail.payments.length > 0 && selectedBillDetail.payments[0].slip_image_url && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                  <span className="font-semibold text-purple-900 text-xs block">
                    หลักฐานสลิปการโอนเงิน
                  </span>
                  <a
                    href={selectedBillDetail.payments[0].slip_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-medium"
                  >
                    <FileText size={14} /> เปิดดูรูปสลิปฉบับเต็ม ↗
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleCloseBillDetail}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveBills;
