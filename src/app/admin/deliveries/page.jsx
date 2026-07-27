'use client';
import { useState, useEffect } from 'react';
import { Truck, Search } from 'lucide-react';

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  useEffect(() => {
    fetch('/api/admin/orders').then(r => r.json()).then(d => {
      setDeliveries((d.data?.orders || []).filter(o => o.delivery));
    }).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Delivery Management</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order ID</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Partner</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th></tr>
          </thead>
          <tbody className="divide-y">
            {deliveries.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{d.id?.slice(0, 8)}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{d.delivery?.status}</span></td>
                <td className="px-4 py-3 text-sm">{d.delivery?.partnerId?.slice(0, 8) || 'Unassigned'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {deliveries.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400"><Truck className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No deliveries found</p></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}