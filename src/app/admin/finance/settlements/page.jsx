'use client';
import { useState, useEffect } from 'react';
import { Banknote, CheckCircle, Clock, IndianRupee, Search, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => { fetchSettlements(); }, [filter]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.append('status', filter);
      const res = await fetch(`/api/admin/finance/settlements?${params}`);
      const data = await res.json();
      if (data.success) {
        setSettlements(data.data.settlements || []);
        setStats(data.data.stats || {});
      }
    } catch (e) {
      toast.error('Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (settlementId) => {
    try {
      const res = await fetch('/api/admin/finance/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId, action: 'process' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settlement processed!');
        fetchSettlements();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('Failed to process settlement');
    }
  };

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
          <p className="text-sm text-gray-500 mt-1">Manage partner payouts and settlements</p>
        </div>
        <button onClick={fetchSettlements} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: stats.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completed', value: stats.completed || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Amount', value: formatCurrency(stats.totalAmount || 0), icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-5 border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
              <s.icon className={`h-8 w-8 ${s.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['PENDING', 'COMPLETED', 'ALL'].map(f => (
          <button key={f}
            onClick={() => setFilter(f === 'ALL' ? '' : f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border ${filter === f || (f === 'ALL' && !filter) ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'ALL' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Partner</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : settlements.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No settlements found</p>
              </td></tr>
            ) : (
              settlements.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold">{s.partner?.user?.name || s.partner?.vehicleType || 'Partner'}</p>
                    <p className="text-xs text-gray-400">{s.partner?.user?.mobile}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(s.amount)}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(s.periodStart)} - {formatDate(s.periodEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    {s.status === 'PENDING' && (
                      <button onClick={() => handleProcess(s.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                        Process Payout
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}