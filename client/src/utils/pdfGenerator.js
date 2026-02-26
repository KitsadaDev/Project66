import jsPDF from "jspdf";
import "jspdf-autotable";

// NOTE: To support Thai language, we need a Thai font in Base64 format.
// Since providing a large Base64 string here is impractical, 
// we will use a standard font for now. Thai characters may appear as garbled text.
// To fix this, you need to convert a .ttf file (e.g., THSarabunNew) to Base64 
// and add it using doc.addFileToVFS and doc.addFont.

export const generateBillPDF = (bill) => {
  const doc = new jsPDF();

  // Add Font (Placeholder for Thai Font)
  // const myFont = "BASE64_STRING_HERE"; 
  // doc.addFileToVFS("MyFont.ttf", myFont);
  // doc.addFont("MyFont.ttf", "MyFont", "normal");
  // doc.setFont("MyFont");
  
  // For now, use standard font
  doc.setFont("helvetica"); 

  // Header
  doc.setFontSize(20);
  doc.text("INVOICE / BILL", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.text(`Bill ID: ${bill.expense_id || bill.id}`, 140, 40);
  doc.text(`Month: ${new Date(bill.billing_month || bill.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 140, 46);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 52);

  // Company Info (Left)
  doc.setFontSize(14);
  doc.text("BRU Food Court", 15, 40);
  doc.setFontSize(10);
  doc.text("Buriram Rajabhat University", 15, 46);
  doc.text("Phone: 044-611-221", 15, 52);

  // Tenant Info
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 60, 195, 60);

  doc.setFontSize(14);
  doc.text("Tenant Information", 15, 70);
  
  doc.setFontSize(12);
  doc.text(`Stall: ${bill.rental_slot?.slot_number || bill.stall?.slot_number || "-"}`, 15, 80);
  // Note: Tenant Name usage (Might be Thai, might break without font)
  // We will try to display it, relying on user to add font if needed.
  // Or we can use a sanitized version or check if it's english.
  doc.text(`Tenant Name: ${bill.tenant?.name || "-"}`, 15, 86);
  
  // Table
  const tableColumn = ["Description", "Units / Details", "Rate", "Amount"];
  const tableRows = [];

  // Rent
  tableRows.push([
    "Rental Fee",
    "Monthly",
    "-",
    parseFloat(bill.rent_amount).toLocaleString()
  ]);

  // Water
  if (bill.water_cost > 0) {
    tableRows.push([
      "Water",
      `${bill.waterUnits || 0} units`,
      `${bill.waterRate || 15} / unit`,
      parseFloat(bill.water_cost).toLocaleString()
    ]);
  }

  // Electric
  if (bill.electricity_cost > 0) {
    tableRows.push([
      "Electricity",
      `${bill.electricUnits || 0} units`,
      `${bill.electricRate || 8} / unit`,
      parseFloat(bill.electricity_cost).toLocaleString()
    ]);
  }

    // Grease Trap
    if (bill.greaseTrapFee > 0) {
        tableRows.push([
          "Grease Trap Fee",
          "Monthly",
          "-",
          parseFloat(bill.greaseTrapFee).toLocaleString()
        ]);
      }

  doc.autoTable({
    startY: 100,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [147, 93, 215] }, // Purple
    columnStyles: {
        3: { halign: 'right' }
    }
  });

  // Total
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(14);
  doc.text(`Total Amount: ${parseFloat(bill.total_amount).toLocaleString()} THB`, 195, finalY, { align: "right" });

  doc.setFontSize(10);
  doc.text(`Due Date: ${new Date(bill.dueDate).toLocaleDateString()}`, 195, finalY + 7, { align: "right" });

  // Status
  let statusText = bill.status;
  if(bill.status === 'PAID') statusText = "PAID";
  else if(bill.status === 'PENDING') statusText = "PENDING PAYMENT";
  else if(bill.status === 'OVERDUE') statusText = "OVERDUE";
  
  doc.setTextColor(bill.status === 'PAID' ? 'green' : (bill.status === 'OVERDUE' ? 'red' : 'orange'));
  doc.text(statusText, 195, finalY + 14, { align: "right" });

  // Save
  doc.save(`Invoice_${bill.rental_slot?.slot_number || bill.stall?.slot_number}_${bill.billing_month}.pdf`);
};
