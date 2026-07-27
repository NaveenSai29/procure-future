'use client';
import { useState, useEffect } from 'react';
import { Activity, Search, Calendar, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700', LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600', APPROVE: 'bg-emerald-100 text-emerald-700',
  REJECT: 'bg-orange-100 text-orange-700', SEND: 'bg-cyan-100 text-cyan-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ action: '', entity: '', startDate: '', endDate: '' });

  useEffect(() => { fetchLogs(); }, [pagination.page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page, limit: 50,
        ...(filters.action && { action: filters.action }),
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });
      const res = await fetch('/api/admin/audit-logs?' + params);
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch {} finally { setLoading(false); }
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getActionColor = (action) => {
    const prefix = action?.split('_')[0];
    return ACTION_COLORS[prefix] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1><p className="text-gray-500">{pagination.total} total records</p></div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="text" placeholder="Filter by action..." value={filters.action} onChange={(e) => { setFilters(prev => ({ ...prev, action: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border rounded-lg text-sm" />
          <input type="text" placeholder="Filter by entity..." value={filters.entity} onChange={(e) => { setFilters(prev => ({ ...prev, entity: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border rounded-lg text-sm" />
          <input type="date" value={filters.startDate} onChange={(e) => { setFilters(prev => ({ ...prev, startDate: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border rounded-lg text-sm" />
          <input type="date" value={filters.endDate} onChange={(e) => { setFilters(prev => ({ ...prev, endDate: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Details</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">IP</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th></tr>
          </thead>
          <tbody className="divide-y">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-500">{log.userId?.slice(0, 8) || 'System'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full font-medium ${getActionColor(log.action)}`}>{log.action}</span></td>
                <td className="px-4 py-3 text-sm">{log.entity}{log.entityId ? ' #' + log.entityId.slice(0, 6) : ''}</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{log.newValue ? JSON.stringify(log.newValue).slice(0, 60) : '-'}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-400">{log.ipAddress || '-'}</td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400"><Activity className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No audit logs found</p></td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Prev</button>
          <span className="px-4 py-2 text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1">Next <ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}