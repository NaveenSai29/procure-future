'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, Search, IndianRupee, RefreshCw, Download, 
  User, Phone, Mail, TrendingUp, TrendingDown, ArrowUpRight,
  Filter, XCircle, Calendar, Loader2, ShoppingBag, Banknote,
  Smartphone, Building, ExternalLink, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';

const formatOrderId = (id) => {
  if (!id) return '#N/A';
  const hex = id.replace(/-/g, '').slice(0, 6);
  const num = parseInt(hex, 16) % 100000;
  return `#${num.toString().padStart(5, '0')}`;
};

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/payments?type=stats'),
        fetch(`/api/admin/payments?limit=100&page=${page}`),
      ]);
      const statsData = await statsRes.json();
      const payData = await paymentsRes.json();
      setStats(statsData);
      setPayments(payData.payments || []);
      setTotalPages(payData.totalPages || 1);
    } catch { toast.error('Failed to load payment data'); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Payment ID', 'Amount', 'Method', 'Customer', 'Email', 'Mobile', 'Product', 'Date', 'Status'];
    const rows = payments.map(p => [
      p.orderId, p.paymentId, p.amount, p.method, p.buyerName, p.buyerEmail, p.buyerMobile, p.productName, new Date(p.createdAt).toISOString(), p.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const filteredPayments = payments.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || 
      p.orderId?.toLowerCase().includes(s) ||
      p.paymentId?.toLowerCase().includes(s) ||
      p.buyerName?.toLowerCase().includes(s) ||
      p.buyerEmail?.toLowerCase().includes(s) ||
      p.buyerMobile?.includes(s);
    const matchMethod = methodFilter === 'ALL' || p.method === methodFilter || 
      (methodFilter === 'UPI' && p.methodDetail === 'upi') ||
      (methodFilter === 'CARD' && p.methodDetail === 'card') ||
      (methodFilter === 'NETBANKING' && p.methodDetail === 'netbanking');
    return matchSearch && matchMethod;
  });

  const getMethodIcon = (method, detail) => {
    if (detail === 'upi') return <Smartphone className="h-3.5 w-3.5" />;
    if (detail === 'card') return <CreditCard className="h-3.5 w-3.5" />;
    if (detail === 'netbanking') return <Building className="h-3.5 w-3.5" />;
    if (method === 'COD') return <Banknote className="h-3.5 w-3.5" />;
    return <CreditCard className="h-3.5 w-3.5" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">All customer transactions across the platform</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalPayments} online payments</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-sm text-gray-500">This Month</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthlyAmount)}</p>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" /> Online: {formatCurrency(stats.onlineAmount)}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-2xl font-bold text-orange-600">{stats.todayPayments} payments</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(stats.todayAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Refunds</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.refundedAmount)}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <TrendingDown className="h-3 w-3" /> COD orders: {stats.codOrders}
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Breakdown */}
      {stats?.methodBreakdown && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setMethodFilter('ALL')} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${methodFilter === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            All ({stats.totalPayments})
          </button>
          {stats.methodBreakdown.map(m => (
            <button key={m.method} onClick={() => setMethodFilter(m.method === 'ONLINE' ? 'ONLINE' : m.method)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${methodFilter === m.method ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {m.method === 'ONLINE' ? 'Online' : m.method} ({m.count})
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" placeholder="Search by Order ID, Payment ID, customer name, email or mobile..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order / Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-gray-400" /></td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-gray-400">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>No payments found</p>
                </td></tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 font-mono">Order:</span>
                          <span className="text-xs font-mono font-medium text-gray-700">{p.orderId ? formatOrderId(p.orderId) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 font-mono">Pay:</span>
                          <span className="text-xs font-mono font-medium text-blue-600">{p.paymentId?.slice(0, 16)}...</span>
                          <button onClick={() => copyToClipboard(p.paymentId, p.id)} className="p-0.5 hover:bg-gray-100 rounded">
                            {copiedId === p.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.buyerName}</p>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-0.5">
                        {p.buyerEmail && <span>{p.buyerEmail}</span>}
                        {p.buyerMobile && <span>+91 {p.buyerMobile}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                      {p.walletDeduction > 0 && (
                        <p className="text-xs text-purple-500">Wallet: {formatCurrency(p.walletDeduction)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`p-1 rounded ${p.methodDetail === 'upi' ? 'bg-green-100' : p.methodDetail === 'card' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          {getMethodIcon(p.method, p.methodDetail)}
                        </span>
                        <span className="text-sm text-gray-700 capitalize">{p.methodDetail || p.method}</span>
                      </div>
                      {p.bank && <p className="text-xs text-gray-400 mt-0.5">{p.bank}</p>}
                      {p.vpa && <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.vpa}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                      {p.productName}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>{filteredPayments.length} payments shown</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-white">Prev</button>
                <span className="px-2 py-1">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-white">Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}