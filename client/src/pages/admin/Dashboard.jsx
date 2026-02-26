import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Store,
  ArrowRight,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";
import { stallsAPI } from "../../api";

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const foodCourt = searchParams.get("foodCourt") || null;
  const navigate = useNavigate();

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

      // Filter by food court if selected
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
    if (!stall) return "vacant";
    if (stall.status === "OCCUPIED") {
      if (stall.hasPendingPayment) return "pending";
      return "occupied";
    }
    return "vacant";
  };

  const getStallColor = (status, isSelected) => {
    const baseClasses =
      "transition-all duration-300 cursor-pointer border-2 shadow-sm relative";
    const selectedClasses = isSelected
      ? "ring-4 ring-purple-200 scale-110 z-10 shadow-xl"
      : "hover:scale-105 hover:shadow-md";

    switch (status) {
      case "occupied":
        return `${baseClasses} ${selectedClasses} bg-green-100 border-green-300 text-green-700 hover:bg-green-200`;
      case "pending":
        return `${baseClasses} ${selectedClasses} bg-red-100 border-red-300 text-red-700 hover:bg-red-200`;
      default: // vacant
        return `${baseClasses} ${selectedClasses} bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600`;
    }
  };

  const getStallData = (slot_number) => {
    return stalls.find((s) => s.slot_number === slot_number);
  };

  const handleStallClick = (slot_number) => {
    const stall = getStallData(slot_number);
    setSelectedStall(stall);
  };

  // Food Court Selection View
  if (!foodCourt) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            เลือกศูนย์อาหาร
          </h1>
        </div>

        {/* Food Court Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Link
            to="/admin?foodCourt=1"
            className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src="/Food-court-1.png"
                alt="ศูนย์อาหาร 1"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
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
            to="/admin?foodCourt=2"
            className="group relative block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src="/Food-court-2.png"
                alt="ศูนย์อาหาร 2"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
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

  // Common Stall Cell Component
  const StallCell = ({ id }) => (
    <div
      className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center font-bold text-sm md:text-base ${getStallColor(getStallStatus(id), selectedStall?.slot_number === id)}`}
      onClick={() => handleStallClick(id)}
    >
      {id}
    </div>
  );

  // Layout for Food Court 1 & 2
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.20))] md:h-[calc(100vh-theme(spacing.24))] -m-4 md:-m-6 overflow-hidden">
      {/* Sidebar Menu - Desktop */}
      <div className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-100 p-6 h-full overflow-y-auto z-20 shadow-lg">
        <Link
          to="/admin"
          className="flex items-center gap-2 mb-8 text-gray-500 hover:text-purple-600 transition-colors"
        >
          ← กลับหน้าเลือกศูนย์
        </Link>
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">เมนูลัด</h2>
        <div className="space-y-2">
          <Link
            to="/admin/tenants"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors"
          >
            <User size={18} />
            <span className="font-medium">ข้อมูลผู้เช่า</span>
          </Link>
          <Link
            to="/admin/stalls"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors"
          >
            <Store size={18} />
            <span className="font-medium">แก้ไขสถานะล็อก</span>
          </Link>
        </div>

        <div className="mt-auto">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
            สถานะ
          </h3>
          <div className="space-y-3 px-2">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span>มีผู้เช่า (ปกติ)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span>มียอดค้างชำระ</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span>ว่าง / ปิดปรับปรุง</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-gray-50/50 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white p-4 shadow-sm flex items-center justify-between z-20">
          <Link
            to="/admin"
            className="text-sm font-medium text-gray-500 hover:text-purple-600"
          >
            ← เลือกศูนย์
          </Link>
          <h1 className="font-bold text-gray-800">ศูนย์อาหาร {foodCourt}</h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        {/* Scrollable Grid Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center min-h-0">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-purple-100/50 border border-white relative">
            <h2 className="absolute top-6 left-8 text-2xl font-bold text-gray-800 hidden lg:block">
              ผังศูนย์อาหาร {foodCourt}
            </h2>

            <div className="mt-8 lg:mt-12">
              {foodCourt === "1" ? (
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
                    <div className="flex-1"></div>{" "}
                    {/* Spacer to push D2 right */}
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
              ) : (
                <div className="flex flex-col gap-6 items-center">
                  {["D1", "D2", "D3", "D4", "D5"].map((id) => (
                    <div key={id} className="flex gap-4">
                      <StallCell id={id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Details Panel */}
      <div
        className={`w-full lg:w-96 bg-white border-l border-gray-100 shadow-2xl lg:shadow-none z-30 transition-transform duration-300 absolute lg:relative bottom-0 lg:bottom-auto h-[60vh] lg:h-full rounded-t-3xl lg:rounded-none overflow-hidden flex flex-col ${selectedStall ? "translate-y-0" : "translate-y-full lg:translate-y-0 lg:block hidden"}`}
      >
        {selectedStall ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                รายละเอียด
              </span>
              <button
                onClick={() => setSelectedStall(null)}
                className="lg:hidden p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              {selectedStall.tenant ? (
                <>
                  <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center mb-4 border-4 border-white shadow-lg text-purple-600">
                      {selectedStall.tenant.avatar ? (
                        <img
                          src={selectedStall.tenant.avatar}
                          alt={selectedStall.tenant?.first_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User size={48} />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 text-center">
                      {selectedStall.tenant?.first_name}{" "}
                      {selectedStall.tenant?.last_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                        ผู้เช่า
                      </span>
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        ล็อก {selectedStall.slot_number}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        ข้อมูลสัญญา
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <FileText
                            size={18}
                            className="text-gray-400 mt-0.5"
                          />
                          <div>
                            <p className="text-sm text-gray-500">ประเภทอาหาร</p>
                            <p className="font-medium text-gray-800">
                              {selectedStall.foodType || "ของคาว"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Calendar
                            size={18}
                            className="text-gray-400 mt-0.5"
                          />
                          <div>
                            <p className="text-sm text-gray-500">
                              ระยะเวลาสัญญา
                            </p>
                            <p className="font-medium text-gray-800">
                              {selectedStall.contractStartDate || "1 ม.ค. 69"} -{" "}
                              {selectedStall.contractEndDate || "31 ธ.ค. 71"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              ({selectedStall.contractDuration || "30"} เดือน)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        ที่อยู่ตามบัตรประชาชน
                      </h4>
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-gray-400 mt-0.5" />
                        <div className="text-sm text-gray-600 leading-relaxed">
                          <p>
                            บ้านเลขที่{" "}
                            {selectedStall.tenant.houseNumber || "111"} หมู่{" "}
                            {selectedStall.tenant.moo || "11"}
                          </p>
                          <p>
                            ต.{selectedStall.tenant.subDistrict || "บ้านใหญ่"}{" "}
                            อ.{selectedStall.tenant.district || "คูเมือง"}
                          </p>
                          <p>
                            จ.{selectedStall.tenant.province || "บุรีรัมย์"}{" "}
                            {selectedStall.tenant.postalCode || "31000"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Store size={32} />
                  </div>
                  <p className="text-lg font-medium text-gray-600">
                    ล็อก {selectedStall.slot_number}
                  </p>
                  <p className="text-sm">ยังไม่มีผู้เช่าในขณะนี้</p>
                  <Link
                    to={`/admin/stalls?edit=${selectedStall.slot_number}`}
                    className="mt-6 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                  >
                    เพิ่มข้อมูลผู้เช่า
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <Store size={40} className="opacity-20" />
            </div>
            <p>เลือกล็อกเพื่อดูรายละเอียด</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
