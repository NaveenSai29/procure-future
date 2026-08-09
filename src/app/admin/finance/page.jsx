'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Building2, Wallet,
  Download, Filter, Calendar, IndianRupee,
  CheckCircle2, Clock, XCircle, RefreshCw,
  ArrowDownToLine, ArrowUpFromLine, Store, Send,
  Loader2, Search, History, ChevronDown,
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
  const [selectedSupplierId, setSelectedSupplierId] = useState('ALL');
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === 'OVERVIEW') {
      fetchSettlementHistory();
    }
  }, [selectedSupplierId, historyStatusFilter, activeTab]);

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

  const fetchSettlementHistory = async () => {
    setHistoryLoading(true);
    try {
      let url = '/api/admin/finance/settlements?limit=200';
      if (historyStatusFilter) url += `&status=${historyStatusFilter}`;
      if (selectedSupplierId !== 'ALL') url += `&supplierId=${selectedSupplierId}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSettlementHistory(data.data.settlements || []);
      }
    } catch (error) {
      console.error('History fetch error:', error);
    } finally { setHistoryLoading(false); }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '-';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const processSettlement = async (supplierId, amount, walletBalance, force = false) => {
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
        body: JSON.stringify({ action: 'processSettlement', supplierId, amount: parseFloat(amount), force }),
      });
      
      if (res.ok) {
        toast.success('Settlement processed successfully');
        fetchData();
        fetchSettlementHistory();
        setSettleAmount(prev => ({ ...prev, [supplierId]: '' }));
      } else if (res.status === 409) {
        if (confirm('This supplier already has a settlement for this period. Process anyway?')) {
          processSettlement(supplierId, amount, walletBalance, true);
        }
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
          <button onClick={() => { fetchData(); if (activeTab === 'OVERVIEW') fetchSettlementHistory(); }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
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
          {/* Supplier Selector & Filters */}
          <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[250px]">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Select Supplier</label>
                <div className="relative">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 border rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="ALL">All Suppliers</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.businessName} ({supplier.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                {['', 'PENDING', 'PROCESSED'].map(f => (
                  <button key={f || 'ALL'}
                    onClick={() => setHistoryStatusFilter(f)}
                    className={`px-4 py-2.5 rounded-lg text-xs font-semibold border transition ${
                      historyStatusFilter === f 
                        ? 'bg-orange-500 text-white border-orange-500' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {f || 'All Status'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settlement History Table */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedSupplierId === 'ALL' 
                    ? 'All Supplier Settlements' 
                    : `Settlements: ${suppliers.find(s => s.id === selectedSupplierId)?.businessName || 'Supplier'}`
                  }
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {settlementHistory.length} settlement(s) found
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyLoading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p>Loading settlements...</p>
                    </td></tr>
                  ) : settlementHistory.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No settlement history found</p>
                    </td></tr>
                  ) : (
                    settlementHistory.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{s.supplier?.businessName || 'PROCURE'}</p>
                          <p className="text-xs text-gray-400">{s.supplier?.email || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(s.amount)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full font-semibold capitalize bg-blue-100 text-blue-700">
                            {s.settlementType?.replace('_', ' ').toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(s.periodStart)} - {formatDate(s.periodEnd)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                            s.status === 'PROCESSED' || s.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : s.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {s.processedAt ? formatDate(s.processedAt) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SETTLEMENTS TAB */}
      {activeTab === 'SETTLEMENTS' && (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-medium">⚡ Settlement Rules</p>
            <p className="text-xs text-yellow-700 mt-1">You can only settle up to the supplier's wallet balance. Commission is auto-deducted on every order. Duplicate settlements in the same period will prompt for confirmation.</p>
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