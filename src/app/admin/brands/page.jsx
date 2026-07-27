'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit, Trash2, X, Save, Search,
  Globe, Image, Package, ExternalLink, Filter
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  const [form, setForm] = useState({
    name: '', logo: '', description: '', website: '', isActive: true
  });

  useEffect(() => { fetchBrands(); }, [pagination.page, searchTerm]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
          <p className="text-gray-500 mt-1">{pagination.total} brands</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Brand
        </button>
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
              <span className="flex items-center gap-1 text-xs text-gray-400">
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

        {brands.length === 0 && (
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