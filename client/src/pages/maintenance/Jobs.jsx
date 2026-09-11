import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  Filter,
} from "lucide-react";
import { maintenanceAPI } from "../../api";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await maintenanceAPI.getAll();
      setJobs(response.data.data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH");
  };

  const getStatusConfig = (status) => {
    const config = {
      PENDING: {
        text: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
        label: "รอดำเนินการ",
        icon: Clock,
        iconBg: "bg-orange-100 text-orange-600",
      },
      IN_PROGRESS: {
        text: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        label: "กำลังดำเนินการ",
        icon: Wrench,
        iconBg: "bg-blue-100 text-blue-600",
      },
      COMPLETED: {
        text: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
        label: "เสร็จสิ้น",
        icon: CheckCircle,
        iconBg: "bg-green-100 text-green-600",
      },
    };
    return config[status] || config.PENDING;
  };

  const filteredJobs = jobs.filter((job) => {
    const slotNum =
      job.slot?.slot_number ||
      job.slot_number ||
      job.stall?.slot_number ||
      "";
    const matchesSearch =
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      slotNum.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = jobs.filter((j) => j.status === "PENDING").length;
  const inProgressCount = jobs.filter((j) => j.status === "IN_PROGRESS").length;
  const completedCount = jobs.filter((j) => j.status === "COMPLETED").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">งานซ่อมทั้งหมด</h1>
        <p className="text-gray-500 text-sm">
          จัดการและอัปเดตสถานะงานซ่อมที่ได้รับมอบหมาย
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{pendingCount}</h3>
            <p className="text-sm text-gray-500">รอดำเนินการ</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Wrench size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {inProgressCount}
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
              {completedCount}
            </h3>
            <p className="text-sm text-gray-500">เสร็จสิ้น</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50 focus:bg-white transition-colors"
              placeholder="ค้นหาชื่องาน, ล็อค..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter size={20} className="text-gray-400" />
            <select
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="PENDING">รอดำเนินการ</option>
              <option value="IN_PROGRESS">กำลังดำเนินการ</option>
              <option value="COMPLETED">เสร็จสิ้น</option>
            </select>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => {
              const config = getStatusConfig(job.status);
              const Icon = config.icon;

              return (
                <Link
                  key={job.request_id || job.id}
                  to={`/maintenance/jobs/${job.request_id || job.id}`}
                  className="block bg-white border border-gray-100 hover:border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0`}
                      >
                        <Icon size={24} />
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-800 text-lg group-hover:text-purple-600 transition-colors mb-1">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap gap-3 items-center text-sm text-gray-500">
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-600">
                            ล็อค{" "}
                            {job.slot?.slot_number ||
                              job.slot_number ||
                              job.stall?.slot_number ||
                              "?"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(job.requested_at || job.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`hidden md:inline-flex px-3 py-1 rounded-lg text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}
                      >
                        {config.label}
                      </span>
                      <ChevronRight
                        size={20}
                        className="text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all"
                      />
                    </div>
                  </div>
                  <div className="md:hidden mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-gray-300" />
              </div>
              <h3 className="text-gray-800 font-bold mb-2">
                ไม่พบรายการงานซ่อม
              </h3>
              <p className="text-gray-400 text-sm">ลองปรับตัวกรองหรือคำค้นหา</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
