import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ClipboardList,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Jobs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Clock size={20} className="text-orange-500" /> งานที่ต้องทำ
            </h3>
            <Link
              to="/maintenance/jobs"
              className="text-purple-600 text-sm font-medium hover:text-purple-700 hover:underline"
            >
              ดูทั้งหมด →
            </Link>
          </div>

          {pendingJobs.length > 0 ? (
            <div className="space-y-3">
              {pendingJobs.slice(0, 5).map((job) => (
                <Link
                  key={job.request_id || job.id}
                  to={`/maintenance/jobs/${job.request_id || job.id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 rounded-xl transition-colors group border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-orange-500 shadow-sm font-bold border border-gray-100">
                      {job.slot_number || job.stall?.slot_number || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(job.createdAt).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-gray-400">
              <CheckCircle
                size={48}
                className="mb-2 text-green-500 opacity-50"
              />
              <p>ไม่มีงานค้าง เยี่ยมมาก!</p>
            </div>
          )}
        </div>

        {/* In Progress Jobs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Wrench size={20} className="text-blue-500" /> กำลังดำเนินการ
            </h3>
          </div>

          {inProgressJobs.length > 0 ? (
            <div className="space-y-3">
              {inProgressJobs.slice(0, 5).map((job) => (
                <Link
                  key={job.id}
                  to={`/maintenance/jobs/${job.id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50/50 rounded-xl transition-colors group border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm font-bold border border-gray-100">
                      {job.slot_number || job.stall?.slot_number || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {job.updatedAt
                          ? new Date(job.updatedAt).toLocaleDateString("th-TH")
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-gray-400">
              <AlertCircle size={48} className="mb-2 opacity-20" />
              <p>ไม่มีงานที่กำลังดำเนินการ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
