'use client';

import { useState, useEffect } from 'react';
import {
  Wallet, TrendingUp, FileText, ArrowDownToLine, ArrowUpFromLine,
  Download, Filter, Calendar, IndianRupee, CreditCard, Building2,
  RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierFinancePage() {
  const [overview, setOverview] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchFinanceData();
  }, []);

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

  const generateReport = async () => {
    try {
      const params = new URLSearchParams({
        report: 'true',
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      });

      const res = await fetch(`/api/supplier/finance?${params}`);
      const data = await res.json();

      // Convert to CSV
      let csv = 'Category,Amount\n';
      csv += `Total Revenue,${data.revenue?.total || 0}\n`;
      csv += `Total Orders,${data.revenue?.orderCount || 0}\n`;
      csv += `Invoices Total,${data.invoices?.total || 0}\n`;
      csv += `Invoice Count,${data.invoices?.count || 0}\n`;
      csv += `Tax Amount,${data.invoices?.tax || 0}\n`;
      csv += `Wallet Balance,${data.wallet?.balance || 0}\n`;
      csv += `Total Earned,${data.wallet?.totalEarned || 0}\n`;
      csv += `Total Withdrawn,${data.wallet?.totalWithdrawn || 0}\n`;
      csv += `Pending Settlement,${data.settlements?.pending || 0}\n`;
      csv += `Total Refunded,${data.returns?.totalRefunded || 0}\n`;
      csv += `\n`;
      csv += 'Transaction Type,Amount,Reference,Date\n';
      (data.recentTransactions || []).forEach(tx => {
        csv += `${tx.type},${tx.amount},${tx.referenceType},${new Date(tx.createdAt).toLocaleDateString()}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
          Download Report
        </button>
      </div>

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
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Invoices</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(overview?.invoices?.total)}
              </p>
              <p className="text-xs text-gray-400">{overview?.invoices?.count || 0} invoices</p>
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
              <p className="text-xs text-gray-400">Earned: {formatCurrency(wallet?.totalEarned)}</p>
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

      {/* Date Filter */}
      <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-lg border">
        <Calendar className="h-4 w-4 text-gray-400" />
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          className="px-3 py-1.5 border rounded text-sm"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          className="px-3 py-1.5 border rounded text-sm"
        />
        <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Content based on active tab */}
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No invoices yet</td>
                    </tr>
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
                      <td className="px-4 py-3 text-sm text-gray-500">{settlement.settlementType}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(settlement.status)}`}>
                          {settlement.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(settlement.createdAt)}</td>
                    </tr>
                  ))}
                  {settlements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No settlements yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
              </div>
              <Wallet className="h-16 w-16 opacity-50" />
            </div>
          </div>
        </div>
      )}

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
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No transactions yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}