import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-purple-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-200 via-purple-100 to-purple-200 px-3 py-3 md:px-8 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <img
            src="/bru-logo.png"
            alt="BRU Logo"
            className="w-10 h-10 md:w-14 md:h-14 object-contain"
          />
          <div>
            <h1 className="text-sm md:text-lg font-bold text-gray-800">
              มหาวิทยาลัย
            </h1>
            <h1 className="text-sm md:text-lg font-semibold text-gray-800">
              ราชภัฏบุรีรัมย์
            </h1>
            <p className="text-xs text-gray-600 hidden md:block">
              Buriram Rajabhat University
            </p>
          </div>
        </div>
      </header>
      <div className="h-2 bg-purple-400"></div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-purple-400 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 italic">
            Login
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="username"
              {...register("login", {
                required: "กรุณากรอก username",
              })}
            />
            {errors.login && (
              <p className="text-red-200 text-sm -mt-2">
                {errors.login.message}
              </p>
            )}

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500"
                placeholder="password"
                {...register("password", {
                  required: "กรุณากรอกรหัสผ่าน",
                  minLength: {
                    value: 6,
                    message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-200 text-sm -mt-2">
                {errors.password.message}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Link
                to="/"
                className="flex-1 py-3 px-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg text-center transition-colors"
              >
                ย้อนกลับ
              </Link>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-white hover:bg-gray-100 text-purple-500 font-semibold rounded-lg border-2 border-purple-300 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "login"}
              </button>
            </div>
          </form>

          {/* Register Link */}
          <div className="text-center mt-6">
            <p className="text-white/80 text-sm">
              ยังไม่มีบัญชี?{" "}
              <Link
                to="/register"
                className="text-white font-semibold underline hover:text-yellow-200"
              >
                ลงทะเบียน
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
