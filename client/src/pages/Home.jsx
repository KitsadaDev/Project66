import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-purple-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-300 via-purple-200 to-purple-300 px-4 py-4 md:px-8 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3 md:gap-4">
          <img
            src="/bru-logo.png"
            alt="BRU Logo"
            className="w-12 h-12 md:w-16 md:h-16 object-contain"
          />
          <div>
            <h1 className="text-base md:text-xl font-bold text-gray-800">
              มหาวิทยาลัย
            </h1>
            <h1 className="text-base md:text-xl font-semibold text-gray-800">
              ราชภัฏบุรีรัมย์
            </h1>
            <p className="text-xs text-gray-600 hidden md:block">
              Buriram Rajabhat University
            </p>
          </div>
        </div>

        <Link
          to="/login"
          className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2.5 md:px-8 md:py-3 rounded-full font-semibold text-sm md:text-base shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          Login
        </Link>
      </header>

      {/* Purple Stripe */}
      <div className="h-10 md:h-12 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 shadow-md"></div>

      {/* Food Court Cards */}
      <section className="px-4 py-10 md:px-8 md:py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {foodCourts.length > 0 ? (
            foodCourts.map((fc) => (
              <div key={fc.food_court_id} className="bg-white rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2 border border-purple-100 flex flex-col">
                <div className="h-48 md:h-56 bg-gradient-to-b from-purple-200 to-purple-400 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  <img
                    src={fc.image_url || `/Food-court-${fc.food_court_id}.png`}
                    alt={fc.name}
                    className="w-full h-full object-cover absolute inset-0"
                    onError={(e) => { e.target.src = '/bru-logo.png'; }}
                  />
                </div>
                <div className="p-5 md:p-6 text-center bg-gradient-to-b from-purple-50 to-purple-100 flex-1 flex flex-col justify-center">
                  <div>
                    <Link
                      to="/login"
                      className="inline-block bg-white text-purple-600 px-8 py-2.5 rounded-xl font-bold border-2 border-purple-400 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-all duration-300 mb-4 shadow-md hover:shadow-lg"
                    >
                      คลิก
                    </Link>
                  </div>
                  <p className="font-bold text-gray-800 text-lg md:text-xl">
                    {fc.name}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 text-center py-10 text-gray-500 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              กำลังโหลดข้อมูลศูนย์อาหาร...
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
