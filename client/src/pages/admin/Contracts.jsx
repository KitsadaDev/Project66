import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  FileText,
  FilePlus,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  X,
  User,
  Store,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Receipt,
  CreditCard,
} from "lucide-react";
import { contractsAPI } from "../../api";
import { toast } from "react-toastify";
import { useAuthStore } from "../../store";

/**
 * คอมโพเนนต์หน้าจัดการสัญญาเช่าทั้งหมดสำหรับผู้ดูแลระบบ (Admin Contracts)
 * - แสดงตารางรายการสัญญาเช่าทั้งหมด (เลขที่สัญญา, ชื่อผู้เช่า, ล็อก, ค่าเช่า, ระยะเวลา)
 * - มีปุ่ม "ดูรายละเอียด" เพื่อเปิดดูข้อมูลสัญญาเช่าฉบับเต็ม
 * - กรองสัญญาตามสถานะ (ทำสัญญาอยู่, หมดอายุ, ขอยกเลิก, ยกเลิกแล้ว)
 * - ค้นหาตามเลขสัญญา, ชื่อ-นามสกุลผู้เช่า, หรือเลขแผงค้า
 * - ดำเนินการอนุมัติ หรือปฏิเสธคำขอยกเลิกสัญญาเช่า (Pending Termination)
 * - มีปุ่มสำหรับไปยังหน้าสร้างสัญญาเช่าใหม่ (Create Contract)
 */
const AdminContracts = () => {
  const { user } = useAuthStore();
  // สถานะเก็บรายการสัญญาเช่า และสถานะการโหลด
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  // คำค้นหา และตัวกรองสถานะ
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // สถานะสำหรับ Modal รายละเอียดสัญญา และ Lightbox รูปภาพ
  const [selectedContract, setSelectedContract] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // รองรับการรับ Query Parameter เช่น ?slot=B2 หรือ ?id=12 เพื่อเปิดดูสัญญาแผงนั้นทันที
  const [searchParams, setSearchParams] = useSearchParams();
  const slotParam = searchParams.get("slot");
  const contractIdParam =
    searchParams.get("id") || searchParams.get("contractId");

  // ฟังก์ชันปิด Modal พร้อมเคลียร์ query param ออกจาก URL อย่างราบรื่น
  const handleCloseModal = () => {
    setSelectedContract(null);
    if (slotParam || contractIdParam) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("slot");
      newParams.delete("id");
      newParams.delete("contractId");
      setSearchParams(newParams, { replace: true });
    }
  };

  // โหลดรายการสัญญาเช่าใหม่เมื่อมีการเปลี่ยนสถานะตัวกรอง
  useEffect(() => {
    fetchContracts();
  }, [statusFilter]);

  // เมื่อเปิดหน้ามาพร้อมกับ Query ?slot=... ให้ค้นหาและเปิดรายละเอียดสัญญาของแผงค้านั้นอัตโนมัติ
  useEffect(() => {
    if (contracts.length > 0) {
      if (slotParam) {
        // ล้างคำว่า 'แผงที่ ' หรือ 'แผง ' เผื่อมีการส่งมา
        const cleanSlot = slotParam
          .replace(/^(แผงที่|แผง)\s*/i, "")
          .trim()
          .toLowerCase();

        // ค้นหาสัญญาของแผงนี้ โดยให้ความสำคัญกับสัญญาที่ ACTIVE หรือ PENDING_TERMINATION ก่อน
        let target = contracts.find(
          (c) =>
            c.slot?.slot_number?.trim().toLowerCase() === cleanSlot &&
            (c.status === "ACTIVE" || c.status === "PENDING_TERMINATION")
        );

        // หากไม่พบสัญญา ACTIVE ให้หาสัญญาล่าสุดของแผงนี้
        if (!target) {
          target = contracts.find(
            (c) => c.slot?.slot_number?.trim().toLowerCase() === cleanSlot
          );
        }

        if (target) {
          setSelectedContract(target);
          setSearch(target.slot?.slot_number || cleanSlot);
        } else {
          setSearch(cleanSlot);
        }
      } else if (contractIdParam) {
        const target = contracts.find(
          (c) => c.contract_id === parseInt(contractIdParam)
        );
        if (target) {
          setSelectedContract(target);
        }
      }
    }
  }, [contracts, slotParam, contractIdParam]);

  /**
   * ดึงรายการสัญญาเช่าจาก API โดยส่ง Query กรองตามสถานะที่เลือก
   */
  const fetchContracts = async () => {
    try {
      setLoading(true);
      const query = statusFilter !== "ALL" ? { status: statusFilter } : {};
      const response = await contractsAPI.getAll(query);
      setContracts(response.data.data);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลสัญญาเช่าได้");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * จัดรูปแบบวันที่ภาษาไทย
   */
  const formatThaiDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /**
   * จัดรูปแบบวันที่และเวลาภาษาไทย
   */
  const formatThaiDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * คำนวณระยะเวลาสัญญาเป็นจำนวนเดือน
   */
  const getContractDurationMonths = (start, end) => {
    if (!start || !end) return null;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const months =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());
    return months > 0 ? months : 1;
  };

  /**
   * แสดงแท็กสถานะ (Badge) พร้อมไอคอนตามสถานะของสัญญา
   * @param {string} status - สถานะของสัญญา
   */
  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 w-fit">
            <CheckCircle size={14} /> ทำสัญญาอยู่
          </span>
        );
      case "EXPIRED":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit">
            <Clock size={14} /> หมดอายุ
          </span>
        );
      case "TERMINATED":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit">
            <XCircle size={14} /> ยกเลิกแล้ว
          </span>
        );
      case "PENDING_TERMINATION":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit">
            <Clock size={14} /> ขอยกเลิกสัญญา
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 flex items-center gap-1 w-fit">
            ไม่ทราบสถานะ
          </span>
        );
    }
  };

  /**
   * อนุมัติคำขอยกเลิกสัญญาเช่า
   * - สัญญาจะถูกเปลี่ยนสถานะเป็น TERMINATED
   * - แผงค้าจะถูกปลดล็อกกลับมาเป็นสถานะ VACANT (ว่าง) อัตโนมัติ
   * @param {string|number} contractId - รหัสสัญญาเช่า
   */
  const handleApproveTermination = async (contractId) => {
    if (
      window.confirm(
        "ยืนยันการอนุมัติยกเลิกสัญญาเช่าใช่หรือไม่?\nหากอนุมัติ สัญญาจะสิ้นสุดและแผงค้าจะว่างลงทันที"
      )
    ) {
      try {
        setLoading(true);
        await contractsAPI.terminate(contractId);
        toast.success("อนุมัติการยกเลิกสัญญาเรียบร้อยแล้ว");
        fetchContracts();
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
      } finally {
        setLoading(false);
      }
    }
  };

  /**
   * ปฏิเสธคำขอยกเลิกสัญญาเช่า (สถานะสัญญาจะคงเป็น ACTIVE ตามเดิม)
   * @param {string|number} contractId - รหัสสัญญาเช่า
   */
  const handleRejectTermination = async (contractId) => {
    if (window.confirm("คุณต้องการปฏิเสธคำขอยกเลิกสัญญานี้ใช่หรือไม่?")) {
      try {
        setLoading(true);
        await contractsAPI.rejectTermination(contractId);
        toast.success("ปฏิเสธคำขอเรียบร้อยแล้ว");
        fetchContracts();
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการปฏิเสธคำขอ");
      } finally {
        setLoading(false);
      }
    }
  };

  /**
   * กรองสัญญาเช่าตามคำค้นหา (เลขที่สัญญา, ชื่อ-สกุลผู้เช่า, เลขแผงค้า) และฟิลเตอร์สถานะ
   */
  const filteredContracts = contracts.filter((c) => {
    const searchLower = search.toLowerCase();

    // 1. กรองตามสถานะที่เลือก
    if (statusFilter !== "ALL" && c.status !== statusFilter) {
      return false;
    }

    // 2. กรองตามคำค้นหา
    const matchesSearch =
      c.contract_number?.toLowerCase().includes(searchLower) ||
      c.tenant?.first_name?.toLowerCase().includes(searchLower) ||
      c.tenant?.last_name?.toLowerCase().includes(searchLower) ||
      c.slot?.slot_number?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // 3. ซ่อนสัญญาเก่าที่ยกเลิกหรือหมดอายุแล้ว หากผู้เช่ารายนั้นมีสัญญาใหม่ที่ยังเปิดใช้งานอยู่ (เฉพาะเมื่อดูแท็บ ALL)
    if (
      statusFilter === "ALL" &&
      (c.status === "TERMINATED" || c.status === "EXPIRED")
    ) {
      const hasActive = contracts.some(
        (other) =>
          other.tenant?.user_id === c.tenant?.user_id &&
          (other.status === "ACTIVE" ||
            other.status === "PENDING_TERMINATION")
      );
      if (hasActive) return false;
    }

    return true;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            ข้อมูลสัญญาเช่า
          </h1>
          <p className="text-gray-500 text-sm">
            ดูรายละเอียดและสถานะสัญญาเช่าทั้งหมดในระบบ
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {user?.role !== "EXECUTIVE" && (
            <Link
              to="/admin/create-contract"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-purple-200 transition-all font-medium text-sm"
            >
              <FilePlus size={18} />
              สร้างสัญญาใหม่
            </Link>
          )}
          <button
            onClick={fetchContracts}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <FileText size={18} />
            รีเฟรชข้อมูล
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Controls */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="ค้นหาเลขที่สัญญา, ชื่อผู้เช่า หรือเลขแผงค้า..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-gray-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="ACTIVE">ทำสัญญาอยู่</option>
              <option value="PENDING_TERMINATION">รอยกเลิกสัญญา</option>
              <option value="EXPIRED">หมดอายุ</option>
              <option value="TERMINATED">ยกเลิก/คืนพื้นที่</option>
            </select>
          </div>
        </div>

        {/* Table / Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={48} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">ไม่พบตั๋วสัญญา</p>
            <p className="text-sm">ไม่มีข้อมูลสัญญาเช่าในระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                  <th className="py-4 px-6 text-left font-medium">สัญญา/แผง</th>
                  <th className="py-4 px-6 text-left font-medium">ผู้เช่า</th>
                  <th className="py-4 px-6 text-left font-medium">ศูนย์อาหาร</th>
                  <th className="py-4 px-6 text-left font-medium">ประเภทอาหาร</th>
                  <th className="py-4 px-6 text-left font-medium">ระยะสัญญา</th>
                  <th className="py-4 px-6 text-right font-medium">ค่าเช่า/เดือน</th>
                  <th className="py-4 px-6 text-left font-medium">สถานะ</th>
                  <th className="py-4 px-6 text-center font-medium">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.contract_id}
                    className="hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span
                          onClick={() => setSelectedContract(contract)}
                          className="font-semibold text-gray-800 font-mono hover:text-purple-600 cursor-pointer transition-colors"
                          title="คลิกเพื่อดูรายละเอียดสัญญา"
                        >
                          {contract.contract_number}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          แผง:{" "}
                          <span className="font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                            {contract.slot?.slot_number || "ถูกลบ"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-800">
                            {contract.tenant?.first_name}{" "}
                            {contract.tenant?.last_name || ""}
                          </span>
                          <span className="text-xs text-gray-500">
                            {contract.phone || contract.tenant?.phone || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-600 font-medium">
                        {contract.slot?.food_court?.name
                          ? contract.slot.food_court.name
                          : contract.slot?.food_court_id
                          ? `ศูนย์อาหาร ${contract.slot.food_court_id}`
                          : "-"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          contract.menuType === "ของคาว"
                            ? "bg-orange-100 text-orange-700"
                            : contract.menuType === "ของหวาน"
                            ? "bg-pink-100 text-pink-700"
                            : contract.menuType === "เครื่องดื่ม"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {contract.menuType || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" /> เริ่ม:{" "}
                          {formatThaiDate(contract.start_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" /> สิ้นสุด:{" "}
                          {formatThaiDate(contract.end_date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-gray-800">
                        {contract.monthly_rent?.toLocaleString() || "0"} ฿
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-2">
                        {getStatusBadge(contract.status)}
                        {contract.status === "PENDING_TERMINATION" &&
                          user?.role !== "EXECUTIVE" && (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                onClick={() =>
                                  handleApproveTermination(contract.contract_id)
                                }
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                              >
                                อนุมัติ
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectTermination(contract.contract_id)
                                }
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                ปฏิเสธ
                              </button>
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer border border-purple-200/80 active:scale-95"
                        title="ดูรายละเอียดสัญญา"
                      >
                        <Eye size={15} />
                        <span>ดูรายละเอียด</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------- */}
      {/* Modal แสดงรายละเอียดสัญญาเช่า (Contract Detail Modal) */}
      {/* ------------------------------------------------------- */}
      {selectedContract && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 my-auto flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white p-5 sm:p-6 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold">รายละเอียดสัญญาเช่า</h2>
                    <span className="font-mono bg-white/20 px-2.5 py-0.5 rounded-lg text-xs font-medium tracking-wide">
                      {selectedContract.contract_number}
                    </span>
                  </div>
                  <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
                    แผงค้า {selectedContract.slot?.slot_number || "-"} •{" "}
                    {selectedContract.slot?.food_court?.name ||
                      `ศูนย์อาหาร ${selectedContract.slot?.food_court_id || "-"}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Quick Highlight Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* แผงค้า */}
                <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Store size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 font-medium block">แผงค้า</span>
                    <span className="text-base font-bold text-gray-800">
                      {selectedContract.slot?.slot_number || "-"}
                    </span>
                    <span className="text-[10px] text-purple-600 block">
                      {selectedContract.slot?.food_court?.name ||
                        `ศูนย์อาหาร ${selectedContract.slot?.food_court_id || "-"}`}
                    </span>
                  </div>
                </div>

                {/* ระยะสัญญา */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 font-medium block">ระยะสัญญา</span>
                    <span className="text-sm font-bold text-gray-800 block">
                      {getContractDurationMonths(
                        selectedContract.start_date,
                        selectedContract.end_date
                      )
                        ? `${getContractDurationMonths(
                            selectedContract.start_date,
                            selectedContract.end_date
                          )} เดือน`
                        : "1 ปี"}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {formatThaiDate(selectedContract.start_date)} -{" "}
                      {formatThaiDate(selectedContract.end_date)}
                    </span>
                  </div>
                </div>

                {/* ค่าเช่า/เดือน */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 font-medium block">ค่าเช่ารายเดือน</span>
                    <span className="text-base font-bold text-emerald-700">
                      {selectedContract.monthly_rent?.toLocaleString() || "0"} ฿
                    </span>
                    <span className="text-[10px] text-gray-500 block">ต่อเดือน</span>
                  </div>
                </div>

                {/* เงินประกันสัญญา */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 font-medium block">เงินประกันสัญญา</span>
                    <span className="text-base font-bold text-amber-700">
                      {selectedContract.deposit_amount?.toLocaleString() || "0"} ฿
                    </span>
                    <span className="text-[10px] text-gray-500 block">ชำระแล้ว</span>
                  </div>
                </div>
              </div>

              {/* สถานะสัญญา */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">สถานะสัญญาปัจจุบัน:</span>
                  {getStatusBadge(selectedContract.status)}
                </div>
                <div className="text-xs text-gray-500">
                  ทำสัญญาวันที่: {formatThaiDate(selectedContract.created_at || selectedContract.start_date)}
                </div>
              </div>

              {/* คำขอยกเลิกสัญญา (ถ้ามี) */}
              {(selectedContract.status === "PENDING_TERMINATION" ||
                selectedContract.cancellation_requests?.length > 0 ||
                selectedContract.cancellation_reason) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <AlertCircle size={18} className="text-amber-600 shrink-0" />
                    <span>ข้อมูลคำขอยกเลิกสัญญา</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm bg-white/80 p-3.5 rounded-xl border border-amber-100">
                    <div>
                      <span className="text-gray-500 block text-[11px]">เหตุผลที่ขอยกเลิก:</span>
                      <span className="font-medium text-gray-800">
                        {selectedContract.cancellation_requests?.[0]?.reason ||
                          selectedContract.cancellation_reason ||
                          "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">หมายเหตุเพิ่มเติม:</span>
                      <span className="font-medium text-gray-800">
                        {selectedContract.cancellation_requests?.[0]?.note ||
                          selectedContract.cancellation_note ||
                          "-"}
                      </span>
                    </div>
                    {selectedContract.cancellation_requests?.[0]?.requested_at && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-500 block text-[11px]">วันที่ยื่นคำขอ:</span>
                        <span className="font-medium text-gray-800">
                          {formatThaiDateTime(
                            selectedContract.cancellation_requests[0].requested_at
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ปุ่มอนุมัติ/ปฏิเสธ หากเป็น Admin และสถานะเป็น PENDING_TERMINATION */}
                  {selectedContract.status === "PENDING_TERMINATION" &&
                    user?.role !== "EXECUTIVE" && (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={async () => {
                            await handleApproveTermination(selectedContract.contract_id);
                            handleCloseModal();
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        >
                          อนุมัติการยกเลิกสัญญา
                        </button>
                        <button
                          onClick={async () => {
                            await handleRejectTermination(selectedContract.contract_id);
                            handleCloseModal();
                          }}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          ปฏิเสธคำขอ
                        </button>
                      </div>
                    )}
                </div>
              )}

              {/* 2-Columns Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: ข้อมูลผู้เช่า */}
                <div className="p-5 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-3.5">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <User size={16} className="text-purple-600" />
                    ข้อมูลผู้เช่า (ตามสัญญา)
                  </h3>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">ชื่อ-นามสกุล</span>
                      <span className="font-semibold text-gray-800">
                        {selectedContract.tenant?.first_name}{" "}
                        {selectedContract.tenant?.last_name || ""}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">เลขประจำตัวประชาชน</span>
                      <span className="font-medium text-gray-800 font-mono">
                        {selectedContract.idCard || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">เบอร์โทรศัพท์</span>
                      <span className="font-medium text-gray-800">
                        {selectedContract.phone ||
                          selectedContract.tenant?.phone ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">อีเมล</span>
                      <span className="font-medium text-gray-800">
                        {selectedContract.tenant?.email || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60 items-center">
                      <span className="text-gray-500">ประเภทอาหาร / สินค้า</span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          selectedContract.menuType === "ของคาว"
                            ? "bg-orange-100 text-orange-700"
                            : selectedContract.menuType === "ของหวาน"
                            ? "bg-pink-100 text-pink-700"
                            : selectedContract.menuType === "เครื่องดื่ม"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {selectedContract.menuType || "-"}
                      </span>
                    </div>
                    <div className="pt-1.5">
                      <span className="text-gray-500 block text-xs mb-1">
                        ที่อยู่ตามสัญญา
                      </span>
                      <p className="font-medium text-gray-700 text-xs sm:text-sm leading-relaxed bg-white p-3 rounded-xl border border-gray-200/60">
                        {selectedContract.address || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: ข้อกำหนดทางการเงิน & ใบเสร็จ */}
                <div className="p-5 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-3.5">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <CreditCard size={16} className="text-indigo-600" />
                    ข้อกำหนดทางการเงิน & ค่าธรรมเนียม
                  </h3>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">ค่าเช่าแผงรายเดือน</span>
                      <span className="font-bold text-gray-800">
                        {selectedContract.monthly_rent?.toLocaleString() || "0"} ฿
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">เงินประกันสัญญา (Deposit)</span>
                      <span className="font-bold text-indigo-700">
                        {selectedContract.deposit_amount?.toLocaleString() || "0"} ฿
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">
                        ค่าบำบัดน้ำเสีย / ถังดักไขมัน
                      </span>
                      <span className="font-medium text-gray-800">
                        {selectedContract.greaseTrapFee
                          ? `${selectedContract.greaseTrapFee.toLocaleString()} ฿/เดือน`
                          : "500 ฿/เดือน"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">ค่าปรับจ่ายค่าเช่าล่าช้า</span>
                      <span className="font-medium text-gray-800">
                        {selectedContract.lateRentFine
                          ? `${selectedContract.lateRentFine.toLocaleString()} ฿/วัน`
                          : "ตามระเบียบ"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                      <span className="text-gray-500">ค่าปรับค่าน้ำไฟล่าช้า</span>
                      <span className="font-medium text-gray-800">
                        {selectedContract.lateUtilityFine
                          ? `${selectedContract.lateUtilityFine.toLocaleString()} ฿/วัน`
                          : "ตามระเบียบ"}
                      </span>
                    </div>

                    {/* ข้อมูลใบเสร็จเงินประกัน */}
                    <div className="pt-2">
                      <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100 space-y-1.5">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <Receipt size={14} className="text-blue-600" />
                          หลักฐานใบเสร็จเงินประกัน
                        </span>
                        <div className="flex justify-between text-xs pt-1">
                          <span className="text-blue-700">เลขที่ใบเสร็จ:</span>
                          <span className="font-semibold text-gray-800 font-mono">
                            {selectedContract.receiptNumber || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-700">วันที่ชำระเงิน:</span>
                          <span className="font-medium text-gray-800">
                            {formatThaiDate(selectedContract.receiptDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* เอกสารสัญญาฉบับจริง (Attached Contract Document) */}
              <div className="p-5 bg-purple-50/40 rounded-2xl border border-purple-100">
                <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-purple-600" />
                  เอกสารสัญญาเช่าฉบับจริง (ไฟล์แนบ)
                </h3>

                {selectedContract.contractImage ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-purple-100">
                    <div
                      onClick={() => setPreviewImage(selectedContract.contractImage)}
                      className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 cursor-pointer relative group flex items-center justify-center"
                    >
                      <img
                        src={selectedContract.contractImage}
                        alt="เอกสารสัญญา"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye size={20} />
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-semibold text-gray-800 text-sm">
                        ไฟล์เอกสารสัญญาฉบับจริง
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        เอกสารที่ลงนามหรือแนบไว้ในระบบ สามารถเปิดดูภาพขยายหรือเปิดในแท็บใหม่ได้
                      </p>
                      <div className="flex items-center gap-2.5 mt-3 justify-center sm:justify-start">
                        <button
                          onClick={() => setPreviewImage(selectedContract.contractImage)}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Eye size={14} /> ดูรูปขนาดเต็ม
                        </button>
                        <a
                          href={selectedContract.contractImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <ExternalLink size={14} /> เปิดในแท็บใหม่
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-medium text-gray-500">
                      ไม่มีไฟล์เอกสารสัญญาแนบในระบบ
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-400">
                รหัสสัญญา ID: {selectedContract.contract_id}
              </span>
              <button
                onClick={handleCloseModal}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* Lightbox ดูรูปภาพสัญญาขนาดใหญ่ */}
      {/* ------------------------------------------------------- */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="ปิด"
            >
              <X size={32} />
            </button>
            <img
              src={previewImage}
              alt="สัญญาเช่าฉบับเต็ม"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContracts;
