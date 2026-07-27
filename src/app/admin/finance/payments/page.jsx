'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Search, IndianRupee, CheckCircle, XCircle, Clock, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/payments?type=stats'),
        fetch('/api/admin/payments?count=50'),
      ]);
      setStats(await statsRes.json());
      const payData = await paymentsRes.json();
      setPayments(payData.items || []);
    } catch { toast.error('Failed to load payment data'); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);
  const statusColor = (s) => ({
    captured: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
    created: 'bg-yellow-100 text-yellow-700', refunded: 'bg-purple-100 text-purple-700',
  }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Payments</h1><p className="text-gray-500">Razorpay payment transactions</p></div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold">{stats.totalPayments}</p><p className="text-xs text-gray-500">Monthly Payments</p></div>
          <div className="bg-green-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthlyAmount)}</p><p className="text-xs text-gray-500">Monthly Amount</p></div>
          <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold">{stats.todayPayments}</p><p className="text-xs text-gray-500">Today</p></div>
          <div className="bg-blue-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.todayAmount)}</p><p className="text-xs text-gray-500">Today Amount</p></div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment ID</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th></tr>
          </thead>
          <tbody className="divide-y">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.id?.slice(0, 16)}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3 text-sm capitalize">{p.method || '-'}</td>
                <td className="px-4 py-3 text-sm">{p.email || p.contact || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${statusColor(p.status)}`}>{p.status}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.created_at ? new Date(p.created_at * 1000).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400"><CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No payments yet</p></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}