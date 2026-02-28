import { useEffect, useState } from "react";
import {
  Search,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Calendar,
  X,
  Eye,
} from "lucide-react";
import { toast } from "react-toastify";
import { maintenanceAPI, usersAPI } from "../../api";
import { useUIStore } from "../../store";
import RepairDetailsModal from "../../components/RepairDetailsModal";

const AdminRepairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignModal, setAssignModal] = useState({ open: false, repair: null });
  const [viewRepair, setViewRepair] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState("");

  const [maintenanceStaff, setMaintenanceStaff] = useState([]);
  const decrementPendingRepairs = useUIStore(
    (state) => state.decrementPendingRepairs,
  );

  useEffect(() => {
    fetchRepairs();
    fetchMaintenanceStaff();
  }, []);

  const fetchMaintenanceStaff = async () => {
    try {
      const response = await usersAPI.getAll({ role: "MAINTENANCE" });
      setMaintenanceStaff(response.data.data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchRepairs = async () => {
    try {
      const response = await maintenanceAPI.getAll();
      setRepairs(response.data.data || []);
    } catch (error) {
      console.error("Error fetching repairs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = (repair) => {
    setAssignModal({ open: true, repair });
    setSelectedStaff("");
  };

  const submitAssignment = async () => {
    if (!selectedStaff) {
      toast.error("กรุณาเลือกเจ้าหน้าที่");
      return;
    }

    try {
      await maintenanceAPI.assignStaff(assignModal.repair.request_id, {
        staffId: selectedStaff,
      });
      toast.success("มอบหมายงานสำเร็จ");
      setAssignModal({ open: false, repair: null });
      fetchRepairs();
      decrementPendingRepairs();
    } catch (error) {
      console.error("Assignment Error:", error);
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message;
      toast.error(`เกิดข้อผิดพลาด (${status}): ${msg}`);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: {
        color: "bg-yellow-100 text-yellow-700",
        label: "รอดำเนินการ",
        icon: Clock,
      },
      IN_PROGRESS: {
        color: "bg-blue-100 text-blue-700",
        label: "กำลังดำเนินการ",
        icon: Wrench,
      },
      COMPLETED: {
        color: "bg-green-100 text-green-700",
        label: "เสร็จสิ้น",
        icon: CheckCircle,
      },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium ${config.color}`}
      >
        <Icon size={14} /> {config.label}
      </span>
    );
  };

  const filteredRepairs = repairs.filter((repair) => {
    const matchesSearch =
      repair.title?.toLowerCase().includes(search.toLowerCase()) ||
      (repair.slot_number || repair.stall?.slot_number)
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || repair.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            จัดการงานซ่อม
          </h1>
          <p className="text-gray-500 text-sm">
            ดูรายการแจ้งซ่อมและมอบหมายงานให้ช่าง
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">
              {repairs.filter((r) => r.status === "PENDING").length}
            </div>
            <div className="text-xs text-gray-500">รอดำเนินการ</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              placeholder="ค้นหาหัวข้อ หรือ หมายเลขล็อค..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING">รอดำเนินการ</option>
            <option value="IN_PROGRESS">กำลังดำเนินการ</option>
            <option value="COMPLETED">เสร็จสิ้น</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  หัวข้อ
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  ล็อค
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  ผู้แจ้ง
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  วันที่แจ้ง
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  สถานะ
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  ผู้รับผิดชอบ
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRepairs.map((repair) => (
                <tr
                  key={repair.request_id}
                  className="border-b border-gray-50 hover:bg-purple-50/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <strong className="text-gray-800">{repair.title}</strong>
                      <p className="text-xs text-gray-500 mt-1">
                        {repair.description?.substring(0, 50)}...
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold">
                      {repair.slot?.slot_number || repair.slot_number || "-"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <User size={12} />
                      </div>
                      {repair.tenant?.first_name ||
                        repair.reporter?.name ||
                        "-"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar size={14} />
                      {new Date(
                        repair.requested_at || repair.createdAt,
                      ).toLocaleDateString("th-TH")}
                    </div>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(repair.status)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {repair.assignedTo?.name || repair.staff?.name || (
                      <span className="text-gray-400 italic">
                        ยังไม่มอบหมาย
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        onClick={() => setViewRepair(repair)}
                        title="ดูรายละเอียด"
                      >
                        <Eye size={18} />
                      </button>
                      {repair.status === "PENDING" && (
                        <button
                          className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          onClick={() => handleAssign(repair)}
                        >
                          <Send size={14} /> มอบหมาย
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRepairs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              ไม่พบรายการแจ้งซ่อม
            </div>
          )}
        </div>
      </div>

      {assignModal.open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setAssignModal({ open: false, repair: null })}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                มอบหมายงานซ่อม
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setAssignModal({ open: false, repair: null })}
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-xl">
              <p className="mb-2 text-gray-800">
                <strong>หัวข้อ:</strong> {assignModal.repair?.title}
              </p>
              <p className="text-sm text-gray-500">
                {assignModal.repair?.description}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกเจ้าหน้าที่ซ่อม
              </label>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
              >
                <option value="">-- เลือกเจ้าหน้าที่ --</option>
                {maintenanceStaff.map((staff) => (
                  <option key={staff.user_id} value={staff.user_id}>
                    {staff.first_name} {staff.last_name || ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <button
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                onClick={() => setAssignModal({ open: false, repair: null })}
              >
                ยกเลิก
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors"
                onClick={submitAssignment}
              >
                <Send size={18} /> มอบหมาย
              </button>
            </div>
          </div>
        </div>
      )}

      {viewRepair && (
        <RepairDetailsModal
          repair={viewRepair}
          onClose={() => setViewRepair(null)}
        />
      )}
    </div>
  );
};

export default AdminRepairs;
