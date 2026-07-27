'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Building2, Wallet,
  Download, Filter, Calendar, IndianRupee,
  CheckCircle2, Clock, XCircle, RefreshCw,
  ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminFinancePage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/finance');
      const data = await res.json();
      if (res.ok) {
        setOverview(data);
      }
    } catch (error) {
      console.error('Fetch finance error:', error);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const processSettlement = async (settlementId) => {
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processSettlement', settlementId })
      });
      
      if (res.ok) {
        toast.success('Settlement processed successfully');
        fetchFinanceData();
      } else {
        throw new Error('Failed to process');
      }
    } catch (error) {
      toast.error('Failed to process settlement');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <h1 className="text-2xl font-bold text-gray-900">Finance Management</h1>
          <p className="text-gray-500 mt-1">Platform revenue, settlements, and financial oversight</p>
        </div>
        <button
          onClick={fetchFinanceData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <IndianRupee className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(overview?.totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Settlements</p>
              <p className="text-xl font-bold">{formatCurrency(overview?.pendingSettlements?.amount)}</p>
              <p className="text-xs text-gray-400">{overview?.pendingSettlements?.count} pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowUpFromLine className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Refunds</p>
              <p className="text-xl font-bold">{formatCurrency(overview?.totalRefunds)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Invoice Stats</p>
              <p className="text-xl font-bold">{overview?.invoiceStats?.length || 0} types</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Statistics */}
      {overview?.invoiceStats && overview.invoiceStats.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm mb-6">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Invoice Summary by Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overview.invoiceStats.map(stat => (
                  <tr key={stat.status} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        stat.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        stat.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        stat.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {stat.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{stat._count}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(stat._sum?.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Revenue Chart */}
      {overview?.monthlyRevenue && overview.monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue (12 Months)</h3>
          <div className="space-y-2">
            <div className="flex items-end gap-1 h-48">
              {overview.monthlyRevenue.map((month, index) => {
                const maxRevenue = Math.max(...overview.monthlyRevenue.map(m => m.revenue));
                const height = maxRevenue > 0 ? (month.revenue / maxRevenue * 100) : 0;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${month.month}: ${formatCurrency(month.revenue)}`}
                  >
                    <span className="text-[10px] text-gray-400">{month.orders}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition cursor-pointer min-h-[4px]"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-400 -rotate-45 mt-1">{month.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}