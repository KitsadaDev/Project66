import { useEffect, useState } from "react";
import { Search, Building2, User, Store } from "lucide-react";
import { stallsAPI } from "../../api";

const ExecutiveStalls = () => {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFoodCourt, setFilterFoodCourt] = useState("ALL");

  useEffect(() => {
    fetchStalls();
  }, []);

  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      setStalls(response.data.data || []);
    } catch (error) {
      console.error("Error fetching stalls:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStalls = stalls.filter((stall) => {
    const matchSearch =
      stall.slot_number?.toLowerCase().includes(search.toLowerCase()) ||
      stall.rental_contracts?.[0]?.tenant?.first_name
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchFoodCourt =
      filterFoodCourt === "ALL" ||
      stall.food_court_id?.toString() === filterFoodCourt;
    return matchSearch && matchFoodCourt;
  });

  const getStatusBadge = (status) => {
    const config = {
      OCCUPIED: { bg: "bg-red-100", text: "text-red-700", label: "มีผู้เช่า" },
      VACANT: { bg: "bg-green-100", text: "text-green-700", label: "ว่าง" },
      MAINTENANCE: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "ซ่อมบำรุง",
      },
    };
    const { bg, text, label } = config[status] || config.VACANT;
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${bg} ${text}`}>
        {label}
      </span>
    );
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
        <h1 className="text-2xl font-bold text-gray-800">ข้อมูลล็อคทั้งหมด</h1>
        <p className="text-gray-500 text-sm">
          ดูข้อมูลล็อคและผู้เช่า (ดูได้อย่างเดียว)
        </p>
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
              placeholder="ค้นหาล็อคหรือชื่อผู้เช่า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white min-w-[150px]"
            value={filterFoodCourt}
            onChange={(e) => setFilterFoodCourt(e.target.value)}
          >
            <option value="ALL">ทุกศูนย์อาหาร</option>
            <option value="1">ศูนย์อาหาร 1</option>
            <option value="2">ศูนย์อาหาร 2</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tl-xl text-sm">
                  ล็อค
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ศูนย์อาหาร
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  สถานะ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ผู้เช่า
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tr-xl text-sm">
                  ค่าเช่า/เดือน
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStalls.map((stall) => (
                <tr
                  key={stall.slot_id}
                  className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                        {stall.slot_number}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Store size={16} className="text-gray-400" />
                      ศูนย์อาหาร {stall.food_court_id}
                    </div>
                  </td>
                  <td className="py-4 px-6">{getStatusBadge(stall.status)}</td>
                  <td className="py-4 px-6">
                    {stall.rental_contracts?.[0]?.tenant ? (
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-800">
                          {stall.rental_contracts[0].tenant.first_name}{" "}
                          {stall.rental_contracts[0].tenant.last_name || ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-800">
                    ฿{(stall.rent || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredStalls.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    ไม่พบข้อมูลล็อค
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

export default ExecutiveStalls;
