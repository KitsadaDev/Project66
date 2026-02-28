import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, User, ArrowLeft, Store, ArrowRight, Info } from "lucide-react";
import { stallsAPI } from "../../api";

const StallStatus = () => {
  const [searchParams] = useSearchParams();
  const foodCourt = searchParams.get("foodCourt");

  const [stalls, setStalls] = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStalls();
  }, [foodCourt]);

  const fetchStalls = async () => {
    try {
      const response = await stallsAPI.getAll();
      let data = response.data.data || [];

      if (foodCourt) {
        data = data.filter((s) => s.food_court_id === parseInt(foodCourt));
      }

      setStalls(data);
    } catch (error) {
      console.error("Error fetching stalls:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStallStatus = (slot_number) => {
    const stall = stalls.find((s) => s.slot_number === slot_number);
    if (!stall) return "empty";
    if (stall.status === "OCCUPIED") return "occupied";
    return stall.status.toLowerCase();
  };

  const getStallData = (slot_number) => {
    return stalls.find((s) => s.slot_number === slot_number);
  };

  const handleStallClick = (slot_number) => {
    const stall = getStallData(slot_number);
    if (!stall) {
      setSelectedStall({ slot_number, status: "EMPTY" });
    } else {
      setSelectedStall(stall);
    }
  };

  const StallCell = ({ id }) => {
    const status = getStallStatus(id);
    const isSelected = selectedStall?.slot_number === id;
    let colorClass = "";

    // Base classes
    const baseClasses =
      "w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center font-bold text-sm md:text-base border-2 cursor-pointer transition-all duration-300 relative";
    const selectedClasses = isSelected
      ? "ring-4 ring-purple-200 scale-110 z-10 shadow-xl"
      : "hover:scale-105 hover:shadow-md";

    switch (status) {
      case "occupied":
        colorClass = "bg-red-100 border-red-300 text-red-700 hover:bg-red-200";
        break;
      case "vacant":
        colorClass =
          "bg-green-100 border-green-300 text-green-700 hover:bg-green-200";
        break;
      case "maintenance":
        colorClass =
          "bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200";
        break;
      default: // empty
        colorClass = "bg-gray-50 border-dashed border-gray-300 text-gray-400";
    }

    return (
      <div
        className={`${baseClasses} ${selectedClasses} ${colorClass}`}
        onClick={() => handleStallClick(id)}
      >
        {id}
      </div>
    );
  };

  if (!foodCourt) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            เลือกศูนย์อาหาร
          </h1>
          <p className="text-gray-500">
            เลือกศูนย์อาหารเพื่อดูสถานะการเช่าล็อค
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Link
            to="/tenant/stall-status?foodCourt=1"
            className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
          >
            <div className="h-48 bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center p-8 transition-transform duration-500 group-hover:scale-105">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-purple-100">
                <Store size={48} className="text-purple-500" />
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                  ศูนย์อาหาร 1
                </h3>
                <ArrowRight
                  size={20}
                  className="text-gray-300 group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all"
                />
              </div>
            </div>
          </Link>

          <Link
            to="/tenant/stall-status?foodCourt=2"
            className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
          >
            <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center p-8 transition-transform duration-500 group-hover:scale-105">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-blue-100">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-blue-600">
                    BRU
                  </span>
                  <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                    Food Center
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                  ศูนย์อาหาร 2
                </h3>
                <ArrowRight
                  size={20}
                  className="text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all"
                />
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.20))] md:h-[calc(100vh-theme(spacing.24))] -m-4 md:-m-6 overflow-hidden">
      {/* Header/Nav for Mobile */}
      <div className="lg:hidden p-4 bg-white shadow-sm flex items-center gap-4 z-10">
        <Link
          to="/tenant/stall-status"
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="font-bold text-gray-800">ศูนย์อาหาร {foodCourt}</h1>
          <p className="text-xs text-gray-500">สถานะล็อค</p>
        </div>
      </div>

      {/* Back Button Desktop */}
      <div className="hidden lg:block absolute top-6 left-6 z-20">
        <Link
          to="/tenant/stall-status"
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-gray-600 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft size={18} />
          กลับไปหน้าเลือกศูนย์
        </Link>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 overflow-auto bg-gray-50/50 flex items-center justify-center p-8 relative">
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-purple-100/50 border border-white">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 hidden lg:block text-center">
            ผังศูนย์อาหาร {foodCourt}
          </h2>

          <div className="flex flex-col gap-6">
            {/* Row B + D1 */}
            <div className="flex gap-4">
              {["B1", "B2", "B3", "B4", "B5", "B6"].map((id) => (
                <StallCell key={id} id={id} />
              ))}
              <div className="w-10"></div>
              <StallCell id="D1" />
            </div>

            {/* Spacer + D2 */}
            <div className="flex gap-4">
              <div className="flex-1"></div>
              <div className="w-10"></div>
              <StallCell id="D2" />
            </div>

            {/* Row A + D3 */}
            <div className="flex gap-4">
              {["A1", "A2", "A3", "A4", "A5", "A6"].map((id) => (
                <StallCell key={id} id={id} />
              ))}
              <div className="w-10"></div>
              <StallCell id="D3" />
            </div>

            <div className="h-4"></div>

            {/* Row C */}
            <div className="flex gap-4">
              {["C1", "C2", "C3", "C4", "C5", "C6"].map((id) => (
                <StallCell key={id} id={id} />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-green-300 bg-green-100"></div>
              <span className="text-sm text-gray-600">ว่าง (พร้อมเช่า)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-red-300 bg-red-100"></div>
              <span className="text-sm text-gray-600">มีผู้เช่าแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-yellow-300 bg-yellow-100"></div>
              <span className="text-sm text-gray-600">ปิดปรับปรุง</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-dashed border-gray-300 bg-gray-50"></div>
              <span className="text-sm text-gray-600">ยังไม่เปิดบริการ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Details Panel */}
      <div
        className={`w-full lg:w-96 bg-white border-l border-gray-100 shadow-2xl lg:shadow-none z-30 transition-transform duration-300 absolute lg:relative bottom-0 lg:bottom-auto h-[50vh] lg:h-full rounded-t-3xl lg:rounded-none overflow-hidden flex flex-col ${selectedStall ? "translate-y-0" : "translate-y-full lg:translate-y-0 lg:block hidden"}`}
      >
        {selectedStall ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                ข้อมูลล็อก
              </span>
              <button
                onClick={() => setSelectedStall(null)}
                className="lg:hidden p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
              <div className="flex flex-col items-center mb-8">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg text-4xl font-bold
                    ${selectedStall.status === "OCCUPIED" ? "bg-red-100 text-red-600" : selectedStall.status === "MAINTENANCE" ? "bg-yellow-100 text-yellow-600" : selectedStall.status === "VACANT" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}
                  `}
                >
                  {selectedStall.slot_number}
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedStall.status === "OCCUPIED"
                    ? "มีผู้เช่าแล้ว"
                    : "ยังว่าง"}
                </h3>
                <div className="mt-2 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedStall.status === "OCCUPIED"
                        ? "bg-red-100 text-red-700"
                        : selectedStall.status === "MAINTENANCE"
                          ? "bg-yellow-100 text-yellow-700"
                          : selectedStall.status === "VACANT"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedStall.status === "OCCUPIED"
                      ? "สถานะปกติ"
                      : "สามารถเช่าได้"}
                  </span>
                </div>
              </div>

              {/* Privacy: Do not show tenant details (Name, Rent, FoodType) */}
              {selectedStall.status === "OCCUPIED" ? (
                <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-gray-500 font-medium">ไม่ว่าง</p>
                  <p className="text-sm text-gray-400 mt-2">
                    ล็อกนี้มีผู้เช่าแล้ว
                  </p>
                </div>
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-gray-500 mb-2">ล็อกนี้ยังว่างอยู่</p>
                  <p className="text-sm text-gray-400">
                    คุณสามารถติดต่อเจ้าหน้าที่เพื่อขอเช่าพื้นที่นี้ได้
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-110">
              <Store size={40} className="opacity-20" />
            </div>
            <p>แตะที่ล็อกเพื่อดูรายละเอียด</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StallStatus;
