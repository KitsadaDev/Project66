import { useEffect, useState } from "react";
import { Search, Phone, Mail, Building2, Utensils } from "lucide-react";
import { formatPhoneNumber } from "../../utils/formatters";
import { usersAPI, stallsAPI, contractsAPI } from "../../api";

/**
 * คอมโพเนนต์แสดงข้อมูลผู้เช่าทั้งหมดสำหรับผู้บริหาร (Executive Tenants - Read Only)
 * - แสดงตารางรายชื่อผู้เช่า, อีเมล, เบอร์โทร, แผงค้าที่เช่า, ประเภทอาหาร, และศูนย์อาหาร
 * - ทำการเชื่อมโยง (Match) ข้อมูลระหว่าง Users, Stalls และ Active Contracts
 * - รองรับการค้นหาตามชื่อ, อีเมล, รหัสแผงค้า, หรือประเภทอาหาร
 */
const ExecutiveTenants = () => {
  // รายการข้อมูลผู้เช่าที่เชื่อมโยงกับแผงค้าและสัญญาแล้ว
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ดึงข้อมูลเมื่อเปิดหน้าจอ
  useEffect(() => {
    fetchTenants();
  }, []);

  /**
   * ดึงข้อมูลผู้เช่าและข้อมูลที่เกี่ยวข้อง:
   * 1. ดึงบัญชีผู้ใช้ที่มี Role เป็น TENANT
   * 2. ดึงรายการแผงค้าทั้งหมด
   * 3. ดึงสัญญาเช่าที่เปิดใช้งานอยู่ (ACTIVE) เพื่อนำประเภทอาหาร (menuType) มาแสดง
   * 4. รวมข้อมูลผู้เช่า เข้ากับแผงค้าและสัญญาเช่า
   */
  const fetchTenants = async () => {
    try {
      // ดึงรายชื่อผู้เช่าทั้งหมด
      const usersRes = await usersAPI.getAll({ role: "TENANT" });
      const users = usersRes.data.data || [];

      let stalls = [];
      let contracts = [];

      // ดึงข้อมูลแผงค้า
      try {
        const stallsRes = await stallsAPI.getAll();
        stalls = stallsRes.data.data || [];
      } catch (error) {
        console.error("Error fetching stalls:", error);
      }

      // ดึงข้อมูลสัญญาเช่า (เพื่อนำประเภทอาหารมาแสดง)
      try {
        const contractsRes = await contractsAPI.getAll({ active: true });
        contracts = contractsRes.data.data || [];
      } catch (error) {
        console.error("Error fetching contracts:", error);
      }

      // จับคู่ข้อมูลผู้เช่ากับแผงค้าและสัญญา
      const tenantsWithStalls = users.map((user) => {
        const contract = contracts.find((c) => c.tenant_id === user.user_id);
        const stall = user.stall || (contract ? stalls.find((s) => s.slot_id === contract.slot_id) : null);
        return { ...user, stall, contract };
      });

      setTenants(tenantsWithStalls);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  // คัดกรองรายชื่อผู้เช่าตามข้อความค้นหา (ชื่อ, อีเมล, หมายเลขแผง, หรือประเภทอาหาร)
  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(search.toLowerCase()) ||
      tenant.stall?.slot_number?.toLowerCase().includes(search.toLowerCase()) ||
      tenant.contract?.menuType?.toLowerCase().includes(search.toLowerCase()),
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          ข้อมูลผู้เช่าทั้งหมด
        </h1>
        <p className="text-gray-500 text-sm">
          ดูข้อมูลผู้เช่า (ดูได้อย่างเดียว)
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="relative mb-6">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50 focus:bg-white transition-colors"
            placeholder="ค้นหาชื่อ, อีเมล, ล็อค หรือประเภทอาหาร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tl-xl text-sm">
                  ชื่อ
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  อีเมล
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  เบอร์โทร
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  แผงค้า
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                  ประเภทอาหาร
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 rounded-tr-xl text-sm">
                  ศูนย์อาหาร
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr
                  key={tenant.user_id}
                  className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors"
                >
                  <td className="py-4 px-6">
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
                      <span className="font-medium text-gray-800">
                        {tenant.first_name} {tenant.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Mail size={14} className="text-gray-400" />
                      {tenant.email}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Phone size={14} className="text-gray-400" />
                      {formatPhoneNumber(tenant.phone) || "-"}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {tenant.stall ? (
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-purple-500" />
                        <span className="font-bold text-gray-800">
                          {tenant.stall.slot_number}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">ไม่มีแผงค้า</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Utensils size={14} className="text-gray-400" />
                      {tenant.contract?.menuType || "-"}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600 text-sm">
                    {tenant.stall
                      ? `ศูนย์อาหาร ${tenant.stall.food_court_id}`
                      : "-"}
                  </td>
                </tr>
              ))}
              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    ไม่พบข้อมูลผู้เช่า
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveTenants;
