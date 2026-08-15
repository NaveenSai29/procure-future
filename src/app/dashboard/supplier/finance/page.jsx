'use client';

import { useState, useEffect } from 'react';
import {
  Wallet, TrendingUp, FileText, ArrowDownToLine, ArrowUpFromLine,
  Download, Filter, Calendar, IndianRupee, CreditCard, Building2,
  RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, ChevronRight,
  Loader2, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierFinancePage() {
  const [overview, setOverview] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [allSettlements, setAllSettlements] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [commissionRate, setCommissionRate] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);

  useEffect(() => {
    fetchFinanceData();
    fetchCommissionRate();
    fetchBankAccounts();
  }, []);

  const fetchCommissionRate = async () => {
    try {
      const res = await fetch('/api/supplier/commission');
      const data = await res.json();
      if (data.success || data.supplierRate) {
        setCommissionRate(data.supplierRate || data.rate || 5);
      }
    } catch {}
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/supplier/bank-accounts');
      const data = await res.json();
      setBankAccounts(data.accounts || []);
    } catch {}
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [overviewRes, invoicesRes, settlementsRes, walletRes] = await Promise.all([
        fetch('/api/supplier/finance'),
        fetch('/api/supplier/finance/invoices?limit=5'),
        fetch('/api/supplier/finance/settlements?limit=5'),
        fetch('/api/supplier/finance/wallet')
      ]);

      const [overviewData, invoicesData, settlementsData, walletData] = await Promise.all([
        overviewRes.json(),
        invoicesRes.json(),
        settlementsRes.json(),
        walletRes.json()
      ]);

      setOverview(overviewData);
      setInvoices(invoicesData.invoices || []);
      setSettlements(settlementsData.settlements || []);
      setWallet(walletData.wallet);
      setTransactions(walletData.transactions || []);
    } catch (error) {
      console.error('Fetch finance data error:', error);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch('/api/supplier/finance/invoices?limit=50');
      const data = await res.json();
      setAllInvoices(data.invoices || []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoadingInvoices(false); }
  };

  const fetchAllSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const res = await fetch('/api/supplier/finance/settlements?limit=50');
      const data = await res.json();
      setAllSettlements(data.settlements || []);
    } catch { toast.error('Failed to load settlements'); }
    finally { setLoadingSettlements(false); }
  };

  useEffect(() => {
    if (activeTab === 'INVOICES' && allInvoices.length === 0) fetchAllInvoices();
    if (activeTab === 'SETTLEMENTS' && allSettlements.length === 0) fetchAllSettlements();
  }, [activeTab]);

  const generateReport = async () => {
    try {
      const params = new URLSearchParams({
        report: 'revenue',
        format: 'csv',
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      });
      const res = await fetch(`/api/supplier/reports?${params}`);
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded as CSV');
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '-';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    const colors = {
      PAID: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      OVERDUE: 'bg-red-100 text-red-700',
      DRAFT: 'bg-gray-100 text-gray-600',
      SENT: 'bg-blue-100 text-blue-700',
      PROCESSED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview', icon: TrendingUp },
    { id: 'INVOICES', label: 'Invoices', icon: FileText },
    { id: 'SETTLEMENTS', label: 'Settlements', icon: Building2 },
    { id: 'WALLET', label: 'Wallet', icon: Wallet },
    { id: 'TRANSACTIONS', label: 'Transactions', icon: CreditCard }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasBankAccount = bankAccounts.length > 0;
  const netRevenue = overview?.revenue?.total ? overview.revenue.total * (1 - (commissionRate || 5) / 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Manage your revenue, invoices, and settlements</p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Bank Account Warning */}
      {!hasBankAccount && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-800">No bank account added</p>
            <p className="text-sm text-yellow-700">Add a bank account to receive settlement payouts.</p>
          </div>
          <a href="/dashboard/supplier/settings/bank" className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700">
            Add Bank
          </a>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <IndianRupee className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(overview?.revenue?.total)}
              </p>
              <p className="text-xs text-gray-400">{overview?.revenue?.orderCount || 0} orders</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Earnings</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(netRevenue)}
              </p>
              <p className="text-xs text-gray-400">After {commissionRate || 5}% commission</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Wallet Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(wallet?.balance)}
              </p>
              <p className="text-xs text-gray-400">Withdrawn: {formatCurrency(wallet?.totalWithdrawn)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Settlement</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(overview?.settlements?.pending)}
              </p>
              {bankAccounts.length > 0 && bankAccounts[0].pennyDropVerified && (
                <p className="text-xs text-green-600">✓ Bank verified</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Recent Invoices */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
              <button
                onClick={() => setActiveTab('INVOICES')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tax</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(invoice.taxAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => window.open(`/api/supplier/finance/invoices/${invoice.id}`, '_blank')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition"
                          title="View invoice"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No invoices yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Settlements */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Settlements</h3>
              <button
                onClick={() => setActiveTab('SETTLEMENTS')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {settlements.map(settlement => (
                    <tr key={settlement.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{formatCurrency(settlement.amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">{settlement.settlementType?.replace('_', ' ').toLowerCase()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(settlement.status)}`}>
                          {settlement.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(settlement.createdAt)}</td>
                    </tr>
                  ))}
                  {settlements.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No settlements yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">All Invoices</h3>
            {loadingInvoices && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tax</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(invoice.taxAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => window.open(`/api/supplier/finance/invoices/${invoice.id}`, '_blank')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition"
                        title="View invoice"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {allInvoices.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {loadingInvoices ? 'Loading...' : 'No invoices yet'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'SETTLEMENTS' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">All Settlements</h3>
            {loadingSettlements && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allSettlements.map(settlement => (
                  <tr key={settlement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(settlement.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{settlement.settlementType?.replace('_', ' ').toLowerCase()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(settlement.status)}`}>
                        {settlement.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(settlement.periodStart)} - {formatDate(settlement.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(settlement.createdAt)}</td>
                  </tr>
                ))}
                {allSettlements.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {loadingSettlements ? 'Loading...' : 'No settlements yet'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallet Tab */}
      {activeTab === 'WALLET' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Available Balance</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(wallet?.balance)}</p>
                <div className="flex gap-4 mt-4 text-sm text-blue-100">
                  <span>Total Earned: {formatCurrency(wallet?.totalEarned)}</span>
                  <span>Total Withdrawn: {formatCurrency(wallet?.totalWithdrawn)}</span>
                </div>
                {commissionRate && (
                  <p className="text-xs text-blue-200 mt-2">Commission rate: {commissionRate}%</p>
                )}
              </div>
              <Wallet className="h-16 w-16 opacity-50" />
            </div>
          </div>

          {/* Bank Account Info */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Bank Account</h3>
            {hasBankAccount ? (
              <div className="space-y-2">
                {bankAccounts.slice(0, 1).map(acc => (
                  <div key={acc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{acc.bankName} - {acc.accountNumber?.slice(-4).padStart(acc.accountNumber?.length, '*')}</p>
                      <p className="text-xs text-gray-500">{acc.accountHolder} · IFSC: {acc.ifscCode}</p>
                    </div>
                    {acc.pennyDropVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No bank account added. <a href="/dashboard/supplier/settings/bank" className="text-blue-600 hover:underline">Add now</a></p>
            )}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${
                        tx.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.type === 'CREDIT' ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.referenceType} - {tx.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(tx.balanceAfter)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}