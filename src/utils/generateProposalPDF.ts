/**
 * Generates a professional Hebrew price quote PDF using browser print functionality.
 * Redesigned layout with company branding, VAT calculations, and dual signature areas.
 */

import { getPaymentTermLabel } from '@/constants/paymentTerms';

export interface FeeLineItem {
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  isOptional?: boolean;
  chargeType?: string;
  duration?: number;
}

export interface ProposalPDFData {
  advisorName?: string;
  supplierName?: string;
  projectName: string;
  advisorType?: string;
  price: number;
  timelineDays: number;
  submittedAt: string;
  currency?: string;
  scopeText?: string;
  consultantNotes?: string;
  selectedServices?: string[];
  servicesNotes?: string;
  conditions?: {
    payment_terms?: string;
    payment_term_type?: string;
    assumptions?: string;
    exclusions?: string;
    validity_days?: number;
  };
  feeItems?: FeeLineItem[];
  milestones?: Array<{
    description: string;
    percentage: number;
  }>;
  signaturePng?: string;
  stampImage?: string;
  // New fields (all optional — callers pass what they have)
  advisorId?: string;        // ת.ז. / ח.פ.
  advisorPhone?: string;
  advisorEmail?: string;
  advisorCompany?: string;
  status?: 'draft' | 'approved' | string;
  version?: number;
  companyLogoUrl?: string;
  startDate?: string;        // ISO date string
}

// ── helpers ──────────────────────────────────────────────────────────

const VAT_RATE = 0.18;

function fmtCurrency(amount: number, code: string): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
  }).format(amount);
}

function fmtDateDDMMYYYY(dateString: string): string {
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getItemTotal(item: FeeLineItem): number {
  if (item.total !== undefined && item.total !== null && !isNaN(item.total) && item.total > 0) {
    return item.total;
  }
  const base = (item.unitPrice || 0) * (item.quantity || 1);
  if (item.chargeType && item.chargeType !== 'one_time' && item.duration && item.duration > 0) {
    return base * item.duration;
  }
  return base;
}

function chargeTypeLabel(ct?: string): string {
  const m: Record<string, string> = {
    one_time: 'חד פעמי',
    monthly: 'חודשי',
    hourly: 'לשעה',
    per_visit: 'לביקור',
    per_unit: 'ליחידה',
  };
  return ct ? m[ct] || ct : '';
}

// ── section builders ─────────────────────────────────────────────────

function buildHeader(data: ProposalPDFData): string {
  const displayName = data.supplierName || data.advisorName || '';
  const dateStr = fmtDateDDMMYYYY(data.submittedAt);

  const logoHtml = data.companyLogoUrl
    ? `<img src="${data.companyLogoUrl}" alt="לוגו" class="logo" />`
    : data.stampImage
      ? `<img src="${data.stampImage}" alt="לוגו" class="logo" />`
      : `<div class="logo-placeholder">לוגו</div>`;

  let statusBadge = '';
  if (data.status === 'approved') {
    statusBadge = `<span class="badge badge-approved">גרסה שאושרה${data.version ? ` (v${data.version})` : ''}</span>`;
  } else if (data.status) {
    statusBadge = `<span class="badge badge-draft">סטטוס: טיוטה${data.version ? ` (v${data.version})` : ''}</span>`;
  }

  return `
    <div class="header">
      <div class="header-top">
        <div class="header-logo">${logoHtml}</div>
        <div class="header-title">
          <h1>הצעת מחיר</h1>
          <p class="project-name">${data.projectName}</p>
          ${data.advisorType ? `<p class="advisor-type">${data.advisorType}</p>` : ''}
        </div>
      </div>
      <div class="header-meta">
        <span class="date">תאריך: ${dateStr}</span>
        ${statusBadge}
      </div>
      ${displayName ? `<p class="submitted-by">הוגש ע״י: ${displayName}${data.advisorCompany ? ` | ${data.advisorCompany}` : ''}</p>` : ''}
    </div>`;
}

function buildConsultantDetails(data: ProposalPDFData): string {
  const name = data.supplierName || data.advisorName;
  if (!name && !data.advisorId && !data.advisorPhone && !data.advisorEmail) return '';

  const rows: string[] = [];
  if (name) rows.push(`<div class="detail-item"><span class="detail-label">שם:</span><span>${name}</span></div>`);
  if (data.advisorCompany) rows.push(`<div class="detail-item"><span class="detail-label">חברה:</span><span>${data.advisorCompany}</span></div>`);
  if (data.advisorId) rows.push(`<div class="detail-item"><span class="detail-label">ת.ז./ח.פ.:</span><span>${data.advisorId}</span></div>`);
  if (data.advisorPhone) rows.push(`<div class="detail-item"><span class="detail-label">טלפון:</span><span dir="ltr">${data.advisorPhone}</span></div>`);
  if (data.advisorEmail) rows.push(`<div class="detail-item"><span class="detail-label">דוא״ל:</span><span dir="ltr">${data.advisorEmail}</span></div>`);

  return `
    <div class="section">
      <h2 class="section-title">פרטי היועץ</h2>
      <div class="details-grid">${rows.join('')}</div>
    </div>`;
}

function buildScopeOfWork(data: ProposalPDFData): string {
  if (!data.scopeText && (!data.selectedServices || data.selectedServices.length === 0) && !data.consultantNotes) return '';

  let inner = '';
  if (data.scopeText) {
    inner += `<div class="scope-text">${data.scopeText}</div>`;
  }
  if (data.selectedServices && data.selectedServices.length > 0) {
    inner += `<h3 class="subsection-title">שירותים נבחרים</h3>
      <ul class="services-list">${data.selectedServices.map(s => `<li>${s}</li>`).join('')}</ul>`;
    if (data.servicesNotes) {
      inner += `<p class="note-text">${data.servicesNotes}</p>`;
    }
  }
  if (data.consultantNotes) {
    inner += `<h3 class="subsection-title">הערות היועץ</h3><div class="consultant-notes">${data.consultantNotes}</div>`;
  }

  return `
    <div class="section">
      <h2 class="section-title">היקף העבודה ופירוט שירותים</h2>
      ${inner}
    </div>`;
}

function buildFeeTable(items: FeeLineItem[], title: string, currency: string): string {
  if (items.length === 0) return '';
  const total = items.reduce((s, i) => s + getItemTotal(i), 0);

  const rows = items.map((item, idx) => {
    const isRecurring = item.chargeType && item.chargeType !== 'one_time' && item.duration;
    const itemTotal = getItemTotal(item);
    let desc = item.description;
    if (isRecurring && item.unitPrice) {
      desc += `<br/><span class="recurring-detail">${fmtCurrency(item.unitPrice, currency)}/${chargeTypeLabel(item.chargeType)} × ${item.duration}</span>`;
    }
    return `
      <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="col-num">${idx + 1}</td>
        <td>${desc}</td>
        <td class="col-center">${item.quantity || 1}</td>
        <td class="col-center">${item.unit || 'יחידה'}</td>
        <td class="col-price">${item.unitPrice ? fmtCurrency(item.unitPrice, currency) : '-'}</td>
        <td class="col-price col-bold">${fmtCurrency(itemTotal, currency)}</td>
      </tr>`;
  }).join('');

  return `
    <h3 class="table-title">${title}</h3>
    <table>
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>תיאור</th>
          <th class="col-center" style="width:60px">כמות</th>
          <th class="col-center" style="width:80px">יחידה</th>
          <th class="col-price" style="width:110px">מחיר יחידה</th>
          <th class="col-price" style="width:110px">סה״כ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="subtotal-row">
          <td colspan="5" class="subtotal-label">סה״כ ${title}</td>
          <td class="col-price col-bold">${fmtCurrency(total, currency)}</td>
        </tr>
      </tbody>
    </table>`;
}

function buildPricingSection(data: ProposalPDFData, currency: string): string {
  if (!data.feeItems || data.feeItems.length === 0) return '';

  const mandatory = data.feeItems.filter(i => !i.isOptional);
  const optional = data.feeItems.filter(i => i.isOptional);
  const mandatoryTotal = mandatory.reduce((s, i) => s + getItemTotal(i), 0);
  const optionalTotal = optional.reduce((s, i) => s + getItemTotal(i), 0);
  const grandBeforeVat = mandatoryTotal + optionalTotal;
  const vat = Math.round(grandBeforeVat * VAT_RATE);
  const grandWithVat = grandBeforeVat + vat;

  let html = '<div class="section">';
  if (mandatory.length) html += buildFeeTable(mandatory, 'פירוט שכר טרחה', currency);
  if (optional.length) html += buildFeeTable(optional, 'פריטים אופציונליים', currency);

  html += `
    <div class="vat-summary">
      <div class="vat-row"><span>סה״כ לפני מע״מ</span><span>${fmtCurrency(grandBeforeVat, currency)}</span></div>
      <div class="vat-row"><span>מע״מ (${Math.round(VAT_RATE * 100)}%)</span><span>${fmtCurrency(vat, currency)}</span></div>
      <div class="vat-row vat-total"><span>סה״כ כולל מע״מ</span><span>${fmtCurrency(grandWithVat, currency)}</span></div>
    </div>
    <p class="validity-note">* כל המחירים ללא מע״מ אלא אם צוין אחרת | הצעה תקפה ל-${data.conditions?.validity_days || 30} יום</p>
  </div>`;
  return html;
}

function buildMilestones(data: ProposalPDFData, currency: string): string {
  if (!data.milestones || data.milestones.length === 0) return '';

  const mandatoryTotal = (data.feeItems || []).filter(i => !i.isOptional).reduce((s, i) => s + getItemTotal(i), 0);
  const base = mandatoryTotal > 0 ? mandatoryTotal : data.price;

  const rows = data.milestones.map((m, idx) => `
    <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td>${m.description}</td>
      <td class="col-center">${m.percentage || 0}%</td>
      <td class="col-price">${fmtCurrency(base * (m.percentage || 0) / 100, currency)}</td>
    </tr>`).join('');

  return `
    <div class="section">
      <h2 class="section-title">אבני דרך לתשלום</h2>
      <table>
        <thead><tr><th>שלב</th><th class="col-center" style="width:100px">אחוז (%)</th><th class="col-price" style="width:120px">סכום</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildTerms(data: ProposalPDFData, currency: string): string {
  const c = data.conditions;
  const submissionDate = new Date(data.submittedAt);
  const startDate = data.startDate ? new Date(data.startDate) : submissionDate;
  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + data.timelineDays);

  const paymentTermDisplay = c?.payment_term_type
    ? getPaymentTermLabel(c.payment_term_type)
    : c?.payment_terms;

  const hasContent = paymentTermDisplay || c?.assumptions || c?.exclusions || c?.validity_days || data.timelineDays;
  if (!hasContent) return '';

  let inner = '';
  if (paymentTermDisplay) inner += `<div class="term-row term-highlight"><span class="term-label">תנאי תשלום:</span><span class="term-value">${paymentTermDisplay}</span></div>`;
  if (c?.validity_days) inner += `<div class="term-row"><span class="term-label">תוקף ההצעה:</span><span class="term-value">${c.validity_days} ימים</span></div>`;

  inner += `<div class="term-row"><span class="term-label">תאריך התחלה:</span><span class="term-value">${fmtDateDDMMYYYY(startDate.toISOString())}</span></div>`;
  inner += `<div class="term-row"><span class="term-label">סיום משוער:</span><span class="term-value">${fmtDateDDMMYYYY(completionDate.toISOString())}</span></div>`;
  inner += `<div class="term-row"><span class="term-label">זמן ביצוע:</span><span class="term-value">${data.timelineDays} ימים</span></div>`;

  if (c?.assumptions) inner += `<div class="term-block"><span class="term-label">הנחות יסוד:</span><p>${c.assumptions}</p></div>`;
  if (c?.exclusions) inner += `<div class="term-block"><span class="term-label">לא כולל:</span><p>${c.exclusions}</p></div>`;

  return `
    <div class="section">
      <h2 class="section-title">תנאים ולוחות זמנים</h2>
      <div class="terms-card">${inner}</div>
    </div>`;
}

function buildSignature(data: ProposalPDFData): string {
  return `
    <div class="signature-section">
      <div class="sig-box">
        <h3>חתימת היועץ</h3>
        <div class="sig-content">
          ${data.signaturePng ? `<img src="${data.signaturePng}" alt="חתימה" class="sig-img" />` : '<div class="sig-line"></div>'}
          ${data.stampImage ? `<img src="${data.stampImage}" alt="חותמת" class="stamp-img" />` : ''}
        </div>
        <p class="sig-label">${data.supplierName || data.advisorName || 'שם היועץ'}</p>
      </div>
      <div class="sig-box">
        <h3>חתימת הלקוח</h3>
        <div class="sig-content"><div class="sig-line"></div></div>
        <p class="sig-label">שם הלקוח</p>
      </div>
    </div>`;
}

// ── main CSS ─────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 15mm 12mm; }
  .section, table, .signature-section { page-break-inside: avoid; }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Assistant', 'Segoe UI', Tahoma, Arial, sans-serif;
  color: #1f2937;
  line-height: 1.7;
  direction: rtl;
  padding: 32px 40px;
  font-size: 14px;
  background: #fff;
}

/* ── Header ───────────── */
.header {
  border-bottom: 3px solid #1e40af;
  padding-bottom: 20px;
  margin-bottom: 28px;
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.header-title { flex: 1; }
.header-title h1 {
  font-size: 28px;
  font-weight: 800;
  color: #1e3a5f;
  margin-bottom: 4px;
}
.project-name { font-size: 18px; color: #374151; font-weight: 600; }
.advisor-type { font-size: 14px; color: #6b7280; }
.header-logo { flex-shrink: 0; }
.logo { max-height: 70px; max-width: 140px; object-fit: contain; }
.logo-placeholder {
  width: 90px; height: 60px;
  border: 2px dashed #d1d5db; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: #9ca3af;
}
.header-meta {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; font-size: 13px; color: #6b7280;
}
.badge {
  font-size: 12px; padding: 3px 12px; border-radius: 12px; font-weight: 600;
}
.badge-draft { background: #fef3c7; color: #92400e; }
.badge-approved { background: #d1fae5; color: #065f46; }
.submitted-by { font-size: 13px; color: #6b7280; margin-top: 6px; }

/* ── Sections ─────────── */
.section { margin-bottom: 24px; }
.section-title {
  font-size: 17px; font-weight: 700; color: #1e3a5f;
  border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 14px;
}
.subsection-title { font-size: 14px; font-weight: 700; color: #374151; margin: 12px 0 6px; }

/* Consultant details */
.details-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px 24px; padding: 14px 16px;
  border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;
}
.detail-item { display: flex; gap: 8px; font-size: 14px; }
.detail-label { font-weight: 600; color: #374151; white-space: nowrap; }

/* Scope */
.scope-text { white-space: pre-wrap; font-size: 14px; margin-bottom: 12px; }
.services-list { padding-right: 20px; margin: 0 0 8px; }
.services-list li { margin-bottom: 3px; }
.note-text { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
.consultant-notes {
  background: #f9fafb; padding: 12px 14px; border-radius: 8px;
  border-right: 3px solid #3b82f6; white-space: pre-wrap; font-size: 14px;
}

/* ── Tables ────────────── */
.table-title { font-size: 15px; font-weight: 700; color: #374151; margin: 18px 0 8px; }
table {
  width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px;
}
th {
  background: #1e3a5f; color: #fff; padding: 8px 10px;
  text-align: right; font-weight: 600; font-size: 13px;
}
td { padding: 7px 10px; border: 1px solid #e5e7eb; }
.row-even { background: #fff; }
.row-odd { background: #f9fafb; }
.col-num { width: 36px; text-align: center; }
.col-center { text-align: center; }
.col-price { text-align: left; }
.col-bold { font-weight: 700; }
.subtotal-row { background: #f0f4f8; }
.subtotal-label { text-align: right; font-weight: 700; }
.recurring-detail { font-size: 11px; color: #6b7280; }

/* VAT summary */
.vat-summary {
  margin-top: 14px; border: 2px solid #1e3a5f; border-radius: 8px;
  overflow: hidden;
}
.vat-row {
  display: flex; justify-content: space-between; padding: 8px 16px;
  font-size: 14px; border-bottom: 1px solid #e5e7eb;
}
.vat-row:last-child { border-bottom: none; }
.vat-total {
  background: #1e3a5f; color: #fff; font-weight: 800; font-size: 16px;
}
.validity-note { font-size: 11px; color: #6b7280; margin-top: 8px; }

/* Terms */
.terms-card {
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; background: #f9fafb;
}
.term-row {
  display: flex; gap: 8px; margin-bottom: 6px; font-size: 14px;
}
.term-highlight { font-weight: 700; font-size: 15px; color: #1e3a5f; margin-bottom: 10px; }
.term-label { font-weight: 600; color: #374151; white-space: nowrap; }
.term-value { color: #1f2937; }
.term-block { margin-top: 10px; font-size: 14px; }
.term-block p { margin-top: 4px; white-space: pre-wrap; }

/* Signatures */
.signature-section {
  display: flex; gap: 32px; margin-top: 36px; padding-top: 24px;
  border-top: 2px solid #e5e7eb;
}
.sig-box {
  flex: 1; text-align: center;
}
.sig-box h3 { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 12px; }
.sig-content { min-height: 70px; display: flex; align-items: flex-end; justify-content: center; gap: 12px; }
.sig-img { max-height: 70px; max-width: 180px; }
.stamp-img { max-height: 60px; max-width: 90px; }
.sig-line { width: 80%; border-bottom: 1px solid #374151; height: 1px; margin-bottom: 4px; }
.sig-label { font-size: 12px; color: #6b7280; margin-top: 6px; }

/* Footer */
.doc-footer {
  margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;
  border-top: 1px solid #e5e7eb; padding-top: 12px;
}
`;

// ── main export ──────────────────────────────────────────────────────

export async function generateProposalPDF(data: ProposalPDFData): Promise<void> {
  const currency = data.currency || 'ILS';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>הצעת מחיר - ${data.projectName}</title>
  <style>${CSS}</style>
</head>
<body>
  ${buildHeader(data)}
  ${buildConsultantDetails(data)}
  ${buildScopeOfWork(data)}
  ${buildPricingSection(data, currency)}
  ${buildMilestones(data, currency)}
  ${buildTerms(data, currency)}
  ${buildSignature(data)}
  <div class="doc-footer">מסמך זה הופק באופן אוטומטי ע״י מערכת BillDing • ${fmtDateDDMMYYYY(new Date().toISOString())}</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  const images = printWindow.document.querySelectorAll('img');
  let loaded = 0;
  const total = images.length;
  let triggered = false;

  const triggerPrint = () => {
    if (triggered) return;
    triggered = true;
    printWindow.focus();
    printWindow.print();
  };

  if (total === 0) {
    printWindow.onload = triggerPrint;
  } else {
    const check = () => { loaded++; if (loaded >= total) triggerPrint(); };
    images.forEach(img => {
      if (img.complete) check();
      else { img.onload = check; img.onerror = check; }
    });
    setTimeout(triggerPrint, 3000);
  }
}
