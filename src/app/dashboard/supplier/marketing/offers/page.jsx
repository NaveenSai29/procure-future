'use client';

import { useState, useEffect } from 'react';
import {
  Percent, Plus, Edit, Trash2, X, Save, Tag,
  Calendar, Flame, Gift, Star
} from 'lucide-react';
import { toast } from 'sonner';

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  const [form, setForm] = useState({
    title: '', description: '', type: 'DISCOUNT',
    discountType: 'PERCENTAGE', discountValue: 20,
    startDate: '', endDate: '', terms: ''
  });

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/supplier/offers');
      const data = await res.json();
      setOffers(data.offers || []);
    } catch { toast.error('Failed to load offers'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const url = editingOffer ? '/api/supplier/offers/' + editingOffer.id : '/api/supplier/offers';
      const method = editingOffer ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingOffer ? 'Offer updated' : 'Offer created');
        setShowModal(false);
        resetForm();
        fetchOffers();
      }
    } catch { toast.error('Failed to save offer'); }
  };

  const handleDelete = async (offerId) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await fetch('/api/supplier/offers/' + offerId, { method: 'DELETE' });
      toast.success('Offer deleted');
      fetchOffers();
    } catch { toast.error('Failed to delete offer'); }
  };

  const resetForm = () => {
    setEditingOffer(null);
    setForm({
      title: '', description: '', type: 'DISCOUNT',
      discountType: 'PERCENTAGE', discountValue: 20,
      startDate: '', endDate: '', terms: ''
    });
  };

  const getTypeIcon = (type) => {
    const icons = {
      DISCOUNT: Percent, FLASH_SALE: Flame, BOGO: Gift,
      BUNDLE: Tag, SEASONAL: Star
    };
    const Icon = icons[type] || Percent;
    return <Icon className="h-5 w-5" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      DISCOUNT: 'bg-blue-100 text-blue-600',
      FLASH_SALE: 'bg-red-100 text-red-600',
      BOGO: 'bg-green-100 text-green-600',
      BUNDLE: 'bg-purple-100 text-purple-600',
      SEASONAL: 'bg-orange-100 text-orange-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const offerTypes = [
    { value: 'DISCOUNT', label: 'Discount' },
    { value: 'FLASH_SALE', label: 'Flash Sale' },
    { value: 'BOGO', label: 'Buy One Get One' },
    { value: 'BUNDLE', label: 'Bundle Deal' },
    { value: 'SEASONAL', label: 'Seasonal Offer' }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offers & Deals</h1>
          <p className="text-gray-500 mt-1">Create special offers for your customers</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Create Offer
        </button>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map(offer => (
          <div key={offer.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${getTypeColor(offer.type)}`}>
                {getTypeIcon(offer.type)}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingOffer(offer); setForm({
                  title: offer.title, description: offer.description || '',
                  type: offer.type, discountType: offer.discountType,
                  discountValue: offer.discountValue,
                  startDate: offer.startDate?.split('T')[0] || '',
                  endDate: offer.endDate?.split('T')[0] || '',
                  terms: offer.terms || ''
                }); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 rounded">
                  <Edit className="h-4 w-4 text-gray-400" />
                </button>
                <button onClick={() => handleDelete(offer.id)} className="p-1.5 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{offer.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{offer.description || 'No description'}</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-green-600">
                {offer.discountType === 'PERCENTAGE' ? offer.discountValue + '%' : 'Rs.' + offer.discountValue} Off
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="h-3 w-3" />
              {new Date(offer.startDate).toLocaleDateString()} - {new Date(offer.endDate).toLocaleDateString()}
            </div>
            <div className="mt-3">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                offer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                offer.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {offer.status}
              </span>
            </div>
          </div>
        ))}
        {offers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Percent className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No offers created yet</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingOffer ? 'Edit Offer' : 'Create Offer'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="Summer Mega Sale" />
              </div>
              <div>
                <label className="text-sm font-medium">Offer Type</label>
                <select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1">
                  {offerTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Discount Type</label>
                  <select value={form.discountType} onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Value</label>
                  <input type="number" value={form.discountValue} onChange={(e) => setForm(prev => ({ ...prev, discountValue: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">Terms & Conditions</label>
                <textarea value={form.terms} onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1" rows={2} placeholder="Optional" />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="h-4 w-4 inline mr-1" />{editingOffer ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}