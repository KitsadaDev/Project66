import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  FileText,
  FilePlus,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { contractsAPI } from "../../api";
import { toast } from "react-toastify";

const AdminContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchContracts();
  }, [statusFilter]);

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

  const handleApproveTermination = async (contractId) => {
    if (window.confirm("ยืนยันการอนุมัติยกเลิกสัญญาเช่าใช่หรือไม่?\nหากอนุมัติ สัญญาจะสิ้นสุดและแผงค้าจะว่างลงทันที")) {
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

  const filteredContracts = contracts.filter((c) => {
    const searchLower = search.toLowerCase();
    
    // 1. Status Filter
    if (statusFilter !== "ALL" && c.status !== statusFilter) {
      return false;
    }

    // 2. Search Filter
    const matchesSearch = c.contract_number?.toLowerCase().includes(searchLower) ||
      c.tenant?.first_name?.toLowerCase().includes(searchLower) ||
      c.tenant?.last_name?.toLowerCase().includes(searchLower) ||
      c.slot?.slot_number?.toLowerCase().includes(searchLower);
      
    if (!matchesSearch) return false;

    // 3. Hide old terminated contracts if the tenant has an active contract (only when viewing ALL)
    if (statusFilter === "ALL" && (c.status === "TERMINATED" || c.status === "EXPIRED")) {
      const hasActive = contracts.some(
        (other) => other.tenant?.user_id === c.tenant?.user_id && (other.status === "ACTIVE" || other.status === "PENDING_TERMINATION")
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
          <Link
            to="/admin/create-contract"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-purple-200 transition-all font-medium text-sm"
          >
            <FilePlus size={18} />
            สร้างสัญญาใหม่
          </Link>
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
                  <th className="py-4 px-6 text-left font-medium">
                    ศูนย์อาหาร
                  </th>
                  <th className="py-4 px-6 text-left font-medium">
                    ประเภทอาหาร
                  </th>
                  <th className="py-4 px-6 text-left font-medium">ระยะสัญญา</th>
                  <th className="py-4 px-6 text-right font-medium">
                    ค่าเช่า/เดือน
                  </th>
                  <th className="py-4 px-6 text-left font-medium">สถานะ</th>
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
                        <span className="font-semibold text-gray-800 font-mono">
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
                            {contract.tenant?.phone || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-600 font-medium">
                        {contract.slot?.food_court_id
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
                          <Calendar size={12} className="text-gray-400" />{" "}
                          เริ่ม:{" "}
                          {new Date(contract.start_date).toLocaleDateString(
                            "th-TH",
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />{" "}
                          สิ้นสุด:{" "}
                          {new Date(contract.end_date).toLocaleDateString(
                            "th-TH",
                          )}
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
                        {contract.status === "PENDING_TERMINATION" && (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => handleApproveTermination(contract.contract_id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                            >
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => handleRejectTermination(contract.contract_id)}
                              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                              ปฏิเสธ
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContracts;
