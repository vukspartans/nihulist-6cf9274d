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

export const exportToExcel = (proposals: Proposal[], projectName: string) => {
  // Use PapaParse (already installed) to generate CSV
  const Papa = require('papaparse');
  
  const data = proposals.map(p => ({
    'Rank': p.evaluation_rank || '-',
    'Supplier': p.supplier_name,
    'AI Score': p.evaluation_score || '-',
    'Price (ILS)': p.price,
    'Timeline (days)': p.timeline_days,
    'Recommendation': p.evaluation_result?.recommendation_level || '-',
    'Status': p.status,
    'Submitted At': new Date(p.submitted_at).toLocaleDateString('he-IL'),
  }));

  const csv = Papa.unparse(data);
  
  // Create download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${projectName}_proposals_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (proposals: Proposal[], projectName: string) => {
  // For PDF, we'll create a simple HTML table and use browser print
  // In production, you might want to use a library like jsPDF or pdfmake
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${projectName} - Proposals Comparison</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .rank-1 { background-color: #d4edda !important; }
      </style>
    </head>
    <body>
      <h1>${projectName}</h1>
      <h2>Proposals Comparison - ${new Date().toLocaleDateString('he-IL')}</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Supplier</th>
            <th>AI Score</th>
            <th>Price (ILS)</th>
            <th>Timeline (days)</th>
            <th>Recommendation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${proposals.map(p => `
            <tr class="${p.evaluation_rank === 1 ? 'rank-1' : ''}">
              <td>${p.evaluation_rank || '-'}</td>
              <td>${p.supplier_name}</td>
              <td>${p.evaluation_score || '-'}</td>
              <td>${new Intl.NumberFormat('he-IL').format(p.price)}</td>
              <td>${p.timeline_days}</td>
              <td>${p.evaluation_result?.recommendation_level || '-'}</td>
              <td>${p.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};




