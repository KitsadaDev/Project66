import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { authAPI } from "../../api";
import { useAuthStore } from "../../store";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await authAPI.login(data);
      const { user, token } = response.data.data;
      setAuth(user, token);
      toast.success("เข้าสู่ระบบสำเร็จ");

      const dashboardRoutes = {
        ADMIN: "/admin",
        TENANT: "/tenant",
        MAINTENANCE: "/maintenance",
        EXECUTIVE: "/executive",
      };
      navigate(dashboardRoutes[user.role] || "/");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden font-sans">
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] bg-purple-300/40 rounded-full blur-[100px]"></div>
        <div className="absolute top-[20%] -right-[20%] w-[600px] h-[600px] bg-indigo-300/30 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[500px] h-[500px] bg-fuchsia-300/30 rounded-full blur-[100px]"></div>
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
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20 backdrop-blur-sm relative overflow-hidden">
          {/* Inner Card Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

          <div className="relative z-10 text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <User size={32} className="text-white drop-shadow-md" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-purple-100/80 text-sm mt-2">
              เข้าสู่ระบบจัดการศูนย์อาหาร
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
            {/* Username */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={20} className="text-white/50 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all duration-300 backdrop-blur-md"
                  placeholder="Username"
                  {...register("login", {
                    required: "กรุณากรอก username",
                  })}
                />
              </div>
              {errors.login && (
                <p className="text-pink-200 text-xs pl-2 font-medium">
                  {errors.login.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-white/50 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all duration-300 backdrop-blur-md"
                  placeholder="Password"
                  {...register("password", {
                    required: "กรุณากรอกรหัสผ่าน",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-pink-200 text-xs pl-2 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Link
                to="/"
                className="flex-[0.8] py-4 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-center border border-white/20 transition-all duration-300 hover:scale-[1.02] shadow-sm flex items-center justify-center"
              >
                ย้อนกลับ
              </Link>
              <button
                type="submit"
                className="flex-1 py-4 px-4 bg-white text-purple-600 hover:text-purple-700 hover:bg-gray-50 font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
