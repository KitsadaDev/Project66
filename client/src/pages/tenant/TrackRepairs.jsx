// ======================================================
// pages/tenant/TrackRepairs.jsx - หน้าติดตามสถานะการแจ้งซ่อมของผู้เช่า (Tenant Repair Tracker)
// รับผิดชอบ:
//   - ดึงรายการคำขอแจ้งซ่อมทั้งหมดของผู้เช่า (maintenanceAPI.getAll)
//   - แสดงกล่องสรุปสถิติจำนวนงานตามสถานะ: รอดำเนินการ (PENDING), กำลังดำเนินการ (IN_PROGRESS), เสร็จสิ้น (COMPLETED)
//   - กรองรายการแจ้งซ่อมตามสถานะ (Status Filter Dropdown)
//   - แสดงรายการการ์ดแจ้งซ่อม พร้อมไอคอนและ Badge สีสถานะ
//   - ปุ่มนำทางไปยังหน้าแจ้งซ่อมใหม่ (/tenant/report-repair)
// ======================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Clock,
  Wrench,
  CheckCircle,
  Calendar,
  AlertCircle,
  Plus,
  Filter,
} from "lucide-react";
import { maintenanceAPI } from "../../api";

const TrackRepairs = () => {
  // -------------------------------------------------------
  // Component States
  // -------------------------------------------------------
  const [repairs, setRepairs] = useState([]);             // รายการคำขอแจ้งซ่อมทั้งหมด
  const [loading, setLoading] = useState(true);           // สถานะกำลังโหลดข้อมูล
  const [statusFilter, setStatusFilter] = useState("ALL"); // สถานะที่ต้องการกรอง (ALL, PENDING, IN_PROGRESS, COMPLETED)

  useEffect(() => {
    fetchRepairs();
  }, []);

  // -------------------------------------------------------
  // ฟังก์ชัน: fetchRepairs
  // หน้าที่: เรียก API ดึงประวัติการแจ้งซ่อมของผู้เช่า
  // -------------------------------------------------------
  const fetchRepairs = async () => {
    try {
      const response = await maintenanceAPI.getAll();
      setRepairs(response.data.data || []);
    } catch (error) {
      console.error("Error fetching repairs:", error);
      // ข้อมูลตัวอย่างสำหรับแสดงผลกรณีจำลอง
      setRepairs([
        {
          id: 1,
          request_id: 1,
          title: "ก๊อกน้ำรั่ว",
          status: "PENDING",
          requested_at: "2026-02-01T00:00:00.000Z",
        },
        {
          id: 2,
          request_id: 2,
          title: "ไฟฟ้าดับบางส่วน",
          status: "IN_PROGRESS",
          requested_at: "2026-01-28T00:00:00.000Z",
        },
        {
          id: 3,
          request_id: 3,
          title: "ประตูพัง",
          status: "COMPLETED",
          requested_at: "2026-01-15T00:00:00.000Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // แปลงรูปแบบวันที่เป็นภาษาไทย
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // -------------------------------------------------------
  // ฟังก์ชัน: getStatusConfig
  // หน้าที่: กำหนดการจัดรูปแบบ สี และไอคอนตามสถานะงานซ่อม
  // -------------------------------------------------------
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

  // กรองรายการตาม statusFilter
  const filteredRepairs = repairs.filter(
    (repair) => statusFilter === "ALL" || repair.status === statusFilter,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* ส่วนหัวหน้าจอ และปุ่มแจ้งซ่อมใหม่ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ติดตามการซ่อม</h1>
          <p className="text-gray-500 text-sm">ตรวจสอบสถานะการแจ้งซ่อมของคุณ</p>
        </div>
        <Link
          to="/tenant/report-repair"
          className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus size={20} /> แจ้งซ่อมใหม่
        </Link>
      </div>

      {/* ------------------------------------------------------- */}
      {/* การ์ดสรุปสถิติสถานะงานซ่อม 3 สถานะ (Summary Stats) */}
      {/* ------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* รอดำเนินการ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {repairs.filter((r) => r.status === "PENDING").length}
            </h3>
            <p className="text-sm text-gray-500">รอดำเนินการ</p>
          </div>
        </div>

        {/* กำลังดำเนินการ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Wrench size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {repairs.filter((r) => r.status === "IN_PROGRESS").length}
            </h3>
            <p className="text-sm text-gray-500">กำลังดำเนินการ</p>
          </div>
        </div>

        {/* เสร็จสิ้น */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {repairs.filter((r) => r.status === "COMPLETED").length}
            </h3>
            <p className="text-sm text-gray-500">เสร็จสิ้น</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ตัวเลือกกรองสถานะ (Filter Bar) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <Filter size={16} /> ประวัติ:
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white text-sm cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING">รอดำเนินการ</option>
            <option value="IN_PROGRESS">กำลังดำเนินการ</option>
            <option value="COMPLETED">เสร็จสิ้น</option>
          </select>
        </div>

        {/* ------------------------------------------------------- */}
        {/* รายการการ์ดแจ้งซ่อม (Repairs List) */}
        {/* ------------------------------------------------------- */}
        <div className="space-y-4">
          {filteredRepairs.map((repair) => {
            const config = getStatusConfig(repair.status);
            const Icon = config.icon;

            return (
              <div
                key={repair.request_id || repair.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* ไอคอนสถานะ */}
                  <div
                    className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    {/* หัวข้องานซ่อม */}
                    <h3 className="font-bold text-gray-800 text-lg mb-1">
                      {repair.title}
                    </h3>
                    {/* วันที่แจ้งซ่อม */}
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(repair.requested_at || repair.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badge แสดงสถานะ */}
                <div className="flex items-center justify-between md:justify-end gap-4 pl-16 md:pl-0">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${config.bg} ${config.text} ${config.border}`}
                  >
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}

          {/* กรณีไม่พบข้อมูลในสถานะที่เลือก */}
          {filteredRepairs.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-gray-300" />
              </div>
              <h3 className="text-gray-800 font-bold mb-2">
                ไม่พบรายการแจ้งซ่อม
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                ยังไม่มีประวัติการแจ้งซ่อมในสถานะที่เลือก
              </p>
              <Link
                to="/tenant/report-repair"
                className="inline-flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-700 cursor-pointer"
              >
                <Plus size={18} /> แจ้งปัญหาตอนนี้
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackRepairs;
