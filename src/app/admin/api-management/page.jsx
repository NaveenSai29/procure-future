'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Key, Webhook, Activity, Plus, Trash2, Copy, Eye, EyeOff,
  RefreshCw, Shield, Zap, Clock, CheckCircle2, XCircle,
  AlertTriangle, Search, Download, Globe, Server, BarChart3,
  Power, PowerOff, ExternalLink, Loader2, Filter, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ApiManagementPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);

  // New key form
  const [keyForm, setKeyForm] = useState({ name: '', scopes: 'read,write', entityType: 'ADMIN', expiresAt: '' });

  // New webhook form
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: 'order.created,order.updated', secret: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-management?section=overview');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateKey = async () => {
    if (!keyForm.name) { toast.error('Name required'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/api-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-key',
          name: keyForm.name,
          scopes: keyForm.scopes.split(',').map(s => s.trim()),
          entityType: keyForm.entityType,
          expiresAt: keyForm.expiresAt || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewKey(json.data.rawKey);
        toast.success('API Key created!');
        fetchData();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error('Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/api-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke-key', keyId }),
      });
      const json = await res.json();
      if (json.success) { toast.success('Key revoked'); fetchData(); }
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) { toast.error('Name and URL required'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/api-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-webhook',
          name: webhookForm.name,
          url: webhookForm.url,
          events: webhookForm.events.split(',').map(s => s.trim()),
          secret: webhookForm.secret || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Webhook created!');
        setShowCreateWebhook(false);
        setWebhookForm({ name: '', url: '', events: 'order.created,order.updated', secret: '' });
        fetchData();
      }
    } catch {
      toast.error('Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'keys', label: 'API Keys', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'logs', label: 'Request Logs', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3"></div></div></div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
          <p className="text-gray-500 mt-1">
            {data?.activeKeys || 0} active keys • {data?.totalWebhooks || 0} webhooks
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Key} label="Active Keys" value={data?.activeKeys || 0} color="blue" />
        <StatCard icon={Shield} label="Revoked Keys" value={data?.revokedKeys?.length || 0} color="red" />
        <StatCard icon={Webhook} label="Webhooks" value={data?.totalWebhooks || 0} color="purple" />
        <StatCard icon={Activity} label="Requests (24h)" value={data?.requestStats?.total?.toLocaleString() || 0} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && data?.requestStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" />Request Stats (24h)</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>Total Requests</span><span className="font-bold">{data.requestStats.total}</span></div>
                <div className="flex justify-between text-sm"><span>Errors</span><span className="font-bold text-red-600">{data.requestStats.errors}</span></div>
                <div className="flex justify-between text-sm"><span>Error Rate</span><span className="font-bold">{data.requestStats.errorRate}%</span></div>
                <div className="flex justify-between text-sm"><span>Avg Duration</span><span className="font-bold">{data.requestStats.avgDuration}ms</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-purple-600" />Top Endpoints</h3>
              <div className="space-y-2">
                {data.requestStats.topPaths?.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs truncate max-w-[200px]">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold mr-1 ${p.method === 'GET' ? 'bg-green-100 text-green-700' : p.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.method}</span>
                      {p.path}
                    </span>
                    <span className="text-gray-500">{p.count} hits • {p.avgMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API KEYS TAB */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">API Keys ({data?.keys?.length || 0})</h3>
            <button onClick={() => setShowCreateKey(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Key
            </button>
          </div>

          {/* New Key Modal */}
          {showCreateKey && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-900 mb-4">Create New API Key</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium">Key Name *</label>
                  <input type="text" value={keyForm.name} onChange={(e) => setKeyForm({...keyForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="Mobile App Key" />
                </div>
                <div>
                  <label className="text-sm font-medium">Scopes</label>
                  <input type="text" value={keyForm.scopes} onChange={(e) => setKeyForm({...keyForm, scopes: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Entity Type</label>
                  <select value={keyForm.entityType} onChange={(e) => setKeyForm({...keyForm, entityType: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1">
                    <option value="ADMIN">Admin</option><option value="SUPPLIER">Supplier</option><option value="BUYER">Buyer</option><option value="PARTNER">Partner</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Expires (optional)</label>
                  <input type="date" value={keyForm.expiresAt} onChange={(e) => setKeyForm({...keyForm, expiresAt: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateKey} disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
                </button>
                <button onClick={() => setShowCreateKey(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Cancel</button>
              </div>
              {newKey && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-bold text-green-800">Key created! Copy it now — it won't be shown again.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 p-2 bg-white rounded text-xs break-all">{newKey}</code>
                    <button onClick={() => copyToClipboard(newKey)} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs"><Copy className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keys List */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prefix</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Scopes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Used</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y">
                {data?.keys?.map(key => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{key.name}</td>
                    <td className="px-4 py-3 text-xs font-mono">{key.prefix}...</td>
                    <td className="px-4 py-3 text-xs">{Array.isArray(key.scopes) ? key.scopes.join(', ') : key.scopes}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleRevokeKey(key.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 flex items-center gap-1 ml-auto">
                        <Trash2 className="h-3 w-3" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WEBHOOKS TAB */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Webhooks ({data?.webhooks?.length || 0})</h3>
            <button onClick={() => setShowCreateWebhook(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Webhook
            </button>
          </div>

          {showCreateWebhook && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h4 className="font-semibold text-purple-900 mb-4">Add Webhook</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="text-sm font-medium">Name *</label><input type="text" value={webhookForm.name} onChange={(e) => setWebhookForm({...webhookForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">URL *</label><input type="url" value={webhookForm.url} onChange={(e) => setWebhookForm({...webhookForm, url: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="https://your-server.com/webhook" /></div>
                <div><label className="text-sm font-medium">Events (comma-separated)</label><input type="text" value={webhookForm.events} onChange={(e) => setWebhookForm({...webhookForm, events: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">Secret (auto-generated if empty)</label><input type="text" value={webhookForm.secret} onChange={(e) => setWebhookForm({...webhookForm, secret: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateWebhook} disabled={creating} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Webhook'}
                </button>
                <button onClick={() => setShowCreateWebhook(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data?.webhooks?.map(wh => (
              <div key={wh.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{wh.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${wh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {wh.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1">{wh.url}</p>
                    <div className="flex gap-1 mt-2">{wh.events?.map(e => <span key={e} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{e}</span>)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      await fetch('/api/admin/api-management', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'toggle-webhook', webhookId: wh.id }),
                      });
                      fetchData();
                    }} className={`px-3 py-1.5 rounded-lg text-xs ${wh.isActive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'}`}>
                      {wh.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button onClick={async () => {
                      if (!confirm('Delete this webhook?')) return;
                      await fetch('/api/admin/api-management', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete-webhook', webhookId: wh.id }),
                      });
                      fetchData();
                    }} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REQUEST LOGS TAB */}
      {activeTab === 'logs' && data?.recentRequests && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Path</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
              </tr></thead>
              <tbody className="divide-y">
                {data.recentRequests.slice(0, 30).map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 text-xs">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-2"><span className={`px-1.5 py-0.5 rounded font-bold ${req.method === 'GET' ? 'bg-green-100 text-green-700' : req.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.method}</span></td>
                    <td className="px-4 py-2 font-mono truncate max-w-[300px]">{req.path}</td>
                    <td className="px-4 py-2 text-right"><span className={`font-bold ${req.statusCode < 400 ? 'text-green-600' : 'text-red-600'}`}>{req.statusCode}</span></td>
                    <td className="px-4 py-2 text-right text-gray-500">{req.durationMs}ms</td>
                    <td className="px-4 py-2 text-gray-400">{req.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600', purple: 'bg-purple-50 text-purple-600' };
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
    </div>
  );
}