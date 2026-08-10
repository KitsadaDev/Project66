import { useEffect, useState } from "react";
import {
  FileText,
  Calendar,
  Home,
  Clock,
  CheckCircle,
  Info,
  CreditCard,
} from "lucide-react";
import { formatPhoneNumber } from "../../utils/formatters";
import { contractsAPI, stallsAPI } from "../../api";

const Contracts = () => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active contracts for this tenant
      const response = await contractsAPI.getAll({ status: "ACTIVE" });
      const myContract = response.data.data?.[0]; // Assuming one active contract per tenant

      if (myContract) {
        // Calculate duration
        const start = new Date(myContract.start_date);
        const end = new Date(myContract.end_date);
        const diffMonths =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());

        setContract({
          ...myContract,
          contractDisplayNumber: myContract.contract_number,
          duration: diffMonths || 12,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
            สัญญาเช่า
          </h1>
          <p className="text-gray-500 text-sm">รายละเอียดสัญญาเช่าล็อคของคุณ</p>
        </div>
        {contract && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            <CheckCircle size={16} /> สัญญามีผลบังคับ
          </span>
        )}
      </div>

      {contract ? (
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          {/* Header */}
          <div className="bg-purple-50 p-6 md:p-8 flex items-center justify-between border-b border-purple-100">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-purple-600">
                <FileText size={32} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
                  {contract.contractDisplayNumber}
                </h2>
                <p className="text-gray-500 text-sm">เลขที่สัญญา</p>
              </div>
            </div>
            {contract.contractImage && (
              <a
                href={contract.contractImage}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
              >
                <FileText size={16} /> ดูสัญญาฉบับจริง ↗
              </a>
            )}
          </div>

          {contract.contractImage && (
            <div className="sm:hidden mx-6 mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-purple-600 shrink-0" />
                <span className="text-xs font-semibold text-gray-800">สัญญาฉบับจริง</span>
              </div>
              <a
                href={contract.contractImage}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-purple-600 text-white font-medium text-xs rounded-lg"
              >
                เปิดดู ↗
              </a>
            </div>
          )}

          {/* Key Info Grid */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Home size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">ล็อคที่เช่า</p>
                <p className="text-lg font-bold text-gray-800">
                  {contract.slot?.slot_number}
                </p>
                <p className="text-xs text-gray-500">
                  ศูนย์อาหาร {contract.slot?.food_court?.name}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">วันเริ่มสัญญา</p>
                <p className="font-semibold text-gray-800">
                  {formatDate(contract.start_date)}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">วันสิ้นสุดสัญญา</p>
                <p className="font-semibold text-gray-800">
                  {formatDate(contract.end_date)}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">ระยะเวลาสัญญา</p>
                <p className="font-semibold text-gray-800">
                  {contract.duration} เดือน
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Info Sections */}
          <div className="px-6 pb-6 md:px-8 md:pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Col: Tenant Data & Receipt */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Info size={18} className="text-purple-500" /> ข้อมูลผู้เช่า
                  (ตามสัญญา)
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ชื่อ-นามสกุล</span>
                    <span className="font-medium text-gray-800">
                      {contract.tenant?.first_name} {contract.tenant?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">เลขบัตรประชาชน</span>
                    <span className="font-medium text-gray-800">
                      {contract.idCard || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">เบอร์โทรศัพท์</span>
                    <span className="font-medium text-gray-800">
                      {formatPhoneNumber(contract.phone) || "-"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="block text-gray-500 mb-1">ที่อยู่</span>
                    <p className="font-medium text-gray-800 leading-relaxed">
                      {contract.address || "-"}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="block text-gray-500 mb-1">
                      ประเภทเมนูอาหาร
                    </span>
                    <p className="font-medium text-gray-800 leading-relaxed">
                      {contract.menuType || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />{" "}
                  หลักฐานการชำระเงิน
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">เลขที่ใบเสร็จรับเงิน</span>
                    <span className="font-medium text-gray-800 font-mono">
                      {contract.receiptNumber || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">วันที่ชำระ</span>
                    <span className="font-medium text-gray-800">
                      {formatDate(contract.receiptDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Financials */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 h-fit">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-green-500" />{" "}
                รายละเอียดค่าใช้จ่าย
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                  <span className="text-gray-600">ค่าเช่ารายเดือน</span>
                  <span className="font-bold text-gray-800">
                    ฿{contract.slot?.rent?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                  <span className="text-gray-600">เงินประกันสัญญา</span>
                  <span className="font-bold text-gray-800">
                    ฿{contract.deposit_amount?.toLocaleString() || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
                  <span className="text-gray-600">ค่าดักไขมัน</span>
                  <span className="font-bold text-gray-800">
                    {contract.menuType === "ของคาว" ? "ตามที่กำหนด" : "ฟรี"}
                  </span>
                </div>

                {/* Fines Section */}
                {(contract.lateRentFine || contract.lateUtilityFine) && (
                  <div className="mt-2 bg-red-50 p-4 rounded-lg border border-red-100">
                    <p className="text-red-800 font-semibold mb-2 text-sm">
                      อัตราค่าปรับ
                    </p>
                    {contract.lateRentFine && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-red-600">ปรับค่าเช่าล่าช้า</span>
                        <span className="font-bold text-red-700">
                          ฿{contract.lateRentFine}/วัน
                        </span>
                      </div>
                    )}
                    {contract.lateUtilityFine && (
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">
                          ปรับค่าน้ำ/ไฟล่าช้า
                        </span>
                        <span className="font-bold text-red-700">
                          ฿{contract.lateUtilityFine}/วัน
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">ไม่พบข้อมูลสัญญาเช่า</p>
        </div>
      )}
    </div>
  );
};

export default Contracts;
