// src/app/admin/reports/tax/page.jsx

'use client';

import { useState, useEffect } from 'react';
import {
  Receipt, TrendingUp, Download, Filter, Calendar, IndianRupee,
  RefreshCw, FileText, BarChart3, ChevronDown, ChevronRight,
  Building2, Hash, Tag, AlertCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function TaxReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedSections, setExpandedSections] = useState({ 
    summary: true, hsnWise: true, supplierWise: false, monthly: true 
  });

  useEffect(() => { fetchReport(); }, [period]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (period === 'custom' && customStart && customEnd) {
        params.append('startDate', customStart);
        params.append('endDate', customEnd);
      }
      const res = await fetch('/api/admin/reports/tax?' + params.toString());
      const data = await res.json();
      if (data.success) setReportData(data.data);
      else toast.error(data.error || 'Failed to load');
    } catch { toast.error('Failed to load tax report'); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ period, export: 'csv' });
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
          <p className="text-gray-500 mt-1">GST collected on delivery & platform fees (suppliers handle product GST)</p>
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

      {/* Policy Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">GST Policy</p>
          <p className="text-sm text-amber-700 mt-1">
            PROCURE collects GST <strong>only on delivery & platform fees</strong> at {reportData?.summary?.gstPercent || 5}%. 
            Product prices are set by suppliers who handle their own GST filing. 
            HSN codes below are for product classification reference only.
          </p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-gray-500 mb-1">Product Revenue</p>
              <p className="text-xl font-bold text-blue-700">{formatINR(reportData.summary.productRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">Supplier sales</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-xs text-gray-500 mb-1">Delivery + Platform Fees</p>
              <p className="text-xl font-bold text-green-700">{formatINR(reportData.summary.totalDeliveryFee + reportData.summary.totalPlatformFee)}</p>
              <p className="text-xs text-gray-400 mt-1">Taxable services</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-xs text-gray-500 mb-1">GST Collected</p>
              <p className="text-xl font-bold text-purple-700">{formatINR(reportData.summary.totalGstCollected)}</p>
              <p className="text-xs text-gray-400 mt-1">CGST: {formatINR(reportData.summary.cgst)} | SGST: {formatINR(reportData.summary.sgst)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <p className="text-xs text-gray-500 mb-1">Orders</p>
              <p className="text-xl font-bold text-orange-700">{reportData.summary.orderCount}</p>
              <p className="text-xs text-gray-400 mt-1">{reportData.monthlyBreakdown.length} months</p>
            </div>
          </div>

          {/* GST Breakdown Detail */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center border">
              <p className="text-xs text-gray-500">Delivery Fee</p>
              <p className="text-lg font-bold text-gray-700">{formatINR(reportData.summary.totalDeliveryFee)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border">
              <p className="text-xs text-gray-500">Platform Fee</p>
              <p className="text-lg font-bold text-gray-700">{formatINR(reportData.summary.totalPlatformFee)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border">
              <p className="text-xs text-gray-500">GST on Delivery</p>
              <p className="text-lg font-bold text-amber-700">{formatINR(reportData.summary.gstOnDelivery)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border">
              <p className="text-xs text-gray-500">GST on Platform</p>
              <p className="text-lg font-bold text-amber-700">{formatINR(reportData.summary.gstOnPlatform)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
              <p className="text-xs text-gray-500">Total GST Liability</p>
              <p className="text-lg font-bold text-red-700">{formatINR(reportData.summary.totalGstCollected)}</p>
            </div>
          </div>

          {/* HSN-wise Product Classification (Reference) */}
          <SectionHeader title="HSN-wise Product Classification" icon={Hash} sectionKey="hsnWise" 
            badge={`${reportData.hsnWise?.length || 0} HSN codes`} 
          />
          {expandedSections.hsnWise && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-2">
                <Info className="h-3 w-3" /> Reference only — GST rates shown are HSN slab rates, not tax collected by PROCURE
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HSN Code</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Products</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product Revenue</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.hsnWise?.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-12 text-gray-400">No HSN data available for this period</td></tr>
                    ) : (
                      reportData.hsnWise?.map((h, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{h.hsnCode}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{h.productCount}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium">{formatINR(h.productRevenue)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{h.orders}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supplier-wise Revenue */}
          <SectionHeader title="Supplier-wise Revenue" icon={Building2} sectionKey="supplierWise" 
            badge={`${reportData.supplierWise?.length || 0} suppliers`}
          />
          {expandedSections.supplierWise && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GSTIN</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.supplierWise?.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-gray-400">No supplier data available</td></tr>
                  ) : (
                    reportData.supplierWise?.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.businessName}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.gstin || 'N/A'}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">{formatINR(s.productRevenue)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">{s.orderCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Monthly Trend */}
          <SectionHeader title="Monthly GST Trend" icon={BarChart3} sectionKey="monthly" />
          {expandedSections.monthly && (
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="space-y-3">
                {reportData.monthlyBreakdown?.map((m, i) => {
                  const maxGst = Math.max(...reportData.monthlyBreakdown.map(x => x.gstCollected), 1);
                  const barWidth = (m.gstCollected / maxGst) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20">{m.month}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center px-3 transition-all" style={{ width: barWidth + '%' }}>
                          <span className="text-xs text-white font-medium">{formatINR(m.gstCollected)}</span>
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