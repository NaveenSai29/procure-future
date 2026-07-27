'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, FileText, Eye, Globe, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_TYPES = ['PAGE', 'BLOG', 'NEWS', 'POLICY', 'ANNOUNCEMENT'];

export default function PagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [form, setForm] = useState({
    title: '', slug: '', content: '', excerpt: '', type: 'PAGE', status: 'DRAFT',
    metaTitle: '', metaDescription: '', featuredImage: ''
  });

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/cms/pages');
      const data = await res.json();
      setPages(data.pages || []);
    } catch { toast.error('Failed to load pages'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    const url = editingPage ? '/api/admin/cms/pages/' + editingPage.id : '/api/admin/cms/pages';
    const method = editingPage ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { toast.success(editingPage ? 'Updated' : 'Created'); setShowModal(false); resetForm(); fetchPages(); }
    else { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this page?')) return;
    await fetch('/api/admin/cms/pages/' + id, { method: 'DELETE' });
    toast.success('Deleted'); fetchPages();
  };

  const resetForm = () => {
    setEditingPage(null);
    setForm({ title: '', slug: '', content: '', excerpt: '', type: 'PAGE', status: 'DRAFT', metaTitle: '', metaDescription: '', featuredImage: '' });
  };

  const getStatusColor = (status) => {
    return status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Pages</h1><p className="text-gray-500">{pages.length} pages</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /> New Page</button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Updated</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
          <tbody className="divide-y">
            {pages.map(page => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><p className="font-medium text-sm">{page.title}</p><p className="text-xs text-gray-400">/{page.slug}</p></td>
                <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-gray-100 rounded-full">{page.type}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(page.status)}`}>{page.status}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(page.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingPage(page); setForm({ title: page.title, slug: page.slug, content: page.content, excerpt: page.excerpt || '', type: page.type, status: page.status, metaTitle: page.metaTitle || '', metaDescription: page.metaDescription || '', featuredImage: page.featuredImage || '' }); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 rounded"><Edit className="h-4 w-4 text-gray-400" /></button>
                    <button onClick={() => handleDelete(page.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No pages created</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{editingPage ? 'Edit Page' : 'New Page'}</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Title</label><input type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">Slug</label><input type="text" value={form.slug} onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium">Type</label><select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1">{PAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-sm font-medium">Status</label><select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
                <div><label className="text-sm font-medium">Featured Image</label><input type="text" value={form.featuredImage} onChange={(e) => setForm(prev => ({ ...prev, featuredImage: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="URL" /></div>
              </div>
              <div><label className="text-sm font-medium">Excerpt</label><textarea value={form.excerpt} onChange={(e) => setForm(prev => ({ ...prev, excerpt: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" rows={2} /></div>
              <div><label className="text-sm font-medium">Content</label><textarea value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1 font-mono text-sm" rows={10} /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Meta Title</label><input type="text" value={form.metaTitle} onChange={(e) => setForm(prev => ({ ...prev, metaTitle: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div><div><label className="text-sm font-medium">Meta Description</label><input type="text" value={form.metaDescription} onChange={(e) => setForm(prev => ({ ...prev, metaDescription: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div></div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button><button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg"><Save className="h-4 w-4 inline mr-1" />{editingPage ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}