// src/app/admin/hsn/page.jsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Upload, Download, Edit, Trash2, Eye, EyeOff,
  RefreshCw, Hash, Filter, X, FileText, AlertCircle, CheckCircle2,
  Package, ChevronLeft, ChevronRight, Loader2, Save, Layers
} from 'lucide-react';
import { toast } from 'sonner';

export default function HsnManagementPage() {
  const [hsnCodes, setHsnCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ chapters: [], sections: [], gstRates: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterChapter, setFilterChapter] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterGstRate, setFilterGstRate] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingHsn, setEditingHsn] = useState(null);
  const [bulkData, setBulkData] = useState('');
  const [bulkMode, setBulkMode] = useState('json');

  const [form, setForm] = useState({ code: '', description: '', chapter: '', section: '', gstRate: 18, cess: 0 });

  const fetchHsnCodes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page, limit: pagination.limit, search: searchTerm,
        ...(filterChapter && { chapter: filterChapter }),
        ...(filterSection && { section: filterSection }),
        ...(filterGstRate && { gstRate: filterGstRate }),
        ...(activeTab === 'active' && { isActive: 'true' }),
        ...(activeTab === 'inactive' && { isActive: 'false' }),
      });
      const res = await fetch('/api/admin/hsn?' + params.toString());
      const data = await res.json();
      if (data.success) {
        setHsnCodes(data.data.hsnCodes);
        setFilters(data.data.filters);
        setPagination(prev => ({ ...prev, ...data.data.pagination }));
        setStats(data.data.stats);
      }
    } catch { toast.error('Failed to load HSN codes'); }
    finally { setLoading(false); }
  }, [pagination.page, searchTerm, filterChapter, filterSection, filterGstRate, activeTab]);

  useEffect(() => { fetchHsnCodes(); }, [fetchHsnCodes]);

  const resetForm = () => setForm({ code: '', description: '', chapter: '', section: '', gstRate: 18, cess: 0 });

  const openEdit = (hsn) => {
    setEditingHsn(hsn);
    setForm({ code: hsn.code, description: hsn.description, chapter: hsn.chapter, section: hsn.section || '', gstRate: hsn.gstRate, cess: hsn.cess });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingHsn(null);
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!form.code || !form.description) { toast.error('Code and description are required'); return; }
      const url = editingHsn ? '/api/admin/hsn/' + editingHsn.id : '/api/admin/hsn';
      const method = editingHsn ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success(editingHsn ? 'HSN code updated' : 'HSN code added');
        setShowModal(false);
        resetForm();
        fetchHsnCodes();
      } else { toast.error(data.error || 'Failed to save'); }
    } catch { toast.error('Failed to save'); }
  };

  const handleToggleStatus = async (id) => {
    try {
      const hsn = hsnCodes.find(h => h.id === id);
      const res = await fetch('/api/admin/hsn/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !hsn.isActive })
      });
      if (res.ok) { toast.success(hsn.isActive ? 'HSN code deactivated' : 'HSN code activated'); fetchHsnCodes(); }
    } catch { toast.error('Failed to update'); }
  };

  const handleBulkImport = async () => {
    try {
      let parsed;
      if (bulkMode === 'json') { parsed = JSON.parse(bulkData); }
      else {
        const lines = bulkData.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',');
        parsed = lines.slice(1).map(line => {
          const vals = line.split(',');
          return { code: vals[0]?.trim(), description: vals[1]?.trim(), chapter: vals[2]?.trim(), section: vals[3]?.trim(), gstRate: parseFloat(vals[4]) || 18, cess: parseFloat(vals[5]) || 0 };
        });
      }
      const res = await fetch('/api/admin/hsn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BULK_IMPORT', data: parsed })
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setShowBulkModal(false); setBulkData(''); fetchHsnCodes(); }
      else { toast.error(data.error || 'Import failed'); }
    } catch { toast.error('Invalid data format'); }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (filterChapter) params.append('chapter', filterChapter);
    if (filterSection) params.append('section', filterSection);
    window.open('/api/admin/hsn/export?' + params.toString(), '_blank');
  };

  const clearFilters = () => { setSearchTerm(''); setFilterChapter(''); setFilterSection(''); setFilterGstRate(''); setActiveTab('all'); };

  const tabStyle = (tab) =>
    `flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`;

  if (loading && hsnCodes.length === 0) {
    return <div className="p-6"><div className="animate-pulse space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}</div></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HSN Code Management</h1>
          <p className="text-gray-500 mt-1">Manage Harmonized System Nomenclature codes for GST compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchHsnCodes} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <Upload className="h-4 w-4" /> Bulk Import
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="h-4 w-4" /> Add HSN Code
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
            <p className="text-xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Codes</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
            <p className="text-xl font-bold text-green-600">{stats.totalActive}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
            <p className="text-xl font-bold text-purple-600">{stats.distinctChapters}</p>
            <p className="text-xs text-gray-500">Chapters</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
            <p className="text-xl font-bold text-orange-600">{stats.totalInactive}</p>
            <p className="text-xs text-gray-500">Inactive</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" placeholder="Search by code, description, chapter..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm"
            />
          </div>
          <select value={filterChapter} onChange={(e) => { setFilterChapter(e.target.value === 'all' ? '' : e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            className="px-3 py-2.5 border rounded-lg text-sm bg-white">
            <option value="all">All Chapters</option>
            {filters.chapters?.map(ch => <option key={ch} value={ch}>Chapter {ch}</option>)}
          </select>
          <select value={filterSection} onChange={(e) => { setFilterSection(e.target.value === 'all' ? '' : e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            className="px-3 py-2.5 border rounded-lg text-sm bg-white min-w-[160px]">
            <option value="all">All Sections</option>
            {filters.sections?.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
          <select value={filterGstRate} onChange={(e) => { setFilterGstRate(e.target.value === 'all' ? '' : e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            className="px-3 py-2.5 border rounded-lg text-sm bg-white">
            <option value="all">All GST Rates</option>
            {filters.gstRates?.map(rate => <option key={rate} value={String(rate)}>{rate}%</option>)}
          </select>
          {(searchTerm || filterChapter || filterSection || filterGstRate || activeTab !== 'all') && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-3 border-t pt-3">
          {['all', 'active', 'inactive'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HSN Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Chapter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST Rate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {hsnCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No HSN codes found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add new codes</p>
                  </td>
                </tr>
              ) : (
                hsnCodes.map((hsn) => (
                  <tr key={hsn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">{hsn.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[300px] truncate" title={hsn.description}>{hsn.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{hsn.chapter}</td>
                    <td className="px-4 py-3">
                      {hsn.section ? <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{hsn.section}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        hsn.gstRate >= 28 ? 'bg-red-100 text-red-700' : hsn.gstRate >= 18 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>{hsn.gstRate}%</span>
                    </td>
                    <td className="px-4 py-3">
                      {hsn.isActive ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Active</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(hsn)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(hsn.id)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title={hsn.isActive ? 'Deactivate' : 'Activate'}>
                          {hsn.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm px-3 py-1.5 bg-white border rounded-md font-medium">{pagination.page} / {pagination.totalPages}</span>
              <button disabled={!pagination.hasNext} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editingHsn ? 'Edit HSN Code' : 'Add HSN Code'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">HSN Code *</label>
                  <input type="text" placeholder="e.g., 8504" value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg mt-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Chapter</label>
                  <input type="text" placeholder="e.g., 85" value={form.chapter}
                    onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg mt-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description *</label>
                <input type="text" placeholder="e.g., Electrical transformers, static converters" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg mt-1.5 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Section / Category</label>
                <input type="text" placeholder="e.g., Electrical Equipment" value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg mt-1.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">GST Rate (%)</label>
                  <select value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2.5 border rounded-lg mt-1.5 text-sm bg-white">
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cess (%)</label>
                  <input type="number" placeholder="0" value={form.cess}
                    onChange={(e) => setForm({ ...form, cess: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 border rounded-lg mt-1.5 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                <Save className="h-4 w-4" /> {editingHsn ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBulkModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Import HSN Codes</h3>
              <button onClick={() => setShowBulkModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Paste JSON array or CSV data. Each item needs: code, description, chapter, section, gstRate, cess.</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setBulkMode('json')} className={`px-3 py-1.5 text-xs rounded-full ${bulkMode === 'json' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>JSON</button>
              <button onClick={() => setBulkMode('csv')} className={`px-3 py-1.5 text-xs rounded-full ${bulkMode === 'csv' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>CSV</button>
            </div>
            <textarea
              className="w-full h-64 font-mono text-sm border rounded-lg p-3 bg-gray-50"
              placeholder={bulkMode === 'json' ? '[\n  {"code": "8504", "description": "Transformers", "chapter": "85", "section": "Electrical", "gstRate": 18, "cess": 0}\n]' : 'code,description,chapter,section,gstRate,cess\n8504,"Electrical Transformers",85,Electrical Equipment,18,0'}
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleBulkImport} disabled={!bulkData.trim()}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Upload className="h-4 w-4" /> Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}