'use client';
import { useState, useEffect } from 'react';
import {
  Truck, Search, CheckCircle, XCircle, Eye, Phone, Bike, MapPin,
  Clock, Package, User, ChevronLeft, ChevronRight,
  Wallet, Banknote, MessageSquare, Settings2, IndianRupee,
  Weight, Ruler, Gauge, Sliders, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_TABS = [
  { key: '', label: 'All', color: '#6B7280' },
  { key: 'ASSIGNED', label: 'Assigned', color: '#8B5CF6' },
  { key: 'ACCEPTED', label: 'Accepted', color: '#3B82F6' },
  { key: 'PICKED_UP', label: 'In Transit', color: '#F59E0B' },
  { key: 'DELIVERED', label: 'Completed', color: '#10B981' },
  { key: 'REJECTED', label: 'Rejected', color: '#EF4444' },
];

const STATUS_STYLE = {
  ASSIGNED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  ACCEPTED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  PICKED_UP: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, codPending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [autoAssignRange, setAutoAssignRange] = useState(7);
  const [codMaxPending, setCodMaxPending] = useState(5000);
  const [codSecurityDeposit, setCodSecurityDeposit] = useState(1000);
  const [otpThreshold, setOtpThreshold] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => { fetchDeliveries(); fetchSettings(); }, [statusFilter, page]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', '15');
      const res = await fetch(`/api/admin/deliveries?${params}`);
      const data = await res.json();
      if (data.success) {
        setDeliveries(data.data.deliveries || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
        const allRes = await fetch('/api/admin/deliveries?limit=500');
        const allData = await allRes.json();
        if (allData.success) {
          const all = allData.data.deliveries || [];
          setStats({
            total: all.length,
            active: all.filter(d => ['ASSIGNED', 'ACCEPTED', 'PICKED_UP'].includes(d.status)).length,
            codPending: all.filter(d => d.order?.paymentMethod === 'COD' && d.status === 'DELIVERED').length,
            completed: all.filter(d => d.status === 'DELIVERED').length,
          });
        }
      }
    } catch (e) { toast.error('Failed to load deliveries'); }
    finally { setLoading(false); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      const deliverySettingsData = data.settings?.DELIVERY;
      if (deliverySettingsData) {
        setDeliverySettings(deliverySettingsData);
        if (deliverySettingsData.autoAssignRange) setAutoAssignRange(parseFloat(deliverySettingsData.autoAssignRange));
        if (deliverySettingsData.codMaxPending) setCodMaxPending(parseFloat(deliverySettingsData.codMaxPending));
        if (deliverySettingsData.codSecurityDeposit) setCodSecurityDeposit(parseFloat(deliverySettingsData.codSecurityDeposit));
        if (deliverySettingsData.otpThreshold) setOtpThreshold(parseFloat(deliverySettingsData.otpThreshold));
      }
    } catch (e) { console.log('Settings load failed:', e); }
  };

  const saveAutoAssignRange = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'DELIVERY',
          settings: { autoAssignRange: autoAssignRange.toString() }
        }),
      });
      const data = await res.json();
      if (data.success || !data.error) {
        setDeliverySettings(prev => ({ ...prev, autoAssignRange: autoAssignRange.toString() }));
        toast.success(`Range saved: ${autoAssignRange}km`);
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (e) { toast.error('Failed to save'); }
    finally { setSavingSettings(false); }
  };

  const saveCODSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'DELIVERY',
          settings: {
            codMaxPending: codMaxPending.toString(),
            codSecurityDeposit: codSecurityDeposit.toString(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('COD settings saved');
      else toast.error(data.error || 'Failed to save');
    } catch (e) { toast.error('Failed to save'); }
    finally { setSavingSettings(false); }
  };

  const saveOTPThreshold = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'DELIVERY',
          settings: { otpThreshold: otpThreshold.toString() },
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('OTP threshold saved');
      else toast.error(data.error || 'Failed to save');
    } catch (e) { toast.error('Failed to save'); }
    finally { setSavingSettings(false); }
  };

  const handleSearch = () => { setPage(1); fetchDeliveries(); };

  const handleAssignDelivery = async (orderId, partnerId) => {
    setAssignLoading(true);
    try {
      const res = await fetch('/api/admin/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, partnerId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Delivery assigned!');
        setShowAssignModal(false);
        setSelectedDelivery(null);
        fetchDeliveries();
      } else { toast.error(data.message); }
    } catch (e) { toast.error('Failed'); }
    finally { setAssignLoading(false); }
  };

  const fetchAvailablePartners = async () => {
    try {
      const res = await fetch('/api/admin/delivery-partners?status=verified&limit=50');
      const data = await res.json();
      if (data.success) {
        const partners = data.data.partners || [];
        setAvailablePartners([...partners.filter(p => p.isOnline), ...partners.filter(p => !p.isOnline)]);
      }
    } catch (e) { toast.error('Failed to load partners'); }
  };

  const openAssignModal = (delivery) => {
    setSelectedDelivery(delivery);
    setShowAssignModal(true);
    fetchAvailablePartners();
  };

  const getStatusBadge = (status) => {
    const style = STATUS_STYLE[status] || STATUS_STYLE.ASSIGNED;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold border ${style.bg} ${style.text} ${style.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {status?.replace('_', ' ') || 'Unknown'}
      </span>
    );
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    const diff = Math.floor((new Date() - new Date(date)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Active', value: stats.active, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'COD Pending', value: stats.codPending, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track, assign, and manage all deliveries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${showSettingsPanel ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Settings2 className="h-4 w-4" /> Settings
          </button>
          <button onClick={() => { fetchDeliveries(); fetchSettings(); }} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettingsPanel && (
        <div className="bg-white rounded-xl border p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Sliders className="h-5 w-5" /> Delivery Settings</h3>
          
          {/* Auto-Assign Range */}
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mb-4">
            <p className="text-sm font-bold text-orange-800 mb-2">🎯 Auto-Assign Range</p>
            <p className="text-xs text-orange-600 mb-3">Orders within this radius are auto-assigned to nearest online partner</p>
            <div className="flex items-center gap-4">
              <input type="range" min="1" max="50" value={autoAssignRange}
                onChange={(e) => setAutoAssignRange(parseInt(e.target.value))}
                className="flex-1 accent-orange-500" />
              <span className="text-lg font-bold text-orange-700 w-16 text-center">{autoAssignRange} km</span>
              <button onClick={saveAutoAssignRange} disabled={savingSettings}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {savingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* COD Settings */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
            <p className="text-sm font-bold text-amber-800 mb-2">💰 COD Controls</p>
            <p className="text-xs text-amber-600 mb-3">Limit how much COD cash a partner can hold before depositing</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-amber-700 font-medium">Max COD Pending per Partner (₹)</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="range" min="1000" max="20000" step="500" value={codMaxPending}
                    onChange={(e) => setCodMaxPending(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500" />
                  <span className="text-lg font-bold text-amber-700 w-20 text-center">₹{codMaxPending}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-amber-700 font-medium">Security Deposit for COD Access (₹)</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="range" min="500" max="5000" step="100" value={codSecurityDeposit}
                    onChange={(e) => setCodSecurityDeposit(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500" />
                  <span className="text-lg font-bold text-amber-700 w-20 text-center">₹{codSecurityDeposit}</span>
                </div>
              </div>
              <button onClick={saveCODSettings} disabled={savingSettings}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                {savingSettings ? 'Saving...' : 'Save COD Settings'}
              </button>
            </div>
          </div>

          {/* OTP Threshold */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 mb-4">
            <p className="text-sm font-bold text-purple-800 mb-2">🔐 OTP Threshold</p>
            <p className="text-xs text-purple-600 mb-3">OTP required only for orders above this amount. Set 0 to always require OTP.</p>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="5000" step="100" value={otpThreshold}
                onChange={(e) => setOtpThreshold(parseInt(e.target.value))}
                className="flex-1 accent-purple-500" />
              <span className="text-lg font-bold text-purple-700 w-20 text-center">₹{otpThreshold}</span>
              <button onClick={saveOTPThreshold} disabled={savingSettings}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {savingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {deliverySettings && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500"><Ruler className="h-3 w-3 inline" /> Max Distance</p>
                <p className="text-lg font-bold">{deliverySettings.maxDistance || 200} km</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500"><Weight className="h-3 w-3 inline" /> Max Weight</p>
                <p className="text-lg font-bold">{deliverySettings.maxWeight || 40000} kg</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500"><IndianRupee className="h-3 w-3 inline" /> Platform Fee</p>
                <p className="text-lg font-bold">₹{deliverySettings.platformFee || 5}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500"><Gauge className="h-3 w-3 inline" /> GST</p>
                <p className="text-lg font-bold">{deliverySettings.gstPercent || 5}%</p>
              </div>
            </div>
          )}
          <a href="/admin/settings" className="text-sm text-orange-600 hover:underline">Edit full settings →</a>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4 border`}>
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-gray-500 mt-1">{s.label}</p></div>
              <s.icon className={`h-8 w-8 ${s.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${statusFilter === tab.key ? 'border-2 shadow-sm text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            style={statusFilter === tab.key ? { backgroundColor: tab.color, borderColor: tab.color } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" placeholder="Search orders..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
          value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Partner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400"><div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />Loading...</td></tr>
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400"><Truck className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No deliveries found</p></td></tr>
              ) : (
                deliveries.map(d => (
                  <tr key={d.id} className="hover:bg-orange-50/30">
                    <td className="px-4 py-3"><p className="text-sm font-mono font-semibold">#{d.order?.id?.slice(-8)}</p><p className="text-xs text-gray-400">Fee: ₹{d.order?.deliveryFee}</p></td>
                    <td className="px-4 py-3"><p className="text-sm font-medium">{d.order?.buyer?.name || 'N/A'}</p><p className="text-xs text-gray-400"><Phone className="h-3 w-3 inline" /> {d.order?.buyer?.mobile}</p></td>
                    <td className="px-4 py-3">
                      {d.partner ? (
                        <><p className="text-sm font-medium">{d.partner.user?.name || 'N/A'}</p><p className="text-xs text-gray-400"><Bike className="h-3 w-3 inline" /> {d.partner.activeVehicle?.vehicleType || 'N/A'}</p></>
                      ) : (
                        <button onClick={() => openAssignModal(d)} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium hover:bg-orange-200">+ Assign</button>
                      )}
                    </td>
                    <td className="px-4 py-3"><p className="text-sm font-bold">₹{d.order?.totalAmount}</p></td>
                    <td className="px-4 py-3">
                      {d.order?.paymentMethod === 'COD' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium border border-amber-200"><Banknote className="h-3 w-3" /> COD</span>
                      ) : <span className="text-xs text-gray-500">Online</span>}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatTime(d.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedDelivery(d)} className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="h-4 w-4" /></button>
                        {d.partner && (
                          <a href={`/admin/delivery-chats`} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"><MessageSquare className="h-4 w-4" /></a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-sm">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-lg disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded-lg disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDelivery && !showAssignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDelivery(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-bold">Delivery #{selectedDelivery.order?.id?.slice(-8)}</h3>
              <button onClick={() => setSelectedDelivery(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                <p className="text-sm font-bold mb-2"><Wallet className="h-4 w-4 inline" /> Earnings</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Delivery Fee</span><span className="font-semibold">₹{selectedDelivery.order?.deliveryFee || 0}</span></div>
                  <hr className="border-orange-200" />
                  <div className="flex justify-between"><span className="font-bold">Partner Earns</span><span className="font-bold text-orange-700">₹{selectedDelivery.order?.deliveryFee || 0}</span></div>
                </div>
              </div>
              {selectedDelivery.order?.paymentMethod === 'COD' && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-sm font-bold text-amber-800"><Banknote className="h-4 w-4 inline" /> COD</p>
                  <p className="text-2xl font-bold text-amber-700">₹{selectedDelivery.order?.totalAmount}</p>
                </div>
              )}
              <button onClick={() => setSelectedDelivery(null)} className="w-full py-3 bg-gray-100 rounded-xl font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-bold">Assign Partner</h3>
              <p className="text-sm text-gray-500">Order #{selectedDelivery.order?.id?.slice(-8)} • ₹{selectedDelivery.order?.totalAmount}</p>
            </div>
            <div className="p-4 space-y-2">
              {availablePartners.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><User className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>No verified partners available</p></div>
              ) : (
                availablePartners.map(p => (
                  <button key={p.id} onClick={() => handleAssignDelivery(selectedDelivery.order?.id, p.id)} disabled={assignLoading}
                    className="w-full p-4 rounded-xl border hover:bg-gray-50 text-left flex items-center justify-between disabled:opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">{p.user?.name?.charAt(0) || 'P'}</div>
                        {p.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{p.user?.name}</p>
                        <p className="text-xs text-gray-500">{p.activeVehicle?.vehicleType || 'N/A'} • {p.activeVehicle?.vehicleNumber || 'N/A'} • ⭐{p.rating?.toFixed(1)}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isOnline ? 'Online' : 'Offline'}</span>
                  </button>
                ))
              )}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setShowAssignModal(false)} className="w-full py-3 bg-gray-100 rounded-xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}