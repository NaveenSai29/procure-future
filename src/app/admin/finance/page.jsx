'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Building2, Wallet,
  Download, Filter, Calendar, IndianRupee,
  CheckCircle2, Clock, XCircle, RefreshCw,
  ArrowDownToLine, ArrowUpFromLine, Store, Send,
  Loader2, Search,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminFinancePage() {
  const [overview, setOverview] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [settlingId, setSettlingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [settleAmount, setSettleAmount] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [financeRes, supplierRes] = await Promise.all([
        fetch('/api/admin/finance'),
        fetch('/api/admin/suppliers'),
      ]);
      const financeData = await financeRes.json();
      const supplierData = await supplierRes.json();
      
      if (financeRes.ok) setOverview(financeData);
      if (supplierData.success) {
        const supps = supplierData.data || supplierData.suppliers || [];
        setSuppliers(supps);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const processSettlement = async (supplierId, amount, walletBalance) => {
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > (walletBalance || 0)) {
      toast.error(`Cannot settle more than wallet balance (${formatCurrency(walletBalance)})`);
      return;
    }
    setSettlingId(supplierId);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processSettlement', supplierId, amount: parseFloat(amount) }),
      });
      
      if (res.ok) {
        toast.success('Settlement processed successfully');
        fetchData();
        setSettleAmount(prev => ({ ...prev, [supplierId]: '' }));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to process settlement');
      }
    } catch (error) {
      toast.error('Failed to process settlement');
    } finally { setSettlingId(null); }
  };

  const filteredSuppliers = suppliers.filter(s => {
    if (!searchTerm) return true;
    return s.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.mobile?.includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Settlements</h1>
          <p className="text-gray-500 mt-1">Platform revenue, supplier settlements, and financial oversight</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { id: 'OVERVIEW', label: 'Overview' },
          { id: 'SETTLEMENTS', label: 'Supplier Settlements' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><IndianRupee className="h-5 w-5 text-green-600" /></div>
                <div><p className="text-sm text-gray-500">Total Revenue</p><p className="text-xl font-bold">{formatCurrency(overview?.totalRevenue)}</p></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
                <div><p className="text-sm text-gray-500">Pending Settlements</p><p className="text-xl font-bold">{formatCurrency(overview?.pendingSettlements?.amount)}</p></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><ArrowUpFromLine className="h-5 w-5 text-red-600" /></div>
                <div><p className="text-sm text-gray-500">Total Refunds</p><p className="text-xl font-bold">{formatCurrency(overview?.totalRefunds)}</p></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Store className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-sm text-gray-500">Total Suppliers</p><p className="text-xl font-bold">{suppliers.length}</p></div>
              </div>
            </div>
          </div>

          {overview?.monthlyRevenue && overview.monthlyRevenue.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue (12 Months)</h3>
              <div className="space-y-2">
                <div className="flex items-end gap-1 h-48">
                  {overview.monthlyRevenue.map((month, index) => {
                    const maxRevenue = Math.max(...overview.monthlyRevenue.map(m => m.revenue));
                    const height = maxRevenue > 0 ? (month.revenue / maxRevenue * 100) : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1" title={`${month.month}: ${formatCurrency(month.revenue)}`}>
                        <span className="text-[10px] text-gray-400">{month.orders}</span>
                        <div className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition cursor-pointer min-h-[4px]" style={{ height: `${Math.max(height, 2)}%` }}></div>
                        <span className="text-[10px] text-gray-400 -rotate-45 mt-1">{month.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SETTLEMENTS TAB */}
      {activeTab === 'SETTLEMENTS' && (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-medium">⚡ Settlement Rules</p>
            <p className="text-xs text-yellow-700 mt-1">You can only settle up to the supplier's wallet balance. Commission is auto-deducted on every order.</p>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Wallet Balance</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Settle Amount</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSuppliers.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">No suppliers found</td></tr>
                  ) : (
                    filteredSuppliers.map(supplier => {
                      const walletBalance = supplier.wallet?.balance || 0;
                      const inputAmount = settleAmount[supplier.id];
                      const isValidAmount = inputAmount && parseFloat(inputAmount) > 0 && parseFloat(inputAmount) <= walletBalance;
                      
                      return (
                        <tr key={supplier.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{supplier.businessName}</p>
                            <p className="text-xs text-gray-500">{supplier.businessType}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">{supplier.email}</p>
                            <p className="text-xs text-gray-400">{supplier.mobile}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className={`text-sm font-bold ${walletBalance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {formatCurrency(walletBalance)}
                            </p>
                            {supplier.wallet?.totalEarned > 0 && (
                              <p className="text-xs text-gray-400">Earned: {formatCurrency(supplier.wallet.totalEarned)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              placeholder="Amount"
                              value={settleAmount[supplier.id] || ''}
                              onChange={(e) => setSettleAmount(prev => ({ ...prev, [supplier.id]: e.target.value }))}
                              className={`w-28 px-3 py-2 border rounded-lg text-sm text-right ${
                                inputAmount && parseFloat(inputAmount) > walletBalance ? 'border-red-300 bg-red-50' : ''
                              }`}
                            />
                            {inputAmount && parseFloat(inputAmount) > walletBalance && (
                              <p className="text-[10px] text-red-500 mt-1">Exceeds balance!</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => processSettlement(supplier.id, settleAmount[supplier.id], walletBalance)}
                              disabled={settlingId === supplier.id || !isValidAmount}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                            >
                              {settlingId === supplier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              {settlingId === supplier.id ? 'Processing...' : 'Settle'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}