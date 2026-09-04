import { useEffect, useState } from "react";
import {
  Search,
  Edit,
  Save,
  X,
  User,
  Phone,
  Mail,
  Plus,
  Trash2,
  FileText,
  Upload,
  Camera,
} from "lucide-react";
import { formatPhoneNumber } from "../../utils/formatters";
import { toast } from "react-toastify";
import { stallsAPI, authAPI, usersAPI, contractsAPI } from "../../api";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [allStalls, setAllStalls] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address_line: "",
    province: "",
    district: "",
    subdistrict: "",
    postal_code: "",
    menuType: "",
    username: "",
    password: "",
    stallId: "",
  });
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Edit-mode profile image state
  const [editProfileFile, setEditProfileFile] = useState(null);
  const [editProfilePreview, setEditProfilePreview] = useState(null);

  // Quick photo upload state
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);

  // Contract Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    id: null,
    stallId: "",
    tenantId: "",
    contractNumber: "",
    startDate: "",
    endDate: "",
    idCard: "",
    phone: "", // Contact number in contract
    address: "",
    receiptNumber: "",
    receiptDate: "",
    contractFee: "", // mapped to securityDeposit or general fee? User said "ค่าประกันสัญญา" -> securityDeposit
    securityDeposit: "",
    lateRentFine: "",
    lateUtilityFine: "",
    menuType: "",
    contractImage: "",
  });
  const [contractFile, setContractFile] = useState(null);
  const [contractFilePreview, setContractFilePreview] = useState(null);
  const [selectedTenantName, setSelectedTenantName] = useState("");

  // Thai Address Cascading Dropdown States
  const [addressObj, setAddressObj] = useState({
    houseNoMoo: "",
    province: "",
    district: "",
    subDistrict: "",
    zipCode: "",
  });

  // Address Cascading Dropdown States
  const [addressData, setAddressData] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);

  // Contract Address Cascading Dropdown States
  const [contractDistricts, setContractDistricts] = useState([]);
  const [contractSubdistricts, setContractSubdistricts] = useState([]);

  // Load address database dynamically when Add Modal or Contract Modal is open
  useEffect(() => {
    if ((isAddModalOpen || isContractModalOpen) && addressData.length === 0) {
      fetch("/thailand-address.json")
        .then((res) => res.json())
        .then((data) => {
          setAddressData(data);
          const sorted = [...data].sort((a, b) => a.name_th.localeCompare(b.name_th));
          setProvinces(sorted);
        })
        .catch((err) => console.error("Error loading address data:", err));
    }
  }, [isAddModalOpen, isContractModalOpen, addressData]);

  // Synchronize Contract Dropdowns when existing contract address is loaded
  useEffect(() => {
    if (isContractModalOpen && addressData.length > 0) {
      if (addressObj.province) {
        const provinceObj = addressData.find((p) => p.name_th === addressObj.province);
        if (provinceObj) {
          const sortedDistricts = [...provinceObj.amphure].sort((a, b) =>
            a.name_th.localeCompare(b.name_th)
          );
          setContractDistricts(sortedDistricts);

          if (addressObj.district) {
            const districtObj = sortedDistricts.find((d) => d.name_th === addressObj.district);
            if (districtObj) {
              const sortedSubdistricts = [...districtObj.tambon].sort((a, b) =>
                a.name_th.localeCompare(b.name_th)
              );
              setContractSubdistricts(sortedSubdistricts);
            }
          }
        }
      }
    }
  }, [isContractModalOpen, addressData, addressObj.province, addressObj.district]);

  const handleContractProvinceChange = (provinceName) => {
    if (!provinceName) {
      setAddressObj((prev) => ({
        ...prev,
        province: "",
        district: "",
        subDistrict: "",
        zipCode: "",
      }));
      setContractDistricts([]);
      setContractSubdistricts([]);
      return;
    }

    const provinceObj = addressData.find((p) => p.name_th === provinceName);
    const sortedDistricts = provinceObj
      ? [...provinceObj.amphure].sort((a, b) => a.name_th.localeCompare(b.name_th))
      : [];

    setAddressObj((prev) => ({
      ...prev,
      province: provinceName,
      district: "",
      subDistrict: "",
      zipCode: "",
    }));
    setContractDistricts(sortedDistricts);
    setContractSubdistricts([]);
  };

  const handleContractDistrictChange = (districtName) => {
    if (!districtName) {
      setAddressObj((prev) => ({
        ...prev,
        district: "",
        subDistrict: "",
        zipCode: "",
      }));
      setContractSubdistricts([]);
      return;
    }

    const districtObj = contractDistricts.find((d) => d.name_th === districtName);
    const sortedSubdistricts = districtObj
      ? [...districtObj.tambon].sort((a, b) => a.name_th.localeCompare(b.name_th))
      : [];

    setAddressObj((prev) => ({
      ...prev,
      district: districtName,
      subDistrict: "",
      zipCode: "",
    }));
    setContractSubdistricts(sortedSubdistricts);
  };

  const handleContractSubdistrictChange = (subdistrictName) => {
    if (!subdistrictName) {
      setAddressObj((prev) => ({
        ...prev,
        subDistrict: "",
        zipCode: "",
      }));
      return;
    }

    const subdistrictObj = contractSubdistricts.find((s) => s.name_th === subdistrictName);
    const zipCode = subdistrictObj ? String(subdistrictObj.zip_code) : "";

    setAddressObj((prev) => ({
      ...prev,
      subDistrict: subdistrictName,
      zipCode: zipCode,
    }));
  };

  const handleProvinceChange = (provinceName) => {
    if (!provinceName) {
      setAddForm((prev) => ({
        ...prev,
        province: "",
        district: "",
        subdistrict: "",
        postal_code: "",
      }));
      setDistricts([]);
      setSubdistricts([]);
      return;
    }

    const provinceObj = addressData.find((p) => p.name_th === provinceName);
    const sortedDistricts = provinceObj
      ? [...provinceObj.amphure].sort((a, b) => a.name_th.localeCompare(b.name_th))
      : [];

    setAddForm((prev) => ({
      ...prev,
      province: provinceName,
      district: "",
      subdistrict: "",
      postal_code: "",
    }));
    setDistricts(sortedDistricts);
    setSubdistricts([]);
  };

  const handleDistrictChange = (districtName) => {
    if (!districtName) {
      setAddForm((prev) => ({
        ...prev,
        district: "",
        subdistrict: "",
        postal_code: "",
      }));
      setSubdistricts([]);
      return;
    }

    const districtObj = districts.find((d) => d.name_th === districtName);
    const sortedSubdistricts = districtObj
      ? [...districtObj.tambon].sort((a, b) => a.name_th.localeCompare(b.name_th))
      : [];

    setAddForm((prev) => ({
      ...prev,
      district: districtName,
      subdistrict: "",
      postal_code: "",
    }));
    setSubdistricts(sortedSubdistricts);
  };

  const handleSubdistrictChange = (subdistrictName) => {
    if (!subdistrictName) {
      setAddForm((prev) => ({
        ...prev,
        subdistrict: "",
        postal_code: "",
      }));
      return;
    }

    const subdistrictObj = subdistricts.find((s) => s.name_th === subdistrictName);
    const zipCode = subdistrictObj ? String(subdistrictObj.zip_code) : "";

    setAddForm((prev) => ({
      ...prev,
      subdistrict: subdistrictName,
      postal_code: zipCode,
    }));
  };

  const openAddModal = () => {
    const randomPassword = Math.random().toString(36).substring(2, 8);
    setAddForm((prev) => ({
      ...prev,
      password: randomPassword,
    }));
    setIsAddModalOpen(true);
  };



  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTenants(), fetchStalls(), fetchContracts()]);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    const response = await usersAPI.getAll({ role: "TENANT" });
    setTenants(response.data.data || []);
  };

  const fetchStalls = async () => {
    const response = await stallsAPI.getAll();
    setAllStalls(response.data.data || []);
  };

  const fetchContracts = async () => {
    try {
      const response = await contractsAPI.getAll({ status: "ACTIVE" });
      setContracts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const handleEdit = (tenant) => {
    setEditingId(tenant.user_id);
    setEditForm({
      first_name: tenant.first_name || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      slot_id: tenant.stall?.slot_id || "",
      originalSlotId: tenant.stall?.slot_id || "",
    });
    setEditProfileFile(null);
    setEditProfilePreview(tenant.profile_image_url || null);
  };

  const handleSave = async (user_id) => {
    try {
      const { slot_id, originalSlotId, ...userData } = editForm;

      if (slot_id !== originalSlotId) {
        if (originalSlotId) {
          await stallsAPI.update(originalSlotId, {
            tenant_id: null,
            status: "VACANT",
          });
        }
        if (slot_id) {
          await stallsAPI.update(slot_id, {
            tenant_id: user_id,
            status: "OCCUPIED",
          });
        }
      }

      if (editProfileFile) {
        // Send as multipart/form-data to upload profile image
        const formData = new FormData();
        Object.entries(userData).forEach(([k, v]) => formData.append(k, v ?? ""));
        formData.append("profileImage", editProfileFile);
        await usersAPI.updateWithPhoto(user_id, formData);
      } else {
        await usersAPI.update(user_id, userData);
      }

      toast.success("บันทึกข้อมูลสำเร็จ");
      setEditingId(null);
      setEditProfileFile(null);
      setEditProfilePreview(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("คุณต้องการลบข้อมูลผู้เช่านี้ใช่หรือไม่?")) {
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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", addForm.title || "");
      formData.append("first_name", addForm.first_name);
      formData.append("last_name", addForm.last_name || "");
      formData.append("phone", addForm.phone || "");
      formData.append("email", addForm.email || "");
      formData.append("username", addForm.username.trim());
      formData.append("password", addForm.password);
      formData.append("address_line", addForm.address_line || "");
      formData.append("subdistrict", addForm.subdistrict || "");
      formData.append("district", addForm.district || "");
      formData.append("province", addForm.province || "");
      formData.append("postal_code", addForm.postal_code || "");
      formData.append("role", "TENANT");

      if (profileFile) {
        formData.append("profileImage", profileFile);
      }

      // 1. Register User
      const registerResponse = await authAPI.register(formData);
      const userId = registerResponse.data.data.user.user_id;

      // 2. Assign to Stall (if selected)
      if (addForm.stallId) {
        await stallsAPI.update(addForm.stallId, {
          tenant_id: userId,
          status: "OCCUPIED",
          menuType: addForm.menuType || null,
        });
      }

      toast.success("เพิ่มผู้เช่าสำเร็จ");
      setIsAddModalOpen(false);
      setAddForm({
        title: "",
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        address_line: "",
        province: "",
        district: "",
        subdistrict: "",
        postal_code: "",
        menuType: "",
        username: "",
        password: "",
        stallId: "",
      });
      setProfileFile(null);
      setProfilePreview(null);
      setDistricts([]);
      setSubdistricts([]);
      fetchData(); // Refresh both lists
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "ไม่สามารถเพิ่มผู้เช่าได้");
    }
  };

  // --- Contract Management ---
  const handleManageContract = (tenant) => {
    if (!tenant.stall) {
      toast.warn(
        "ผู้เช่ารายนี้ยังไม่มีแผงค้าเช่า กรุณากำหนดแผงค้าก่อนจัดการสัญญา",
      );
      return;
    }

    setSelectedTenantName(tenant.first_name);
    const existingContract = contracts.find(
      (c) => c.tenant_id === tenant.user_id && c.status === "ACTIVE",
    );

    if (existingContract) {
      setContractForm({
        id: existingContract.contract_id,
        stallId: existingContract.slot_id,
        tenantId: tenant.user_id,
        contractNumber: existingContract.contract_number || "",
        startDate: existingContract.start_date
          ? existingContract.start_date.split("T")[0]
          : "",
        endDate: existingContract.end_date
          ? existingContract.end_date.split("T")[0]
          : "",
        idCard: existingContract.idCard || "",
        phone: existingContract.phone || tenant.phone || "",
        address: existingContract.address || "",
        receiptNumber: existingContract.receiptNumber || "",
        receiptDate: existingContract.receiptDate
          ? existingContract.receiptDate.split("T")[0]
          : "",
        securityDeposit: existingContract.deposit_amount || "",
        menuType: existingContract.menuType || "",
        contractImage: existingContract.contractImage || "",
      });
      setContractFile(null);
      setContractFilePreview(existingContract.contractImage || null);

      // Simple parse attempt for existing address, or fallback to houseNoMoo
      const addrGroups = (existingContract.address || "").match(
        /บ้านเลขที่\s(.*?),\sตำบล(.*?),\sอำเภอ(.*?),\sจังหวัด(.*?)\s(\d{5})/,
      );
      if (addrGroups) {
        setAddressObj({
          houseNoMoo: addrGroups[1] || "",
          subDistrict: addrGroups[2] || "",
          district: addrGroups[3] || "",
          province: addrGroups[4] || "",
          zipCode: addrGroups[5] || "",
        });
      } else {
        setAddressObj({
          houseNoMoo: existingContract.address || tenant.address_line || "",
          province: tenant.province || "",
          district: tenant.district || "",
          subDistrict: tenant.subdistrict || "",
          zipCode: tenant.postal_code || "",
        });
      }
    } else {
      // New Contract Defaults
      const today = new Date();
      const next3Years = new Date();
      next3Years.setFullYear(today.getFullYear() + 3);

      setContractForm({
        id: null,
        stallId: tenant.stall.slot_id,
        tenantId: tenant.user_id,
        contractNumber: "",
        startDate: today.toISOString().split("T")[0],
        endDate: next3Years.toISOString().split("T")[0],
        idCard: "",
        phone: tenant.phone || "",
        address: "",
        receiptNumber: "",
        receiptDate: "",
        securityDeposit: tenant.stall.rent ? tenant.stall.rent * 3 : "",
        menuType: "",
        contractImage: "",
      });
      setContractFile(null);
      setContractFilePreview(null);
      setAddressObj({
        houseNoMoo: tenant.address_line || "",
        province: tenant.province || "",
        district: tenant.district || "",
        subDistrict: tenant.subdistrict || "",
        zipCode: tenant.postal_code || "",
      });
    }
    setIsContractModalOpen(true);
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate Max 3 Years
      const start = new Date(contractForm.startDate);
      const end = new Date(contractForm.endDate);
      const maxEnd = new Date(start);
      maxEnd.setFullYear(maxEnd.getFullYear() + 3);
      if (end > maxEnd) {
        toast.warning("ระยะเวลาสัญญาเช่าสูงสุดคือ 3 ปี");
        return;
      }

      // Combine address before submit
      const combinedAddress = `บ้านเลขที่ ${addressObj.houseNoMoo}, ตำบล${addressObj.subDistrict}, อำเภอ${addressObj.district}, จังหวัด${addressObj.province} ${addressObj.zipCode}`;
      const finalForm = { ...contractForm, address: combinedAddress };

      const formData = new FormData();
      Object.keys(finalForm).forEach((key) => {
        if (key === "securityDeposit") {
          // Backend expects deposit_amount, not securityDeposit
          if (finalForm[key] !== null && finalForm[key] !== undefined) {
            formData.append("deposit_amount", finalForm[key]);
          }
        } else if (finalForm[key] !== null && finalForm[key] !== undefined) {
          formData.append(key, finalForm[key]);
        }
      });
      if (contractFile) {
        formData.append("contractFile", contractFile);
      }

      if (contractForm.id) {
        await contractsAPI.update(contractForm.id, formData);
        toast.success("อัปเดตสัญญาสำเร็จ");
      } else {
        await contractsAPI.create(formData);
        toast.success("สร้างสัญญาสำเร็จ");
      }
      setIsContractModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถบันทึกสัญญาได้");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setEditProfileFile(null);
    setEditProfilePreview(null);
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(search.toLowerCase()) ||
      tenant.stall?.slot_number?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getMaxEndDate = () => {
    if (!contractForm.startDate) return "";
    const start = new Date(contractForm.startDate);
    start.setFullYear(start.getFullYear() + 3);
    return start.toISOString().split("T")[0];
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            จัดการข้อมูลผู้เช่า
          </h1>
          <p className="text-gray-500 text-sm">
            ดูและแก้ไขข้อมูลผู้เช่าทั้งหมด
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={20} />
          เพิ่มผู้เช่าใหม่
        </button>
      </div>

      {/* Tenants List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล หรือเลขแผงค้า..."
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
                <th className="py-4 px-6 text-left font-medium">ชื่อผู้เช่า</th>
                <th className="py-4 px-6 text-left font-medium">
                  แผงค้าที่เช่า
                </th>
                <th className="py-4 px-6 text-left font-medium">
                  ข้อมูลติดต่อ
                </th>
                <th className="py-4 px-4 text-center font-medium whitespace-nowrap">
                  อัพรูป
                </th>
                <th className="py-4 px-4 text-center font-medium whitespace-nowrap">
                  จัดการสัญญา
                </th>
                <th className="py-4 px-4 text-center font-medium whitespace-nowrap">
                  แก้ไขข้อมูลผู้เช่า
                </th>
                <th className="py-4 px-4 text-center font-medium whitespace-nowrap">
                  ลบผู้เช่า
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.map((tenant) => (
                <tr
                  key={tenant.user_id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    {editingId === tenant.user_id ? (
                      <div className="flex items-center gap-3">
                        {/* Profile photo upload in edit mode */}
                        <label className="relative cursor-pointer group shrink-0">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setEditProfileFile(file);
                                setEditProfilePreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                          {editProfilePreview || tenant.profile_image_url ? (
                            <img
                              src={editProfilePreview || tenant.profile_image_url}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover border-2 border-purple-400 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                              {(tenant.first_name || tenant.username || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera size={14} className="text-white" />
                          </div>
                        </label>
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                          value={editForm.first_name || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              first_name: e.target.value,
                            })
                          }
                          placeholder="ชื่อผู้เช่า"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {tenant.profile_image_url ? (
                          <img
                            src={tenant.profile_image_url}
                            alt="Profile"
                            className="w-8 h-8 rounded-full object-cover border border-purple-100 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {(tenant.first_name || tenant.username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <p className="font-semibold text-gray-800">
                          {tenant.first_name} {tenant.last_name || ""}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {editingId === tenant.user_id ? (
                      <select
                        className="w-32 px-2 py-1 border rounded-lg text-sm"
                        value={editForm.slot_id}
                        onChange={(e) =>
                          setEditForm({ ...editForm, slot_id: e.target.value })
                        }
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        {tenant.stall && (
                          <option value={tenant.stall.slot_id}>
                            {tenant.stall.slot_number} (ศูนย์อาหาร{" "}
                            {tenant.stall.food_court_id})
                          </option>
                        )}
                        {allStalls
                          .filter((s) => s.status === "VACANT")
                          .map((s) => (
                            <option key={s.slot_id} value={s.slot_id}>
                              {s.slot_number} (ศูนย์อาหาร {s.food_court_id})
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          tenant.stall
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {tenant.stall
                          ? `${tenant.stall.slot_number} (ศูนย์อาหาร ${tenant.stall.food_court_id})`
                          : "ไม่มี"}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Phone size={14} />
                        {editingId === tenant.user_id ? (
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                            value={editForm.phone || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                phone: e.target.value,
                              })
                            }
                            placeholder="เบอร์โทรศัพท์"
                          />
                        ) : (
                          <span>{formatPhoneNumber(tenant.phone) || "-"}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* อัพรูป */}
                  <td className="py-4 px-4 text-center">
                    {editingId !== tenant.user_id ? (
                      <label
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer select-none"
                        title="อัปโหลดรูปโปรไฟล์"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPhotoId === tenant.user_id}
                          onChange={(e) =>
                            handleQuickPhotoUpload(tenant.user_id, e.target.files[0])
                          }
                        />
                        {uploadingPhotoId === tenant.user_id && (
                          <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        อัพรูปโปรไฟล์
                      </label>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  {/* จัดการสัญญา */}
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleManageContract(tenant)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center justify-center"
                      title="จัดการสัญญา"
                      disabled={editingId === tenant.user_id}
                    >
                      <FileText size={18} />
                    </button>
                  </td>

                  {/* แก้ไขข้อมูลผู้เช่า */}
                  <td className="py-4 px-4 text-center">
                    {editingId === tenant.user_id ? (
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSave(tenant.user_id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="บันทึก"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ยกเลิก"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(tenant)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors inline-flex items-center justify-center"
                        title="แก้ไขข้อมูลผู้เช่า"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                  </td>

                  {/* ลบผู้เช่า */}
                  <td className="py-4 px-4 text-center">
                    {editingId === tenant.user_id ? (
                      <span className="text-gray-300">-</span>
                    ) : (
                      <button
                        onClick={() => handleDelete(tenant.user_id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="ลบผู้เช่า"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Management Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  จัดการสัญญาเช่า
                </h2>
                <p className="text-sm text-gray-500">
                  ผู้เช่า: {selectedTenantName}
                </p>
              </div>
              <button
                onClick={() => setIsContractModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={handleContractSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Section 1: Personal Info */}
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <User size={18} /> ข้อมูลส่วนตัว
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เลขบัตรประชาชน
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={contractForm.idCard}
                      maxLength={17}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        let formatted = value;
                        if (value.length > 0) {
                          formatted = value.match(
                            /^(\d{0,1})(\d{0,4})(\d{0,5})(\d{0,2})(\d{0,1})$/,
                          );
                          if (!formatted) return;
                          formatted =
                            formatted[1] +
                            (formatted[2] ? "-" + formatted[2] : "") +
                            (formatted[3] ? "-" + formatted[3] : "") +
                            (formatted[4] ? "-" + formatted[4] : "") +
                            (formatted[5] ? "-" + formatted[5] : "");
                        }
                        setContractForm({
                          ...contractForm,
                          idCard: formatted,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์โทรศัพท์ (ในสัญญา)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={contractForm.phone}
                      maxLength={10}
                      onChange={(e) => {
                        const unformatted = e.target.value.replace(/\D/g, "");
                        setContractForm({
                          ...contractForm,
                          phone: unformatted,
                        });
                      }}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      ที่อยู่ตามทะเบียนบ้าน/ปัจจุบัน
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                          placeholder="บ้านเลขที่และหมู่"
                          value={addressObj.houseNoMoo}
                          onChange={(e) =>
                            setAddressObj({
                              ...addressObj,
                              houseNoMoo: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          จังหวัด
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                          value={addressObj.province}
                          onChange={(e) => handleContractProvinceChange(e.target.value)}
                        >
                          <option value="">เลือกจังหวัด</option>
                          {provinces.map((p) => (
                            <option key={p.id} value={p.name_th}>
                              {p.name_th}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          อำเภอ/เขต
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                          value={addressObj.district}
                          onChange={(e) => handleContractDistrictChange(e.target.value)}
                          disabled={!addressObj.province}
                        >
                          <option value="">เลือกอำเภอ/เขต</option>
                          {contractDistricts.map((d) => (
                            <option key={d.id} value={d.name_th}>
                              {d.name_th}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          ตำบล/แขวง
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                          value={addressObj.subDistrict}
                          onChange={(e) => handleContractSubdistrictChange(e.target.value)}
                          disabled={!addressObj.district}
                        >
                          <option value="">เลือกตำบล/แขวง</option>
                          {contractSubdistricts.map((s) => (
                            <option key={s.id} value={s.name_th}>
                              {s.name_th}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          รหัสไปรษณีย์
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                          placeholder="รหัสไปรษณีย์..."
                          value={addressObj.zipCode}
                          onChange={(e) =>
                            setAddressObj({
                              ...addressObj,
                              zipCode: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Contract Info */}
              <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <FileText size={18} /> รายละเอียดสัญญา
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เลขที่สัญญาเช่า
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น CTR-A2-654445 (หากเว้นว่างไว้ ระบบจะสร้างให้อัตโนมัติ)"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={contractForm.contractNumber || ""}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          contractNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันเริ่มสัญญา
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={contractForm.startDate}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันสิ้นสุดสัญญา
                    </label>
                    <input
                      type="date"
                      required
                      max={getMaxEndDate()}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={contractForm.endDate}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประเภทเมนูอาหาร
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                      value={contractForm.menuType}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          menuType: e.target.value,
                        })
                      }
                    >
                      <option value="">-- เลือกประเภทอาหาร --</option>
                      <option value="ของคาว">ของคาว</option>
                      <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                      <option value="ของหวาน">ของหวาน</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Security Deposit */}
              <div className="md:col-span-2 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <FileText size={18} /> ค่าประกันสัญญา
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ค่าประกันสัญญา (บาท)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={contractForm.securityDeposit}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          securityDeposit: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Contract Document Upload & Preview */}
              <div className="md:col-span-2 bg-purple-50 p-4 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Upload size={18} /> รูปภาพ/เอกสารสัญญาฉบับจริง (สำหรับตรวจสอบ)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl cursor-pointer font-medium text-sm transition-colors shadow-sm">
                      <Upload size={16} />
                      {contractFilePreview ? "เปลี่ยนรูป/ไฟล์สัญญา" : "แนบรูปภาพ/ไฟล์สัญญา (PDF หรือ รูปภาพ)"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setContractFile(file);
                            setContractFilePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    {contractFilePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setContractFile(null);
                          setContractFilePreview(null);
                          setContractForm({ ...contractForm, contractImage: "" });
                        }}
                        className="text-xs text-red-500 hover:underline font-medium"
                      >
                        ลบเอกสารออก
                      </button>
                    )}
                  </div>

                  {contractFilePreview && (
                    <div className="mt-3 p-3.5 bg-white rounded-xl border border-purple-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        {contractFilePreview.endsWith(".pdf") || contractFilePreview.includes("pdf") ? (
                          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                            PDF
                          </div>
                        ) : (
                          <img
                            src={contractFilePreview}
                            alt="เอกสารสัญญาฉบับจริง"
                            className="w-14 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {contractFile ? contractFile.name : "เอกสารสัญญาฉบับจริงที่แนบไว้"}
                          </p>
                          <a
                            href={contractFilePreview}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:underline font-medium flex items-center gap-1 mt-0.5"
                          >
                            คลิกเพื่อเปิดดูรูปภาพ/เอกสารขนาดเต็ม ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 transition-all font-medium cursor-pointer"
                >
                  บันทึกสัญญา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tenant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">
                เพิ่มผู้เช่าใหม่
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setProfileFile(null);
                  setProfilePreview(null);
                  setDistricts([]);
                  setSubdistricts([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6">
              {/* Profile Image (Optional) */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                {profilePreview ? (
                  <div className="relative">
                    <img
                      src={profilePreview}
                      alt="Profile Preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-purple-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileFile(null);
                        setProfilePreview(null);
                      }}
                      className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full p-1 border hover:bg-red-200"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-purple-600 py-2">
                    <Upload size={32} className="mb-2 text-gray-400" />
                    <span className="text-xs font-semibold">รูปโปรไฟล์ (ไม่บังคับ)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setProfileFile(file);
                          setProfilePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Section: Personal Info */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 text-sm border-l-4 border-purple-500 pl-2">ข้อมูลส่วนตัว</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">คำนำหน้า</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                      value={addForm.title}
                      onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    >
                      <option value="">เลือกคำนำหน้า</option>
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อ *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                      placeholder="ชื่อจริง"
                      value={addForm.first_name}
                      onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">นามสกุล</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                      placeholder="นามสกุล"
                      value={addForm.last_name}
                      onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">เบอร์โทรศัพท์ *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                      placeholder="08xxxxxxxx"
                      value={addForm.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setAddForm({ ...addForm, phone: val });
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">อีเมล</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                      placeholder="email@example.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Address */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 text-sm border-l-4 border-purple-500 pl-2">ที่อยู่</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ที่อยู่ (บ้านเลขที่ ถนน)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                    placeholder="ที่อยู่ บ้านเลขที่ ถนน ซอย"
                    value={addForm.address_line}
                    onChange={(e) => setAddForm({ ...addForm, address_line: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">จังหวัด</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                      value={addForm.province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                    >
                      <option value="">เลือกจังหวัด</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.name_th}>
                          {p.name_th}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">อำเภอ</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                      value={addForm.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={!addForm.province}
                    >
                      <option value="">เลือกอำเภอ</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.name_th}>
                          {d.name_th}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">ตำบล</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                      value={addForm.subdistrict}
                      onChange={(e) => handleSubdistrictChange(e.target.value)}
                      disabled={!addForm.district}
                    >
                      <option value="">เลือกตำบล</option>
                      {subdistricts.map((s) => (
                        <option key={s.id} value={s.name_th}>
                          {s.name_th}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสไปรษณีย์</label>
                  <input
                    type="text"
                    className="w-full md:w-1/2 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                    placeholder="รหัสไปรษณีย์"
                    value={addForm.postal_code}
                    onChange={(e) => setAddForm({ ...addForm, postal_code: e.target.value })}
                  />
                </div>
              </div>

              {/* Section: Stall & Shop Type */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 text-sm border-l-4 border-purple-500 pl-2">ข้อมูลแผงค้าและประเภทร้าน</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">เลือกแผงค้า (ไม่บังคับ)</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                      value={addForm.stallId}
                      onChange={(e) => setAddForm({ ...addForm, stallId: e.target.value })}
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {allStalls
                        .filter((s) => s.status === "VACANT")
                        .map((s) => (
                          <option key={s.slot_id} value={s.slot_id}>
                            {s.slot_number} (ศูนย์ {s.food_court_id}) ({s.slot_size} ตร.ม. - {Number(s.rent).toLocaleString()} บาท)
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภทร้าน</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white text-sm"
                      value={addForm.menuType}
                      onChange={(e) => setAddForm({ ...addForm, menuType: e.target.value })}
                    >
                      <option value="">เลือกประเภทร้าน</option>
                      <option value="ของคาว">ร้านของคาว</option>
                      <option value="เครื่องดื่ม">ร้านน้ำหวาน</option>
                      <option value="ของหวาน">ร้านขนม</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Login Credentials */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 text-sm border-l-4 border-purple-500 pl-2">ข้อมูลล็อกอิน</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm"
                      placeholder="Username สำหรับล็อกอิน"
                      value={addForm.username}
                      onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสผ่านชั่วคราว (ระบบสร้างให้อัตโนมัติ)</label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-700 flex justify-between items-center h-[38px]">
                      <span>{addForm.password}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(addForm.password);
                          toast.success("คัดลอกรหัสผ่านแล้ว!");
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700 font-bold bg-transparent border-0 cursor-pointer"
                      >
                        คัดลอก
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setProfileFile(null);
                    setProfilePreview(null);
                    setDistricts([]);
                    setSubdistricts([]);
                  }}
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
    </div>
  );
};

export default Tenants;
