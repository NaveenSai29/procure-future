'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Search, IndianRupee, RefreshCw, Download, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/payments?type=stats'),
        fetch('/api/admin/payments?count=100'),
      ]);
      const statsData = await statsRes.json();
      const payData = await paymentsRes.json();
      setStats(statsData);
      setPayments(payData.items || payData.recentPayments || []);
    } catch { toast.error('Failed to load payment data'); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

  const statusColor = (s) => {
    const colors = {
      captured: 'bg-green-100 text-green-700', 
      PAID: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      FAILED: 'bg-red-100 text-red-700',
      created: 'bg-yellow-100 text-yellow-700', 
      PENDING: 'bg-yellow-100 text-yellow-700',
      refunded: 'bg-purple-100 text-purple-700',
      REFUNDED: 'bg-purple-100 text-purple-700',
    };
    return colors[s] || 'bg-gray-100 text-gray-600';
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = !searchTerm || 
      (p.id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">Track all customer payments and transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalPayments || 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-sm text-gray-500">Monthly Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthlyAmount || 0)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Today's Payments</p>
            <p className="text-2xl font-bold text-orange-600">{stats.todayPayments || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue || 0)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search by ID, email, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['ALL', 'captured', 'failed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${statusFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payment ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No payments found</p>
                </td></tr>
              ) : (
                filteredPayments.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-medium text-gray-900">{p.id?.slice(0, 16)}...</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.email || p.name || 'N/A'}</p>
                      {p.contact && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{p.contact}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 capitalize">{p.method || 'Online'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColor(p.status)}`}>
                        {p.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 
                       p.created_at ? new Date(p.created_at * 1000).toLocaleDateString('en-IN') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}