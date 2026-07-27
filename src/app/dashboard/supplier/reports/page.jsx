'use client';

import { useState } from 'react';
import { Download, FileText, BarChart3, TrendingUp, Package, DollarSign, ShoppingCart, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierReportsPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [generating, setGenerating] = useState(false);

  const reports = [
    { title: 'Sales Report', desc: 'Order-wise sales details with amounts', icon: ShoppingCart, endpoint: 'sales', color: 'bg-blue-50 text-blue-600' },
    { title: 'Revenue Summary', desc: 'Revenue breakdown by period', icon: DollarSign, endpoint: 'revenue', color: 'bg-green-50 text-green-600' },
    { title: 'Product Performance', desc: 'Top selling products and categories', icon: TrendingUp, endpoint: 'products', color: 'bg-purple-50 text-purple-600' },
    { title: 'Inventory Report', desc: 'Current stock levels and valuations', icon: Package, endpoint: 'inventory', color: 'bg-orange-50 text-orange-600' },
    { title: 'Tax Report', desc: 'GST collected and payable summary', icon: FileText, endpoint: 'tax', color: 'bg-red-50 text-red-600' },
    { title: 'Returns Report', desc: 'Return requests and refunds summary', icon: RotateCcw, endpoint: 'returns', color: 'bg-yellow-50 text-yellow-600' },
  ];

  const generateReport = async (endpoint, title) => {
    setGenerating(true);
    try {
      const params = new URLSearchParams({
        report: endpoint,
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      });
      const res = await fetch(`/api/supplier/finance?${params}`);
      const data = await res.json();

      // Convert to CSV
      let csv = '';
      if (endpoint === 'sales' && data.orders) {
        csv = 'Order ID,Product,Quantity,Amount,Status,Date\n';
        data.orders.data?.forEach(o => {
          csv += `${o.id},${o.product?.name || '-'},${o.quantity},${o.totalAmount},${o.status},${new Date(o.createdAt).toLocaleDateString()}\n`;
        });
      } else if (endpoint === 'revenue') {
        csv = 'Category,Amount\n';
        csv += `Total Revenue,${data.orders?.total || 0}\n`;
        csv += `Orders Count,${data.orders?.count || 0}\n`;
        csv += `Invoices Total,${data.invoices?.total || 0}\n`;
        csv += `Settlements Total,${data.settlements?.total || 0}\n`;
      } else if (endpoint === 'products') {
        csv = 'Product,Orders,Amount\n';
        data.orders?.data?.forEach(o => {
          csv += `${o.product?.name || '-'},1,${o.totalAmount}\n`;
        });
      } else if (endpoint === 'inventory') {
        csv = 'Product,SKU,Warehouse,Available,Reserved,Damaged,Min Stock\n';
        data.inventoryStatus?.all?.forEach(i => {
          csv += `${i.product?.name || '-'},${i.product?.sku || '-'},${i.warehouse?.name || '-'},${i.availableQty},${i.reservedQty},${i.damagedQty},${i.minStockLevel}\n`;
        });
      } else {
        // Fallback: JSON to CSV conversion
        csv = JSON.stringify(data, null, 2);
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${title} downloaded as CSV`);
    } catch { toast.error('Failed to generate report'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Download business reports in CSV format</p>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Period:</span>
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
          <span className="text-gray-400">to</span>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
          {(dateRange.start || dateRange.end) && (
            <button onClick={() => setDateRange({ start: '', end: '' })} className="text-sm text-red-500 hover:text-red-600">Clear</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => (
          <div key={report.title} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
            <div className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center mb-3`}>
              <report.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{report.desc}</p>
            <button
              onClick={() => generateReport(report.endpoint, report.title)}
              disabled={generating}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2 font-medium"
            >
              {generating ? 'Generating...' : <><Download className="h-4 w-4" /> Download CSV</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}