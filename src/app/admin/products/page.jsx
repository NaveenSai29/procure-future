"use client";

import { useEffect, useState } from "react";
import {
  Package, CheckCircle, XCircle, Search,
  Ban, AlertCircle, Loader2, Store, Boxes,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (supplierFilter) params.set("supplierId", supplierFilter);
      if (searchTerm) params.set("search", searchTerm);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data || json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [statusFilter, supplierFilter, page]);
  useEffect(() => { setPage(1); }, [statusFilter, supplierFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchProducts();
  };

  const toggleProduct = async (productId, field, value) => {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(field === "isApproved" ? (value ? "Product approved & activated!" : "Product unapproved") : value ? "Product activated" : "Product deactivated");
        fetchProducts();
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleRejectProduct = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setRejectLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: rejectModal.id, isApproved: false, isActive: false, rejectionReason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Product rejected");
        setRejectModal(null);
        setRejectReason("");
        fetchProducts();
      }
    } catch {
      toast.error("Failed to reject product");
    } finally {
      setRejectLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      toast.error("Select products first");
      return;
    }

    const actionLabels = {
      APPROVE: "approve & activate",
      REJECT: "reject & deactivate",
      ACTIVATE: "activate",
      DEACTIVATE: "deactivate",
    };

    if (!confirm(`Are you sure you want to ${actionLabels[action]} ${selectedIds.length} products?`)) return;

    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedIds, action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${selectedIds.length} products updated!`);
        setSelectedIds([]);
        fetchProducts();
      }
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const products = data?.products || [];
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const products = data?.products || [];
  const suppliers = data?.suppliers || [];
  const stats = data?.stats || {};
  const pagination = data?.pagination || {};

  const tabs = [
    { value: "ALL", label: "All", count: stats.total || 0 },
    { value: "PENDING", label: "Pending", count: stats.pending || 0 },
    { value: "APPROVED", label: "Approved", count: stats.approved || 0 },
    { value: "INACTIVE", label: "Inactive", count: stats.inactive || 0 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-blue-600" />
            Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.total || 0} total • {stats.pending || 0} pending approval
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold">{stats.total || 0}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <p className="text-2xl font-bold text-yellow-700">{stats.pending || 0}</p>
          <p className="text-sm text-yellow-600">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-2xl font-bold text-green-700">{stats.approved || 0}</p>
          <p className="text-sm text-green-600">Live</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-2xl font-bold text-red-700">{stats.inactive || 0}</p>
          <p className="text-sm text-red-600">Inactive</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === tab.value
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.businessName}</option>
            ))}
          </select>
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.length} product{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction("APPROVE")}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-1"
            >
              <CheckCircle className="h-4 w-4" /> Approve All
            </button>
            <button
              onClick={() => handleBulkAction("ACTIVATE")}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction("DEACTIVATE")}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition"
            >
              Deactivate
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white border text-gray-600 rounded-lg text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Product Table */}
      {loading ? (
        <div className="bg-white rounded-xl border p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center">
          <Package className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No products found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-sm text-gray-600">
                  <th className="text-left p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Supplier</th>
                  <th className="text-left p-4">Brand</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Stock</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const totalStock = p.inventory?.reduce((s, i) => s + (i.availableQty || 0), 0) || 0;
                  const warehouseName = p.inventory?.[0]?.warehouse?.name;
                  return (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 transition ${!p.isApproved ? "bg-yellow-50/30" : ""}`}>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            SKU: {p.sku || "N/A"} • {p._count?.images || 0} images • {p._count?.variants || 0} variants
                          </p>
                          {p.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">Rejected: {p.rejectionReason}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">{p.supplier?.businessName || "N/A"}</p>
                            {p.supplier?.isVerified && (
                              <span className="text-xs text-green-600">✓ Verified</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{p.brand?.name || "-"}</td>
                      <td className="p-4 text-sm text-gray-600">{p.category?.name || "N/A"}</td>
                      <td className="p-4">
                        <p className="font-medium">₹{p.pricing?.[0]?.sellingPrice || "N/A"}</p>
                        {p.pricing?.[0]?.mrp > p.pricing?.[0]?.sellingPrice && (
                          <p className="text-xs text-gray-400 line-through">₹{p.pricing?.[0]?.mrp}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Boxes className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className={`text-sm font-medium ${totalStock === 0 ? 'text-red-600' : totalStock < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                              {totalStock} units
                            </p>
                            {warehouseName && (
                              <p className="text-xs text-gray-400">{warehouseName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.isApproved ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Approved
                            </span>
                          ) : p.rejectionReason ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Rejected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Pending
                            </span>
                          )}
                          {!p.isActive && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {!p.isApproved && (
                            <>
                              <button
                                onClick={() => toggleProduct(p.id, "isApproved", true)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center gap-1"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => { setRejectModal(p); setRejectReason(""); }}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition flex items-center gap-1"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {p.isApproved && !p.isActive && (
                            <button
                              onClick={() => toggleProduct(p.id, "isActive", true)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                            >
                              Activate
                            </button>
                          )}
                          {p.isActive && (
                            <button
                              onClick={() => toggleProduct(p.id, "isActive", false)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition flex items-center gap-1"
                            >
                              <Ban className="h-3.5 w-3.5" /> Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900">Reject Product</h3>
            <p className="text-sm text-gray-500 mt-1">
              {rejectModal.name}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason (e.g., Poor quality image, Incorrect pricing, Incomplete description)"
              className="w-full mt-4 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectProduct}
                disabled={rejectLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {rejectLoading ? "Rejecting..." : "Reject Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}