import { useEffect, useState } from "react";
import { Wrench, Clock, CheckCircle, Calendar, Filter } from "lucide-react";
import { maintenanceAPI } from "../../api";

const ExecutiveRepairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    fetchRepairs();
  }, []);

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

  const filteredRepairs = repairs.filter(
    (repair) => filterStatus === "ALL" || repair.status === filterStatus,
  );

  const getStatusBadge = (status) => {
    const config = {
      PENDING: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "รอดำเนินการ",
        icon: Clock,
      },
      IN_PROGRESS: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        label: "กำลังซ่อม",
        icon: Wrench,
      },
      COMPLETED: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "เสร็จสิ้น",
        icon: CheckCircle,
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

  const stats = {
    total: repairs.length,
    pending: repairs.filter((r) => r.status === "PENDING").length,
    inProgress: repairs.filter((r) => r.status === "IN_PROGRESS").length,
    completed: repairs.filter((r) => r.status === "COMPLETED").length,
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
        <h1 className="text-2xl font-bold text-gray-800">
          ข้อมูลงานซ่อมทั้งหมด
        </h1>
        <p className="text-gray-500 text-sm">
          ดูข้อมูลการแจ้งซ่อม (ดูได้อย่างเดียว)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <Wrench size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
            <p className="text-sm text-gray-500">งานซ่อมทั้งหมด</p>
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
            <p className="text-sm text-gray-500">รอดำเนินการ</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Wrench size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {stats.inProgress}
            </h3>
            <p className="text-sm text-gray-500">กำลังดำเนินการ</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {stats.completed}
            </h3>
            <p className="text-sm text-gray-500">เสร็จสิ้น</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Filter size={20} className="text-gray-400" />
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tl-xl text-sm">
                  หัวข้อ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ล็อค
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ผู้แจ้ง
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  วันที่แจ้ง
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ผู้รับผิดชอบ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tr-xl text-sm">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRepairs.map((repair) => (
                <tr
                  key={repair.id}
                  className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                >
                  <td
                    className="py-4 px-6 font-medium text-gray-800 truncate max-w-[200px]"
                    title={repair.title}
                  >
                    {repair.title}
                  </td>
                  <td className="py-4 px-6">
                    {repair.stall?.slot_number || "-"}
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    {repair.tenant?.name || "-"}
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(repair.createdAt).toLocaleDateString("th-TH")}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    {repair.assignedTo?.name || (
                      <span className="text-gray-400 italic">ยังไม่ระบุ</span>
                    )}
                  </td>
                  <td className="py-4 px-6">{getStatusBadge(repair.status)}</td>
                </tr>
              ))}
              {filteredRepairs.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    ไม่พบข้อมูลงานซ่อม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveRepairs;
