'use client';
import { useState, useEffect } from 'react';
import { Ticket, Search, Eye, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/marketing/coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await fetch('/api/admin/marketing/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId: id, status: currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })
      });
      toast.success('Updated');
      fetchCoupons();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">All Coupons</h1><p className="text-gray-500">Platform-wide coupon oversight</p></div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Discount</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usage</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {coupons.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-sm">{c.code}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.supplierId}</td>
                <td className="px-4 py-3 text-sm">{c.discountType === 'PERCENTAGE' ? c.discountValue + '%' : 'Rs.' + c.discountValue}</td>
                <td className="px-4 py-3 text-sm">{c.usageCount}/{c.usageLimit}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleStatus(c.id, c.status)} className="p-1.5 hover:bg-gray-100 rounded">
                    {c.status === 'ACTIVE' ? <Ban className="h-4 w-4 text-yellow-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No coupons found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}