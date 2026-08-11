"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Gift, IndianRupee, RefreshCw,
  Search, TrendingUp, CheckCircle2, Clock, Star,
  Loader2, ChevronDown, ArrowUpRight, BadgeCheck,
  ShoppingCart, Filter, Settings, Truck, Package,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, BUYER, DELIVERY
  const [rewardModal, setRewardModal] = useState(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  // Buyer Reward Settings
  const [rewardSetting, setRewardSetting] = useState('100');
  const [thresholdSetting, setThresholdSetting] = useState('5000');
  const [savingReward, setSavingReward] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Delivery Referral Settings
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryReward, setDeliveryReward] = useState('500');
  const [savingDeliverySettings, setSavingDeliverySettings] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      const res = await fetch(`/api/admin/referrals?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.purchaseThreshold) {
          setThresholdSetting(String(json.data.purchaseThreshold));
        }
        // Load delivery settings
        if (json.data.settings?.delivery) {
          setDeliveryEnabled(json.data.settings.delivery.enabled);
          setDeliveryThreshold(String(json.data.settings.delivery.ordersThreshold));
          setDeliveryReward(String(json.data.settings.delivery.rewardAmount));
        }
      }
    } catch {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  // Fetch settings from system settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (json.settings?.REFERRAL) {
        if (json.settings.REFERRAL.reward_amount) {
          setRewardSetting(json.settings.REFERRAL.reward_amount);
        }
        if (json.settings.REFERRAL.purchase_threshold) {
          setThresholdSetting(json.settings.REFERRAL.purchase_threshold);
        }
      }
      if (json.settings?.DELIVERY_REFERRAL) {
        if (json.settings.DELIVERY_REFERRAL.delivery_referral_enabled !== undefined) {
          setDeliveryEnabled(json.settings.DELIVERY_REFERRAL.delivery_referral_enabled === 'true');
        }
        if (json.settings.DELIVERY_REFERRAL.delivery_referral_orders_threshold) {
          setDeliveryThreshold(json.settings.DELIVERY_REFERRAL.delivery_referral_orders_threshold);
        }
        if (json.settings.DELIVERY_REFERRAL.delivery_referral_reward_amount) {
          setDeliveryReward(json.settings.DELIVERY_REFERRAL.delivery_referral_reward_amount);
        }
      }
    } catch {}
  };

  useEffect(() => { 
    fetchData(); 
    fetchSettings();
  }, [fetchData]);

  // Save buyer reward setting
  const handleSaveReward = async () => {
    if (!rewardSetting || parseInt(rewardSetting) <= 0) {
      toast.error('Enter valid reward amount');
      return;
    }
    setSavingReward(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'REFERRAL',
          settings: { reward_amount: String(rewardSetting) },
        }),
      });
      if (res.ok) {
        toast.success(`Referral reward set to ₹${rewardSetting}!`);
      }
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSavingReward(false);
    }
  };

  // Save buyer threshold setting
  const handleSaveThreshold = async () => {
    if (!thresholdSetting || parseInt(thresholdSetting) <= 0) {
      toast.error('Enter valid threshold amount');
      return;
    }
    setSavingThreshold(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'REFERRAL',
          settings: { purchase_threshold: String(thresholdSetting) },
        }),
      });
      if (res.ok) {
        toast.success(`Purchase threshold set to ₹${thresholdSetting}!`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSavingThreshold(false);
    }
  };

  // Save delivery referral settings
  const handleSaveDeliverySettings = async () => {
    setSavingDeliverySettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'DELIVERY_REFERRAL',
          settings: {
            delivery_referral_enabled: String(deliveryEnabled),
            delivery_referral_orders_threshold: String(deliveryThreshold),
            delivery_referral_reward_amount: String(deliveryReward),
          },
        }),
      });
      if (res.ok) {
        toast.success('Delivery referral settings saved!');
      }
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSavingDeliverySettings(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!rewardModal || !rewardAmount || rewardAmount <= 0) {
      toast.error('Enter valid reward amount');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId: rewardModal.id,
          status: 'PAID',
          rewardAmount: parseFloat(rewardAmount),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`₹${rewardAmount} paid to ${rewardModal.referrer?.name}!`);
        setRewardModal(null);
        setRewardAmount('');
        fetchData();
      } else {
        toast.error(json.error || 'Failed');
      }
    } catch {
      toast.error('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (referralId, status, referrerName) => {
    if (!confirm(`Mark this referral as "${status}" for ${referrerName}?`)) return;
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralId, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Status updated');
        fetchData();
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const filteredReferrals = data?.referrals?.filter(r =>
    !searchTerm ||
    r.referrer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referrer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referred?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const statusBadge = (status) => {
    const badges = {
      REGISTERED: 'bg-blue-100 text-blue-700',
      PURCHASED: 'bg-purple-100 text-purple-700',
      PAID: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  const typeBadge = (type) => {
    if (type === 'DELIVERY') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          🛵 Delivery
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        🛒 Buyer
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
          <p className="text-gray-500 mt-1">Track user referrals and reward top referrers</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* ========== BUYER REFERRAL SETTINGS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Reward Amount Setting */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Gift className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Buyer Reward Amount</h3>
              <p className="text-xs text-gray-500">Paid to referrer on successful purchase referral</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
              <input
                type="number"
                value={rewardSetting}
                onChange={(e) => setRewardSetting(e.target.value)}
                className="w-28 pl-8 pr-3 py-2 border rounded-lg text-lg font-bold text-center"
                min="1"
              />
            </div>
            <button onClick={handleSaveReward} disabled={savingReward}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
              {savingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {savingReward ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Purchase Threshold Setting */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Buyer Eligibility Threshold</h3>
              <p className="text-xs text-gray-500">Minimum purchase amount to qualify for reward</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
              <input
                type="number"
                value={thresholdSetting}
                onChange={(e) => setThresholdSetting(e.target.value)}
                className="w-28 pl-8 pr-3 py-2 border rounded-lg text-lg font-bold text-center"
                min="1"
              />
            </div>
            <button onClick={handleSaveThreshold} disabled={savingThreshold}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {savingThreshold ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {savingThreshold ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== DELIVERY REFERRAL SETTINGS ========== */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Truck className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">🚀 Delivery Partner Referral Program</h3>
            <p className="text-xs text-gray-500">Reward delivery partners who refer other delivery partners</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Enabled</label>
            <select
              value={deliveryEnabled ? 'true' : 'false'}
              onChange={(e) => setDeliveryEnabled(e.target.value === 'true')}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="true">✅ Enabled</option>
              <option value="false">❌ Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Deliveries Required</label>
            <input
              type="number"
              value={deliveryThreshold}
              onChange={(e) => setDeliveryThreshold(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-center"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reward Amount (₹)</label>
            <input
              type="number"
              value={deliveryReward}
              onChange={(e) => setDeliveryReward(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-center"
              min="0"
            />
          </div>
          <div>
            <button
              onClick={handleSaveDeliverySettings}
              disabled={savingDeliverySettings}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingDeliverySettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {savingDeliverySettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Referrals</p>
            <p className="text-2xl font-bold text-blue-600">{data.stats.totalReferrals}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Buyer</p>
            <p className="text-2xl font-bold text-blue-600">{data.stats.buyerReferrals || data.stats.registered + data.stats.purchased + data.stats.paid}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Delivery</p>
            <p className="text-2xl font-bold text-purple-600">{data.stats.deliveryReferrals || 0}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Registered</p>
            <p className="text-2xl font-bold text-purple-600">{data.stats.registered}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Paid Out</p>
            <p className="text-2xl font-bold text-green-600">{data.stats.paid}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Rewards</p>
            <p className="text-2xl font-bold text-emerald-600">₹{data.stats.totalRewardsGiven.toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* Reward Modal */}
      {rewardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pay Referral Reward</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm"><strong>Referrer:</strong> {rewardModal.referrer?.name} ({rewardModal.referrer?.email})</p>
              <p className="text-sm mt-1"><strong>Referred:</strong> {rewardModal.referred?.name}</p>
              {rewardModal.type === 'DELIVERY' ? (
                <>
                  <p className="text-sm mt-1"><strong>Deliveries:</strong> {rewardModal.stats?.deliveriesCompleted || 0} / {rewardModal.stats?.requiredForReward || 50}</p>
                  <p className="text-sm mt-1"><strong>Progress:</strong> {rewardModal.stats?.progressPercent || 0}%</p>
                </>
              ) : (
                <>
                  <p className="text-sm mt-1"><strong>Total Purchases:</strong> ₹{rewardModal.stats?.totalPurchaseValue?.toLocaleString('en-IN')}</p>
                  <p className="text-sm mt-1"><strong>Orders:</strong> {rewardModal.stats?.deliveredOrders} delivered</p>
                </>
              )}
              <p className="text-xs text-gray-400 mt-1">Default reward: <strong>₹{rewardModal.type === 'DELIVERY' ? deliveryReward : rewardSetting}</strong></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Reward Amount (₹)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    placeholder={rewardModal.type === 'DELIVERY' ? deliveryReward : rewardSetting}
                    className="flex-1 px-3 py-2.5 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => setRewardAmount(rewardModal.type === 'DELIVERY' ? deliveryReward : rewardSetting)}
                    className="px-3 py-2.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                    Use Default
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">This amount will be added to {rewardModal.referrer?.name}'s wallet.</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setRewardModal(null); setRewardAmount(''); }} className="flex-1 px-4 py-2.5 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleMarkAsPaid} disabled={processing} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <IndianRupee className="h-4 w-4" />}
                  {processing ? 'Processing...' : 'Pay Reward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['ALL', 'BUYER', 'DELIVERY'].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${typeFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'ALL' ? 'All Types' : f === 'BUYER' ? '🛒 Buyer' : '🛵 Delivery'}
            </button>
          ))}
        </div>
        <div className="w-px h-8 bg-gray-300" />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['ALL', 'REGISTERED', 'PURCHASED', 'PAID'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Referrer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Referred User</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progress</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reward</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
              ) : filteredReferrals.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No referrals found</td></tr>
              ) : (
                filteredReferrals.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{typeBadge(r.type)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xs">
                          {r.referrer?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.referrer?.name}</p>
                          <p className="text-xs text-gray-500">{r.referrer?.email}</p>
                          <p className="text-xs text-blue-600 font-mono">Code: {r.referrer?.referralCode}</p>
                          {r.referrer?.isDeliveryPartner && (
                            <span className="text-xs text-purple-500 font-medium">🛵 Partner</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.referred?.name}</p>
                        <p className="text-xs text-gray-500">{r.referred?.email || r.referred?.mobile}</p>
                        <p className="text-xs text-gray-400">Joined: {new Date(r.referred?.joinedAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(r.status)}
                      {r.stats?.meetsCriteria && r.status !== 'PAID' && r.type !== 'DELIVERY' && (
                        <div className="mt-1">
                          <span className="text-xs text-green-600 flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Eligible
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.type === 'DELIVERY' ? (
                        <div>
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${Math.min(100, r.stats?.progressPercent || 0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 font-semibold">{r.stats?.progressPercent || 0}%</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{r.stats?.deliveriesCompleted || 0}/{r.stats?.requiredForReward || 50} deliveries</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold">₹{r.stats?.totalPurchaseValue?.toLocaleString('en-IN') || 0}</p>
                          <p className="text-xs text-gray-400">{r.stats?.deliveredOrders || 0} orders</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.rewardAmount > 0 ? (
                        <span className="text-sm font-bold text-green-600">₹{r.rewardAmount.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === 'REGISTERED' && (
                          <button onClick={() => handleUpdateStatus(r.id, 'PURCHASED', r.referrer?.name)}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200">
                            Mark Purchased
                          </button>
                        )}
                        {r.status !== 'PAID' && (
                          <button onClick={() => {
                            setRewardModal(r);
                            setRewardAmount(r.type === 'DELIVERY' ? deliveryReward : rewardSetting);
                          }}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 flex items-center gap-1">
                            <Gift className="h-3 w-3" /> Pay
                          </button>
                        )}
                        {r.status === 'PAID' && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3" /> Paid
                          </span>
                        )}
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