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
    name: "",
    email: "",
    phone: "",
    password: "",
    stallId: "",
  });

  // Contract Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    id: null,
    stallId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    idCard: "",
    phone: "", // Contact number in contract
    address: "",
    receiptNumber: "",
    receiptDate: "",
    contractFee: "", // mapped to securityDeposit or general fee? User said "ค่าประกันสัญญา" -> securityDeposit
    securityDeposit: "",
    greaseTrapFee: "500",
    lateRentFine: "",
    lateUtilityFine: "",
  });
  const [selectedTenantName, setSelectedTenantName] = useState("");

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
      const response = await contractsAPI.getAll({ active: true });
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

      await usersAPI.update(user_id, userData);

      toast.success("บันทึกข้อมูลสำเร็จ");
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Register User
      const registerResponse = await authAPI.register({
        first_name: addForm.name,
        username: addForm.email || addForm.name,
        phone: addForm.phone,
        password: addForm.password,
        role: "TENANT",
      });

      const userId = registerResponse.data.data.user.user_id;

      // 2. Assign to Stall (if selected)
      if (addForm.stallId) {
        await stallsAPI.update(addForm.stallId, {
          tenant_id: userId,
          status: "OCCUPIED",
        });
      }

      toast.success("เพิ่มผู้เช่าสำเร็จ");
      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        stallId: "",
      });
      fetchData(); // Refresh both lists
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "ไม่สามารถเพิ่มผู้เช่าได้");
    }
  };

  // --- Contract Management ---
  const handleManageContract = (tenant) => {
    if (!tenant.stall) {
      toast.warn("ผู้เช่ารายนี้ยังไม่มีล็อกเช่า กรุณากำหนดล็อกก่อนจัดการสัญญา");
      return;
    }

    setSelectedTenantName(tenant.first_name);
    const existingContract = contracts.find(
      (c) => c.slot_id === tenant.stall?.slot_id && c.status === "ACTIVE",
    );

    if (existingContract) {
      setContractForm({
        id: existingContract.contract_id,
        slot_id: existingContract.slot_id,
        tenant_id: tenant.user_id,
        startDate: existingContract.start_date
          ? existingContract.start_date.split("T")[0]
          : "",
        endDate: existingContract.end_date
          ? existingContract.end_date.split("T")[0]
          : "",
        idCard: existingContract.idCard || "",
        phone: formatPhoneNumber(existingContract.phone || tenant.phone || ""),
        address: existingContract.address || "",
        receiptNumber: existingContract.receiptNumber || "",
        receiptDate: existingContract.receiptDate
          ? existingContract.receiptDate.split("T")[0]
          : "",
        securityDeposit: existingContract.securityDeposit || "",
        greaseTrapFee: existingContract.greaseTrapFee || "500",
        lateRentFine: existingContract.lateRentFine || "",
        lateUtilityFine: existingContract.lateUtilityFine || "",
        menuType: existingContract.menuType || "",
      });
    } else {
      // New Contract Defaults
      const today = new Date();
      const next3Years = new Date();
      next3Years.setFullYear(today.getFullYear() + 3);

      setContractForm({
        id: null,
        slot_id: tenant.stall.slot_id,
        tenant_id: tenant.user_id,
        startDate: today.toISOString().split("T")[0],
        endDate: next3Years.toISOString().split("T")[0],
        idCard: "",
        phone: formatPhoneNumber(tenant.phone || ""),
        address: "",
        receiptNumber: "",
        receiptDate: "",
        securityDeposit: tenant.stall.rent ? tenant.stall.rent * 2 : "",
        greaseTrapFee: "500",
        lateRentFine: "",
        lateUtilityFine: "",
        menuType: "",
      });
    }
    setIsContractModalOpen(true);
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(contractForm).forEach((key) => {
        if (contractForm[key] !== null && contractForm[key] !== undefined) {
          formData.append(key, contractForm[key]);
        }
      });

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
          onClick={() => setIsAddModalOpen(true)}
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
              placeholder="ค้นหาชื่อ, อีเมล หรือเลขห้อง..."
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
                <th className="py-4 px-6 text-left font-medium">ล็อกที่เช่า</th>
                <th className="py-4 px-6 text-left font-medium">
                  ข้อมูลติดต่อ
                </th>
                <th className="py-4 px-6 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.map((tenant) => (
                <tr
                  key={tenant.user_id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                        {(tenant.first_name || tenant.username || "?").charAt(
                          0,
                        )}
                      </div>
                      <div>
                        {editingId === tenant.user_id ? (
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 mb-1"
                            value={editForm.first_name || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                first_name: e.target.value,
                              })
                            }
                            placeholder="ชื่อผู้เช่า"
                          />
                        ) : (
                          <p className="font-semibold text-gray-800">
                            {tenant.first_name} {tenant.last_name || ""}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          ID: {tenant.user_id}
                        </p>
                      </div>
                    </div>
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
                            {tenant.stall.slot_number} (ปัจจุบัน)
                          </option>
                        )}
                        {allStalls
                          .filter((s) => s.status === "VACANT")
                          .map((s) => (
                            <option key={s.slot_id} value={s.slot_id}>
                              {s.slot_number}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tenant.stall
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {tenant.stall ? tenant.stall.slot_number : "ไม่มี"}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} />
                        {tenant.email}
                      </div>
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
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Manage Contract Button */}
                      <button
                        onClick={() => handleManageContract(tenant)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="จัดการสัญญา"
                      >
                        <FileText size={18} />
                      </button>

                      {editingId === tenant.user_id ? (
                        <>
                          <button
                            onClick={() => handleSave(tenant.user_id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(tenant)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                    </div>
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
                      maxLength={12}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setContractForm({
                          ...contractForm,
                          phone: formatted,
                        });
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ที่อยู่ตามทะเบียนบ้าน/ปัจจุบัน
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      rows="2"
                      value={contractForm.address}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          address: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Section 2: Contract Info */}
              <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <FileText size={18} /> รายละเอียดสัญญา
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เลขที่ใบเสร็จรับเงิน
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={contractForm.receiptNumber}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          receiptNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประเภทเมนูอาหาร
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      placeholder="เช่น อาหารตามสั่ง, ก๋วยเตี๋ยว"
                      value={contractForm.menuType}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          menuType: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันที่ในใบเสร็จ
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      value={contractForm.receiptDate}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          receiptDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Fees & Fines */}
              <div className="md:col-span-2 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <Upload size={18} /> ค่าธรรมเนียมและค่าปรับ
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ค่าดักไขมัน (บาท)
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                      value={contractForm.greaseTrapFee}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          greaseTrapFee: e.target.value,
                        })
                      }
                    >
                      <option value="0">ไม่มี</option>
                      <option value="500">500</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ค่าปรับเช่าล่าช้า (บาท/วัน)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      placeholder="ระบุยอดเงิน หรือปล่อยว่าง"
                      value={contractForm.lateRentFine}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          lateRentFine: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 transition-all font-medium"
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                เพิ่มผู้เช่าใหม่
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลือกห้อง/ล็อก (ไม่บังคับ)
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                  value={addForm.stallId}
                  onChange={(e) =>
                    setAddForm({ ...addForm, stallId: e.target.value })
                  }
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {allStalls
                    .filter((s) => s.status === "VACANT")
                    .map((s) => (
                      <option key={s.slot_id} value={s.slot_id}>
                        {s.slot_number} ({s.size} ตร.ม. - {s.rent} บาท)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                  value={addForm.phone}
                  onChange={(e) =>
                    setAddForm({ ...addForm, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล (สำหรับล็อกอิน)
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 transition-all"
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
