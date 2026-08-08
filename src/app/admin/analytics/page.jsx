'use client';

import { useState, useEffect } from 'react';
import {
  Users, Store, Package, ShoppingCart, DollarSign,
  Truck, RotateCcw, TrendingUp, TrendingDown,
  BarChart3, PieChart, Activity, RefreshCw, Download, Banknote, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/analytics?type=overview');
      const data = await res.json();

      if (res.ok) {
        setAnalytics(data);
      } else {
        toast.error(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const updateMetrics = async () => {
    try {
      const res = await fetch('/api/admin/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateMetrics' })
      });

      if (res.ok) {
        toast.success('Metrics updated');
        fetchAnalytics();
      }
    } catch (error) {
      toast.error('Failed to update metrics');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

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

  if (!analytics) return null;

    const kpiCards = [
    { label: 'Total Users', value: formatNumber(analytics.kpis.totalUsers), icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Suppliers', value: formatNumber(analytics.kpis.totalSuppliers), icon: Store, color: 'bg-purple-100 text-purple-600' },
    { label: 'Products', value: formatNumber(analytics.kpis.totalProducts), icon: Package, color: 'bg-orange-100 text-orange-600' },
    { label: 'Total Orders', value: formatNumber(analytics.kpis.totalOrders), icon: ShoppingCart, color: 'bg-green-100 text-green-600' },
    { label: 'Total Revenue', value: formatCurrency(analytics.kpis.totalRevenue), icon: DollarSign, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Commission Collected', value: formatCurrency(analytics.kpis.totalCommission), icon: Banknote, color: 'bg-cyan-100 text-cyan-600' },
    { label: 'COD Orders', value: `${formatNumber(analytics.kpis.codOrders)} (${formatCurrency(analytics.kpis.codAmount)})`, icon: Truck, color: 'bg-amber-100 text-amber-600' },
    { label: 'Pending Settlements', value: `${formatNumber(analytics.kpis.pendingSettlementCount)} (${formatCurrency(analytics.kpis.pendingSettlements)})`, icon: Activity, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Deliveries', value: formatNumber(analytics.kpis.totalDeliveries), icon: Truck, color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Active Partners', value: formatNumber(analytics.kpis.activePartners), icon: Users, color: 'bg-teal-100 text-teal-600' },
    { label: 'SLA Breaches', value: formatNumber(analytics.kpis.slaBreaches), icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { label: 'Expired Orders', value: formatNumber(analytics.kpis.expiredOrders), icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { label: 'Returns', value: formatNumber(analytics.kpis.totalReturns), icon: RotateCcw, color: 'bg-pink-100 text-pink-600' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-500 mt-1">Enterprise-wide business intelligence</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={updateMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Update Metrics
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((card, index) => (
          <div key={index} className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Platform Revenue (30 Days)</h3>
          {analytics.revenueByDay && analytics.revenueByDay.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-end gap-1 h-48">
                {analytics.revenueByDay.map((day, index) => {
                  const maxRevenue = Math.max(...analytics.revenueByDay.map(d => d.revenue));
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue * 100) : 0;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${new Date(day.date).toLocaleDateString()}: ${formatCurrency(day.revenue)}`}
                    >
                      <span className="text-[10px] text-gray-400">{day.orders}</span>
                      <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition cursor-pointer min-h-[4px]"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No revenue data</p>
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Distribution</h3>
          {analytics.orderStats && analytics.orderStats.length > 0 ? (
            <div className="space-y-3">
              {analytics.orderStats.map(stat => {
                const total = analytics.orderStats.reduce((sum, s) => sum + s._count, 0);
                const percentage = total > 0 ? (stat._count / total * 100).toFixed(1) : 0;
                const colors = {
                  DELIVERED: 'bg-green-500',
                  PENDING: 'bg-yellow-500',
                  CONFIRMED: 'bg-blue-500',
                  CANCELLED: 'bg-red-500',
                  PROCESSING: 'bg-purple-500',
                  SHIPPED: 'bg-indigo-500'
                };
                const revenue = formatCurrency(stat._sum.totalAmount || 0);
                return (
                  <div key={stat.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{stat.status}</span>
                      <span className="text-gray-900 font-medium">
                        {stat._count} ({percentage}%) - {revenue}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${colors[stat.status] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No order data</p>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Verification Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Supplier Verification */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Supplier Verification</h3>
          {analytics.supplierVerification && (
            <div className="space-y-4">
              {analytics.supplierVerification.map(stat => (
                <div key={stat.isVerified.toString()} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {stat.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${stat.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{
                          width: `${(stat._count / analytics.supplierVerification.reduce((s, v) => s + v._count, 0) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{stat._count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Approvals */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Product Approvals</h3>
          {analytics.productApprovals && (
            <div className="space-y-4">
              {analytics.productApprovals.map(stat => (
                <div key={stat.isApproved.toString()} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {stat.isApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${stat.isApproved ? 'bg-blue-500' : 'bg-orange-500'}`}
                        style={{
                          width: `${(stat._count / analytics.productApprovals.reduce((s, v) => s + v._count, 0) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{stat._count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery & Returns Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Status */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Delivery Status</h3>
          {analytics.deliveryStats && (
            <div className="space-y-3">
              {analytics.deliveryStats.map(stat => (
                <div key={stat.status} className="flex justify-between text-sm">
                  <span className="text-gray-600">{stat.status}</span>
                  <span className="font-medium">{stat._count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Returns Status */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Returns Status</h3>
          {analytics.returnStats && (
            <div className="space-y-3">
              {analytics.returnStats.map(stat => (
                <div key={stat.status} className="flex justify-between text-sm">
                  <span className="text-gray-600">{stat.status}</span>
                  <span className={`font-medium ${
                    stat.status === 'PENDING' ? 'text-yellow-600' :
                    stat.status === 'APPROVED' ? 'text-green-600' :
                    stat.status === 'REJECTED' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stat._count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}