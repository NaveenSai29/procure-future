'use client';
import { useState, useEffect } from 'react';
import { RotateCcw, Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

const formatOrderId = (id) => {
  if (!id) return '#N/A';
  const hex = id.replace(/-/g, '').slice(0, 6);
  const num = parseInt(hex, 16) % 100000;
  return `#${num.toString().padStart(5, '0')}`;
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchReturns(); }, [statusFilter]);

  const fetchReturns = async () => {
    try {
      const params = new URLSearchParams({ limit: '50', ...(statusFilter && { status: statusFilter }) });
      const res = await fetch('/api/admin/returns?' + params);
      const data = await res.json();
      setReturns(data.returns || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await fetch('/api/returns/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' })
      });
      toast.success('Return ' + (action === 'approve' ? 'approved' : 'rejected'));
      fetchReturns();
    } catch { toast.error('Failed to update'); }
  };

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-blue-100 text-blue-700'
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1><p className="text-gray-500">{returns.length} requests</p></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Status</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Buyer</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {returns.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{r.orderId ? formatOrderId(r.orderId) : 'N/A'}</td>
                <td className="px-4 py-3 text-sm">{r.buyer?.name || 'N/A'}</td>
                <td className="px-4 py-3 text-sm max-w-xs truncate">{r.reason}</td>
                <td className="px-4 py-3 text-sm font-medium">Rs.{r.refundAmount || r.order?.totalAmount || 0}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${statusColors[r.status] || 'bg-gray-100'}`}>{r.status}</span></td>
                <td className="px-4 py-3">
                  {r.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleAction(r.id, 'approve')} className="p-1.5 hover:bg-green-50 rounded text-green-600"><Check className="h-4 w-4" /></button>
                      <button onClick={() => handleAction(r.id, 'reject')} className="p-1.5 hover:bg-red-50 rounded text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {returns.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400"><RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No return requests found</p></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}