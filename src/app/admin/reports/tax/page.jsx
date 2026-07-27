// src/app/admin/reports/tax/page.jsx

'use client';

import { useState, useEffect } from 'react';
import {
  Receipt, TrendingUp, Download, Filter, Calendar, IndianRupee,
  RefreshCw, FileText, BarChart3, ChevronDown, ChevronRight,
  Building2, Hash, Tag, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function TaxReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [hsnChapter, setHsnChapter] = useState('');
  const [expandedSections, setExpandedSections] = useState({ summary: true, rateWise: true, hsnWise: true, supplierWise: false, monthly: true });

  useEffect(() => { fetchReport(); }, [period]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: 'summary', period });
      if (period === 'custom' && customStart && customEnd) {
        params.append('startDate', customStart);
        params.append('endDate', customEnd);
      }
      if (hsnChapter) params.append('hsnChapter', hsnChapter);
      const res = await fetch('/api/admin/reports/tax?' + params.toString());
      const data = await res.json();
      if (data.success) setReportData(data.data);
      else toast.error(data.error || 'Failed to load');
    } catch { toast.error('Failed to load tax report'); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ type: 'summary', period, export: 'csv' });
    if (period === 'custom' && customStart && customEnd) {
      params.append('startDate', customStart);
      params.append('endDate', customEnd);
    }
    window.open('/api/admin/reports/tax?' + params.toString(), '_blank');
  };

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
  };

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const SectionHeader = ({ title, icon: Icon, sectionKey, badge }) => (
    <button onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm"><Icon className="h-5 w-5 text-blue-600" /></div>
        <span className="font-semibold text-gray-900">{title}</span>
        {badge && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      {expandedSections[sectionKey] ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
    </button>
  );

  const periods = [
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'this-year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  if (loading && !reportData) {
    return <div className="p-6"><div className="animate-pulse space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>)}</div></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Reports</h1>
          <p className="text-gray-500 mt-1">GST tax liability, HSN-wise summary, and compliance reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchReport} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="h-5 w-5 text-gray-400" />
          {periods.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${period === p.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex gap-2 ml-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm" />
              <span className="text-gray-400 self-center">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm" />
              <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Apply</button>
            </div>
          )}
        </div>
      </div>

      {reportData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-gray-500 mb-1">Taxable Value</p>
              <p className="text-xl font-bold text-blue-700">{formatINR(reportData.summary.totalTaxableValue)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-xs text-gray-500 mb-1">CGST</p>
              <p className="text-xl font-bold text-purple-700">{formatINR(reportData.summary.totalCgst)}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <p className="text-xs text-gray-500 mb-1">SGST</p>
              <p className="text-xl font-bold text-indigo-700">{formatINR(reportData.summary.totalSgst)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <p className="text-xs text-gray-500 mb-1">Cess</p>
              <p className="text-xl font-bold text-orange-700">{formatINR(reportData.summary.totalCess)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-xs text-gray-500 mb-1">Total Tax</p>
              <p className="text-xl font-bold text-red-700">{formatINR(reportData.summary.totalTax)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
              <p className="text-lg font-bold text-green-600">{reportData.summary.orderCount}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-3 text-center border border-cyan-200">
              <p className="text-lg font-bold text-cyan-600">{reportData.summary.invoiceCount}</p>
              <p className="text-xs text-gray-500">Invoices</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-200">
              <p className="text-lg font-bold text-yellow-600">{formatINR(reportData.summary.totalRevenue)}</p>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
              <p className="text-lg font-bold text-gray-600">{reportData.monthlyBreakdown.length}</p>
              <p className="text-xs text-gray-500">Months</p>
            </div>
          </div>

          {/* Rate-wise Summary */}
          <SectionHeader title="Rate-wise Tax Summary" icon={TrendingUp} sectionKey="rateWise" badge={`${reportData.rateWise.length} rates`} />
          {expandedSections.rateWise && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST Rate</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Taxable Value</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tax Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cess</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Orders</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.rateWise.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                          r.rate >= 28 ? 'bg-red-100 text-red-700' : r.rate >= 18 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>{r.rate}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{formatINR(r.taxableValue)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-purple-700">{formatINR(r.taxAmount)}</td>
                      <td className="px-4 py-3 text-right text-sm text-orange-600">{formatINR(r.cess)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{r.count}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {reportData.summary.totalTaxableValue > 0 ? ((r.taxableValue / reportData.summary.totalTaxableValue) * 100).toFixed(1) + '%' : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* HSN-wise Breakdown */}
          <SectionHeader title="HSN-wise Tax Breakdown (GSTR-1 Style)" icon={Hash} sectionKey="hsnWise" badge={`${reportData.hsnWise.length} HSN codes`} />
          {expandedSections.hsnWise && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HSN Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST Rate</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Taxable Value</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tax Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.hsnWise.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400">No HSN-wise data available for this period</td></tr>
                    ) : (
                      reportData.hsnWise.map((h, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{h.hsnCode}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-[250px] truncate" title={h.description}>{h.description}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{h.section || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${h.gstRate >= 28 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{h.gstRate}%</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{formatINR(h.taxableValue)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-purple-700">{formatINR(h.taxAmount)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{h.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supplier-wise */}
          <SectionHeader title="Supplier-wise Tax Summary" icon={Building2} sectionKey="supplierWise" badge={`${reportData.supplierWise.length} suppliers`} />
          {expandedSections.supplierWise && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GSTIN</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Taxable Value</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tax Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.supplierWise.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">No supplier data available</td></tr>
                  ) : (
                    reportData.supplierWise.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.businessName}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.gstin || 'N/A'}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatINR(s.taxableValue)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-purple-700">{formatINR(s.taxAmount)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">{s.orderCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Monthly Trend */}
          <SectionHeader title="Monthly Tax Trend" icon={BarChart3} sectionKey="monthly" />
          {expandedSections.monthly && (
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="space-y-3">
                {reportData.monthlyBreakdown.map((m, i) => {
                  const maxTax = Math.max(...reportData.monthlyBreakdown.map(x => x.taxAmount), 1);
                  const barWidth = (m.taxAmount / maxTax) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20">{m.month}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center px-3 transition-all" style={{ width: barWidth + '%' }}>
                          <span className="text-xs text-white font-medium">{formatINR(m.taxAmount)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right">{m.orderCount} orders</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <div className="text-center py-20">
          <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No Tax Data Available</h3>
          <p className="text-gray-400 mt-1">Tax reports will appear here once orders are processed</p>
        </div>
      )}
    </div>
  );
}