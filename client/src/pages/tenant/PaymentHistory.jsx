import { useEffect, useState } from "react";
import {
  History,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Receipt,
  Eye,
  CreditCard,
} from "lucide-react";
import { billsAPI, stallsAPI } from "../../api";

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewModal, setViewModal] = useState({ open: false, payment: null });

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      const billsRes = await billsAPI.getAll();
      const bills = billsRes.data.data || [];

      // Filter by year based on billing_month
      const filteredBills = bills.filter((bill) => {
        if (!bill.billing_month) return false;
        const billYear = new Date(bill.billing_month).getFullYear();
        return billYear === selectedYear;
      });

      setPayments(filteredBills);
    } catch (error) {
      console.error("Error fetching data:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

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
        label: "รอตรวจสอบ",
        icon: Clock,
      },
      OVERDUE: {
        bg: "bg-red-100",
        text: "text-red-700",
        label: "เกินกำหนด",
        icon: XCircle,
      },
    };
    const c = config[status] || config.PENDING;
    const Icon = c.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium ${c.bg} ${c.text}`}
      >
        <Icon size={14} /> {c.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            ประวัติการชำระเงิน
          </h1>
          <p className="text-gray-500 text-sm">
            ตรวจสอบบริวัติการชำระค่าเช่าย้อนหลัง
          </p>
        </div>
        <select
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white shadow-sm"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          <option value={2026}>ปี 2569</option>
          <option value={2025}>ปี 2568</option>
          <option value={2024}>ปี 2567</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {payments.filter((p) => p.status === "PAID").length}
            </h3>
            <p className="text-sm text-gray-500">บิลที่ชำระแล้ว</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              {payments.filter((p) => p.status === "PENDING").length}
            </h3>
            <p className="text-sm text-gray-500">รอตรวจสอบ</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-purple-600">
              ฿
              {payments
                .filter((p) => p.status === "PAID")
                .reduce((sum, p) => sum + (p.total_amount || 0), 0)
                .toLocaleString()}
            </h3>
            <p className="text-sm text-gray-500">ยอดชำระรวมปีนี้</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  เดือน
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  ยอดเงิน
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  วันที่ชำระ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  สถานะ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  หลักฐาน
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-medium text-gray-800">
                        <Calendar size={18} className="text-purple-400" />
                        {payment.billing_month
                          ? new Date(payment.billing_month).toLocaleDateString(
                              "th-TH",
                              { month: "long" },
                            )
                          : "-"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-purple-600">
                        ฿{payment.total_amount?.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {payment.payments?.[0]?.payment_date
                        ? formatDate(payment.payments[0].payment_date)
                        : "-"}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="py-4 px-6">
                      {payment.payments?.[0]?.payment_slip_url ? (
                        <button
                          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                          onClick={() =>
                            setViewModal({
                              open: true,
                              payment: {
                                ...payment,
                                receiptUrl:
                                  payment.payments[0].payment_slip_url,
                              },
                            })
                          }
                          title="ดูหลักฐานการชำระเงิน"
                        >
                          ดูหลักฐานการชำระเงิน
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>ไม่พบประวัติการชำระเงิน</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Receipt Modal */}
      {viewModal.open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewModal({ open: false, payment: null })}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Receipt size={20} className="text-purple-500" />{" "}
                หลักฐานการชำระเงิน
              </h3>
              <button
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
                onClick={() => setViewModal({ open: false, payment: null })}
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-gray-100 flex items-center justify-center min-h-[300px]">
              {viewModal.payment?.receiptUrl ? (
                <img
                  src={viewModal.payment.receiptUrl}
                  alt="Receipt"
                  className="max-w-full max-h-[70vh] rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                    <Eye size={24} />
                  </div>
                  ไม่พบรูปใบเสร็จ
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  วันที่ชำระ:{" "}
                  {formatDate(viewModal.payment?.payments?.[0]?.payment_date)}
                </span>
                <span className="font-bold text-gray-800">
                  ฿{viewModal.payment?.total_amount?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
