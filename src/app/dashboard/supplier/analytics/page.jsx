'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, ShoppingCart, Package, Users, DollarSign,
  BarChart3, PieChart, TrendingDown, AlertTriangle,
  Download, Calendar, Filter, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('MONTHLY');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchAnalytics();
  }, [period, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const res = await fetch(`/api/supplier/analytics?${params}`);
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
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Business intelligence and insights</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total Revenue</span>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(analytics.kpis.totalRevenue)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-600">Total earnings</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total Orders</span>
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(analytics.kpis.totalOrders)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-gray-500">
              {analytics.kpis.completionRate} completion rate
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Products</span>
            <Package className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(analytics.kpis.totalProducts)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-gray-500">Active products</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Avg Order Value</span>
            <BarChart3 className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(analytics.kpis.avgOrderValue)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-gray-500">Per order</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend (Last 30 Days)</h3>
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
              <div className="text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No revenue data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Status</h3>
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
                return (
                  <div key={stat.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{stat.status}</span>
                      <span className="text-gray-900 font-medium">{stat._count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[stat.status] || 'bg-gray-500'}`}
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
              <p>No order data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl border shadow-sm mb-6">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Top Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.topProducts?.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatCurrency(product.pricing[0]?.sellingPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{product._count.orders}</td>
                </tr>
              ))}
              {!analytics.topProducts?.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No product data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {analytics.inventoryStatus?.lowStock?.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm mb-6">
          <div className="p-4 border-b flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Low Stock Alerts</h3>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              {analytics.inventoryStatus.lowStock.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.inventoryStatus.lowStock.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.product?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.warehouse?.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-red-600 font-medium">{item.availableQty}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.minStockLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Out of Stock */}
      {analytics.inventoryStatus?.outOfStock?.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Out of Stock</h3>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {analytics.inventoryStatus.outOfStock.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.inventoryStatus.outOfStock.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.product?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.warehouse?.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                        Out of Stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}