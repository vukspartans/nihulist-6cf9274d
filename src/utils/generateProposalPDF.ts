/**
 * Generates a PDF of a proposal using browser print functionality
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
  price: number;
  timelineDays: number;
  submittedAt: string;
  scopeText?: string;
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
}

export async function generateProposalPDF(data: ProposalPDFData): Promise<void> {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate estimated completion date
  const submissionDate = new Date(data.submittedAt);
  const completionDate = new Date(submissionDate);
  completionDate.setDate(completionDate.getDate() + data.timelineDays);

  // Helper to calculate item total safely
  const getItemTotal = (item: FeeLineItem): number => {
    if (item.total !== undefined && item.total !== null && !isNaN(item.total)) return item.total;
    return (item.unitPrice || 0) * (item.quantity || 1);
  };

  // Generate fee table rows
  let feeTableHtml = '';
  if (data.feeItems && data.feeItems.length > 0) {
    const mandatoryItems = data.feeItems.filter(item => !item.isOptional);
    const optionalItems = data.feeItems.filter(item => item.isOptional);
    
    const generateRows = (items: FeeLineItem[]) => items.map((item, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${item.unit || 'יחידה'}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${item.unitPrice ? formatCurrency(item.unitPrice) : '-'}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600;">${formatCurrency(getItemTotal(item))}</td>
      </tr>
    `).join('');

    if (mandatoryItems.length > 0) {
      feeTableHtml += `
        <h3 style="margin-top: 24px; margin-bottom: 12px; color: #374151;">פירוט שכר טרחה</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; width: 40px;">#</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">תיאור</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; width: 60px;">כמות</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; width: 80px;">יחידה</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; width: 100px;">מחיר יחידה</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; width: 100px;">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            ${generateRows(mandatoryItems)}
          </tbody>
        </table>
        <p style="font-size: 11px; color: #6b7280; text-align: right; margin-top: 8px;">* כל המחירים ללא מע"מ</p>
      `;
    }

    if (optionalItems.length > 0) {
      feeTableHtml += `
        <h4 style="margin-top: 16px; margin-bottom: 8px; color: #6b7280;">פריטים אופציונליים</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            ${generateRows(optionalItems)}
          </tbody>
        </table>
      `;
    }
  }

  // Generate milestones table
  let milestonesHtml = '';
  if (data.milestones && data.milestones.length > 0) {
    // Calculate mandatory total for milestone amounts
    const mandatoryTotal = (data.feeItems || [])
      .filter(item => !item.isOptional)
      .reduce((sum, item) => sum + getItemTotal(item), 0);
    const baseAmount = mandatoryTotal > 0 ? mandatoryTotal : data.price;
    
    milestonesHtml = `
      <h3 style="margin-top: 24px; margin-bottom: 12px; color: #374151;">אבני דרך לתשלום</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">שלב</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; width: 100px;">אחוז</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; width: 120px;">סכום</th>
          </tr>
        </thead>
        <tbody>
          ${data.milestones.map(m => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${m.description}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${m.percentage || 0}%</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">${formatCurrency(baseAmount * (m.percentage || 0) / 100)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Generate conditions section
  let conditionsHtml = '';
  if (data.conditions) {
    const { payment_terms, payment_term_type, assumptions, exclusions, validity_days } = data.conditions;
    // Prefer payment_term_type (structured) over payment_terms (free text)
    const paymentTermDisplay = payment_term_type 
      ? getPaymentTermLabel(payment_term_type)
      : payment_terms;
    
    if (paymentTermDisplay || assumptions || exclusions || validity_days) {
      conditionsHtml = `
        <h3 style="margin-top: 24px; margin-bottom: 12px; color: #374151;">תנאים</h3>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; font-size: 14px;">
          ${paymentTermDisplay ? `<p style="margin-bottom: 8px;"><strong>תנאי תשלום:</strong> ${paymentTermDisplay}</p>` : ''}
          ${assumptions ? `<p style="margin-bottom: 8px;"><strong>הנחות יסוד:</strong> ${assumptions}</p>` : ''}
          ${exclusions ? `<p style="margin-bottom: 8px;"><strong>לא כולל:</strong> ${exclusions}</p>` : ''}
          ${validity_days ? `<p style="margin-bottom: 8px;"><strong>תוקף ההצעה:</strong> ${validity_days} ימים</p>` : ''}
        </div>
      `;
    }
  }

  // Generate signature section
  let signatureHtml = '';
  if (data.signaturePng || data.stampImage) {
    signatureHtml = `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <h3 style="margin-bottom: 16px; color: #374151;">חתימה</h3>
        <div style="display: flex; gap: 24px; align-items: flex-end;">
          ${data.signaturePng ? `
            <div style="text-align: center;">
              <img src="${data.signaturePng}" alt="חתימה" style="max-height: 80px; max-width: 200px; border-bottom: 1px solid #374151;" />
              <p style="margin-top: 4px; font-size: 12px; color: #6b7280;">חתימה</p>
            </div>
          ` : ''}
          ${data.stampImage ? `
            <div style="text-align: center;">
              <img src="${data.stampImage}" alt="חותמת" style="max-height: 80px; max-width: 100px;" />
              <p style="margin-top: 4px; font-size: 12px; color: #6b7280;">חותמת</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <title>הצעת מחיר - ${data.projectName}</title>
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          margin: 0;
          padding: 40px;
          color: #1f2937;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #3b82f6;
        }
        .header h1 {
          color: #1e40af;
          margin-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .info-box {
          background-color: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
        }
        .info-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .scope-section {
          margin-top: 24px;
        }
        .scope-section h3 {
          color: #374151;
          margin-bottom: 12px;
        }
        .scope-content {
          background-color: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>הצעת מחיר</h1>
        <p style="font-size: 18px; color: #4b5563;">${data.projectName}</p>
        <p style="font-size: 14px; color: #6b7280;">${data.supplierName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <div class="info-label">מחיר מוצע</div>
          <div class="info-value" style="color: #059669;">${formatCurrency(data.price)}</div>
        </div>
        <div class="info-box">
          <div class="info-label">זמן ביצוע</div>
          <div class="info-value">${data.timelineDays} ימים</div>
        </div>
        <div class="info-box">
          <div class="info-label">תאריך הגשה</div>
          <div class="info-value">${formatDate(data.submittedAt)}</div>
        </div>
        <div class="info-box">
          <div class="info-label">תאריך סיום משוער</div>
          <div class="info-value">${formatDate(completionDate.toISOString())}</div>
        </div>
      </div>

      ${data.scopeText ? `
        <div class="scope-section">
          <h3>היקף העבודה</h3>
          <div class="scope-content">${data.scopeText}</div>
        </div>
      ` : ''}

      ${feeTableHtml}
      ${milestonesHtml}
      ${conditionsHtml}
      ${signatureHtml}

      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af;">
        מסמך זה הופק באופן אוטומטי • ${new Date().toLocaleDateString('he-IL')}
      </div>
    </body>
    </html>
  `;

  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
