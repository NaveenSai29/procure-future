"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Search, Plus, RefreshCw, Users, IndianRupee,
  TrendingUp, Clock, Calendar, ArrowUpRight, ArrowDownRight,
  Loader2, Filter, ChevronDown, Gift, AlertCircle, CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminWalletPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addForm, setAddForm] = useState({
    userId: '', amount: '', description: '', expiresInDays: '30', referenceType: 'ADMIN_ADDED',
  });
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddMoney = async () => {
    if (!addForm.userId || !addForm.amount || addForm.amount <= 0) {
      toast.error('Select user and enter valid amount');
      return;
    }
    setAdding(true);
    try {
      const expiresAt = addForm.expiresInDays 
        ? new Date(Date.now() + parseInt(addForm.expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const res = await fetch('/api/admin/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: addForm.userId,
          amount: parseFloat(addForm.amount),
          description: addForm.description || 'Added by admin',
          expiresAt,
          referenceType: addForm.referenceType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.data.message);
        setShowAddMoney(false);
        setAddForm({ userId: '', amount: '', description: '', expiresInDays: '30', referenceType: 'ADMIN_ADDED' });
        fetchData();
      } else {
        toast.error(json.error || 'Failed');
      }
    } catch {
      toast.error('Failed to add money');
    } finally {
      setAdding(false);
    }
  };

  const viewUserWallet = async (userId) => {
    try {
      const res = await fetch(`/api/admin/wallet?userId=${userId}`);
      const json = await res.json();
      if (json.success) setSelectedUser(json.data.wallet);
    } catch {
      toast.error('Failed to load wallet details');
    }
  };

  const filteredWallets = data?.wallets?.filter(w =>
    !searchTerm ||
    w.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const transactionTypeBadge = (type) => {
    const badges = {
      CREDIT: 'bg-green-100 text-green-700',
      DEBIT: 'bg-red-100 text-red-700',
      EXPIRED: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[type] || 'bg-gray-100'}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
          <p className="text-gray-500 mt-1">Manage buyer wallets, add money, track transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => setShowAddMoney(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Money
          </button>
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Users className="h-4 w-4" /> Total Wallets</div>
            <p className="text-2xl font-bold text-blue-600">{data.stats.totalWallets}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><IndianRupee className="h-4 w-4" /> Total Balance</div>
            <p className="text-2xl font-bold text-green-600">₹{data.stats.totalBalance.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><TrendingUp className="h-4 w-4" /> Avg Balance</div>
            <p className="text-2xl font-bold text-purple-600">₹{data.stats.averageBalance.toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Money to Wallet</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Select User</label>
                <select
                  value={addForm.userId}
                  onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm"
                >
                  <option value="">Choose user...</option>
                  {data?.wallets?.map(w => (
                    <option key={w.userId} value={w.userId}>
                      {w.user?.name} ({w.user?.email}) — Balance: ₹{w.balance?.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Amount (₹)</label>
                <input
                  type="number"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  placeholder="e.g., 100"
                  className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  value={addForm.referenceType}
                  onChange={(e) => setAddForm({ ...addForm, referenceType: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm"
                >
                  <option value="ADMIN_ADDED">Bonus / Promotional</option>
                  <option value="REFERRAL_BONUS">Referral Reward</option>
                  <option value="REFUND">Refund</option>
                  <option value="CASHBACK">Cashback</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expires In</label>
                <select
                  value={addForm.expiresInDays}
                  onChange={(e) => setAddForm({ ...addForm, expiresInDays: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm"
                >
                  <option value="">Never expires</option>
                  <option value="7">7 days</option>
                  <option value="15">15 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="e.g., Diwali bonus"
                  className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddMoney(false)} className="flex-1 px-4 py-2.5 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleAddMoney} disabled={adding} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {adding ? 'Adding...' : 'Add Money'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm"
        />
      </div>

      {/* Wallets Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Recent Activity</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
              ) : filteredWallets.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No wallets found</td></tr>
              ) : (
                filteredWallets.map(w => (
                  <tr key={w.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{w.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{w.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-lg font-bold text-gray-900">₹{w.balance?.toLocaleString('en-IN')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {w.transactions?.slice(0, 2).map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {transactionTypeBadge(t.type)}
                            <span className={t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                              {t.type === 'CREDIT' ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setAddForm({ ...addForm, userId: w.userId });
                          setShowAddMoney(true);
                        }}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200"
                      >
                        + Add Money
                      </button>
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