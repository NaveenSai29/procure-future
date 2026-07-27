'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Server, Database, Cpu, HardDrive, AlertTriangle,
  CheckCircle2, XCircle, Clock, RefreshCw, TrendingUp, TrendingDown,
  Users, Package, ShoppingCart, Shield, Mail, MessageSquare,
  RotateCcw, DollarSign, Zap, Disc, Wifi, WifiOff, Store,
  BarChart3, ListFilter, Eye, ChevronDown, ChevronUp,
  Radio, Bug, FileWarning, Search, Download, Trash2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function MonitoringPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedError, setExpandedError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      const res = await fetch(`/api/admin/monitoring?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      } else {
        toast.error(json.message || 'Failed to load');
      }
    } catch {
      toast.error('Failed to fetch monitoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'errors', label: 'Error Logs', icon: Bug },
    { id: 'queues', label: 'Queues', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const severityColors = {
    HIGH: 'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    WARNING: 'bg-orange-100 text-orange-700 border-orange-200',
    LOW: 'bg-green-100 text-green-700 border-green-200',
  };

  const threatColors = {
    HIGH: 'text-red-600 bg-red-50',
    MEDIUM: 'text-yellow-600 bg-yellow-50',
    LOW: 'text-green-600 bg-green-50',
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
          <p className="text-gray-500 mt-1">Real-time system monitoring, performance & error tracking</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
            {autoRefresh ? 'Auto (15s)' : 'Manual'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts Banner */}
      {data?.alerts?.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.alerts.map((alert, i) => (
            <div key={i} className={`rounded-xl p-4 border flex items-center gap-3 ${severityColors[alert.severity]}`}>
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-sm">{alert.type}:</span>
                <span className="text-sm ml-1">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && data && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Server} label="CPU Usage" value={`${data.performance?.cpu?.usagePercent || 0}%`} color="blue" alert={data.performance?.cpu?.usagePercent > 80} />
            <StatCard icon={HardDrive} label="Memory" value={`${data.performance?.memory?.usagePercent || 0}%`} color="purple" alert={data.performance?.memory?.usagePercent > 85} />
            <StatCard icon={Database} label="DB Connections" value={data.database?.connections || 0} color="orange" alert={data.database?.connections > 40} />
            <StatCard icon={Activity} label="Error Rate" value={`${data.performance?.requests?.errorRate || 0}%`} color="red" alert={Number(data.performance?.requests?.errorRate) > 5} />
          </div>

          {/* Performance & Security Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-600" />Performance</h3>
              <div className="space-y-4">
                <ProgressBar label="CPU" value={data.performance?.cpu?.usagePercent || 0} max={100} color="blue" />
                <ProgressBar label="Memory" value={data.performance?.memory?.usagePercent || 0} max={100} color="purple" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Uptime:</span> <span className="font-mono font-medium">{data.performance?.uptimeFormatted}</span></div>
                  <div><span className="text-gray-500">CPU Cores:</span> <span className="font-mono font-medium">{data.performance?.cpu?.cores}</span></div>
                  <div><span className="text-gray-500">Heap:</span> <span className="font-mono font-medium">{data.performance?.memory?.heapUsed}MB</span></div>
                  <div><span className="text-gray-500">RSS:</span> <span className="font-mono font-medium">{data.performance?.memory?.rss}MB</span></div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-red-600" />Security</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Threat Level</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${threatColors[data.security?.threatLevel] || 'text-gray-600 bg-gray-100'}`}>
                    {data.security?.threatLevel || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Failed Logins" value={data.security?.failedLogins || 0} alert={data.security?.failedLogins > 10} />
                  <MiniStat label="Brute Force" value={data.security?.bruteForceAttempts || 0} alert={data.security?.bruteForceAttempts > 0} />
                  <MiniStat label="Suspicious" value={data.security?.suspiciousActivities || 0} alert={data.security?.suspiciousActivities > 0} />
                  <MiniStat label="Fraud Alerts" value={data.security?.fraudAlerts || 0} alert={data.security?.fraudAlerts > 3} />
                </div>
              </div>
            </div>
          </div>

          {/* Queues & DB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-blue-600" />Queues</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>Email Queued</span><span className="font-mono font-bold">{data.queues?.email?.queued || 0}</span></div>
                <div className="flex justify-between text-sm"><span>Email Failed</span><span className="font-mono font-bold text-red-600">{data.queues?.email?.failed || 0}</span></div>
                <div className="flex justify-between text-sm"><span>Email Sent (24h)</span><span className="font-mono font-bold text-green-600">{data.queues?.email?.sent24h || 0}</span></div>
                <hr className="my-2" />
                <div className="flex justify-between text-sm"><span>SMS Queued</span><span className="font-mono font-bold">{data.queues?.sms?.queued || 0}</span></div>
                <div className="flex justify-between text-sm"><span>SMS Failed</span><span className="font-mono font-bold text-red-600">{data.queues?.sms?.failed || 0}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Database className="h-5 w-5 text-purple-600" />Database</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>Size</span><span className="font-mono font-bold">{data.database?.size} MB</span></div>
                <div className="flex justify-between text-sm"><span>Connections</span><span className="font-mono font-bold">{data.database?.connections}</span></div>
                <div className="flex justify-between text-sm"><span>Slow Queries</span><span className={`font-mono font-bold ${data.database?.slowQueries > 5 ? 'text-red-600' : 'text-green-600'}`}>{data.database?.slowQueries || 0}</span></div>
                <div className="flex justify-between text-sm"><span>Status</span><span className={`font-bold ${data.database?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>{data.database?.status}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {activeTab === 'performance' && data?.performance && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Cpu} label="CPU Usage" value={`${data.performance.cpu.usagePercent}%`} color="blue" />
            <StatCard icon={HardDrive} label="Memory Usage" value={`${data.performance.memory.usagePercent}%`} color="purple" />
            <StatCard icon={Activity} label="Total Requests" value={data.performance.requests.total.toLocaleString()} color="green" />
            <StatCard icon={Bug} label="Error Rate" value={`${data.performance.requests.errorRate}%`} color="red" />
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">CPU Load Average</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{data.performance.cpu.load1}</p>
                <p className="text-xs text-gray-500 mt-1">1 min</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{data.performance.cpu.load5}</p>
                <p className="text-xs text-gray-500 mt-1">5 min</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{data.performance.cpu.load15}</p>
                <p className="text-xs text-gray-500 mt-1">15 min</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Memory Details</h3>
            <ProgressBar label="Heap Usage" value={data.performance.memory.usagePercent} max={100} color="purple" />
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
              <div><span className="text-gray-500">Heap Used:</span> <span className="font-mono font-medium">{data.performance.memory.heapUsed} MB</span></div>
              <div><span className="text-gray-500">Heap Total:</span> <span className="font-mono font-medium">{data.performance.memory.heapTotal} MB</span></div>
              <div><span className="text-gray-500">RSS:</span> <span className="font-mono font-medium">{data.performance.memory.rss} MB</span></div>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE TAB */}
      {activeTab === 'database' && data?.database && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Database} label="DB Size" value={`${data.database.size} MB`} color="purple" />
            <StatCard icon={Wifi} label="Connections" value={data.database.connections} color="blue" alert={data.database.connections > 40} />
            <StatCard icon={Clock} label="Slow Queries" value={data.database.slowQueries || 0} color="orange" alert={data.database.slowQueries > 5} />
            <StatCard icon={CheckCircle2} label="Status" value={data.database.status} color="green" />
          </div>

          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Table Sizes (Top 10)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Table</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rows</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.database.tables?.map((table, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{table.name}</td>
                      <td className="px-4 py-3 text-sm text-right">{table.rows?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{table.size} MB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ERROR LOGS TAB */}
      {activeTab === 'errors' && data?.errors && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Bug} label="Total Errors" value={data.errors.total} color="red" alert={data.errors.total > 20} />
            <StatCard icon={TrendingUp} label="Error Types" value={data.errors.byType?.length || 0} color="orange" />
            <StatCard icon={Clock} label="Peak Hour" value={data.errors.byHour?.length ? `${data.errors.byHour.reduce((a,b) => a.count > b.count ? a : b).hour}:00` : 'N/A'} color="yellow" />
          </div>

          {/* Error Distribution */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Errors by Type</h3>
            <div className="space-y-3">
              {data.errors.byType?.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-700 w-40 truncate">{item.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${Math.min((item.count / (data.errors.total || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-10 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Recent Errors ({data.errors.recent?.length || 0})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.errors.recent?.map((err, i) => (
                    <>
                      <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedError(expandedError === i ? null : i)}>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(err.time).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{err.type}</span></td>
                        <td className="px-4 py-3 text-xs font-mono">{err.entity}{err.entityId ? `:${err.entityId.substring(0,8)}` : ''}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{err.ip || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <ChevronDown className={`h-4 w-4 ml-auto transition ${expandedError === i ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {expandedError === i && (
                        <tr key={`${i}-detail`} className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-3">
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">{JSON.stringify(err.detail, null, 2)}</pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUEUES TAB */}
      {activeTab === 'queues' && data?.queues && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={Mail} label="Email Queued" value={data.queues.email.queued} color="blue" alert={data.queues.email.queued > 50} />
            <StatCard icon={XCircle} label="Email Failed" value={data.queues.email.failed} color="red" alert={data.queues.email.failed > 10} />
            <StatCard icon={CheckCircle2} label="Email Sent (24h)" value={data.queues.email.sent24h} color="green" />
            <StatCard icon={MessageSquare} label="SMS Queued" value={data.queues.sms.queued} color="purple" />
            <StatCard icon={XCircle} label="SMS Failed" value={data.queues.sms.failed} color="red" alert={data.queues.sms.failed > 5} />
            <StatCard icon={CheckCircle2} label="SMS Sent (24h)" value={data.queues.sms.sent24h} color="green" />
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && data?.security && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Shield} label="Threat Level" value={data.security.threatLevel} color={data.security.threatLevel === 'HIGH' ? 'red' : data.security.threatLevel === 'MEDIUM' ? 'yellow' : 'green'} />
            <StatCard icon={XCircle} label="Failed Logins" value={data.security.failedLogins} color="red" alert={data.security.failedLogins > 10} />
            <StatCard icon={AlertTriangle} label="Brute Force" value={data.security.bruteForceAttempts} color="orange" alert={data.security.bruteForceAttempts > 0} />
            <StatCard icon={Bug} label="Fraud Alerts" value={data.security.fraudAlerts} color="red" alert={data.security.fraudAlerts > 3} />
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-gray-400 text-center mt-6">
        {autoRefresh ? 'Auto-refreshing every 15 seconds' : 'Auto-refresh disabled'} • Last updated: {lastUpdated?.toLocaleTimeString() || 'N/A'} • Period: {period}
      </p>
    </div>
  );
}

// Helper Components
function StatCard({ icon: Icon, label, value, color = 'blue', alert = false }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };

  return (
    <div className={`rounded-xl p-4 border ${alert ? 'bg-red-50 border-red-300' : colorMap[color] || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-5 w-5 ${alert ? 'text-red-500' : ''}`} />
        {alert && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function ProgressBar({ label, value, max = 100, color = 'blue' }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap = { blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-green-500', red: 'bg-red-500', orange: 'bg-orange-500' };
  const alertThreshold = color === 'red' ? 50 : color === 'purple' ? 85 : 80;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={`font-bold ${pct > alertThreshold ? 'text-red-600' : 'text-gray-700'}`}>{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full ${colorMap[color] || 'bg-blue-500'} rounded-full transition-all duration-500 ${pct > alertThreshold ? 'animate-pulse' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, alert = false }) {
  return (
    <div className={`p-3 rounded-lg ${alert ? 'bg-red-50' : 'bg-gray-50'}`}>
      <p className={`text-lg font-bold ${alert ? 'text-red-700' : 'text-gray-700'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}