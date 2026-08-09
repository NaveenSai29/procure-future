'use client';
import { useState, useEffect } from 'react';
import { 
  Activity, Search, Calendar, Filter, ChevronLeft, ChevronRight, 
  User, Package, ShoppingCart, Store, Settings, Shield, CreditCard,
  Truck, RotateCcw, Bell, Tag, Image, RefreshCw, Download, X
} from 'lucide-react';

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700', LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600', APPROVE: 'bg-emerald-100 text-emerald-700',
  REJECT: 'bg-orange-100 text-orange-700', SEND: 'bg-cyan-100 text-cyan-700',
  VERIFY: 'bg-teal-100 text-teal-700', PROCESS: 'bg-indigo-100 text-indigo-700',
  CANCEL: 'bg-pink-100 text-pink-700', REFUND: 'bg-amber-100 text-amber-700',
};

const ENTITY_ICONS = {
  Order: ShoppingCart, Product: Package, Supplier: Store, User: User,
  Category: Tag, Brand: Tag, Payment: CreditCard, Delivery: Truck,
  Return: RotateCcw, Notification: Bell, Setting: Settings, KYC: Shield,
  Media: Image, Coupon: Tag, HSN: Tag, Wallet: CreditCard, RFQ: ShoppingCart,
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filtersData, setFiltersData] = useState({ actions: [], entities: [] });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ action: '', entity: '', startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchLogs(); }, [pagination.page]);

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
      if (data.filters) setFiltersData(data.filters);
    } catch {} finally { setLoading(false); }
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({ action: '', entity: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const getActionColor = (action) => {
    const prefix = action?.split('_')[0];
    return ACTION_COLORS[prefix] || 'bg-gray-100 text-gray-600';
  };

  const formatAction = (action) => {
    if (!action) return '-';
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getEntityIcon = (entity) => {
    const Icon = ENTITY_ICONS[entity] || Activity;
    return <Icon className="h-3.5 w-3.5" />;
  };

  const getUserDisplay = (log) => {
    if (log.user?.name) return log.user.name;
    if (log.user?.email) return log.user.email;
    if (log.user?.mobile) return log.user.mobile;
    if (log.userId) return log.userId.slice(0, 8) + '...';
    return 'System';
  };

  const exportCSV = () => {
    const headers = ['Date', 'User', 'Action', 'Entity', 'Details', 'IP Address'];
    const rows = logs.map(log => [
      formatDate(log.createdAt),
      getUserDisplay(log),
      formatAction(log.action),
      log.entity + (log.entityId ? ' #' + log.entityId.slice(0, 8) : ''),
      log.newValue ? JSON.stringify(log.newValue).slice(0, 100) : '-',
      log.ipAddress || '-',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total.toLocaleString()} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {(filters.action || filters.entity || filters.startDate || filters.endDate) && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X className="h-3 w-3" /> Clear All
            </button>
          )}
        </div>

        {showFilters && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Action</label>
                <select value={filters.action} onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">All Actions</option>
                  {filtersData.actions.map(a => (
                    <option key={a} value={a}>{formatAction(a)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Entity</label>
                <select value={filters.entity} onChange={(e) => setFilters(prev => ({ ...prev, entity: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">All Entities</option>
                  {filtersData.entities.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Start Date</label>
                <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">End Date</label>
                <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <button onClick={applyFilters} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-2">
              <Search className="h-4 w-4" /> Apply Filters
            </button>
          </div>
        )}

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'].map(action => (
            <button
              key={action}
              onClick={() => { setFilters(prev => ({ ...prev, action: prev.action === action ? '' : action })); setPagination(prev => ({ ...prev, page: 1 })); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filters.action === action 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {formatAction(action)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>Loading logs...</p>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No audit logs found</p>
                </td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{getUserDisplay(log)}</p>
                          {log.user?.email && <p className="text-xs text-gray-400">{log.user.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">{getEntityIcon(log.entity)}</span>
                        <span className="text-sm text-gray-700">{log.entity}</span>
                        {log.entityId && <span className="text-xs text-gray-400 font-mono">#{log.entityId.slice(0, 8)}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                      {log.newValue ? (
                        <span className="truncate block" title={JSON.stringify(log.newValue, null, 2)}>
                          {JSON.stringify(log.newValue).slice(0, 80)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{log.ipAddress || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button 
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} 
            disabled={pagination.page === 1} 
            className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1 text-sm hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button 
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} 
            disabled={pagination.page === pagination.totalPages} 
            className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-1 text-sm hover:bg-gray-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}