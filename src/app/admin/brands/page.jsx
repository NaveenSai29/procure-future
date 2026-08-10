'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit, Trash2, X, Save, Search,
  Globe, Image, Package, ExternalLink, Filter,
  GitMerge, Trash, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  // Merge & Cleanup states
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [merging, setMerging] = useState(false);
  const [deletingEmpty, setDeletingEmpty] = useState(false);

  const [form, setForm] = useState({
    name: '', logo: '', description: '', website: '', isActive: true
  });

  useEffect(() => { fetchBrands(); }, [pagination.page, searchTerm]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 50,
        search: searchTerm
      });
      const res = await fetch('/api/admin/brands?' + params.toString());
      const data = await res.json();
      setBrands(data.brands || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingBrand ? '/api/admin/brands/' + editingBrand.id : '/api/admin/brands';
      const method = editingBrand ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingBrand ? 'Brand updated' : 'Brand created');
        setShowModal(false);
        resetForm();
        fetchBrands();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save brand');
    }
  };

  const handleDelete = async (brandId, name) => {
    if (!confirm('Delete brand "' + name + '"?')) return;
    try {
      const res = await fetch('/api/admin/brands/' + brandId, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Brand deleted');
        fetchBrands();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Cannot delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setEditingBrand(null);
    setForm({ name: '', logo: '', description: '', website: '', isActive: true });
  };

  const openEdit = (brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      logo: brand.logo || '',
      description: brand.description || '',
      website: brand.website || '',
      isActive: brand.isActive
    });
    setShowModal(true);
  };

  // Find duplicate brands by normalized name
  const findDuplicates = () => {
    const groups = {};
    brands.forEach(b => {
      const key = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    const dups = Object.values(groups).filter(g => g.length > 1);
    setDuplicates(dups);
    setShowDuplicates(true);
    setMergeSource('');
    setMergeTarget('');
  };

  // Merge source brand into target brand
  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) {
      toast.error('Select both source and target brands');
      return;
    }
    if (mergeSource === mergeTarget) {
      toast.error('Cannot merge a brand into itself');
      return;
    }
    const sourceName = brands.find(b => b.id === mergeSource)?.name || 'Source';
    const targetName = brands.find(b => b.id === mergeTarget)?.name || 'Target';
    if (!confirm(`Merge "${sourceName}" into "${targetName}"?\n\nAll products from "${sourceName}" will move to "${targetName}" and "${sourceName}" will be deleted.`)) return;

    setMerging(true);
    try {
      const res = await fetch('/api/admin/brands/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBrandId: mergeSource, targetBrandId: mergeTarget }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchBrands();
        setMergeSource('');
        setMergeTarget('');
        findDuplicates();
      } else {
        toast.error(data.error || 'Merge failed');
      }
    } catch {
      toast.error('Merge failed');
    } finally {
      setMerging(false);
    }
  };

  // Delete all brands with 0 products
  const deleteEmptyBrands = async () => {
    const emptyBrands = brands.filter(b => (b._count?.products || 0) === 0);
    if (emptyBrands.length === 0) {
      toast.info('No empty brands to delete');
      return;
    }
    if (!confirm(`Delete ${emptyBrands.length} brands with 0 products? This cannot be undone.`)) return;

    setDeletingEmpty(true);
    let deleted = 0;
    let failed = 0;
    for (const b of emptyBrands) {
      try {
        const res = await fetch('/api/admin/brands/' + b.id, { method: 'DELETE' });
        if (res.ok) deleted++;
        else failed++;
      } catch { failed++; }
    }
    toast.success(`${deleted} empty brands deleted${failed > 0 ? `, ${failed} failed` : ''}`);
    setDeletingEmpty(false);
    fetchBrands();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
          <p className="text-gray-500 mt-1">{pagination.total} brands</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={findDuplicates}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            <GitMerge className="h-4 w-4" /> Find Duplicates
          </button>
          <button
            onClick={deleteEmptyBrands}
            disabled={deletingEmpty}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {deletingEmpty ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            Delete Empty
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4" /> Add Brand
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Duplicates Panel */}
      {showDuplicates && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Possible Duplicates ({duplicates.length} groups found)
            </h3>
            <button onClick={() => setShowDuplicates(false)} className="text-amber-600 hover:text-amber-800 text-sm font-medium">
              ✕ Close
            </button>
          </div>

          {duplicates.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-700 text-sm font-medium">✅ No duplicate brands found! All brand names are unique.</p>
            </div>
          ) : (
            duplicates.map((group, i) => (
              <div key={i} className="bg-white rounded-lg p-3 mb-2 border border-amber-100">
                <p className="text-xs text-gray-500 mb-2">Group {i + 1}: {group.length} similar brands</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {group.map(b => (
                    <span key={b.id} className={`px-2 py-1 rounded text-sm font-medium ${
                      b._count?.products > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {b.name} ({b._count?.products || 0} products)
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <select 
                    value={mergeSource} 
                    onChange={e => setMergeSource(e.target.value)}
                    className="text-xs px-2 py-1.5 border rounded bg-white"
                  >
                    <option value="">Merge from...</option>
                    {group.map(b => <option key={b.id} value={b.id}>{b.name} ({b._count?.products || 0})</option>)}
                  </select>
                  <span className="text-xs text-gray-400">→</span>
                  <select 
                    value={mergeTarget} 
                    onChange={e => setMergeTarget(e.target.value)}
                    className="text-xs px-2 py-1.5 border rounded bg-white"
                  >
                    <option value="">into...</option>
                    {group.map(b => <option key={b.id} value={b.id}>{b.name} ({b._count?.products || 0})</option>)}
                  </select>
                  <button 
                    onClick={handleMerge} 
                    disabled={!mergeSource || !mergeTarget || merging}
                    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {merging ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
                    {merging ? 'Merging...' : 'Merge'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map(brand => (
          <div key={brand.id} className={`bg-white rounded-xl border p-5 hover:shadow-md transition ${!brand.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                  {brand.website && (
                    <a href={brand.website} target="_blank" className="text-xs text-blue-600 flex items-center gap-1 mt-0.5 hover:underline">
                      <Globe className="h-3 w-3" /> Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(brand)} className="p-1.5 hover:bg-gray-100 rounded">
                  <Edit className="h-4 w-4 text-gray-400" />
                </button>
                <button onClick={() => handleDelete(brand.id, brand.name)} className="p-1.5 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
            
            {brand.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{brand.description}</p>
            )}

            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-1 text-xs ${(brand._count?.products || 0) > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                <Package className="h-3 w-3" />
                {brand._count?.products || 0} products
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                brand.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {brand.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}

        {brands.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No brands found</p>
            <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-700 text-sm mt-1">
              Add your first brand
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingBrand ? 'Edit Brand' : 'Add Brand'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Brand Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="e.g., Samsung, Tata Steel"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Logo URL</label>
                <input
                  type="text"
                  value={form.logo}
                  onChange={(e) => setForm(prev => ({ ...prev, logo: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="https://www.brand.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  rows={2}
                  placeholder="Brand description"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={form.isActive}
                  onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingBrand ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}