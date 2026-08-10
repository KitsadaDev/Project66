import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Store, X } from "lucide-react";
import { stallsAPI } from "../../api";

const StallStatus = () => {
  const [searchParams] = useSearchParams();
  const foodCourt = searchParams.get("foodCourt") || "1";
  const [stalls, setStalls] = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStalls(); }, [foodCourt]);

  const fetchStalls = async () => {
    try {
      const res = await stallsAPI.getAll();
      let data = res.data.data || [];
      const fcId = parseInt(foodCourt);
      data = data.filter((s) => s.food_court_id === fcId);
      setStalls(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const getStatus = (id) => {
    const fcId = parseInt(foodCourt);
    const s = stalls.find((s) => s.slot_number === id && s.food_court_id === fcId);
    if (!s) return "empty";
    return s.status.toLowerCase();
  };

  const handleClick = (id) => {
    const fcId = parseInt(foodCourt);
    const s = stalls.find((s) => s.slot_number === id && s.food_court_id === fcId);
    setSelectedStall(s ?? { slot_number: id, status: "EMPTY" });
  };

  // ── Stall cell ──
  const Cell = ({ id, w = 44, h = 44 }) => {
    const status = getStatus(id);
    const sel = selectedStall?.slot_number === id;
    const color =
      status === "occupied"    ? "bg-red-100 border-red-300 text-red-700" :
      status === "vacant"      ? "bg-green-100 border-green-300 text-green-700" :
      status === "maintenance" ? "bg-yellow-100 border-yellow-300 text-yellow-700" :
                                 "bg-gray-50 border-dashed border-gray-300 text-gray-400";
    return (
      <div
        onClick={() => handleClick(id)}
        className={`flex items-center justify-center font-bold text-xs border-2 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-md flex-shrink-0 ${color} ${sel ? "ring-4 ring-purple-300 scale-110 shadow-xl" : ""}`}
        style={{ width: w, height: h }}
      >
        {id}
      </div>
    );
  };

  // ── Horizontal row of cells ──
  const Row = ({ ids, cellW = 44, cellH = 44, gap = 5 }) => (
    <div style={{ display: "flex", gap }}>
      {ids.map((id) => <Cell key={id} id={id} w={cellW} h={cellH} />)}
    </div>
  );


  // ─────────────────────────────────
  // FC1 layout — pixel-perfect map
  // Container: 920 × 640  (ml-10 for left door labels)
  // Cell: 44×44, gap: 5
  // ─────────────────────────────────
  const W = 920, H_ROOM = 660;
  const WALL = "3px solid #4B5563";

  const FC1Map = () => (
    <div className="min-w-[920px] w-[920px] mx-auto">

      {/* ═══ ROOM (bordered) ═══ */}
      <div style={{ position: "relative", width: W, height: H_ROOM }}>

        {/* ── Room walls ── */}
        <div style={{ position:"absolute", left:0, top:0, bottom:0, borderLeft: WALL }} />
        {/* Bottom wall */}
        <div style={{ position:"absolute", left:0, right:0, bottom:0, borderBottom: WALL }} />
        {/* Top wall (stops at x=810) */}
        <div style={{ position:"absolute", top:0, left:0, width:810, borderTop: WALL }} />
        {/* Notch vertical (drops down at x=810) */}
        <div style={{ position:"absolute", left:810, top:0, height:100, borderLeft: WALL }} />
        {/* Notch bottom horizontal (x=810 to right) */}
        <div style={{ position:"absolute", top:100, left:810, right:0, borderTop: WALL }} />
        {/* Right wall */}
        <div style={{ position:"absolute", right:0, top:100, bottom:0, borderRight: WALL }} />


        {/* ── B row ── */}
        <div style={{ position:"absolute", top:10, left:330, display:"flex", gap:5 }}>
          {["B1","B2","B3","B4","B5","B6","B7","B8"].map((id) => <Cell key={id} id={id} />)}
        </div>

        {/* ── C row ── */}
        <div style={{ position:"absolute", top:115, left:134, display:"flex", gap:5 }}>
          {["C1","C2","C3","C4","C5","C6"].map((id) => <Cell key={id} id={id} />)}
        </div>

        {/* ── Dining zone ── */}
        <div
          className="absolute flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 text-gray-500 text-sm font-medium"
          style={{ top:175, left:100, width:640, height:315 }}
        >
          โซนโต๊ะนั่งทานอาหาร
        </div>

        {/* ── A column (right wall, A1-A11) ── */}
        <div style={{ position:"absolute", top:110, right:10, display:"flex", flexDirection:"column", gap:5 }}>
          {["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11"].map((id) => <Cell key={id} id={id} />)}
        </div>

        {/* ── D row ── */}
        <div style={{ position:"absolute", top:606, left:294, display:"flex", gap:5 }}>
          {["D1","D2","D3","D4","D5","D6"].map((id) => <Cell key={id} id={id} />)}
        </div>


      </div>

      {/* ═══ E row — OUTSIDE the room (below bottom wall) ═══ */}
      <div style={{ marginTop: 10, display:"flex", gap:5 }}>
        {["E1","E2","E3","E4","E5","E6","E7","E8","E9","E10","E11","E12"].map((id) => <Cell key={id} id={id} />)}
      </div>
    </div>
  );

  /* ── Selector page ── */

  if (!foodCourt) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">เลือกศูนย์อาหาร</h1>
          <p className="text-gray-500">เลือกศูนย์อาหารเพื่อดูสถานะการเช่าล็อค</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Link to="/tenant/stall-status?foodCourt=1"
            className="group block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white">
            <div className="h-48 bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center p-8">
              <div className="bg-white/80 p-4 rounded-2xl shadow-lg border border-purple-100">
                <Store size={48} className="text-purple-500" />
              </div>
            </div>
            <div className="p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">ศูนย์อาหาร 1</h3>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
          <Link to="/tenant/stall-status?foodCourt=2"
            className="group block rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white">
            <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center p-8">
              <div className="bg-white/80 p-4 rounded-2xl shadow-lg border border-blue-100">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-blue-600">BRU</span>
                  <span className="text-xs text-blue-400 uppercase tracking-wider">Food Center</span>
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">ศูนย์อาหาร 2</h3>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* ── Map page ── */
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile header */}
      <div className="lg:hidden p-4 bg-white shadow-sm flex items-center gap-4">
        <Link to="/tenant/stall-status" className="p-2 -ml-2 text-gray-500"><ArrowLeft size={24} /></Link>
        <div>
          <h1 className="font-bold text-gray-800">ศูนย์อาหาร {foodCourt}</h1>
          <p className="text-xs text-gray-500">สถานะล็อค</p>
        </div>
      </div>

      {/* Desktop back */}
      <div className="hidden lg:block pt-6 pl-6">
        <Link to="/tenant/stall-status"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-gray-600 hover:text-purple-600 transition-colors">
          <ArrowLeft size={18} /> กลับไปหน้าเลือกศูนย์
        </Link>
      </div>

      {/* Map card */}
      <div className="p-2 sm:p-4 lg:p-8">
        <div className="bg-white p-3 sm:p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] shadow-xl w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 hidden lg:block text-center">
            ผังศูนย์อาหาร {foodCourt}
          </h2>

          {/* Mobile scroll hint */}
          <div className="lg:hidden text-center text-xs text-purple-600 font-semibold mb-3 flex items-center justify-center gap-1.5 bg-purple-50/80 py-2 px-3 rounded-xl border border-purple-100 shadow-sm">
            <span>👈</span> เลื่อน ซ้าย-ขวา เพื่อดูผังทั้งหมด <span>👉</span>
          </div>

          <div className="w-full overflow-x-auto pb-4 pt-1">
            {foodCourt === "1" ? (
              <FC1Map />
            ) : (
              /* FC2 */
              <div className="flex flex-col gap-6 min-w-[500px] mx-auto">
                <div className="flex gap-3">
                  {["B1","B2","B3","B4","B5","B6"].map((id) => <Cell key={id} id={id} />)}
                  <div className="w-8" /><Cell id="D1" />
                </div>
                <div className="flex gap-3 justify-end pr-0">
                  <div className="flex-1" /><Cell id="D2" />
                </div>
                <div className="flex gap-3">
                  {["A1","A2","A3","A4","A5","A6"].map((id) => <Cell key={id} id={id} />)}
                  <div className="w-8" /><Cell id="D3" />
                </div>
                <div className="h-2" />
                <div className="flex gap-3">
                  {["C1","C2","C3","C4","C5","C6"].map((id) => <Cell key={id} id={id} />)}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 sm:gap-6 border-t border-gray-100 pt-4 sm:pt-6">
            {[["border-green-300 bg-green-100","ว่าง (พร้อมเช่า)"],["border-red-300 bg-red-100","มีผู้เช่าแล้ว"],["border-yellow-300 bg-yellow-100","ปิดปรับปรุง"],["border-dashed border-gray-300 bg-gray-50","ยังไม่เปิดบริการ"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border ${c}`} />
                <span className="text-xs sm:text-sm text-gray-600">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedStall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
             onClick={() => setSelectedStall(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative"
               onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedStall(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors">
              <X size={16} />
            </button>
            <div className="flex flex-col items-center mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 text-3xl font-bold shadow-lg
                ${selectedStall.status==="OCCUPIED"?"bg-red-100 text-red-600":selectedStall.status==="MAINTENANCE"?"bg-yellow-100 text-yellow-600":selectedStall.status==="VACANT"?"bg-green-100 text-green-600":"bg-gray-100 text-gray-400"}`}>
                {selectedStall.slot_number}
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {selectedStall.status==="OCCUPIED"?"มีผู้เช่าแล้ว":selectedStall.status==="MAINTENANCE"?"ปิดปรับปรุง":selectedStall.status==="VACANT"?"ว่าง":"ยังไม่เปิดบริการ"}
              </h3>
              <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold
                ${selectedStall.status==="OCCUPIED"?"bg-red-100 text-red-700":selectedStall.status==="MAINTENANCE"?"bg-yellow-100 text-yellow-700":selectedStall.status==="VACANT"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>
                {selectedStall.status==="OCCUPIED"?"สถานะปกติ":selectedStall.status==="MAINTENANCE"?"ปิดชั่วคราว":selectedStall.status==="VACANT"?"พร้อมเช่า":"ยังไม่เปิด"}
              </span>
            </div>
            {selectedStall.status==="OCCUPIED"?(
              <div className="text-center p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-gray-600 font-medium">ล็อกนี้มีผู้เช่าแล้ว</p>
                <p className="text-sm text-gray-400 mt-1">ไม่สามารถจองล็อกนี้ได้ในขณะนี้</p>
              </div>
            ):selectedStall.status==="MAINTENANCE"?(
              <div className="text-center p-5 bg-yellow-50 rounded-2xl border border-yellow-100">
                <p className="text-yellow-700 font-medium">ล็อกนี้ปิดปรับปรุงชั่วคราว</p>
                <p className="text-sm text-yellow-500 mt-1">กรุณาติดต่อเจ้าหน้าที่สำหรับข้อมูลเพิ่มเติม</p>
              </div>
            ):selectedStall.status==="VACANT"?(
              <div className="text-center p-5 border-2 border-dashed border-green-200 rounded-2xl bg-green-50/50">
                <p className="text-green-700 font-medium">ล็อกนี้ยังว่างอยู่</p>
                <p className="text-sm text-green-500 mt-1">ติดต่อเจ้าหน้าที่เพื่อขอเช่าพื้นที่นี้ได้เลย</p>
              </div>
            ):(
              <div className="text-center p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">ยังไม่เปิดให้บริการ</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StallStatus;
