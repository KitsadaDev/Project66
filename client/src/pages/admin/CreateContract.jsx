import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Store,
  User,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  Phone,
  MapPin,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  contractsAPI,
  foodCourtsAPI,
  stallsAPI,
  usersAPI,
  shopTypesAPI,
} from "../../api";

const CreateContract = () => {
  const navigate = useNavigate();

  // Loading states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Master Data
  const [foodCourts, setFoodCourts] = useState([]);
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState("");
  const [vacantStalls, setVacantStalls] = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);

  const [tenants, setTenants] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [activeContracts, setActiveContracts] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantSearch, setTenantSearch] = useState("");

  const [shopTypes, setShopTypes] = useState([]);

  // Address Data (Thailand)
  const [addressData, setAddressData] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);

  const [addressForm, setAddressForm] = useState({
    houseNoMoo: "",
    province: "",
    district: "",
    subDistrict: "",
    zipCode: "",
  });

  // Contract Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const nextYearDate = new Date();
  nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
  const nextYearStr = nextYearDate.toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    contract_number: "",
    startDate: todayStr,
    endDate: nextYearStr,
    menuType: "",
    deposit_amount: "",
    idCard: "",
    phone: "",
    receiptNumber: "",
    receiptDate: todayStr,
    lateRentFine: "",
    lateUtilityFine: "",
  });

  // File Upload State
  const [contractFile, setContractFile] = useState(null);
  const [contractFilePreview, setContractFilePreview] = useState(null);
  const [isPdf, setIsPdf] = useState(false);

  // 1. Initial Load: Food courts, tenants, active contracts, shop types, address data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingInitial(true);
        const [courtsRes, usersRes, contractsRes] = await Promise.all([
          foodCourtsAPI.getAll().catch(() => ({ data: { data: [] } })),
          usersAPI.getAll({ role: "TENANT" }).catch(() => ({ data: { data: [] } })),
          contractsAPI.getAll().catch(() => ({ data: { data: [] } })),
        ]);

        const courts = courtsRes.data?.data || courtsRes.data || [];
        setFoodCourts(courts);
        if (courts.length > 0) {
          setSelectedFoodCourtId(courts[0].food_court_id || courts[0].id || "");
        }

        const tenantsList = usersRes.data?.data || usersRes.data || [];
        setTenants(tenantsList);

        const contractsList = contractsRes.data?.data || contractsRes.data || [];
        setAllContracts(contractsList);
        setActiveContracts(contractsList.filter((c) => c.status === "ACTIVE"));

        // Fetch Shop types from API (เหมือนเวอร์ชันแอป)
        try {
          const typesRes = await shopTypesAPI.getAll();
          setShopTypes(typesRes.data?.data || typesRes.data || []);
        } catch (e) {
          console.error("Failed to load shop types:", e);
        }

        // Fetch Thailand Address JSON
        try {
          const addressRes = await fetch("/thailand-address.json");
          const addrData = await addressRes.json();
          setAddressData(addrData);
          const sorted = [...addrData].sort((a, b) =>
            a.name_th.localeCompare(b.name_th)
          );
          setProvinces(sorted);
        } catch (addrErr) {
          console.warn("Could not load address data:", addrErr);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        toast.error("ไม่สามารถโหลดข้อมูลเบื้องต้นได้");
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Load Vacant Stalls whenever selectedFoodCourtId changes
  useEffect(() => {
    if (!selectedFoodCourtId) {
      setVacantStalls([]);
      setSelectedStall(null);
      return;
    }

    const fetchVacantStalls = async () => {
      try {
        setLoadingStalls(true);
        const res = await stallsAPI.getAll({
          food_court_id: selectedFoodCourtId,
          status: "VACANT",
        });
        const stalls = res.data?.data || res.data || [];
        setVacantStalls(stalls);
        // Reset selected stall if not in new list
        setSelectedStall(null);
      } catch (err) {
        console.error("Error loading vacant stalls:", err);
        toast.error("ไม่สามารถโหลดข้อมูลแผงค้าว่างได้");
      } finally {
        setLoadingStalls(false);
      }
    };

    fetchVacantStalls();
  }, [selectedFoodCourtId]);

  // Handle Stall selection: auto calculate deposit (rent * 3)
  const handleStallChange = (stallId) => {
    if (!stallId) {
      setSelectedStall(null);
      setFormData((prev) => ({ ...prev, deposit_amount: "" }));
      return;
    }
    const stall = vacantStalls.find(
      (s) => String(s.slot_id || s.id) === String(stallId)
    );
    setSelectedStall(stall || null);
    if (stall && stall.rent) {
      const calculatedDeposit = parseFloat(stall.rent) * 3;
      setFormData((prev) => ({
        ...prev,
        deposit_amount: calculatedDeposit.toString(),
      }));
    }
  };

  // Auto calculate deposit_amount = rent * 3 whenever selectedStall changes
  useEffect(() => {
    if (selectedStall?.rent) {
      const calculated = parseFloat(selectedStall.rent) * 3;
      setFormData((prev) => ({
        ...prev,
        deposit_amount: calculated.toString(),
      }));
    } else if (!selectedStall) {
      setFormData((prev) => ({
        ...prev,
        deposit_amount: "",
      }));
    }
  }, [selectedStall]);

  // Handle Tenant selection: auto populate phone / idCard and Address
  const handleTenantChange = (tenantId) => {
    if (!tenantId) {
      setSelectedTenant(null);
      setAddressForm({
        houseNoMoo: "",
        province: "",
        district: "",
        subDistrict: "",
        zipCode: "",
      });
      setDistricts([]);
      setSubdistricts([]);
      return;
    }
    const tenant = tenants.find(
      (t) => String(t.user_id || t.id) === String(tenantId)
    );
    setSelectedTenant(tenant || null);
    if (tenant) {
      const prevContract = allContracts.find(
        (c) =>
          String(c.tenant_id || c.tenant?.user_id) ===
          String(tenant.user_id || tenant.id)
      );

      setFormData((prev) => ({
        ...prev,
        phone: tenant.phone || prevContract?.phone || prev.phone,
        idCard: tenant.idCard || prevContract?.idCard || prev.idCard,
      }));

      // Auto-populate Address from Tenant fields in database
      const newHouseNo = tenant.address_line || tenant.address || "";
      const newProvince = tenant.province || "";
      const newDistrict = tenant.district || "";
      const newSubDistrict = tenant.subdistrict || "";
      let newZip = tenant.postal_code || "";

      setAddressForm({
        houseNoMoo: newHouseNo,
        province: newProvince,
        district: newDistrict,
        subDistrict: newSubDistrict,
        zipCode: newZip,
      });

      // Synchronize cascading districts & subdistricts immediately
      if (addressData.length > 0 && newProvince) {
        const provObj = addressData.find((p) => p.name_th === newProvince);
        const sortedDistricts = provObj
          ? [...provObj.amphure].sort((a, b) =>
              a.name_th.localeCompare(b.name_th)
            )
          : [];
        setDistricts(sortedDistricts);

        if (newDistrict) {
          const distObj = sortedDistricts.find(
            (d) => d.name_th === newDistrict
          );
          const sortedSubdistricts = distObj
            ? [...distObj.tambon].sort((a, b) =>
                a.name_th.localeCompare(b.name_th)
              )
            : [];
          setSubdistricts(sortedSubdistricts);

          if (!newZip && newSubDistrict) {
            const subObj = sortedSubdistricts.find(
              (s) => s.name_th === newSubDistrict
            );
            if (subObj?.zip_code) {
              setAddressForm((prev) => ({
                ...prev,
                zipCode: String(subObj.zip_code),
              }));
            }
          }
        } else {
          setSubdistricts([]);
        }
      }
    }
  };

  // Synchronize Cascading Address Dropdowns whenever addressData loads
  useEffect(() => {
    if (addressData.length === 0 || !addressForm.province) return;

    const provinceObj = addressData.find(
      (p) => p.name_th === addressForm.province
    );
    if (provinceObj) {
      const sortedDistricts = [...provinceObj.amphure].sort((a, b) =>
        a.name_th.localeCompare(b.name_th)
      );
      setDistricts(sortedDistricts);

      if (addressForm.district) {
        const districtObj = sortedDistricts.find(
          (d) => d.name_th === addressForm.district
        );
        if (districtObj) {
          const sortedSubdistricts = [...districtObj.tambon].sort((a, b) =>
            a.name_th.localeCompare(b.name_th)
          );
          setSubdistricts(sortedSubdistricts);
        }
      }
    }
  }, [addressData, addressForm.province, addressForm.district]);

  // Address Cascading Handlers
  const handleProvinceChange = (provinceName) => {
    if (!provinceName) {
      setAddressForm((prev) => ({
        ...prev,
        province: "",
        district: "",
        subDistrict: "",
        zipCode: "",
      }));
      setDistricts([]);
      setSubdistricts([]);
      return;
    }

    const provinceObj = addressData.find((p) => p.name_th === provinceName);
    const sortedDistricts = provinceObj
      ? [...provinceObj.amphure].sort((a, b) =>
          a.name_th.localeCompare(b.name_th)
        )
      : [];

    setAddressForm((prev) => ({
      ...prev,
      province: provinceName,
      district: "",
      subDistrict: "",
      zipCode: "",
    }));
    setDistricts(sortedDistricts);
    setSubdistricts([]);
  };

  const handleDistrictChange = (districtName) => {
    if (!districtName) {
      setAddressForm((prev) => ({
        ...prev,
        district: "",
        subDistrict: "",
        zipCode: "",
      }));
      setSubdistricts([]);
      return;
    }

    const districtObj = districts.find((d) => d.name_th === districtName);
    const sortedSubdistricts = districtObj
      ? [...districtObj.tambon].sort((a, b) =>
          a.name_th.localeCompare(b.name_th)
        )
      : [];

    setAddressForm((prev) => ({
      ...prev,
      district: districtName,
      subDistrict: "",
      zipCode: "",
    }));
    setSubdistricts(sortedSubdistricts);
  };

  const handleSubdistrictChange = (subdistrictName) => {
    if (!subdistrictName) {
      setAddressForm((prev) => ({
        ...prev,
        subDistrict: "",
        zipCode: "",
      }));
      return;
    }

    const subdistrictObj = subdistricts.find(
      (s) => s.name_th === subdistrictName
    );
    const zipCode = subdistrictObj ? String(subdistrictObj.zip_code) : "";

    setAddressForm((prev) => ({
      ...prev,
      subDistrict: subdistrictName,
      zipCode: zipCode,
    }));
  };


  // File Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      setIsPdf(true);
      setContractFile(file);
      setContractFilePreview(file.name);
    } else if (file.type.startsWith("image/")) {
      setIsPdf(false);
      setContractFile(file);
      setContractFilePreview(URL.createObjectURL(file));
    } else {
      toast.warning("กรุณาเลือกไฟล์ภาพ (.jpg, .png) หรือไฟล์ PDF เท่านั้น");
    }
  };

  const removeFile = () => {
    setContractFile(null);
    setContractFilePreview(null);
    setIsPdf(false);
  };

  // Active Contract Check for Tenants (ตรวจสอบผู้เช่าที่มีสัญญาหรือแผงค้าอยู่แล้ว)
  const isTenantActive = (userId) => {
    return (
      activeContracts.some(
        (c) =>
          String(c.tenant_id || c.tenant?.user_id) === String(userId) &&
          c.status === "ACTIVE"
      ) ||
      tenants.some(
        (t) => String(t.user_id || t.id) === String(userId) && Boolean(t.stall)
      )
    );
  };

  // Validate and Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFoodCourtId) {
      toast.error("กรุณาเลือกศูนย์อาหาร");
      return;
    }

    if (!selectedStall) {
      toast.error("กรุณาเลือกล็อคแผงค้า");
      return;
    }

    if (!selectedTenant) {
      toast.error("กรุณาเลือกผู้เช่า");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error("กรุณาระบุวันที่เริ่มและสิ้นสุดสัญญา");
      return;
    }

    // Check 3 Years Max
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end <= start) {
      toast.error("วันที่สิ้นสุดสัญญาต้องมากกว่าวันที่เริ่มสัญญา");
      return;
    }

    const maxEnd = new Date(start);
    maxEnd.setFullYear(maxEnd.getFullYear() + 3);
    if (end > maxEnd) {
      toast.warning("ระยะเวลาสัญญาเช่าสูงสุดต้องไม่เกิน 3 ปี");
      return;
    }

    try {
      setSubmitting(true);

      // Build Combined Address
      let combinedAddress = "";
      if (addressForm.houseNoMoo) {
        combinedAddress += addressForm.houseNoMoo;
      }
      if (addressForm.subDistrict) {
        combinedAddress += ` ต.${addressForm.subDistrict}`;
      }
      if (addressForm.district) {
        combinedAddress += ` อ.${addressForm.district}`;
      }
      if (addressForm.province) {
        combinedAddress += ` จ.${addressForm.province}`;
      }
      if (addressForm.zipCode) {
        combinedAddress += ` ${addressForm.zipCode}`;
      }

      const payload = new FormData();
      payload.append(
        "slot_id",
        String(selectedStall.slot_id || selectedStall.id)
      );
      payload.append(
        "tenant_id",
        String(selectedTenant.user_id || selectedTenant.id)
      );
      payload.append("startDate", formData.startDate);
      payload.append("endDate", formData.endDate);

      if (formData.contract_number.trim()) {
        payload.append("contract_number", formData.contract_number.trim());
      }
      const finalDeposit = selectedStall?.rent
        ? String(parseFloat(selectedStall.rent) * 3)
        : formData.deposit_amount;
      if (finalDeposit) {
        payload.append("deposit_amount", finalDeposit);
      }
      if (formData.menuType) {
        payload.append("menuType", formData.menuType);
      }
      if (formData.idCard.trim()) {
        payload.append("idCard", formData.idCard.trim());
      }
      if (formData.phone.trim()) {
        payload.append("phone", formData.phone.trim());
      }
      if (combinedAddress.trim()) {
        payload.append("address", combinedAddress.trim());
      }
      if (formData.receiptNumber.trim()) {
        payload.append("receiptNumber", formData.receiptNumber.trim());
      }
      if (formData.receiptDate) {
        payload.append("receiptDate", formData.receiptDate);
      }
      if (contractFile) {
        payload.append("contractFile", contractFile);
      }

      await contractsAPI.create(payload);
      toast.success("สร้างสัญญาเช่าสำเร็จเรียบร้อยแล้ว");
      navigate("/admin/contracts");
    } catch (err) {
      console.error("Error creating contract:", err);
      const msg =
        err.response?.data?.message ||
        "เกิดข้อผิดพลาดในการสร้างสัญญา กรุณาตรวจสอบข้อมูล";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered tenants for dropdown: คัดเฉพาะผู้เช่าที่ยังไม่มีสัญญาเท่านั้น
  const filteredTenants = tenants
    .filter((t) => !isTenantActive(t.user_id || t.id))
    .filter((t) => {
      const fullName = `${t.first_name || ""} ${t.last_name || ""}`.toLowerCase();
      const phone = (t.phone || "").toLowerCase();
      const email = (t.email || "").toLowerCase();
      const q = tenantSearch.toLowerCase();
      return fullName.includes(q) || phone.includes(q) || email.includes(q);
    });

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-500 font-medium">กำลังโหลดข้อมูลระบบ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Breadcrumb and Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link to="/admin" className="hover:text-purple-600 transition-colors">
            แดชบอร์ด
          </Link>
          <span>/</span>
          <Link
            to="/admin/contracts"
            className="hover:text-purple-600 transition-colors"
          >
            ข้อมูลสัญญาเช่า
          </Link>
          <span>/</span>
          <span className="text-purple-600 font-medium">สร้างสัญญาเช่าใหม่</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin/contracts"
                className="p-2 bg-white rounded-xl border border-gray-200 text-gray-600 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm"
                title="ย้อนกลับ"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                สร้างสัญญาเช่าแผงค้า
              </h1>
            </div>
            <p className="text-gray-500 text-sm mt-1 ml-11">
              บันทึกสัญญาเช่าใหม่ เลือกล็อคที่ว่าง ระบุผู้เช่า และแนบหลักฐานเอกสารสัญญา
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Food Court & Stall Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                1. เลือกศูนย์อาหารและแผงค้า
              </h2>
              <p className="text-xs text-gray-500">
                เลือกล็อคที่มีสถานะว่าง (VACANT) ในศูนย์อาหารที่ต้องการทำสัญญา
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Food Court */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ศูนย์อาหาร <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedFoodCourtId}
                onChange={(e) => setSelectedFoodCourtId(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all font-medium"
                required
              >
                <option value="">-- กรุณาเลือกศูนย์อาหาร --</option>
                {foodCourts.map((court) => (
                  <option
                    key={court.food_court_id || court.id}
                    value={court.food_court_id || court.id}
                  >
                    {court.name || `ศูนย์อาหาร ${court.food_court_id || court.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Vacant Stall */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                แผงค้า / ล็อคที่ว่าง <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStall?.slot_id || selectedStall?.id || ""}
                onChange={(e) => handleStallChange(e.target.value)}
                disabled={loadingStalls || vacantStalls.length === 0}
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all font-medium disabled:bg-gray-100 disabled:text-gray-400"
                required
              >
                <option value="">
                  {loadingStalls
                    ? "กำลังโหลดข้อมูลแผงค้า..."
                    : vacantStalls.length === 0
                    ? "-- ไม่มีล็อคว่างในศูนย์อาหารนี้ --"
                    : "-- เลือกล็อคแผงค้า --"}
                </option>
                {vacantStalls.map((s) => (
                  <option key={s.slot_id || s.id} value={s.slot_id || s.id}>
                    ล็อค {s.slot_number} (ค่าเช่า{" "}
                    {parseFloat(s.rent || 0).toLocaleString()} ฿/เดือน)
                  </option>
                ))}
              </select>
              {vacantStalls.length === 0 && !loadingStalls && selectedFoodCourtId && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={14} /> ไม่มีล็อคที่สถานะว่างในศูนย์อาหารนี้
                </p>
              )}
            </div>
          </div>

          {/* Stall Selected Card Banner */}
          {selectedStall && (
            <div className="mt-5 p-4 bg-gradient-to-r from-purple-50/70 to-indigo-50/50 border border-purple-100 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white text-purple-600 rounded-xl shadow-xs border border-purple-100 font-bold">
                  <Store size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-800">
                      ล็อค {selectedStall.slot_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      พร้อมทำสัญญา
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ขนาดพื้นที่: {selectedStall.size || "มาตรฐาน"} | ประเภท:{" "}
                    {selectedStall.category || "ทั่วไป"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">ค่าเช่ารายเดือน</span>
                  <span className="text-lg font-bold text-gray-800">
                    {parseFloat(selectedStall.rent || 0).toLocaleString()}{" "}
                    <span className="text-sm font-normal text-gray-500">฿/เดือน</span>
                  </span>
                </div>
                <div className="text-right border-l border-purple-100 pl-6">
                  <span className="text-xs text-purple-600 font-medium block">
                    เงินประกันสัญญาแนะนำ (x3)
                  </span>
                  <span className="text-lg font-bold text-purple-700">
                    {(parseFloat(selectedStall.rent || 0) * 3).toLocaleString()}{" "}
                    <span className="text-sm font-normal text-purple-500">฿</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Tenant Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                2. เลือกผู้เช่า (Tenant)
              </h2>
              <p className="text-xs text-gray-500">
                เลือกผู้เช่าที่ลงทะเบียนในระบบ และยังไม่มีสัญญาเช่าที่เปิดใช้งานอยู่
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search and Select Tenant */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ผู้เช่าในระบบ <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTenant?.user_id || selectedTenant?.id || ""}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all font-medium"
                required
              >
                <option value="">
                  {filteredTenants.length === 0
                    ? "-- ไม่มีผู้เช่าที่ว่างพร้อมทำสัญญา --"
                    : "-- กรุณาเลือกผู้เช่า --"}
                </option>
                {filteredTenants.map((t) => (
                  <option
                    key={t.user_id || t.id}
                    value={t.user_id || t.id}
                  >
                    {t.first_name} {t.last_name || ""}{" "}
                    {t.phone ? `(${t.phone})` : ""}
                  </option>
                ))}
              </select>
              {filteredTenants.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={14} /> ผู้เช่าในระบบทุกคนมีสัญญาเช่าอยู่แล้ว (หรือไม่มีรายชื่อที่ตรงกับคำค้นหา)
                </p>
              )}
            </div>

            {/* Quick Filter Search Box */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ค้นหาผู้เช่า (ชื่อ / เบอร์โทร)
              </label>
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="พิมพ์ชื่อ นามสกุล หรือเบอร์โทรศัพท์เพื่อกรอง..."
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all text-sm"
              />
            </div>
          </div>

          {/* Selected Tenant Profile Preview Card */}
          {selectedTenant && (
            <div className="mt-5 p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border border-blue-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                  {selectedTenant.first_name?.[0] || "T"}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">
                    {selectedTenant.first_name} {selectedTenant.last_name || ""}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-gray-400" />
                      {selectedTenant.phone || "ไม่มีเบอร์โทร"}
                    </span>
                    <span>อีเมล: {selectedTenant.email || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-xs font-semibold">
                <CheckCircle2 size={14} /> ผู้เช่าพร้อมทำสัญญา
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Contract Terms & Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                3. ข้อมูลและเงื่อนไขสัญญาเช่า
              </h2>
              <p className="text-xs text-gray-500">
                กำหนดระยะเวลาสัญญา ประเภทสินค้า และเงินประกันสัญญา
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Contract Number (Custom or Auto) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เลขที่สัญญาเช่า
              </label>
              <input
                type="text"
                value={formData.contract_number}
                onChange={(e) =>
                  setFormData({ ...formData, contract_number: e.target.value })
                }
                placeholder="เว้นว่างเพื่อให้ระบบสร้างอัตโนมัติ"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all text-sm font-mono"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                เช่น CTR-A01-XXXXXX (หากไม่ระบุ ระบบจะรันเลขอัตโนมัติ)
              </span>
            </div>

            {/* Menu / Shop Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ประเภทอาหาร / สินค้า <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.menuType}
                onChange={(e) =>
                  setFormData({ ...formData, menuType: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all font-medium"
                required
              >
                <option value="">-- เลือกหมวดหมู่ (เช่น ของคาว, ขนม, น้ำหวาน) --</option>
                {shopTypes.map((st, idx) => {
                  const typeName = st.type_name || st.name;
                  return (
                    <option key={st.shop_type_id || st.id || idx} value={typeName}>
                      {typeName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เงินประกันสัญญา (บาท) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={
                    selectedStall?.rent
                      ? (parseFloat(selectedStall.rent) * 3).toString()
                      : formData.deposit_amount
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, deposit_amount: e.target.value })
                  }
                  placeholder={
                    selectedStall?.rent
                      ? String(parseFloat(selectedStall.rent) * 3)
                      : ""
                  }
                  className={`w-full pl-4 pr-12 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-gray-800 transition-all font-semibold ${
                    selectedStall?.rent
                      ? "bg-purple-50/50 text-purple-900"
                      : "bg-gray-50/70"
                  }`}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  บาท
                </span>
              </div>
              {selectedStall?.rent && (
                <span className="text-[11px] text-purple-600 font-medium mt-1.5 flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-purple-600 shrink-0" />
                  คำนวณอัตโนมัติ: ค่าเช่า ({parseFloat(selectedStall.rent).toLocaleString()} ฿) x 3 = {(parseFloat(selectedStall.rent) * 3).toLocaleString()} บาท
                </span>
              )}
            </div>
          </div>

          {/* Date Duration Range */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="mb-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={16} className="text-purple-600" />
                ระยะเวลาสัญญาเช่า <span className="text-red-500">*</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <span className="text-xs text-gray-500 mb-1.5 block">
                  วันที่เริ่มสัญญา (Start Date)
                </span>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all"
                  required
                />
              </div>

              <div>
                <span className="text-xs text-gray-500 mb-1.5 block">
                  วันที่สิ้นสุดสัญญา (End Date - สูงสุดไม่เกิน 3 ปี)
                </span>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact and Citizen ID info */}
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เลขประจำตัวประชาชนผู้เช่า (13 หลัก)
              </label>
              <div className="relative">
                <CreditCard
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  maxLength={13}
                  value={formData.idCard}
                  onChange={(e) =>
                    setFormData({ ...formData, idCard: e.target.value })
                  }
                  placeholder="เช่น 1310100xxxxxx"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เบอร์โทรศัพท์ติดต่อในสัญญา
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="เช่น 0812345678"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Address Information (Thai Cascading) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MapPin size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                4. ข้อมูลที่อยู่
              </h2>
              <p className="text-xs text-gray-500">
                ระบุที่อยู่ของผู้เช่าเพื่อใช้เป็นหลักฐานทางกฎหมายในสัญญาเช่า
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* House No / Street */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                บ้านเลขที่ / หมู่ / ถนน / ซอย
              </label>
              <input
                type="text"
                value={addressForm.houseNoMoo}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, houseNoMoo: e.target.value })
                }
                placeholder="เช่น 123/45 หมู่ 6 ถ.สุขุมวิท ซอย 12"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all text-sm"
              />
            </div>

            {/* Province, District, Subdistrict, Zipcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Province */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  จังหวัด
                </label>
                <select
                  value={addressForm.province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 text-sm"
                >
                  <option value="">-- เลือกจังหวัด --</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.name_th}>
                      {p.name_th}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  อำเภอ / เขต
                </label>
                <select
                  value={addressForm.district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={!addressForm.province || districts.length === 0}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 text-sm disabled:bg-gray-100"
                >
                  <option value="">-- เลือกอำเภอ/เขต --</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.name_th}>
                      {d.name_th}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subdistrict */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  ตำบล / แขวง
                </label>
                <select
                  value={addressForm.subDistrict}
                  onChange={(e) => handleSubdistrictChange(e.target.value)}
                  disabled={!addressForm.district || subdistricts.length === 0}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 text-sm disabled:bg-gray-100"
                >
                  <option value="">-- เลือกตำบล/แขวง --</option>
                  {subdistricts.map((s) => (
                    <option key={s.id} value={s.name_th}>
                      {s.name_th}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zipcode */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  รหัสไปรษณีย์
                </label>
                <input
                  type="text"
                  value={addressForm.zipCode}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, zipCode: e.target.value })
                  }
                  placeholder="รหัสไปรษณีย์"
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: Receipt & Payment Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <DollarSign size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                5. ข้อมูลใบเสร็จรับเงินมัดจำ / ประกันสัญญา
              </h2>
              <p className="text-xs text-gray-500">
                บันทึกเลขที่ใบเสร็จรับเงินและวันที่ชำระเงินมัดจำ (ถ้ามี)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เลขที่ใบเสร็จรับเงินมัดจำ
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) =>
                  setFormData({ ...formData, receiptNumber: e.target.value })
                }
                placeholder="เช่น REC-6709-001"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                วันที่ออกใบเสร็จรับเงิน
              </label>
              <input
                type="date"
                value={formData.receiptDate}
                onChange={(e) =>
                  setFormData({ ...formData, receiptDate: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white text-gray-800 transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Contract Document Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                6. แนบเอกสารสัญญา / รูปถ่ายสัญญา
              </h2>
              <p className="text-xs text-gray-500">
                อัปโหลดไฟล์สแกนสัญญาเช่าที่มีลายเซ็นทั้งสองฝ่าย (รองรับไฟล์รูปภาพ JPG, PNG หรือ PDF)
              </p>
            </div>
          </div>

          {!contractFilePreview ? (
            <label className="border-2 border-dashed border-gray-200 hover:border-purple-400 bg-gray-50/50 hover:bg-purple-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 shadow-xs">
                <Upload size={26} />
              </div>
              <span className="text-sm font-bold text-gray-700">
                คลิกเพื่อเลือกไฟล์เอกสาร หรือลากไฟล์มาวางที่นี่
              </span>
              <span className="text-xs text-gray-400 mt-1">
                รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 10MB
              </span>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPdf ? (
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                    <FileCheck size={26} />
                  </div>
                ) : (
                  <img
                    src={contractFilePreview}
                    alt="Contract Preview"
                    className="w-14 h-14 object-cover rounded-xl border border-gray-200 shadow-xs"
                  />
                )}
                <div>
                  <span className="text-sm font-bold text-gray-800 block truncate max-w-sm">
                    {contractFile?.name || "ไฟล์เอกสารสัญญา"}
                  </span>
                  <span className="text-xs text-gray-400">
                    ขนาด:{" "}
                    {contractFile?.size
                      ? (contractFile.size / 1024 / 1024).toFixed(2) + " MB"
                      : "-"}{" "}
                    | {isPdf ? "PDF Document" : "รูปภาพ"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={removeFile}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="ลบไฟล์"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons & Summary Bar */}
        <div className="sticky bottom-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-purple-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">สรุปการสร้างสัญญา</span>
              <span className="text-sm font-bold text-gray-800">
                {selectedStall ? `แผงค้า ${selectedStall.slot_number}` : "ยังไม่ได้เลือกล็อค"}{" "}
                • {selectedTenant ? `${selectedTenant.first_name}` : "ยังไม่ได้เลือกผู้เช่า"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate("/admin/contracts")}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium transition-all text-sm text-center"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-purple-200 hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังบันทึกสัญญา...</span>
                </>
              ) : (
                <>
                  <FileCheck size={18} />
                  <span>บันทึกและสร้างสัญญา</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateContract;
