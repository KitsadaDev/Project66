import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Key,
  Camera,
  Wrench,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "react-toastify";
import { usersAPI } from "../../api";
import { formatPhoneNumber } from "../../utils/formatters";

const Mechanics = () => {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState(null);

  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    title: "นาย",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    role: "MAINTENANCE"
  });

  const [editForm, setEditForm] = useState({});
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: "" });
  const [showPassword, setShowPassword] = useState(false);

  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getAll({ role: "MAINTENANCE" });
      setMechanics(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดข้อมูลช่างซ่อมบำรุงได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileImageChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 2MB");
        return;
      }
      if (isEdit) {
        setEditForm({ ...editForm, profileFile: file });
        setProfilePreview(URL.createObjectURL(file));
      } else {
        setProfileFile(file);
        setProfilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(addForm).forEach((key) => {
        if (addForm[key]) {
          formData.append(key, addForm[key]);
        }
      });
      
      if (profileFile) {
        formData.append("profileImage", profileFile);
      }

      await usersAPI.create(formData);
      toast.success("เพิ่มข้อมูลช่างซ่อมบำรุงสำเร็จ");
      setIsAddModalOpen(false);
      setAddForm({
      username: "",
      password: "",
      title: "นาย",
      first_name: "",
        last_name: "",
        phone: "",
        email: "",
        role: "MAINTENANCE"
      });
      setProfileFile(null);
      setProfilePreview(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "ไม่สามารถเพิ่มข้อมูลได้");
    }
  };

  const handleEditClick = (mechanic) => {
    setSelectedMechanic(mechanic);
    setEditForm({
      title: mechanic.title || "นาย",
      first_name: mechanic.first_name || "",
      last_name: mechanic.last_name || "",
      phone: mechanic.phone || "",
      email: mechanic.email || "",
      username: mechanic.username || ""
    });
    setProfilePreview(mechanic.profile_image_url || null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(editForm).forEach(key => {
        if (key !== "profileFile" && editForm[key] !== null && editForm[key] !== undefined) {
          formData.append(key, editForm[key]);
        }
      });

      if (editForm.profileFile) {
        formData.append("profileImage", editForm.profileFile);
      }

      await usersAPI.updateWithPhoto(selectedMechanic.user_id, formData);
      toast.success("อัปเดตข้อมูลสำเร็จ");
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถอัปเดตข้อมูลได้");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลช่างซ่อมบำรุงรายนี้?")) {
      try {
        await usersAPI.delete(id);
        toast.success("ลบข้อมูลสำเร็จ");
        fetchData();
      } catch (error) {
        console.error(error);
        toast.error("ไม่สามารถลบข้อมูลได้");
      }
    }
  };

  const handleResetPasswordClick = (mechanic) => {
    setSelectedMechanic(mechanic);
    setResetPasswordForm({ newPassword: "" });
    setShowPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.resetPassword(selectedMechanic.user_id, resetPasswordForm);
      toast.success("รีเซ็ตรหัสผ่านสำเร็จ");
      setIsResetPasswordModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "ไม่สามารถรีเซ็ตรหัสผ่านได้");
    }
  };

  const handleQuickPhotoUpload = async (user_id, file) => {
    if (!file) return;
    setUploadingPhotoId(user_id);
    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      await usersAPI.updateWithPhoto(user_id, formData);
      toast.success("อัปโหลดรูปโปรไฟล์สำเร็จ");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถอัปโหลดรูปได้");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const filteredMechanics = mechanics.filter(
    (mechanic) =>
      mechanic.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      mechanic.email?.toLowerCase().includes(search.toLowerCase()) ||
      mechanic.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">จัดการข้อมูลช่างซ่อมบำรุง</h1>
          <p className="text-gray-500 text-sm mt-1">เพิ่มและจัดการบัญชีผู้ใช้งานช่างซ่อมบำรุงในระบบ</p>
        </div>
        <button
          onClick={() => {
            setProfilePreview(null);
            setProfileFile(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
        >
          <Plus size={20} />
          เพิ่มช่างซ่อมบำรุง
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, หรือ Username..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="py-4 px-6 text-left font-medium">ชื่อช่าง</th>
                <th className="py-4 px-6 text-left font-medium">เบอร์โทรศัพท์</th>
                <th className="py-4 px-6 text-left font-medium">อีเมล</th>
                <th className="py-4 px-6 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMechanics.map((mechanic) => (
                <tr key={mechanic.user_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {mechanic.profile_image_url ? (
                        <img
                          src={mechanic.profile_image_url}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover border border-purple-100 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                          {(mechanic.first_name || mechanic.username || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800">
                          {mechanic.title || ""}{mechanic.first_name} {mechanic.last_name || ""}
                        </p>
                        <p className="text-gray-500 text-xs">@{mechanic.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <span className="font-medium text-gray-800">{mechanic.phone ? formatPhoneNumber(mechanic.phone) : "-"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1 text-gray-500 text-sm truncate max-w-[200px]">
                      <span className="font-medium text-gray-800">{mechanic.email || "-"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <label
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer select-none"
                        title="อัปโหลดรูปโปรไฟล์"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPhotoId === mechanic.user_id}
                          onChange={(e) => handleQuickPhotoUpload(mechanic.user_id, e.target.files[0])}
                        />
                        {uploadingPhotoId === mechanic.user_id && (
                          <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        อัพรูปโปรไฟล์
                      </label>
                      <button
                        onClick={() => handleEditClick(mechanic)}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(mechanic.user_id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบข้อมูล"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMechanics.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    ไม่พบข้อมูลช่างซ่อมบำรุง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Mechanic Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-gray-800">เพิ่มข้อมูลช่างซ่อมบำรุง</h2>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-6">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden">
                    {profilePreview ? (
                      <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
                        <Camera size={24} />
                        <span className="text-[10px]">อัปโหลดรูป</span>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera size={24} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfileImageChange(e, false)} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={addForm.title}
                      onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อจริง *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={addForm.first_name}
                      onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={addForm.last_name}
                      onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    value={addForm.phone}
                    maxLength={10}
                    onChange={(e) => {
                      const unformatted = e.target.value.replace(/\D/g, "");
                      setAddForm({ ...addForm, phone: unformatted });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 transition-all text-sm font-medium cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Mechanic Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-gray-800">แก้ไขข้อมูลช่างซ่อมบำรุง</h2>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden">
                    {profilePreview ? (
                      <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
                        <Camera size={24} />
                        <span className="text-[10px]">เปลี่ยนรูป</span>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera size={24} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfileImageChange(e, true)} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    value={editForm.username}
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อจริง *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    value={editForm.phone}
                    maxLength={10}
                    onChange={(e) => {
                      const unformatted = e.target.value.replace(/\D/g, "");
                      setEditForm({ ...editForm, phone: unformatted });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 transition-all text-sm font-medium cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">รีเซ็ตรหัสผ่าน</h2>
              <p className="text-gray-500 text-sm mt-1">
                สำหรับผู้ใช้: <span className="font-medium text-purple-600">{selectedMechanic?.username}</span>
              </p>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่ *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl"
                    value={resetPasswordForm.newPassword}
                    onChange={(e) => setResetPasswordForm({ newPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl shadow-lg shadow-yellow-200 transition-all text-sm font-medium cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mechanics;
