'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Image, Eye, EyeOff, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const PLACEMENTS = ['HOME', 'CATEGORY', 'PRODUCT', 'SIDEBAR', 'FOOTER', 'POPUP'];

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState({
    title: '', imageUrl: '', linkUrl: '', placement: 'HOME', sortOrder: 0, isActive: true, startDate: '', endDate: ''
  });

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/admin/cms/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch { toast.error('Failed to load banners'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const url = editingBanner ? '/api/admin/cms/banners/' + editingBanner.id : '/api/admin/cms/banners';
      const method = editingBanner ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success(editingBanner ? 'Banner updated' : 'Banner created');
        setShowModal(false); resetForm(); fetchBanners();
      }
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    await fetch('/api/admin/cms/banners/' + id, { method: 'DELETE' });
    toast.success('Banner deleted'); fetchBanners();
  };

  const handleToggle = async (id, current) => {
    await fetch('/api/admin/cms/banners/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !current }) });
    toast.success(current ? 'Banner hidden' : 'Banner active'); fetchBanners();
  };

  const resetForm = () => {
    setEditingBanner(null);
    setForm({ title: '', imageUrl: '', linkUrl: '', placement: 'HOME', sortOrder: 0, isActive: true, startDate: '', endDate: '' });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Banners</h1><p className="text-gray-500">{banners.length} banners</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Banner</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map(banner => (
          <div key={banner.id} className={`bg-white rounded-xl border overflow-hidden ${!banner.isActive ? 'opacity-50' : ''}`}>
            <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
              {banner.imageUrl ? <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" /> : <Image className="h-12 w-12 text-gray-300" />}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{banner.title}</h3>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{banner.placement}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingBanner(banner); setForm({ title: banner.title, imageUrl: banner.imageUrl, linkUrl: banner.linkUrl || '', placement: banner.placement, sortOrder: banner.sortOrder, isActive: banner.isActive, startDate: banner.startDate?.split('T')[0] || '', endDate: banner.endDate?.split('T')[0] || '' }); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 rounded"><Edit className="h-4 w-4 text-gray-400" /></button>
                  <button onClick={() => handleToggle(banner.id, banner.isActive)} className="p-1.5 hover:bg-gray-100 rounded">{banner.isActive ? <EyeOff className="h-4 w-4 text-yellow-500" /> : <Eye className="h-4 w-4 text-green-500" />}</button>
                  <button onClick={() => handleDelete(banner.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                </div>
              </div>
              <p className="text-xs text-gray-500">Order: {banner.sortOrder} | {banner.linkUrl ? 'Linked' : 'No link'}</p>
            </div>
          </div>
        ))}
        {banners.length === 0 && <div className="col-span-full text-center py-12 text-gray-400"><Image className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No banners created</p></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{editingBanner ? 'Edit Banner' : 'Add Banner'}</h3><button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Title</label><input type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              <div><label className="text-sm font-medium">Image URL</label><input type="text" value={form.imageUrl} onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              <div><label className="text-sm font-medium">Link URL (optional)</label><input type="text" value={form.linkUrl} onChange={(e) => setForm(prev => ({ ...prev, linkUrl: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Placement</label><select value={form.placement} onChange={(e) => setForm(prev => ({ ...prev, placement: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1">{PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="text-sm font-medium">Sort Order</label><input type="number" value={form.sortOrder} onChange={(e) => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} /> Active</label>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button><button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg"><Save className="h-4 w-4 inline mr-1" />{editingBanner ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}