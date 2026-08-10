'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Megaphone, Info, AlertTriangle, CheckCircle, Clock, Send, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

const ANNOUNCE_TYPES = { INFO: { icon: Info, color: 'bg-blue-100 text-blue-700' }, WARNING: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700' }, SUCCESS: { icon: CheckCircle, color: 'bg-green-100 text-green-700' }, MAINTENANCE: { icon: Clock, color: 'bg-orange-100 text-orange-700' } };
const TARGETS = ['ALL', 'BUYERS', 'SUPPLIERS', 'DELIVERY'];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'INFO', targetUsers: 'ALL', startDate: '', endDate: '', isActive: true });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try { 
      const res = await fetch('/api/admin/cms/announcements'); 
      const data = await res.json(); 
      setAnnouncements(data.announcements || []); 
    } catch {} 
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (!form.content.trim()) { toast.error('Content required'); return; }

    const url = editing ? '/api/admin/cms/announcements/' + editing.id : '/api/admin/cms/announcements';
    const method = editing ? 'PATCH' : 'POST';
    
    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(form) 
      });
      if (res.ok) { 
        toast.success(editing ? 'Updated' : 'Created & notifications sent!'); 
        setShowModal(false); 
        resetForm(); 
        fetchAnnouncements(); 
      } else {
        toast.error('Failed to save');
      }
    } catch { toast.error('Failed'); }
  };

  const handleToggleActive = async (announcement) => {
    try {
      const res = await fetch('/api/admin/cms/announcements/' + announcement.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !announcement.isActive }),
      });
      if (res.ok) {
        toast.success(announcement.isActive ? 'Deactivated' : 'Activated');
        fetchAnnouncements();
      }
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => { 
    if (!confirm('Delete this announcement?')) return; 
    await fetch('/api/admin/cms/announcements/' + id, { method: 'DELETE' }); 
    toast.success('Deleted'); 
    fetchAnnouncements(); 
  };

  const resetForm = () => { 
    setEditing(null); 
    setForm({ title: '', content: '', type: 'INFO', targetUsers: 'ALL', startDate: '', endDate: '', isActive: true }); 
  };

  const activeCount = announcements.filter(a => a.isActive !== false).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm">{announcements.length} total · {activeCount} active</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Send className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">How Announcements Work</p>
          <p className="text-sm text-blue-700 mt-1">
            Creating an active announcement sends <strong>in-app notifications</strong> to the targeted users. 
            Buyers see announcements on their home screen. Deactivated announcements are hidden.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No announcements yet</p>
            <p className="text-sm mt-1">Create your first announcement to notify users</p>
          </div>
        ) : (
          announcements.map(a => {
            const typeStyle = ANNOUNCE_TYPES[a.type] || ANNOUNCE_TYPES.INFO;
            const Icon = typeStyle.icon;
            const isActive = a.isActive !== false;
            
            return (
              <div key={a.id} className={`bg-white rounded-xl border p-5 transition ${!isActive ? 'opacity-60 bg-gray-50' : 'hover:shadow-md'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${typeStyle.color} flex-shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{a.title}</h3>
                          {!isActive && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Active Toggle */}
                        <button 
                          onClick={() => handleToggleActive(a)} 
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                          title={isActive ? 'Deactivate' : 'Activate'}
                        >
                          {isActive ? 
                            <ToggleRight className="h-5 w-5 text-green-500" /> : 
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          }
                        </button>
                        <button onClick={() => { 
                          setEditing(a); 
                          setForm({ 
                            title: a.title, content: a.content, type: a.type, 
                            targetUsers: a.targetUsers || 'ALL', 
                            startDate: a.startDate?.split('T')[0] || '', 
                            endDate: a.endDate?.split('T')[0] || '',
                            isActive: a.isActive !== false,
                          }); 
                          setShowModal(true); 
                        }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <Edit className="h-4 w-4 text-gray-400" />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> Target: <span className="font-medium text-gray-600">{a.targetUsers || 'ALL'}</span>
                      </span>
                      {a.startDate && <span>From: {new Date(a.startDate).toLocaleDateString('en-IN')}</span>}
                      {a.endDate && <span>To: {new Date(a.endDate).toLocaleDateString('en-IN')}</span>}
                      <span>Created: {new Date(a.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit' : 'New'} Announcement</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} 
                  className="w-full px-3 py-2.5 border rounded-lg mt-1" placeholder="e.g., Holiday Schedule Update" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Content *</label>
                <textarea value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} 
                  className="w-full px-3 py-2.5 border rounded-lg mt-1" rows={4} placeholder="Your announcement message..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))} 
                    className="w-full px-3 py-2.5 border rounded-lg mt-1">
                    {Object.keys(ANNOUNCE_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Target Users</label>
                  <select value={form.targetUsers} onChange={(e) => setForm(prev => ({ ...prev, targetUsers: e.target.value }))} 
                    className="w-full px-3 py-2.5 border rounded-lg mt-1">
                    {TARGETS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Users' : t === 'BUYERS' ? 'Buyers Only' : t === 'SUPPLIERS' ? 'Suppliers Only' : 'Delivery Partners'}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))} 
                    className="w-full px-3 py-2.5 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))} 
                    className="w-full px-3 py-2.5 border rounded-lg mt-1" />
                </div>
              </div>
              {/* Active Toggle */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Active</p>
                  <p className="text-xs text-gray-500">Send notifications & show to users immediately</p>
                </div>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border rounded-lg font-medium">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />{editing ? 'Update' : 'Create & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}