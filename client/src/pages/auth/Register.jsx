import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { formatPhoneNumber } from "../../utils/formatters";
import { authAPI } from "../../api";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const password = watch("password");

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      await authAPI.register(registerData);
      toast.success("ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ");
      navigate("/login");
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
        <Link
          to="/login"
          className="bg-purple-400 hover:bg-purple-500 text-white px-4 py-2 md:px-8 md:py-3 rounded-full font-semibold text-sm md:text-base shadow-lg shadow-purple-300/30 transition-all hover:-translate-y-0.5"
        >
          Login
        </Link>
      </header>
      <div className="h-2 bg-purple-400"></div>

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-purple-400 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6">
            ลงทะเบียน
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ชื่อ */}
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="ชื่อ-นามสกุล"
              {...register("first_name", { required: "กรุณากรอกชื่อ-นามสกุล" })}
            />
            {errors.first_name && (
              <p className="text-red-200 text-sm -mt-2">
                {errors.first_name.message}
              </p>
            )}

            {/* Username */}
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="ยูสเซอร์เนม"
              {...register("username", { required: "กรุณากรอกยูสเซอร์เนม" })}
            />
            {errors.username && (
              <p className="text-red-200 text-sm -mt-2">
                {errors.username.message}
              </p>
            )}

            {/* Phone */}
            <input
              type="tel"
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="เบอร์โทรศัพท์"
              maxLength={12}
              {...register("phone", {
                required: "กรุณากรอกเบอร์โทรศัพท์",
                pattern: {
                  value: /^0[0-9]{2}-[0-9]{3}-[0-9]{4}$/,
                  message: "เบอร์โทรศัพท์ไม่ถูกต้อง (xxx-xxx-xxxx)",
                },
                onChange: (e) => {
                  setValue("phone", formatPhoneNumber(e.target.value));
                },
              })}
            />
            {errors.phone && (
              <p className="text-red-200 text-sm -mt-2">
                {errors.phone.message}
              </p>
            )}

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500"
                placeholder="รหัสผ่าน"
                {...register("password", {
                  required: "กรุณากรอกรหัสผ่าน",
                  minLength: { value: 6, message: "ขั้นต่ำ 6 ตัวอักษร" },
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

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-500"
                placeholder="ยืนยันรหัสผ่าน"
                {...register("confirmPassword", {
                  required: "ยืนยันรหัสผ่าน",
                  validate: (val) => val === password || "รหัสผ่านไม่ตรงกัน",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-200 text-sm -mt-2">
                {errors.confirmPassword.message}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Link
                to="/login"
                className="flex-1 py-3 px-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg text-center transition-colors"
              >
                ย้อนกลับ
              </Link>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-white hover:bg-gray-100 text-purple-500 font-semibold rounded-lg border-2 border-purple-300 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-white/80 text-sm">
              มีบัญชีแล้ว?{" "}
              <Link
                to="/login"
                className="text-white font-semibold underline hover:text-yellow-200"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
