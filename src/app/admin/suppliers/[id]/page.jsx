'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, DollarSign, Clock, Shield, Users, UserPlus, Trash2, Store, Mail, Phone, Bike, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [showAddAgent, setShowAddAgent] = useState(false);

  // COD Settings
  const [codEnabled, setCodEnabled] = useState(false);
  const [codThreshold, setCodThreshold] = useState(2000);
  const [responseSlaHours, setResponseSlaHours] = useState(24);
  const [processingSlaHours, setProcessingSlaHours] = useState(4);
  const [pickupSlaHours, setPickupSlaHours] = useState(2);
  const [autoCancelEnabled, setAutoCancelEnabled] = useState(true);

  // Shop Hours Settings
  const [shopOpenTime, setShopOpenTime] = useState('');
  const [shopCloseTime, setShopCloseTime] = useState('');
  const [shopOpenDays, setShopOpenDays] = useState([]);
  const [savingShopHours, setSavingShopHours] = useState(false);

  useEffect(() => {
    fetchSupplier();
    fetchAvailablePartners();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`);
      const data = await res.json();
      if (data.success) {
        setSupplier(data.data);
        setCodEnabled(data.data.codEnabled);
        setCodThreshold(data.data.codThreshold || 2000);
        setResponseSlaHours(data.data.responseSlaHours || 24);
        setProcessingSlaHours(data.data.processingSlaHours || 4);
        setPickupSlaHours(data.data.pickupSlaHours || 2);
        setAutoCancelEnabled(data.data.autoCancelEnabled !== false);
        if (data.data.settings) {
          setShopOpenTime(data.data.settings.shopOpenTime || '');
          setShopCloseTime(data.data.settings.shopCloseTime || '');
          try {
            setShopOpenDays(data.data.settings.shopOpenDays ? JSON.parse(data.data.settings.shopOpenDays) : []);
          } catch { setShopOpenDays([]); }
        }
      }
    } catch (err) {
      toast.error('Failed to load supplier');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePartners = async () => {
    try {
      const res = await fetch('/api/admin/delivery-partners?status=verified&limit=100');
      const data = await res.json();
      if (data.success) {
        setAvailablePartners(data.data.partners || []);
      }
    } catch {}
  };

  const handleSaveCodSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: id,
          action: 'updateCodSettings',
          codEnabled,
          codThreshold: parseFloat(codThreshold),
          responseSlaHours: parseInt(responseSlaHours),
          processingSlaHours: parseInt(processingSlaHours),
          pickupSlaHours: parseInt(pickupSlaHours),
          autoCancelEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('COD & SLA settings saved');
        fetchSupplier();
      } else {
        toast.error(data.message || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShopHours = async () => {
    setSavingShopHours(true);
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: id,
          action: 'updateShopHours',
          shopOpenTime,
          shopCloseTime,
          shopOpenDays: JSON.stringify(shopOpenDays),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Shop hours saved');
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch { toast.error('Failed to save'); }
    finally { setSavingShopHours(false); }
  };

  const toggleDay = (day) => {
    const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    if (shopOpenDays.includes(day)) {
      setShopOpenDays(shopOpenDays.filter(d => d !== day));
    } else {
      setShopOpenDays([...shopOpenDays, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)));
    }
  };

  const handleAddAgent = async (partnerId) => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Agent added');
        fetchSupplier();
        setShowAddAgent(false);
      } else {
        toast.error(data.message || 'Failed to add agent');
      }
    } catch {
      toast.error('Failed to add agent');
    }
  };

  const handleRemoveAgent = async (agentId) => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/agents?agentId=${agentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Agent removed');
        fetchSupplier();
      } else {
        toast.error(data.message || 'Failed to remove');
      }
    } catch {
      toast.error('Failed to remove agent');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Supplier not found</p>
      </div>
    );
  }

  const dedicatedAgents = supplier.dedicatedAgents || [];
  const assignedPartnerIds = dedicatedAgents.map(a => a.partner?.id);
  const unassignedPartners = availablePartners.filter(p => !assignedPartnerIds.includes(p.id));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{supplier.businessName}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{supplier.email}</span>
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{supplier.mobile}</span>
              {supplier.gstin && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">GST: {supplier.gstin}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {supplier.isVerified ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">✓ Verified</span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full font-medium">Pending KYC</span>
          )}
          {supplier.codEnabled && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> COD Active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shop Hours Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" /> Shop Hours
          </h2>
          <p className="text-sm text-gray-500 mb-4">Set when this supplier accepts orders. If not set, shop is always open.</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Open Time</label>
                <input
                  type="time"
                  value={shopOpenTime}
                  onChange={(e) => setShopOpenTime(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Close Time</label>
                <input
                  type="time"
                  value={shopCloseTime}
                  onChange={(e) => setShopCloseTime(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Open Days</label>
              <div className="flex gap-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                      shopOpenDays.includes(day)
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {shopOpenTime && shopCloseTime && shopOpenDays.length > 0 && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-sm text-green-700 font-medium">
                  🕐 {shopOpenTime} - {shopCloseTime} on {shopOpenDays.map(d => d.substring(0, 3)).join(', ')}
                </p>
              </div>
            )}

            <button
              onClick={handleSaveShopHours}
              disabled={savingShopHours}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingShopHours ? (
                <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Shop Hours</>
              )}
            </button>
          </div>
        </div>

        {/* Dedicated Agents Card */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" /> Dedicated Agents
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {dedicatedAgents.length} agent{dedicatedAgents.length !== 1 ? 's' : ''} assigned
          </p>

          {/* Agent List */}
          <div className="space-y-2 mb-4">
            {dedicatedAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bike className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{agent.partner?.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {agent.partner?.activeVehicle?.vehicleType || 'N/A'} • ⭐ {agent.partner?.rating?.toFixed(1) || '0.0'}
                      {agent.partner?.isOnline && <span className="text-green-500 ml-1">• Online</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAgent(agent.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {dedicatedAgents.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No dedicated agents</p>
                <p className="text-xs">Add agents for high-value COD orders</p>
              </div>
            )}
          </div>

          {/* Add Agent */}
          {showAddAgent ? (
            <div className="border rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Select a verified delivery partner:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {unassignedPartners.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No available partners</p>
                ) : (
                  unassignedPartners.slice(0, 15).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddAgent(p.id)}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.user?.name}</p>
                        <p className="text-xs text-gray-500">{p.activeVehicle?.vehicleType} • ⭐ {p.rating?.toFixed(1)}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-blue-500" />
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowAddAgent(false)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddAgent(true)}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-purple-400 hover:text-purple-600 transition flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" /> Add Agent
            </button>
          )}

          {/* Info Note */}
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs text-amber-700">
              💡 Dedicated agents handle high-value COD orders (above ₹{codThreshold?.toLocaleString('en-IN')}). 
              These orders are NOT visible to other delivery partners.
            </p>
          </div>
        </div>

        {/* COD Settings Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" /> COD & SLA Settings
          </h2>
          <p className="text-sm text-gray-500 mb-6">Configure COD access and auto-cancel timers for this supplier</p>

          <div className="space-y-5">
            {/* COD Enabled Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900">COD Enabled</p>
                <p className="text-xs text-gray-500">Allow customers to pay with Cash on Delivery</p>
              </div>
              <button
                onClick={() => setCodEnabled(!codEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${codEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${codEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* COD Threshold */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                COD Threshold (₹)
              </label>
              <p className="text-xs text-gray-500 mb-2">Orders above this amount are only visible to dedicated agents</p>
              <input
                type="number"
                value={codThreshold}
                onChange={(e) => setCodThreshold(e.target.value)}
                disabled={!codEnabled}
                className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-40"
              />
            </div>

            {/* SLA Settings */}
            <div className="border-t pt-5">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" /> Auto-Cancel Timers (SLA)
              </h3>
              <p className="text-xs text-gray-500 mb-4">Orders are auto-expired/cancelled if deadlines are breached</p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Response SLA (Hours)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Max time to accept before expiring</p>
                  <input
                    type="number"
                    value={responseSlaHours}
                    onChange={(e) => setResponseSlaHours(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing SLA (Hours)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Max time to prepare after accepting</p>
                  <input
                    type="number"
                    value={processingSlaHours}
                    onChange={(e) => setProcessingSlaHours(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup SLA (Hours)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Max time for dedicated agent to pick up</p>
                  <input
                    type="number"
                    value={pickupSlaHours}
                    onChange={(e) => setPickupSlaHours(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Auto Cancel Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mt-4">
                <div>
                  <p className="font-semibold text-gray-900">Auto-Cancel Orders</p>
                  <p className="text-xs text-gray-500">Automatically cancel orders when SLA is breached</p>
                </div>
                <button
                  onClick={() => setAutoCancelEnabled(!autoCancelEnabled)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${autoCancelEnabled ? 'bg-red-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${autoCancelEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveCodSettings}
            disabled={saving}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4" /> Save COD & SLA Settings</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}