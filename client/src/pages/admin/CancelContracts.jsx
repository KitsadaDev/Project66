import React, { useState, useEffect } from "react";
import { contractsAPI } from "../../api";
import { toast } from "react-toastify";
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Ban
} from "lucide-react";
import { formatPhoneNumber } from "../../utils/formatters";

const CancelContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PENDING"); // 'PENDING' or 'ACTIVE'
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await contractsAPI.getAll();
      setContracts(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดข้อมูลสัญญาเช่าได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    if (window.confirm("ยืนยันการอนุมัติยกเลิกสัญญา? สัญญานี้จะถูกยกเลิกทันที")) {
      try {
        await contractsAPI.terminate(id);
        toast.success("ยกเลิกสัญญาสำเร็จ");
        fetchData();
      } catch (error) {
        toast.error("ไม่สามารถยกเลิกสัญญาได้");
      }
    }
  };

  const handleReject = async (id) => {
    if (window.confirm("ยืนยันการปฏิเสธคำขอยกเลิกสัญญา? สัญญาจะกลับไปเป็นสถานะปกติ")) {
      try {
        await contractsAPI.rejectTermination(id);
        toast.success("ปฏิเสธคำขอสำเร็จ");
        fetchData();
      } catch (error) {
        toast.error("ไม่สามารถปฏิเสธคำขอได้");
      }
    }
  };

  const handleForceCancel = async (id) => {
    if (window.confirm("คุณต้องการบังคับยกเลิกสัญญานี้ใช่หรือไม่?\nสัญญานี้จะถูกยกเลิกทันทีโดยไม่ต้องรอผู้เช่าส่งคำขอ")) {
      try {
        await contractsAPI.terminate(id);
        toast.success("บังคับยกเลิกสัญญาสำเร็จ");
        fetchData();
      } catch (error) {
        toast.error("ไม่สามารถบังคับยกเลิกสัญญาได้");
      }
    }
  };

  // Filter contracts based on tab and search
  const filteredContracts = contracts.filter((c) => {
    let statusMatch = false;
    if (activeTab === "PENDING") statusMatch = c.status === "PENDING_TERMINATION";
    else if (activeTab === "ACTIVE") statusMatch = c.status === "ACTIVE";
    else if (activeTab === "HISTORY") statusMatch = c.status === "TERMINATED";
    
    if (!statusMatch) return false;

    if (search) {
      const searchLower = search.toLowerCase();
      const tenantName = `${c.tenant?.first_name || ""} ${c.tenant?.last_name || ""}`.toLowerCase();
      const contractNo = (c.contract_number || "").toLowerCase();
      const slotNo = (c.slot?.slot_number || "").toLowerCase();
      return tenantName.includes(searchLower) || contractNo.includes(searchLower) || slotNo.includes(searchLower);
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">การยกเลิกสัญญา</h1>
        <p className="text-gray-500 text-sm mt-1">จัดการคำขอยกเลิกสัญญาและบังคับยกเลิกสัญญา</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === "PENDING"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            คำร้องขอยกเลิก{" "}
            {contracts.filter((c) => c.status === "PENDING_TERMINATION").length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 ml-2 text-xs font-bold text-white bg-red-500 rounded-full">
                {contracts.filter((c) => c.status === "PENDING_TERMINATION").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === "ACTIVE"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            สัญญาที่กำลังเช่าอยู่
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === "HISTORY"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            ประวัติการยกเลิก
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ค้นหาเลขที่สัญญา, แผงค้า, ชื่อผู้เช่า..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 font-semibold">เลขที่สัญญา / ผู้เช่า</th>
                <th className="py-4 px-6 font-semibold">แผงค้า</th>
                <th className="py-4 px-6 font-semibold">วันที่เริ่มสัญญา</th>
                <th className="py-4 px-6 font-semibold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p>ไม่พบข้อมูลสัญญา</p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.contract_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">{contract.contract_number}</span>
                        <span className="text-gray-500 text-xs mt-1">
                          {contract.tenant?.first_name} {contract.tenant?.last_name || ""}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatPhoneNumber(contract.tenant?.phone) || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          {contract.slot?.slot_number || "-"}
                        </span>
                        <span className="text-xs text-gray-500">
                          (ศ.อาหาร {contract.slot?.food_court_id || "-"})
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(contract.start_date).toLocaleDateString("th-TH")}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {activeTab === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(contract.contract_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <CheckCircle size={16} /> อนุมัติยกเลิก
                          </button>
                          <button
                            onClick={() => handleReject(contract.contract_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <XCircle size={16} /> ปฏิเสธ
                          </button>
                        </div>
                      ) : activeTab === "ACTIVE" ? (
                        <button
                          onClick={() => handleForceCancel(contract.contract_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors border border-red-100 cursor-pointer"
                        >
                          <Ban size={16} /> ยกเลิกสัญญา
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold">
                          ยกเลิกแล้วเมื่อ {new Date(contract.updated_at).toLocaleDateString("th-TH")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CancelContracts;
