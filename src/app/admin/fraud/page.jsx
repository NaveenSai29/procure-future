'use client';

import { useState, useEffect } from 'react';
import {
  Shield, AlertTriangle, RefreshCw, Search, Eye, CheckCircle2,
  XCircle, Clock, User, ShoppingCart, RotateCcw, DollarSign,
  Wallet, Key, Package, TrendingUp, Filter
} from 'lucide-react';
import { toast } from 'sonner';

export default function FraudDetectionPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/fraud');
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data.alerts);
        setStats(data.data.stats);
      }
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  const runScan = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/admin/fraud', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Scan complete. ${data.newAlerts || 0} new alerts found.`);
        fetchAlerts();
      } else { 
        toast.error(data.message || data.error || 'Scan failed'); 
      }
    } catch (err) { 
      toast.error('Scan failed - check console for details');
      console.error(err);
    }
    finally { setScanning(false); }
  };

  const handleAction = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/fraud/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { toast.success(`Alert ${status.toLowerCase()}`); fetchAlerts(); }
    } catch { toast.error('Failed'); }
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'RAPID_ORDERS': return <ShoppingCart className="h-4 w-4" />;
      case 'EXCESSIVE_RETURNS': return <RotateCcw className="h-4 w-4" />;
      case 'HIGH_VALUE_REFUND': return <DollarSign className="h-4 w-4" />;
      case 'WALLET_SPIKE': return <Wallet className="h-4 w-4" />;
      case 'BRUTE_FORCE': return <Key className="h-4 w-4" />;
      case 'DUPLICATE_LISTINGS': return <Package className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const severityColor = (s) => {
    switch (s) {
      case 'HIGH': return 'bg-red-100 text-red-700';
      case 'MEDIUM': return 'bg-orange-100 text-orange-700';
      case 'LOW': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case 'OPEN': return 'bg-red-100 text-red-700';
      case 'REVIEWED': return 'bg-blue-100 text-blue-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filtered = alerts.filter(a => {
    if (filter !== 'ALL' && a.severity !== filter) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase()) && 
        !a.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}</div></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-red-600" /> Fraud Detection
          </h1>
          <p className="text-gray-500 mt-1">Detect suspicious activities and prevent fraud</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAlerts} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={runScan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
            <Search className="h-4 w-4" /> {scanning ? 'Scanning...' : 'Run Fraud Scan'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-50 rounded-xl p-3 text-center border">
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Alerts</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
            <p className="text-2xl font-bold text-red-700">{stats.open}</p>
            <p className="text-xs text-gray-500">Open</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
            <p className="text-2xl font-bold text-orange-700">{stats.highRisk}</p>
            <p className="text-xs text-gray-500">High Risk</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
            <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
            <p className="text-xs text-gray-500">Resolved</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm mb-6">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search alerts..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No fraud alerts detected</p>
              <p className="text-sm mt-1">Run a fraud scan to check for suspicious activity</p>
            </div>
          ) : (
            filtered.map(alert => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 transition flex items-start gap-4">
                <div className={`p-2 rounded-lg shrink-0 ${severityColor(alert.severity)}`}>
                  {typeIcon(alert.alertType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(alert.severity)}`}>{alert.severity}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(alert.status)}`}>{alert.status}</span>
                    <span className="text-xs text-gray-400">{alert.alertType.replace(/_/g, ' ')}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
                {alert.status === 'OPEN' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleAction(alert.id, 'REVIEWED')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100">
                      <Eye className="h-3 w-3" /> Review
                    </button>
                    <button onClick={() => handleAction(alert.id, 'RESOLVED')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100">
                      <CheckCircle2 className="h-3 w-3" /> Resolve
                    </button>
                  </div>
                )}
                {alert.status === 'REVIEWED' && (
                  <button onClick={() => handleAction(alert.id, 'RESOLVED')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100 shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}