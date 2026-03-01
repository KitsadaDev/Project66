import jsPDF from "jspdf";
import "jspdf-autotable";

// NOTE: To support Thai language, we need a Thai font in Base64 format.
// Since providing a large Base64 string here is impractical, 
// we will use a standard font for now. Thai characters may appear as garbled text.
// To fix this, you need to convert a .ttf file (e.g., THSarabunNew) to Base64 
// and add it using doc.addFileToVFS and doc.addFont.

export const generateBillPDF = (bill) => {
  const doc = new jsPDF();

  // Branding Colors
  const primaryColor = [147, 51, 234]; // Purple (9333EA)
  const secondaryColor = [107, 114, 128]; // Gray (6B7280)
  const successColor = [34, 197, 94]; // Green (22C55E)
  const warningColor = [245, 158, 11]; // Orange (F59E0B)
  const errorColor = [239, 68, 68]; // Red (EF4444)

  doc.setFont("helvetica");

  // Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, "F");

  // Invoice Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 15, 25);

  // Bill ID & Date in Header
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`NO: ${bill.contract_number || bill.expense_id || bill.id}`, 195, 20, { align: "right" });
  doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 195, 26, { align: "right" });

  // Company Info (Vendor)
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("BRU Food Court", 15, 55);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...secondaryColor);
  doc.text("Buriram Rajabhat University", 15, 61);
  doc.text("8 Lampai Mat Rd, Nai Muang", 15, 66);
  doc.text("Buriram, 31000", 15, 71);
  doc.text("Phone: 044-611-221", 15, 76);

  // Billing To (Customer Info)
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 120, 55);

  const tenantFirstName = bill.contract?.tenant?.first_name || bill.tenant?.first_name || "-";
  const tenantLastName = bill.contract?.tenant?.last_name || bill.tenant?.last_name || "";
  const stallNumber = bill.contract?.slot?.slot_number || bill.slot?.slot_number || "-";
  const foodCourtName = bill.contract?.slot?.food_court?.name || bill.slot?.food_court?.name || "-";

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${tenantFirstName} ${tenantLastName}`, 120, 62);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...secondaryColor);
  doc.text(`Stall: ${stallNumber}`, 120, 68);
  doc.text(`Location: ${foodCourtName}`, 120, 73);
  doc.text(`Billing Month: ${new Date(bill.billing_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 120, 78);

  // Table Data Preparation
  const tableColumn = ["Description", "Quantity/Units", "Rate", "Amount"];
  const tableRows = [];

  // Rent
  tableRows.push([
    { content: "Rental Fee", styles: { fontStyle: 'bold' } },
    "1 Month",
    (bill.rent_amount || 0).toLocaleString(),
    (bill.rent_amount || 0).toLocaleString()
  ]);

  // Water
  if (bill.water_cost > 0) {
    tableRows.push([
      "Water Usage",
      `${bill.water_units || 0} Units`,
      (bill.water_rate || 0).toLocaleString(),
      (bill.water_cost || 0).toLocaleString()
    ]);
  }

  // Electric
  if (bill.electricity_cost > 0) {
    tableRows.push([
      "Electricity Usage",
      `${bill.electricity_units || 0} Units`,
      (bill.electricity_rate || 0).toLocaleString(),
      (bill.electricity_cost || 0).toLocaleString()
    ]);
  }

  // Grease Trap
  if (bill.grease_trap_fee > 0) {
    tableRows.push([
      "Grease Trap Service",
      "1 Month",
      (bill.grease_trap_fee || 0).toLocaleString(),
      (bill.grease_trap_fee || 0).toLocaleString()
    ]);
  }

  // Late Fee
  if (bill.late_fee > 0) {
    tableRows.push([
      { content: "Late Payment Penalty", styles: { textColor: errorColor } },
      "-",
      "-",
      (bill.late_fee || 0).toLocaleString()
    ]);
  }

  // Draw Table
  doc.autoTable({
    startY: 90,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 11,
      halign: 'center'
    },
    bodyStyles: { 
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  // Summary Area
  const finalY = doc.lastAutoTable.finalY + 15;
  
  // Draw light gray line
  doc.setDrawColor(230, 230, 230);
  doc.line(120, finalY - 5, 195, finalY - 5);

  // Total
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("TOTAL AMOUNT:", 120, finalY);
  doc.setTextColor(...primaryColor);
  doc.text(`THB ${parseFloat(bill.total_amount || 0).toLocaleString()}`, 195, finalY, { align: "right" });

  // Due Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...secondaryColor);
  const dueDate = bill.due_date || bill.dueDate;
  doc.text("Due Date:", 120, finalY + 8);
  doc.setTextColor(100, 100, 100);
  doc.text(dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '-', 195, finalY + 8, { align: "right" });

  // Status Badge
  const statusX = 15;
  const statusY = finalY - 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  
  let statusColor = warningColor;
  let statusText = "PENDING PAYMENT";
  
  if (bill.status === "PAID") {
    statusColor = successColor;
    statusText = "PAID";
  } else if (bill.status === "OVERDUE") {
    statusColor = errorColor;
    statusText = "OVERDUE";
  }

  doc.setFillColor(...statusColor);
  doc.roundedRect(statusX, statusY, 45, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, statusX + 22.5, statusY + 6.5, { align: "center" });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text("Thank you for your business!", 105, pageHeight - 20, { align: "center" });
  doc.text("Buriram Rajabhat University Food Court Management System", 105, pageHeight - 15, { align: "center" });

  // Save PDF
  const fileName = `Invoice_${stallNumber}_${new Date(bill.billing_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}.pdf`;
  doc.save(fileName);
};
