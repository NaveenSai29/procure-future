'use client';
import { useState, useEffect } from 'react';
import { Percent, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  useEffect(() => {
    fetch('/api/admin/marketing/offers').then(r => r.json()).then(d => setOffers(d.offers || [])).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Offers</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map(o => (
          <div key={o.id} className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold">{o.title}</h3>
            <p className="text-sm text-gray-500">{o.type} • {o.discountValue}{o.discountType === 'PERCENTAGE' ? '%' : ' Rs.'}</p>
            <span className={`px-2 py-1 text-xs rounded-full ${o.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{o.status}</span>
          </div>
        ))}
        {offers.length === 0 && <div className="col-span-full text-center py-12 text-gray-400"><Percent className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No offers found</p></div>}
      </div>
    </div>
  );
}