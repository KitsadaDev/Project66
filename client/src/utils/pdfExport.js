// ─── PDF Export Utilities ───────────────────────────────────────────────────

/**
 * Generates a conic-gradient CSS string for a donut chart
 */
function getConicStyle(slices, total) {
  if (!total || total === 0) return 'background: #E5E7EB;';
  var cumulative = 0;
  var stops = slices.map(function(slice) {
    var start = cumulative;
    var pct = (slice.value / total) * 100;
    cumulative += pct;
    return slice.color + ' ' + start + '% ' + cumulative + '%';
  });
  return 'background: conic-gradient(' + stops.join(', ') + ');';
}

/**
 * Open an HTML string in a new window and trigger print dialog
 */
function openPrintWindow(html) {
  var w = window.open('', '_blank');
  if (!w) {
    alert('กรุณาอนุญาต Pop-up เพื่อส่งออก PDF');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = function() {
    setTimeout(function() { w.print(); }, 300);
  };
}

// ─── Common CSS ─────────────────────────────────────────────────────────────
var BASE_CSS = [
  "@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap');",
  "body { font-family: 'Sarabun', Arial, sans-serif; padding: 24px; color: #1F2937; }",
  '.header { text-align: center; padding-bottom: 12px; margin-bottom: 20px; }',
  '.header h1 { font-size: 22px; margin: 0 0 6px 0; }',
  '.header p { color: #6B7280; font-size: 13px; margin: 0; }',
  'table { width: 100%; border-collapse: collapse; margin-top: 10px; }',
  'th, td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; font-size: 11px; }',
  'th { background-color: #F3F4F6; color: #374151; font-weight: bold; }',
  'tr:nth-child(even) { background-color: #FAFAFA; }',
  '.badge { display: inline-block; padding: 3px 6px; border-radius: 12px; font-size: 9px; font-weight: bold; }',
  '.footer { margin-top: 30px; text-align: right; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding-top: 10px; }',
  '@media print { body { padding: 0; } }',
].join('\n');

// ─── Maintenance Report ──────────────────────────────────────────────────────

export function exportMaintenanceReportPDF(repairs, titleExtra, categoryList, slotList, maxSlotCount) {
  titleExtra = titleExtra || '';
  categoryList = categoryList || [];
  slotList = slotList || [];
  maxSlotCount = maxSlotCount || 1;

  var today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  var pendingCount = repairs.filter(function(r) { return r.status === 'PENDING'; }).length;
  var inProgressCount = repairs.filter(function(r) { return r.status === 'IN_PROGRESS'; }).length;
  var completedCount = repairs.filter(function(r) { return r.status === 'COMPLETED'; }).length;

  // Build category bars
  var catBarsHtml = '';
  categoryList.forEach(function(item) {
    catBarsHtml += '<div style="margin-bottom:8px;">';
    catBarsHtml += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">';
    catBarsHtml += '<span>' + item.category + ' (' + item.count + ' ครั้ง)</span>';
    catBarsHtml += '<span style="color:#6B7280;font-weight:bold;">' + item.percent + '%</span>';
    catBarsHtml += '</div>';
    catBarsHtml += '<div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;">';
    catBarsHtml += '<div style="height:100%;width:' + item.percent + '%;background:' + item.color + ';"></div>';
    catBarsHtml += '</div></div>';
  });

  // Build slot bars
  var slotBarsHtml = '';
  slotList.forEach(function(item, index) {
    var pct = maxSlotCount > 0 ? Math.round((item.count / maxSlotCount) * 100) : 0;
    var rankLabel = (index + 1) + '.';
    slotBarsHtml += '<div style="margin-bottom:8px;">';
    slotBarsHtml += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">';
    slotBarsHtml += '<span>' + rankLabel + ' ' + item.slot_number + '</span>';
    slotBarsHtml += '<span style="color:#80639A;font-weight:bold;">' + item.count + ' ครั้ง</span>';
    slotBarsHtml += '</div>';
    slotBarsHtml += '<div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;">';
    slotBarsHtml += '<div style="height:100%;width:' + pct + '%;background:#80639A;"></div>';
    slotBarsHtml += '</div></div>';
  });

  // Build charts section
  var chartsSection = '';
  if (categoryList.length > 0 || slotList.length > 0) {
    chartsSection = '<div style="display:flex;gap:20px;margin-bottom:20px;">';
    if (categoryList.length > 0) {
      chartsSection += '<div style="flex:1;background:#F9FAFB;padding:12px;border-radius:8px;border:1px solid #E5E7EB;">';
      chartsSection += '<div style="font-size:13px;font-weight:bold;margin-bottom:10px;color:#374151;border-bottom:1px solid #E5E7EB;padding-bottom:4px;">🏷️ ประเภทงานซ่อมบ่อย</div>';
      chartsSection += catBarsHtml + '</div>';
    }
    if (slotList.length > 0) {
      chartsSection += '<div style="flex:1;background:#F9FAFB;padding:12px;border-radius:8px;border:1px solid #E5E7EB;">';
      chartsSection += '<div style="font-size:13px;font-weight:bold;margin-bottom:10px;color:#374151;border-bottom:1px solid #E5E7EB;padding-bottom:4px;">ล็อกแจ้งซ่อมบ่อยสุด</div>';
      chartsSection += slotBarsHtml + '</div>';
    }
    chartsSection += '</div>';
  }

  // Build rows
  var rowsHtml = '';
  if (repairs.length === 0) {
    rowsHtml = '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;">ไม่มีข้อมูลการแจ้งซ่อม</td></tr>';
  } else {
    repairs.forEach(function(item) {
      var dateStr = item.requested_at ? new Date(item.requested_at).toLocaleDateString('th-TH') : '-';
      var slotNo = (item.rental_slot && item.rental_slot.slot_number) || (item.slot && item.slot.slot_number) || '-';
      var assignee = '-';
      if (item.assignments && item.assignments[0] && item.assignments[0].assignee) {
        var a = item.assignments[0].assignee;
        assignee = ((a.first_name || '') + ' ' + (a.last_name || '')).trim();
      }
      var statusMap = { COMPLETED: 'เสร็จสิ้น', IN_PROGRESS: 'กำลังดำเนินการ', PENDING: 'รอดำเนินการ' };
      var statusText = statusMap[item.status] || item.status;
      var catSpan = item.category ? '<br><span style="color:#6B7280;font-size:9px;">' + item.category + '</span>' : '';
      rowsHtml += '<tr>';
      rowsHtml += '<td>' + dateStr + '</td>';
      rowsHtml += '<td>' + slotNo + '</td>';
      rowsHtml += '<td><strong>' + (item.title || '-') + '</strong>' + catSpan + '</td>';
      rowsHtml += '<td>' + assignee + '</td>';
      rowsHtml += '<td><span class="badge status-' + item.status + '">' + statusText + '</span></td>';
      rowsHtml += '</tr>';
    });
  }

  var extraCss = [
    '.status-COMPLETED { background:#DCFCE7; color:#166534; }',
    '.status-IN_PROGRESS { background:#DBEAFE; color:#1E40AF; }',
    '.status-PENDING { background:#FEF3C7; color:#92400E; }',
    '.summary-box { display:flex; justify-content:space-between; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:12px 16px; margin-bottom:20px; }',
    '.summary-item { text-align:center; flex:1; }',
    '.summary-item .num { font-size:18px; font-weight:bold; }',
    '.summary-item .label { font-size:11px; color:#6B7280; }',
  ].join('\n');

  var titleExtraText = titleExtra ? '(' + titleExtra + ')' : '';
  var html = '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>รายงานซ่อมบำรุง</title>';
  html += '<style>' + BASE_CSS + '\n' + extraCss + '\n';
  html += '.header h1 { color:#7C3AED; } .header { border-bottom:2px solid #7C3AED; }';
  html += '</style></head><body>';
  html += '<div class="header"><h1>รายงานสรุปการแจ้งซ่อมบำรุง</h1>';
  html += '<p>ระบบจัดการศูนย์อาหาร Food Court System ' + titleExtraText + '</p></div>';
  html += '<div class="summary-box">';
  html += '<div class="summary-item"><div class="num">' + repairs.length + '</div><div class="label">งานทั้งหมด</div></div>';
  html += '<div class="summary-item"><div class="num" style="color:#92400E;">' + pendingCount + '</div><div class="label">รอดำเนินการ</div></div>';
  html += '<div class="summary-item"><div class="num" style="color:#1E40AF;">' + inProgressCount + '</div><div class="label">กำลังดำเนินการ</div></div>';
  html += '<div class="summary-item"><div class="num" style="color:#166534;">' + completedCount + '</div><div class="label">เสร็จสิ้น</div></div>';
  html += '</div>';
  html += chartsSection;
  html += '<table><thead><tr>';
  html += '<th style="width:15%;">วันที่แจ้ง</th><th style="width:15%;">ล็อก</th>';
  html += '<th style="width:30%;">รายการแจ้งซ่อม</th><th style="width:20%;">ผู้รับผิดชอบ</th><th style="width:20%;">สถานะ</th>';
  html += '</tr></thead><tbody>' + rowsHtml + '</tbody></table>';
  html += '<div class="footer">วันที่ออกเอกสาร: ' + today + ' | ออกรายงานโดยระบบอัตโนมัติ</div>';
  html += '</body></html>';

  openPrintWindow(html);
}

// ─── Bills Report ────────────────────────────────────────────────────────────

export function exportBillsReportPDF(bills, titleExtra, paidBills, waitingBills, pendingBills, unbilledBills, targetBase, paidRate) {
  titleExtra = titleExtra || '';
  paidBills = paidBills || 0;
  waitingBills = waitingBills || 0;
  pendingBills = pendingBills || 0;
  unbilledBills = unbilledBills || 0;
  targetBase = targetBase || 0;
  paidRate = paidRate || 0;

  var today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  var tableBills = bills.filter(function(b) { return b.status === 'PENDING' || b.status === 'OVERDUE'; });
  var overdueCount = tableBills.filter(function(b) { return b.status === 'OVERDUE'; }).length;
  var totalAmount = tableBills.reduce(function(sum, b) { return sum + Number(b.total_amount || 0); }, 0);

  // Donut using CSS conic-gradient
  var slices = [
    { color: '#10B981', value: paidBills },
    { color: '#F59E0B', value: waitingBills },
    { color: '#EF4444', value: pendingBills },
    { color: '#9CA3AF', value: unbilledBills },
  ];
  var conicStyle = getConicStyle(slices, targetBase);

  // Build rows
  var rowsHtml = '';
  if (tableBills.length === 0) {
    rowsHtml = '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;">ไม่มีบิลค้างชำระ</td></tr>';
  } else {
    tableBills.forEach(function(item) {
      var dueDateStr = (item.due_date || item.dueDate) ? new Date(item.due_date || item.dueDate).toLocaleDateString('th-TH') : '-';
      var tenant = item.tenant || (item.rental_contract && item.rental_contract.tenant);
      var tenantName = tenant ? ((tenant.first_name || '') + ' ' + (tenant.last_name || '')).trim() : '-';
      var slot = item.rental_slot || (item.rental_contract && item.rental_contract.rental_slot);
      var slotNo = slot && slot.slot_number ? 'ล็อก ' + slot.slot_number : '';
      var statusText = item.status === 'OVERDUE' ? 'เกินกำหนด' : 'รอชำระ';
      var slotSpan = slotNo ? '<br><span style="color:#6B7280;font-size:9px;">' + slotNo + '</span>' : '';
      rowsHtml += '<tr>';
      rowsHtml += '<td>#' + (item.expense_id || item.bill_number || '-') + '</td>';
      rowsHtml += '<td><strong>' + tenantName + '</strong>' + slotSpan + '</td>';
      rowsHtml += '<td>' + dueDateStr + '</td>';
      rowsHtml += '<td><span class="badge status-' + item.status + '">' + statusText + '</span></td>';
      rowsHtml += '<td style="text-align:right;font-weight:bold;color:#DC2626;">฿' + Number(item.total_amount || 0).toLocaleString() + '</td>';
      rowsHtml += '</tr>';
    });
  }

  var titleExtraText = titleExtra ? '(' + titleExtra + ')' : '';
  var extraCss = [
    '.status-OVERDUE { background:#FEE2E2; color:#991B1B; }',
    '.status-PENDING { background:#FEF3C7; color:#92400E; }',
    '.legend-row { display:flex; align-items:center; margin-bottom:6px; font-size:12px; }',
    '.legend-dot { width:10px; height:10px; border-radius:50%; margin-right:6px; flex-shrink:0; }',
    '.legend-label { flex:1; color:#374151; }',
    '.legend-val { font-weight:bold; }',
    '.donut-wrap { width:130px; height:130px; border-radius:50%; position:relative; margin:0 auto 14px; ' + conicStyle + ' -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    '.donut-hole { width:88px; height:88px; background:#fff; border-radius:50%; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; justify-content:center; }',
    '.summary-box { display:flex; flex-wrap:wrap; gap:10px; background:#FEF2F2; border:1px solid #FCA5A5; border-radius:8px; padding:16px; }',
    '.summary-item { flex:1 1 45%; }',
    '.summary-item .num { font-size:18px; font-weight:bold; color:#991B1B; }',
    '.summary-item .label { font-size:11px; color:#991B1B; }',
  ].join('\n');

  var html = '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>รายงานบิลค่าเช่า</title>';
  html += '<style>' + BASE_CSS + '\n' + extraCss + '\n';
  html += '.header h1 { color:#DC2626; } .header { border-bottom:2px solid #EF4444; }';
  html += '</style></head><body>';
  html += '<div class="header"><h1>รายงานบิลค่าเช่า</h1>';
  html += '<p>ระบบจัดการศูนย์อาหาร Food Court System ' + titleExtraText + '</p></div>';

  // Top Section: donut + summary
  html += '<div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:20px;">';
  // Left: donut
  html += '<div style="flex:0 0 180px;text-align:center;">';
  html += '<div class="donut-wrap">';
  html += '<div class="donut-hole"><div style="font-size:18px;font-weight:bold;color:#1F2937;">' + paidRate + '%</div><div style="font-size:10px;color:#6B7280;">อัตราจัดเก็บ</div></div>';
  html += '</div>';
  html += '<div class="legend-row"><div class="legend-dot" style="background:#10B981;"></div><div class="legend-label">ชำระแล้ว</div><div class="legend-val">' + paidBills + '</div></div>';
  html += '<div class="legend-row"><div class="legend-dot" style="background:#F59E0B;"></div><div class="legend-label">รอยืนยันสลิป</div><div class="legend-val">' + waitingBills + '</div></div>';
  html += '<div class="legend-row"><div class="legend-dot" style="background:#EF4444;"></div><div class="legend-label">รอชำระ/เกินกำหนด</div><div class="legend-val">' + pendingBills + '</div></div>';
  html += '<div class="legend-row"><div class="legend-dot" style="background:#9CA3AF;"></div><div class="legend-label">ยังไม่ออกบิล</div><div class="legend-val">' + unbilledBills + '</div></div>';
  html += '</div>';
  // Right: summary
  html += '<div style="flex:1;">';
  html += '<h3 style="font-size:14px;margin:0 0 10px;color:#374151;">สรุปยอดค้างชำระทั้งหมด</h3>';
  html += '<div class="summary-box">';
  html += '<div class="summary-item"><div class="num">' + tableBills.length + '</div><div class="label">บิลค้างชำระทั้งหมด</div></div>';
  html += '<div class="summary-item"><div class="num">' + overdueCount + '</div><div class="label">เกินกำหนด (Overdue)</div></div>';
  html += '<div class="summary-item" style="flex-basis:100%;margin-top:10px;"><div class="num" style="font-size:22px;color:#DC2626;">฿' + totalAmount.toLocaleString() + '</div><div class="label">ยอดค้างชำระรวม (บาท)</div></div>';
  html += '</div></div></div>';

  html += '<h3 style="font-size:14px;margin:20px 0 5px;color:#374151;">รายการบิลที่ค้างชำระ (Pending / Overdue)</h3>';
  html += '<table><thead><tr>';
  html += '<th style="width:15%;">เลขที่บิล</th><th style="width:25%;">ผู้เช่า / ล็อก</th>';
  html += '<th style="width:20%;">กำหนดชำระ</th><th style="width:20%;">สถานะ</th>';
  html += '<th style="width:20%;text-align:right;">จำนวนเงิน (บาท)</th>';
  html += '</tr></thead><tbody>' + rowsHtml + '</tbody></table>';
  html += '<div class="footer">วันที่ออกเอกสาร: ' + today + ' | ออกรายงานโดยระบบอัตโนมัติ</div>';
  html += '</body></html>';

  openPrintWindow(html);
}
