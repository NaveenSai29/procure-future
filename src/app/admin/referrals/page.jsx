"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Gift, IndianRupee, RefreshCw,
  Search, TrendingUp, CheckCircle2, Clock, Star,
  Loader2, ChevronDown, ArrowUpRight, BadgeCheck,
  ShoppingCart, Filter, Settings,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rewardModal, setRewardModal] = useState(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  // Reward Setting
  const [rewardSetting, setRewardSetting] = useState('100');
  const [savingReward, setSavingReward] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await fetch(`/api/admin/referrals?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetch reward setting from system settings
  const fetchRewardSetting = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (json.settings?.REFERRAL?.reward_amount) {
        setRewardSetting(json.settings.REFERRAL.reward_amount);
      }
    } catch {}
  };

  useEffect(() => { 
    fetchData(); 
    fetchRewardSetting();
  }, [fetchData]);

  // Save reward setting
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
        settings: {
          reward_amount: String(rewardSetting),
        },
      }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Referral reward set to ₹${rewardSetting}!`);
      } else {
        // Try direct system setting update as fallback
        await fetch('/api/admin/settings/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'REFERRAL',
            key: 'reward_amount',
            value: String(rewardSetting),
            description: 'Amount rewarded per successful referral (in INR)',
          }),
        });
        toast.success(`Referral reward set to ₹${rewardSetting}!`);
      }
    } catch (err) {
      console.error('Save reward error:', err);
      toast.error('Failed to save. Try again.');
    } finally {
      setSavingReward(false);
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

  const handleUpdateStatus = async (referralId, status) => {
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

      {/* ========== REFERRAL REWARD SETTING ========== */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <Gift className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Default Referral Reward</h3>
              <p className="text-sm text-gray-500">Amount credited to referrer's wallet when their friend makes first purchase</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
              <input
                type="number"
                value={rewardSetting}
                onChange={(e) => setRewardSetting(e.target.value)}
                className="w-28 pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                min="1"
              />
            </div>
            <button
              onClick={handleSaveReward}
              disabled={savingReward}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition"
            >
              {savingReward ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <>Save</>
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          <Settings className="h-3 w-3 inline mr-1" />
          This is the default amount. You can override it when paying individual referrals.
        </p>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Referrals</p>
            <p className="text-2xl font-bold text-blue-600">{data.stats.totalReferrals}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Registered</p>
            <p className="text-2xl font-bold text-purple-600">{data.stats.registered}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Purchased</p>
            <p className="text-2xl font-bold text-orange-600">{data.stats.purchased}</p>
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
              <p className="text-sm mt-1"><strong>Total Purchases:</strong> ₹{rewardModal.stats?.totalPurchaseValue?.toLocaleString('en-IN')}</p>
              <p className="text-sm mt-1"><strong>Orders:</strong> {rewardModal.stats?.deliveredOrders} delivered</p>
              <p className="text-xs text-gray-400 mt-1">Default reward: <strong>₹{rewardSetting}</strong></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Reward Amount (₹)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    placeholder={rewardSetting}
                    className="flex-1 px-3 py-2.5 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => setRewardAmount(rewardSetting)}
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Referrer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Referred User</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Purchases</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reward</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
              ) : filteredReferrals.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No referrals found</td></tr>
              ) : (
                filteredReferrals.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xs">
                          {r.referrer?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.referrer?.name}</p>
                          <p className="text-xs text-gray-500">{r.referrer?.email}</p>
                          <p className="text-xs text-blue-600 font-mono">Code: {r.referrer?.referralCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.referred?.name}</p>
                        <p className="text-xs text-gray-500">{r.referred?.email}</p>
                        <p className="text-xs text-gray-400">Joined: {new Date(r.referred?.joinedAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(r.status)}
                      {r.stats?.meetsCriteria && r.status !== 'PAID' && (
                        <div className="mt-1">
                          <span className="text-xs text-green-600 flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Eligible
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold">₹{r.stats?.totalPurchaseValue?.toLocaleString('en-IN') || 0}</p>
                      <p className="text-xs text-gray-400">{r.stats?.deliveredOrders || 0} orders</p>
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
                          <button onClick={() => handleUpdateStatus(r.id, 'PURCHASED')}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200">
                            Mark Purchased
                          </button>
                        )}
                        {r.status !== 'PAID' && r.stats?.meetsCriteria && (
                          <button onClick={() => setRewardModal(r)}
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