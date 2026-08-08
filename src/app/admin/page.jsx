'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Store, Package, ShoppingCart, TrendingUp, DollarSign,
  Clock, AlertCircle, FileText, RotateCcw, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Activity, UserPlus, Building, Eye, Banknote, Timer, Truck
} from 'lucide-react';

const formatOrderId = (id) => {
  if (!id) return '#N/A';
  const hex = id.replace(/-/g, '').slice(0, 6);
  const num = parseInt(hex, 16) % 100000;
  return `#${num.toString().padStart(5, '0')}`;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v || 0);
  const formatNumber = (v) => new Intl.NumberFormat('en-IN').format(v || 0);
  const timeAgo = (date) => {
    const mins = Math.floor((new Date() - new Date(date)) / 60000);
    if (mins < 60) return mins + 'm ago';
    if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
    return Math.floor(mins / 1440) + 'd ago';
  };

  if (loading) return (
    <div className="p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}</div>
        <div className="grid grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>)}</div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management</p>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Total Users</p><p className="text-2xl font-bold mt-1">{formatNumber(stats?.users)}</p></div>
            <div className="bg-blue-50 p-3 rounded-xl"><Users className="h-5 w-5 text-blue-600" /></div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-green-600"><ArrowUp className="h-3 w-3" /> {stats?.recentUsers?.length || 0} new this month</div>
        </div>
        <div className="bg-white rounded-xl border p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Suppliers</p><p className="text-2xl font-bold mt-1">{formatNumber(stats?.suppliers)}</p></div>
            <div className="bg-purple-50 p-3 rounded-xl"><Store className="h-5 w-5 text-purple-600" /></div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">{stats?.verifiedSuppliers || 0} verified</div>
        </div>
        <div className="bg-white rounded-xl border p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Products</p><p className="text-2xl font-bold mt-1">{formatNumber(stats?.products)}</p></div>
            <div className="bg-green-50 p-3 rounded-xl"><Package className="h-5 w-5 text-green-600" /></div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-yellow-600"><AlertCircle className="h-3 w-3" /> {stats?.pendingProducts || 0} pending approval</div>
        </div>
        <div className="bg-white rounded-xl border p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Total Orders</p><p className="text-2xl font-bold mt-1">{formatNumber(stats?.orders)}</p></div>
            <div className="bg-orange-50 p-3 rounded-xl"><ShoppingCart className="h-5 w-5 text-orange-600" /></div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">{stats?.todayOrders || 0} today</div>
        </div>
      </div>

      {/* Revenue & Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-5 text-white">
          <p className="text-green-100 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.totalRevenue)}</p>
          <p className="text-xs text-green-200 mt-1">All time</p>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
          <p className="text-blue-100 text-sm">Monthly Revenue</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.monthlyRevenue)}</p>
          <p className="text-xs text-blue-200 mt-1">This month</p>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-5 text-white">
          <p className="text-purple-100 text-sm">Today's Revenue</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.todayRevenue)}</p>
          <p className="text-xs text-purple-200 mt-1">{stats?.todayOrders || 0} orders today</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-yellow-600"><Clock className="h-4 w-4" /> Pending RFQs</span>
              <Link href="/admin/rfq" className="font-bold text-yellow-600">{stats?.activeRFQs || 0}</Link>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-red-600"><RotateCcw className="h-4 w-4" /> Pending Returns</span>
              <Link href="/admin/returns" className="font-bold text-red-600">{stats?.pendingReturns || 0}</Link>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-orange-600"><DollarSign className="h-4 w-4" /> Pending Settlements</span>
              <Link href="/admin/finance" className="font-bold text-orange-600">{stats?.pendingSettlements || 0}</Link>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-blue-600"><Package className="h-4 w-4" /> Pending Products</span>
              <Link href="/admin/products" className="font-bold text-blue-600">{stats?.pendingProducts || 0}</Link>
            </div>
          </div>
        </div>
      </div>

      {/* COD & SLA Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2.5 rounded-xl"><Banknote className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">COD Orders (Active)</p>
              <p className="text-xl font-bold text-gray-900">{stats?.codActiveOrders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2.5 rounded-xl"><Timer className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Expired Orders</p>
              <p className="text-xl font-bold text-gray-900">{stats?.expiredOrders || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl"><Store className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">COD-Enabled Shops</p>
              <p className="text-xl font-bold text-gray-900">{stats?.codEnabledSuppliers || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 p-2.5 rounded-xl"><Users className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Dedicated Agents</p>
              <p className="text-xl font-bold text-gray-900">{stats?.totalDedicatedAgents || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Recent Orders</h3>
            <Link href="/admin/orders" className="text-xs text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          <div className="divide-y">
            {stats?.recentOrders?.map(order => (
              <div key={order.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium">{formatOrderId(order.id)}</p>
                  <p className="text-xs text-gray-500">{order.buyer?.name} • {order.product?.name?.slice(0, 30)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatCurrency(order.totalAmount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    order.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
              <div className="p-4 text-center text-sm text-gray-400">No recent orders</div>
            )}
          </div>
        </div>

        {/* Recent Suppliers & Users */}
        <div className="space-y-6">
          {/* New Suppliers */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Building className="h-4 w-4" /> New Suppliers</h3>
              <Link href="/admin/suppliers" className="text-xs text-blue-600 hover:text-blue-700">View All</Link>
            </div>
            <div className="divide-y">
              {stats?.recentSuppliers?.map(supplier => (
                <div key={supplier.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                      {supplier.businessName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{supplier.businessName}</p>
                      <p className="text-xs text-gray-500">{supplier.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(supplier.createdAt)}</span>
                </div>
              ))}
              {(!stats?.recentSuppliers || stats.recentSuppliers.length === 0) && (
                <div className="p-4 text-center text-sm text-gray-400">No new suppliers</div>
              )}
            </div>
          </div>

          {/* New Users */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><UserPlus className="h-4 w-4" /> New Users</h3>
              <Link href="/admin/users" className="text-xs text-blue-600 hover:text-blue-700">View All</Link>
            </div>
            <div className="divide-y">
              {stats?.recentUsers?.map(u => (
                <div key={u.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                      {u.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(u.createdAt)}</span>
                </div>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <div className="p-4 text-center text-sm text-gray-400">No new users</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/admin/orders" className="bg-white rounded-xl border p-4 hover:shadow-md transition flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-medium">Manage Orders</span>
        </Link>
        <Link href="/admin/deliveries" className="bg-white rounded-xl border p-4 hover:shadow-md transition flex items-center gap-3">
          <Truck className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">Deliveries</span>
        </Link>
        <Link href="/admin/suppliers" className="bg-white rounded-xl border p-4 hover:shadow-md transition flex items-center gap-3">
          <Store className="h-5 w-5 text-purple-500" />
          <span className="text-sm font-medium">COD & SLA Settings</span>
        </Link>
        <Link href="/admin/delivery-partners" className="bg-white rounded-xl border p-4 hover:shadow-md transition flex items-center gap-3">
          <Users className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium">Delivery Partners</span>
        </Link>
      </div>
    </div>
  );
}