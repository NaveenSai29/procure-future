'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Megaphone, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const ANNOUNCE_TYPES = { INFO: { icon: Info, color: 'bg-blue-100 text-blue-700' }, WARNING: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700' }, SUCCESS: { icon: CheckCircle, color: 'bg-green-100 text-green-700' }, MAINTENANCE: { icon: Clock, color: 'bg-orange-100 text-orange-700' } };
const TARGETS = ['ALL', 'BUYERS', 'SUPPLIERS', 'DELIVERY'];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'INFO', targetUsers: 'ALL', startDate: '', endDate: '' });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try { const res = await fetch('/api/admin/cms/announcements'); const data = await res.json(); setAnnouncements(data.announcements || []); } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    const url = editing ? '/api/admin/cms/announcements/' + editing.id : '/api/admin/cms/announcements';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { toast.success(editing ? 'Updated' : 'Created'); setShowModal(false); resetForm(); fetchAnnouncements(); }
  };

  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await fetch('/api/admin/cms/announcements/' + id, { method: 'DELETE' }); toast.success('Deleted'); fetchAnnouncements(); };

  const resetForm = () => { setEditing(null); setForm({ title: '', content: '', type: 'INFO', targetUsers: 'ALL', startDate: '', endDate: '' }); };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Announcements</h1><p className="text-gray-500">{announcements.length} announcements</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /> New Announcement</button>
      </div>

      <div className="space-y-3">
        {announcements.map(a => {
          const typeStyle = ANNOUNCE_TYPES[a.type] || ANNOUNCE_TYPES.INFO;
          const Icon = typeStyle.icon;
          return (
            <div key={a.id} className={`bg-white rounded-xl border p-4 ${!a.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${typeStyle.color}`}><Icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div><h3 className="font-semibold text-gray-900">{a.title}</h3><p className="text-sm text-gray-500 mt-1">{a.content}</p></div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(a); setForm({ title: a.title, content: a.content, type: a.type, targetUsers: a.targetUsers || 'ALL', startDate: a.startDate?.split('T')[0] || '', endDate: a.endDate?.split('T')[0] || '' }); setShowModal(true); }} className="p-1 hover:bg-gray-100 rounded"><Edit className="h-3.5 w-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Target: {a.targetUsers || 'ALL'}</span>
                    {a.startDate && <span>From: {new Date(a.startDate).toLocaleDateString()}</span>}
                    {a.endDate && <span>To: {new Date(a.endDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {announcements.length === 0 && <div className="text-center py-12 text-gray-400"><Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No announcements</p></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{editing ? 'Edit' : 'New'} Announcement</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Title</label><input type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              <div><label className="text-sm font-medium">Content</label><textarea value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Type</label><select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1">{Object.keys(ANNOUNCE_TYPES).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-sm font-medium">Target Users</label><select value={form.targetUsers} onChange={(e) => setForm(prev => ({ ...prev, targetUsers: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1">{TARGETS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              </div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button><button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg"><Save className="h-4 w-4 inline mr-1" />{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}