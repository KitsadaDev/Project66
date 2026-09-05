import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wrench,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useAuthStore } from "../../store";
import { maintenanceAPI } from "../../api";

const MaintenanceDashboard = () => {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const pendingJobs = jobs.filter((j) => j.status === "PENDING");
  const inProgressJobs = jobs.filter((j) => j.status === "IN_PROGRESS");
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");

  const assignedJobs = jobs.filter(
    (j) => j.status === "PENDING" || j.status === "IN_PROGRESS"
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return {
          label: "รอดำเนินการ",
          className: "bg-orange-50 text-orange-600 border border-orange-200",
        };
      case "IN_PROGRESS":
        return {
          label: "กำลังดำเนินการ",
          className: "bg-blue-50 text-blue-600 border border-blue-200",
        };
      case "COMPLETED":
        return {
          label: "เสร็จสิ้น",
          className: "bg-green-50 text-green-600 border border-green-200",
        };
      default:
        return {
          label: status,
          className: "bg-gray-50 text-gray-600 border border-gray-200",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Banner */}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {pendingJobs.length}
            </h3>
            <p className="text-sm text-gray-500">งานรอดำเนินการ</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Wrench size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {inProgressJobs.length}
            </h3>
            <p className="text-sm text-gray-500">กำลังดำเนินการ</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {completedJobs.length}
            </h3>
            <p className="text-sm text-gray-500">งานเสร็จสิ้นแล้ว</p>
          </div>
        </div>
      </div>

      {/* Assigned Jobs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">
            งานที่ได้รับมอบหมาย ({assignedJobs.length})
          </h3>
          <Link
            to="/maintenance/jobs"
            className="text-purple-600 text-sm font-medium hover:text-purple-700 hover:underline"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {assignedJobs.length > 0 ? (
          <div className="space-y-3">
            {assignedJobs.map((job) => {
              const statusBadge = getStatusBadge(job.status);
              const slotNum =
                job.slot?.slot_number ||
                job.slot_number ||
                job.stall?.slot_number ||
                "-";

              return (
                <Link
                  key={job.request_id || job.id}
                  to={`/maintenance/jobs/${job.request_id || job.id}`}
                  className="block p-5 bg-white hover:bg-purple-50/30 rounded-2xl transition-all border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-gray-800 text-base md:text-lg group-hover:text-purple-600 transition-colors">
                      {job.title}
                    </h4>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {job.category && (
                    <div className="text-xs text-gray-500 mb-2">
                      {job.category}
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    ล็อค {slotNum} • {formatDate(job.requested_at || job.createdAt)}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm">ไม่มีงานค้าง เยี่ยมมาก!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
