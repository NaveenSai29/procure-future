"use client";
import { useState, useEffect } from "react";
import {
  Search, Download, CheckCircle, XCircle, Truck, Store,
  ChevronDown, IndianRupee, Package, User, Clock, Loader2, AlertTriangle, X,
} from "lucide-react";
import { toast } from "sonner";

const formatOrderId = (id) => {
  if (!id) return '#N/A';
  const hex = id.replace(/-/g, '').slice(0, 6);
  const num = parseInt(hex, 16) % 100000;
  return `#${num.toString().padStart(5, '0')}`;
};

const STATUS_OPTIONS = ["", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "DECLINED", "RETURNED", "EXPIRED"];
const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  DECLINED: "bg-gray-100 text-gray-700",
  RETURNED: "bg-orange-100 text-orange-700",
  EXPIRED: "bg-red-100 text-red-700",
};

const BULK_ACTIONS = [
  { status: "CONFIRMED", label: "Confirm", color: "bg-blue-600 hover:bg-blue-700" },
  { status: "PROCESSING", label: "Processing", color: "bg-purple-600 hover:bg-purple-700" },
  { status: "SHIPPED", label: "Shipped", color: "bg-indigo-600 hover:bg-indigo-700" },
  { status: "CANCELLED", label: "Cancel", color: "bg-red-600 hover:bg-red-700" },
];

export default function AdminOrdersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch("/api/admin/orders?" + params);
      const json = await res.json();
      if (json.success) setData(json.data || json);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  const handleSingleCancel = async (orderId) => {
    if (!confirm("Cancel this order? Refund will be processed automatically.")) return;
    setCancellingId(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "cancel" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order cancelled & refunded");
        fetchOrders();
      } else {
        toast.error(json.message || "Failed to cancel");
      }
    } catch { toast.error("Failed"); }
    finally { setCancellingId(null); }
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedOrders.length === 0) return toast.error("Select orders first");
    if (!confirm(`Update ${selectedOrders.length} orders to ${newStatus}?`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selectedOrders, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${selectedOrders.length} orders updated`);
        setSelectedOrders([]);
        fetchOrders();
      }
    } catch { toast.error("Failed"); }
    finally { setBulkLoading(false); }
  };

  const toggleSelect = (id) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    const orders = data?.orders || [];
    setSelectedOrders((prev) => (prev.length === orders.length ? [] : orders.map((o) => o.id)));
  };

  const exportCSV = () => {
    const orders = data?.orders || [];
    const headers = ["Order ID", "Buyer", "Email", "Product", "Supplier", "Qty", "Amount", "Commission", "Status", "Decline Reason", "Date"];
    const rows = orders.map((o) => [
      formatOrderId(o.id),
      o.buyer?.name || "N/A",
      o.buyer?.email || "N/A",
      o.product?.name || "N/A",
      o.product?.supplier?.businessName || "N/A",
      o.quantity,
      o.totalAmount,
      o.supplierCommissionRate > 0 ? `-${(o.totalAmount * o.supplierCommissionRate) / 100} (${o.supplierCommissionRate}%)` : '-',
      o.status,
      o.status === "DECLINED" ? (o.statusHistory?.[0]?.notes || "N/A") : "",
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("CSV exported!");
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(v || 0);

  const canCancel = (status) => !['DELIVERED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(status);

  const stats = data?.stats || {};
  const orders = data?.orders || [];
  const pagination = data?.pagination || {};

  const statCards = [
    { label: "Pending", value: stats.pending || 0, color: "text-yellow-600 bg-yellow-50" },
    { label: "Processing", value: (stats.confirmed || 0) + (stats.processing || 0), color: "text-purple-600 bg-purple-50" },
    { label: "Shipped", value: stats.shipped || 0, color: "text-indigo-600 bg-indigo-50" },
    { label: "Delivered", value: stats.delivered || 0, color: "text-green-600 bg-green-50" },
    { label: "Cancelled", value: (stats.cancelled || 0) + (stats.expired || 0), color: "text-red-600 bg-red-50" },
    { label: "Declined", value: stats.declined || 0, color: "text-gray-600 bg-gray-50" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-blue-600" />
            Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">{stats.total || 0} total orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-3 ${stat.color} bg-opacity-30`}>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order ID, Buyer, Product, Supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || "All Status"}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">
            {selectedOrders.length} order{selectedOrders.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            {BULK_ACTIONS.map((action) => (
              <button
                key={action.status}
                onClick={() => handleBulkStatus(action.status)}
                disabled={bulkLoading}
                className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 ${action.color}`}
              >
                {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                {action.label}
              </button>
            ))}
            <button onClick={() => setSelectedOrders([])} className="px-3 py-1.5 bg-white border text-gray-600 rounded-lg text-xs">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="bg-white rounded-xl border p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3">
                    <input type="checkbox" checked={selectedOrders.length === orders.length && orders.length > 0} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedOrders.includes(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">
                      <div>{formatOrderId(o.id)}</div>
                      {o.status === "DECLINED" && o.statusHistory?.[0]?.notes && (
                        <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {o.statusHistory[0].notes.replace("Declined: ", "")}
                        </div>
                      )}
                      {o.status === "EXPIRED" && o.statusHistory?.[0]?.notes && (
                        <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {o.statusHistory[0].notes.replace("Auto-expired: ", "").replace("Auto-cancelled: ", "").substring(0, 60)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{o.buyer?.name || "N/A"}</p>
                          <p className="text-xs text-gray-400">{o.buyer?.email || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[180px] truncate">{o.product?.name || "N/A"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{o.product?.supplier?.businessName || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{o.quantity}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm">
                      {o.supplierCommissionRate > 0 ? (
                        <span className="text-red-600">-{formatCurrency((o.totalAmount * o.supplierCommissionRate) / 100)} <span className="text-xs text-gray-400">({o.supplierCommissionRate}%)</span></span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[o.status] || "bg-gray-100"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      {canCancel(o.status) && (
                        <button
                          onClick={() => handleSingleCancel(o.id)}
                          disabled={cancellingId === o.id}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium border border-red-200 disabled:opacity-50"
                        >
                          {cancellingId === o.id ? (
                            <Loader2 className="h-3 w-3 animate-spin inline" />
                          ) : (
                            <><X className="h-3 w-3 inline" /> Cancel</>
                          )}
                        </button>
                      )}
                      {!canCancel(o.status) && (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {pagination.totalPages} ({pagination.total} orders)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}