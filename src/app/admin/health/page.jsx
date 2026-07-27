'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Server, Database, Cpu, HardDrive, AlertTriangle,
  CheckCircle2, XCircle, Clock, RefreshCw, TrendingUp,
  Users, Package, ShoppingCart, Shield, Mail, MessageSquare,
  RotateCcw, DollarSign, Zap, Disc, Wifi, WifiOff, Store, 
} from 'lucide-react';
import { toast } from 'sonner';

export default function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHealth = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      if (data.success) {
        setHealth(data.data);
        setLastUpdated(new Date());
      } else {
        toast.error(data.message || 'Failed to load');
      }
    } catch { toast.error('Failed to fetch system health'); }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchHealth(false), 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const statusBadge = (status) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {status === 'healthy' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {status}
    </span>
  );

  const MetricCard = ({ icon: Icon, label, value, sub, color = 'blue', alert = false }) => (
    <div className={`rounded-xl p-4 border ${alert ? 'bg-red-50 border-red-200' : `bg-${color}-50 border-${color}-200`}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-5 w-5 ${alert ? 'text-red-500' : `text-${color}-600`}`} />
        {alert && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-red-700' : `text-${color}-700`}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-500 mt-1">Real-time monitoring of server, database, and application metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={() => fetchHealth(false)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {health && (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${health.database.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                {health.database.status === 'healthy' ? <Wifi className="h-6 w-6 text-green-600" /> : <WifiOff className="h-6 w-6 text-red-600" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Database</p>
                {statusBadge(health.database.status)}
                <p className="text-xs text-gray-400 mt-1">{health.database.responseTime}ms response</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Server Uptime</p>
                <p className="text-lg font-bold text-blue-700">{health.server.uptimeFormatted}</p>
                <p className="text-xs text-gray-400">Node {health.server.nodeVersion}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Cpu className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">CPU Load</p>
                <p className="text-lg font-bold text-purple-700">{health.server.cpu.load1}</p>
                <p className="text-xs text-gray-400">{health.server.cpu.cores} cores</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Memory</p>
                <p className="text-lg font-bold text-orange-700">{health.server.memory.usagePercent}%</p>
                <p className="text-xs text-gray-400">{health.server.memory.heapUsed} / {health.server.memory.heapTotal}</p>
              </div>
            </div>
          </div>

          {/* Server Metrics */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Server Metrics</h3>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Platform</p>
                <p className="text-sm font-mono text-gray-900">{health.server.platform}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hostname</p>
                <p className="text-sm font-mono text-gray-900">{health.server.hostname}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Memory</p>
                <p className="text-sm font-mono text-gray-900">{health.server.memory.total}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Free Memory</p>
                <p className="text-sm font-mono text-gray-900">{health.server.memory.free}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Heap Used</p>
                <p className="text-sm font-mono text-gray-900">{health.server.memory.heapUsed}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">RSS</p>
                <p className="text-sm font-mono text-gray-900">{health.server.memory.rss}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">DB Connections</p>
                <p className="text-sm font-mono text-gray-900">{health.database.connections}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">DB Size</p>
                <p className="text-sm font-mono text-gray-900">{health.database.size}</p>
              </div>
            </div>
          </div>

          {/* Application Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard icon={Users} label="Total Users" value={health.application.totalUsers} sub={`${health.application.activeUsers} active`} color="blue" />
            <MetricCard icon={Package} label="Total Products" value={health.application.totalProducts} color="green" />
            <MetricCard icon={ShoppingCart} label="Orders Today" value={health.application.todayOrders} sub={`₹${health.application.todayRevenue.toLocaleString('en-IN')}`} color="purple" />
            <MetricCard icon={DollarSign} label="Total Orders" value={health.application.totalOrders} color="orange" />
            <MetricCard icon={Store} label="Suppliers" value={health.application.totalSuppliers} color="indigo" />
          </div>

          {/* Security & Alerts */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Security & Alerts</h3>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
              <MetricCard icon={AlertTriangle} label="Failed Logins (24h)" value={health.security.failedLogins24h} color="red" alert={health.security.failedLogins24h > 5} />
              <MetricCard icon={Shield} label="Pending KYC" value={health.security.pendingKyc} color="orange" alert={health.security.pendingKyc > 10} />
              <MetricCard icon={MessageSquare} label="Open Tickets" value={health.security.openTickets} color="yellow" />
              <MetricCard icon={RotateCcw} label="Pending Returns" value={health.security.pendingReturns} color="pink" />
              <MetricCard icon={DollarSign} label="Pending Settlements" value={health.security.pendingSettlements} color="red" />
              <div className={`rounded-xl p-4 border ${Number(health.security.errorRate24h) > 5 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <TrendingUp className={`h-5 w-5 mb-2 ${Number(health.security.errorRate24h) > 5 ? 'text-red-500' : 'text-gray-400'}`} />
                <p className={`text-2xl font-bold ${Number(health.security.errorRate24h) > 5 ? 'text-red-700' : 'text-gray-700'}`}>{health.security.errorRate24h}%</p>
                <p className="text-xs text-gray-500 mt-1">Error Rate (24h)</p>
              </div>
            </div>
          </div>

          {/* Queues & Storage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Email & SMS Queue</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email Queue</p>
                    <p className="text-xs text-gray-400">Pending emails</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${health.queues.email.queued > 50 ? 'text-red-600' : 'text-gray-600'}`}>{health.queues.email.queued}</span>
                    {health.queues.email.failed > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{health.queues.email.failed} failed</span>}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">SMS Queue</p>
                    <p className="text-xs text-gray-400">Pending messages</p>
                  </div>
                  <span className="text-sm font-bold text-gray-600">{health.queues.sms.queued}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Disc className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Storage</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Audit Log Entries</p>
                    <p className="text-xs text-gray-400">Total records</p>
                  </div>
                  <span className="text-sm font-bold text-gray-600">{health.storage.auditLogEntries.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Media Files</p>
                    <p className="text-xs text-gray-400">Uploaded assets</p>
                  </div>
                  <span className="text-sm font-bold text-gray-600">{health.storage.mediaFiles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Uploads</p>
                    <p className="text-xs text-gray-400">Storage used</p>
                  </div>
                  <span className="text-sm font-bold text-gray-600">{health.storage.uploadSize}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Activity (Last Hour)</h3>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{health.activity.ordersLastHour}</p>
                <p className="text-xs text-gray-500">New Orders</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{health.activity.usersLastHour}</p>
                <p className="text-xs text-gray-500">New Users</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{health.activity.totalRequests24h.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Requests (24h)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{health.activity.errors24h}</p>
                <p className="text-xs text-gray-500">Errors (24h)</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">Auto-refreshes every 30 seconds • Last updated: {health.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}</p>
        </div>
      )}
    </div>
  );
}