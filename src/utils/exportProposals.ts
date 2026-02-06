// Export proposals to PDF/Excel

interface Proposal {
  id: string;
  supplier_name: string;
  price: number;
  timeline_days: number;
  evaluation_score?: number | null;
  evaluation_rank?: number | null;
  evaluation_result?: any;
  submitted_at: string;
  status: string;
}

// Helper for status labels
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    submitted: 'הוגש',
    accepted: 'אושר',
    rejected: 'נדחה',
    under_review: 'בבדיקה',
    draft: 'טיוטה',
    withdrawn: 'בוטל',
    negotiation_requested: 'משא ומתן',
    resubmitted: 'הוגש מחדש',
  };
  return labels[status] || status;
};

// Get recommendation level in Hebrew
const getRecommendationLabel = (level?: string): string => {
  if (!level) return '-';
  const labels: Record<string, string> = {
    'highly_recommended': 'מומלץ מאוד',
    'recommended': 'מומלץ',
    'acceptable': 'סביר',
    'not_recommended': 'לא מומלץ',
  };
  return labels[level] || level;
};

export const exportToExcel = (proposals: Proposal[], projectName: string) => {
  // Use PapaParse (already installed) to generate CSV
  const Papa = require('papaparse');
  
  const data = proposals.map(p => ({
    'דירוג': p.evaluation_rank || '-',
    'יועץ': p.supplier_name,
    'ציון AI': p.evaluation_score ? Math.round(p.evaluation_score) : '-',
    'מחיר (₪)': p.price,
    'לו"ז (ימים)': p.timeline_days,
    'המלצה': getRecommendationLabel(p.evaluation_result?.recommendation_level),
    'סטטוס': getStatusLabel(p.status),
    'תאריך הגשה': new Date(p.submitted_at).toLocaleDateString('he-IL'),
  }));

  const csv = Papa.unparse(data);
  
  // Add BOM for Hebrew encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${projectName}_הצעות_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (proposals: Proposal[], projectName: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('he-IL');

  // Find best price for highlighting
  const bestPrice = proposals.length > 0 ? Math.min(...proposals.map(p => p.price)) : 0;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <title>${projectName} - השוואת הצעות</title>
      <style>
        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
          @page { margin: 1cm; }
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
          padding: 40px; 
          color: #1f2937; 
          line-height: 1.6;
          margin: 0;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #3b82f6;
        }
        h1 { 
          color: #1e40af; 
          margin-bottom: 8px;
          font-size: 24px;
        }
        h2 { 
          color: #6b7280; 
          font-weight: normal; 
          margin: 0;
          font-size: 16px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 14px;
          margin-top: 16px;
        }
        th, td { 
          border: 1px solid #e5e7eb; 
          padding: 12px 8px; 
          text-align: right; 
        }
        th { 
          background-color: #f3f4f6; 
          font-weight: 600; 
          color: #374151;
        }
        tr:nth-child(even) { 
          background-color: #f9fafb; 
        }
        .rank-1 { 
          background-color: #d1fae5 !important; 
        }
        .best-price { 
          color: #059669; 
          font-weight: bold; 
        }
        .best-price-badge {
          display: inline-block;
          background-color: #10b981;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 4px;
        }
        .score-high { color: #059669; font-weight: 600; }
        .score-medium { color: #d97706; font-weight: 600; }
        .score-low { color: #dc2626; font-weight: 600; }
        .footer { 
          margin-top: 40px; 
          text-align: center; 
          font-size: 12px; 
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 24px;
          padding: 16px;
          background-color: #f3f4f6;
          border-radius: 8px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          font-size: 12px;
          color: #6b7280;
        }
        .summary-value {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${projectName}</h1>
        <h2>השוואת הצעות מחיר • ${new Date().toLocaleDateString('he-IL')}</h2>
      </div>

      <div class="summary">
        <div class="summary-item">
          <div class="summary-label">סה״כ הצעות</div>
          <div class="summary-value">${proposals.length}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">המחיר הנמוך ביותר</div>
          <div class="summary-value" style="color: #059669;">${formatCurrency(bestPrice)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">טווח מחירים</div>
          <div class="summary-value">${formatCurrency(Math.min(...proposals.map(p => p.price)))} - ${formatCurrency(Math.max(...proposals.map(p => p.price)))}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 60px;">דירוג</th>
            <th>יועץ</th>
            <th style="width: 80px;">ציון AI</th>
            <th style="width: 120px;">מחיר</th>
            <th style="width: 80px;">לו"ז (ימים)</th>
            <th style="width: 100px;">המלצה</th>
            <th style="width: 80px;">סטטוס</th>
            <th style="width: 100px;">תאריך הגשה</th>
          </tr>
        </thead>
        <tbody>
          ${proposals.map(p => {
            const isBestPrice = p.price === bestPrice;
            const scoreClass = p.evaluation_score 
              ? (p.evaluation_score >= 80 ? 'score-high' : p.evaluation_score >= 60 ? 'score-medium' : 'score-low')
              : '';
            
            return `
              <tr class="${p.evaluation_rank === 1 ? 'rank-1' : ''}">
                <td style="text-align: center; font-weight: 600;">${p.evaluation_rank || '-'}</td>
                <td>${p.supplier_name}</td>
                <td style="text-align: center;" class="${scoreClass}">${p.evaluation_score ? Math.round(p.evaluation_score) : '-'}</td>
                <td class="${isBestPrice ? 'best-price' : ''}">
                  ${isBestPrice ? '<span class="best-price-badge">הנמוך</span>' : ''}
                  ${formatCurrency(p.price)}
                </td>
                <td style="text-align: center;">${p.timeline_days}</td>
                <td>${getRecommendationLabel(p.evaluation_result?.recommendation_level)}</td>
                <td>${getStatusLabel(p.status)}</td>
                <td>${formatDate(p.submitted_at)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        * כל המחירים ללא מע"מ • מסמך זה הופק באופן אוטומטי
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
