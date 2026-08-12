"use client";

import { useEffect, useState } from "react";
import { Users, Mail, Phone, ShoppingCart, Search, TrendingUp, Calendar, IndianRupee, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetch("/api/supplier/customers")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCustomers(data.data);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = customers.reduce((s, c) => s + c.totalOrders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  if (loading) return <div className="p-8 text-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
    <p className="text-muted-foreground">Loading customers...</p>
  </div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">{customers.length} customers who ordered from you</p>
        </div>
      </div>

      {/* Stats */}
      {customers.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Customers</p>
            <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-green-600">{totalOrders}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Avg Order Value</p>
            <p className="text-2xl font-bold text-purple-600">₹{avgOrderValue.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No customers yet</h3>
          <p className="text-gray-500 mt-1">Customers will appear when they place orders</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg">
                  {customer.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500">Customer since {customer.firstOrder ? new Date(customer.firstOrder).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition" />
              </div>
              <div className="space-y-2 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Orders</span>
                  <span className="font-semibold">{customer.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Total Spent</span>
                  <span className="font-semibold text-green-600">₹{customer.totalSpent?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Last Order</span>
                  <span className="font-medium text-xs">
                    {customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Customer Details</h3>
              <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-2xl">
                {selectedCustomer.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-400">Customer #{selectedCustomer.id?.slice(0, 6)?.toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-700">{selectedCustomer.totalOrders}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-600">Total Spent</p>
                <p className="text-2xl font-bold text-green-700">₹{selectedCustomer.totalSpent?.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-purple-600">First Order</p>
                <p className="text-sm font-semibold text-purple-700">
                  {selectedCustomer.firstOrder ? new Date(selectedCustomer.firstOrder).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-sm text-orange-600">Last Order</p>
                <p className="text-sm font-semibold text-orange-700">
                  {selectedCustomer.lastOrder ? new Date(selectedCustomer.lastOrder).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            <h4 className="font-semibold text-gray-900 mb-3">Order History</h4>
            <div className="space-y-2">
              {(selectedCustomer.orders || []).slice(0, 10).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{order.id?.slice(0, 8)?.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{order.totalAmount?.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{order.status}</span>
                  </div>
                </div>
              ))}
              {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No order history</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}