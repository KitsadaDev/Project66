import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogIn, ArrowRight } from "lucide-react";
import { foodCourtsAPI } from "../api";

const Home = () => {
  const [foodCourts, setFoodCourts] = useState([]);

  useEffect(() => {
    const fetchFoodCourts = async () => {
      try {
        const response = await foodCourtsAPI.getAll();
        setFoodCourts(response.data.data || []);
      } catch (error) {
        console.error("Error fetching food courts:", error);
      }
    };
    fetchFoodCourts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans flex flex-col">
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-purple-300/40 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] -right-[20%] w-[700px] h-[700px] bg-indigo-300/30 rounded-full blur-[150px]"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[600px] h-[600px] bg-fuchsia-300/30 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="bg-white/60 backdrop-blur-xl border-b border-purple-100/50 px-4 py-4 md:px-8 flex justify-between items-center relative z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-2xl shadow-md border border-purple-50">
            <img
              src="/bru-logo.png"
              alt="BRU Logo"
              className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-sm"
            />
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold text-gray-800 leading-tight">
              มหาวิทยาลัยราชภัฏบุรีรัมย์
            </h1>
            <p className="text-xs md:text-sm text-purple-600 font-medium">
              Buriram Rajabhat University
            </p>
          </div>
        </div>

        <Link
          to="/login"
          className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2.5 md:px-8 md:py-3 rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
        >
          <LogIn size={18} className="transition-transform group-hover:-translate-x-1" />
          เข้าสู่ระบบ
        </Link>
      </header>

      {/* Decorative Gradient Line (Replaces the solid stripe) */}
      <div className="h-1.5 md:h-2 bg-gradient-to-r from-purple-400 via-indigo-500 to-fuchsia-500 relative z-10 opacity-90 shadow-sm"></div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-12 md:px-8 md:py-20 max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center">
        
        {/* Title Section */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-700 tracking-tight mb-4 pb-2 leading-relaxed">
            ศูนย์อาหารมหาวิทยาลัยราชภัฏบุรีรัมย์
          </h2>
          <p className="text-gray-600 md:text-lg max-w-2xl mx-auto font-medium">
            ยินดีต้อนรับเข้าสู่ระบบจัดการศูนย์อาหาร เลือกศูนย์อาหารเพื่อดำเนินการเข้าสู่ระบบและจัดการแผงค้าของคุณ
          </p>
        </div>

        {/* Food Court Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full max-w-4xl">
          {foodCourts.length > 0 ? (
            foodCourts.map((fc) => (
              <div 
                key={fc.food_court_id} 
                className="group bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl border border-white/60 transition-all duration-500 hover:-translate-y-2 flex flex-col"
              >
                <div className="h-56 md:h-64 bg-purple-100 flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 to-transparent z-10 mix-blend-multiply opacity-50 group-hover:opacity-30 transition-opacity duration-500"></div>
                  <img
                    src={fc.image_url || `/Food-court-${fc.food_court_id}.png`}
                    alt={fc.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    onError={(e) => { e.target.src = '/bru-logo.png'; }}
                  />
                </div>
                
                <div className="p-8 text-center flex-1 flex flex-col justify-center items-center relative bg-gradient-to-b from-transparent to-purple-50/50">
                  <h3 className="font-extrabold text-gray-800 text-2xl md:text-3xl mb-6 drop-shadow-sm">
                    {fc.name}
                  </h3>
                  <Link
                    to="/login"
                    className="group/btn flex items-center gap-2 bg-white text-purple-600 px-8 py-3.5 rounded-2xl font-bold border-2 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-300 shadow-md hover:shadow-lg w-full max-w-[200px] justify-center"
                  >
                    เข้าสู่ระบบ
                    <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-[2rem] border border-white shadow-sm">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4 shadow-sm"></div>
              <p className="text-gray-600 font-semibold text-lg">กำลังโหลดข้อมูลศูนย์อาหาร...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
