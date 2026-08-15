'use client';

import { useState, useEffect } from 'react';
import { Users, MapPin, Phone, CheckCircle2, Trash2, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminWaitlistPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/waitlist');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error('Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWaitlist(); }, []);

  const handleMarkNotified = async (id) => {
    setProcessingId(id);
    try {
      await fetch('/api/admin/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'markNotified' }),
      });
      toast.success('Marked as notified');
      fetchWaitlist();
    } catch {
      toast.error('Failed to update');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    setProcessingId(id);
    try {
      await fetch('/api/admin/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      });
      toast.success('Entry deleted');
      fetchWaitlist();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = data?.waitlist?.filter(w =>
    !searchTerm ||
    w.mobile?.includes(searchTerm) ||
    w.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.state?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waitlist Management</h1>
          <p className="text-gray-500 mt-1">Users waiting for PROCURE in their area</p>
        </div>
        <button onClick={fetchWaitlist} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Users className="h-4 w-4" /> Total Waitlist</div>
            <p className="text-2xl font-bold text-blue-600">{data.stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><CheckCircle2 className="h-4 w-4" /> Notified</div>
            <p className="text-2xl font-bold text-green-600">{data.stats.notified}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><MapPin className="h-4 w-4" /> Pending</div>
            <p className="text-2xl font-bold text-orange-600">{data.stats.pending}</p>
          </div>
        </div>
      )}

      {/* City Stats */}
      {data?.cityStats && data.cityStats.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Cities</h3>
          <div className="flex flex-wrap gap-2">
            {data.cityStats.slice(0, 10).map((city, i) => (
              <span key={i} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                {city.city}: {city.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by mobile or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No waitlist entries</td></tr>
              ) : (
                filtered.map((w, i) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{w.mobile}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{w.city || '-'}, {w.state || '-'}</p>
                      {w.pincode && <p className="text-xs text-gray-400">{w.pincode}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {w.user ? (
                        <p className="text-sm text-gray-700">{w.user.name}</p>
                      ) : (
                        <span className="text-xs text-gray-400">Guest</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {w.notifiedAt ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Notified {new Date(w.notifiedAt).toLocaleDateString('en-IN')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {!w.notifiedAt && (
                          <button
                            onClick={() => handleMarkNotified(w.id)}
                            disabled={processingId === w.id}
                            className="p-2 rounded-lg hover:bg-green-50 transition"
                            title="Mark as Notified"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(w.id)}
                          disabled={processingId === w.id}
                          className="p-2 rounded-lg hover:bg-red-50 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}