import { useEffect, useState } from "react";
import {
  Receipt,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { billsAPI } from "../../api";

const ExecutiveBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    fetchBills();
  }, []);

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

  const filteredBills = bills.filter(
    (bill) => filterStatus === "ALL" || bill.status === filterStatus,
  );

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tl-xl text-sm">
                  ล็อค
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ผู้เช่า
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  เดือน
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ยอดรวม
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tr-xl text-sm">
                  สถานะ
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
                    {bill.rental_slot?.slot_number ||
                      bill.rental_contract?.rental_slot?.slot_number ||
                      "-"}
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    {bill.rental_contract?.tenant?.first_name || "-"}
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
                  <td className="py-4 px-6 font-bold text-green-600">
                    ฿{(bill.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">{getStatusBadge(bill.status)}</td>
                </tr>
              ))}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    ไม่พบข้อมูลบิล
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

export default ExecutiveBills;
