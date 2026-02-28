import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
} from "lucide-react";
import { notificationsAPI } from "../../api";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, UNREAD, READ

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsAPI.getAll();
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === id ? { ...n, status: "READ" } : n,
        ),
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("คุณต้องการลบการแจ้งเตือนนี้ใช่หรือไม่?")) return;
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "ALL") return true;
    return n.status === filter;
  });

  const unreadCount = notifications.filter((n) => n.status === "UNREAD").length;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Bell className="text-purple-600" />
            การแจ้งเตือน
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount} ใหม่
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-2">
            ติดตามข่าวสารและการแจ้งเตือนสำคัญเกี่ยวกับสัญญาและบิลของคุณ
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "ALL" ? "bg-purple-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"}`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "UNREAD" ? "bg-purple-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"}`}
          >
            ยังไม่ได้อ่าน
          </button>
          <button
            onClick={() => setFilter("READ")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "READ" ? "bg-purple-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"}`}
          >
            อ่านแล้ว
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
            <Bell size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            ไม่มีการแจ้งเตือน
          </h3>
          <p className="text-gray-500">คุณยังไม่มีการแจ้งเตือนในขณะนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((n) => (
            <div
              key={n.notification_id}
              className={`bg-white rounded-2xl p-5 shadow-sm border transition-all duration-300 ${n.status === "UNREAD" ? "border-purple-200 bg-purple-50/30" : "border-gray-100"}`}
            >
              <div className="flex gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${n.status === "UNREAD" ? "bg-purple-100 text-purple-600 font-bold" : "bg-gray-100 text-gray-400"}`}
                >
                  {n.title.includes("บิล") ? (
                    <AlertCircle size={24} />
                  ) : (
                    <Bell size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3
                      className={`font-bold truncate ${n.status === "UNREAD" ? "text-gray-900" : "text-gray-600"}`}
                    >
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(n.created_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p
                    className={`text-sm leading-relaxed mb-4 ${n.status === "UNREAD" ? "text-gray-700" : "text-gray-500"}`}
                  >
                    {n.message}
                  </p>
                  <div className="flex justify-end gap-3">
                    {n.status === "UNREAD" && (
                      <button
                        onClick={() => handleMarkAsRead(n.notification_id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-purple-50"
                      >
                        <Check size={14} />
                        ทำเครื่องหมายว่าอ่านแล้ว
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.notification_id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
