"use client";

import { useEffect, useState } from "react";
import {
  Package, CheckCircle, XCircle, Search,
  Ban, AlertCircle, Loader2, Store, Boxes,
  Image as ImageIcon, ArrowUpDown, Trash2, Eye,
  Download, AlertTriangle, ChevronDown, ChevronUp,
  MonitorSmartphone
} from "lucide-react";
import ProductPreview from "@/components/products/ProductPreview";
import { toast } from "sonner";

// Custom Confirm Popup
function ConfirmPopup({ isOpen, title, message, confirmText, onConfirm, onCancel, type = 'warning' }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle className={`h-5 w-5 ${type === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition ${
              type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Detail modal state
  const [detailProduct, setDetailProduct] = useState(null);
  
  // Preview modal state
  const [previewProduct, setPreviewProduct] = useState(null);
  
  // Confirm popup state
  const [confirmPopup, setConfirmPopup] = useState(null);
  
  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (supplierFilter) params.set("supplierId", supplierFilter);
      if (searchTerm) params.set("search", searchTerm);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data || json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [statusFilter, supplierFilter, page, limit]);
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

  const handleBulkAction = (action) => {
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

    if (action === "REJECT") {
      // Show reject modal for bulk
      setConfirmPopup({
        title: "Bulk Reject Products",
        message: `Reject ${selectedIds.length} product(s)? This will deactivate them.`,
        confirmText: "Reject All",
        type: 'danger',
        onConfirm: async () => {
          setBulkLoading(true);
          try {
            const res = await fetch("/api/admin/products", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productIds: selectedIds, action: "REJECT" }),
            });
            const json = await res.json();
            if (json.success) {
              toast.success(`${selectedIds.length} products rejected!`);
              setSelectedIds([]);
              fetchProducts();
            }
          } catch {
            toast.error("Bulk action failed");
          } finally {
            setBulkLoading(false);
          }
          setConfirmPopup(null);
        },
        onCancel: () => setConfirmPopup(null),
      });
      return;
    }

    setConfirmPopup({
      title: `Bulk ${actionLabels[action]}`,
      message: `${actionLabels[action].charAt(0).toUpperCase() + actionLabels[action].slice(1)} ${selectedIds.length} product(s)?`,
      confirmText: actionLabels[action],
      type: action === "APPROVE" ? 'success' : 'warning',
      onConfirm: async () => {
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
        setConfirmPopup(null);
      },
      onCancel: () => setConfirmPopup(null),
    });
  };

  const handleDeleteProduct = (product) => {
    setConfirmPopup({
      title: "Delete Product",
      message: `Permanently delete "${product.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
          const json = await res.json();
          if (json.success) {
            toast.success("Product deleted");
            fetchProducts();
          } else {
            toast.error("Failed to delete");
          }
        } catch {
          toast.error("Failed to delete");
        }
        setConfirmPopup(null);
      },
      onCancel: () => setConfirmPopup(null),
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const sortedProducts = getSortedProducts();
    if (selectedIds.length === sortedProducts.length && sortedProducts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedProducts.map((p) => p.id));
    }
  };

  // Sort products client-side
  const getSortedProducts = () => {
    const products = data?.products || [];
    const multiplier = sortOrder === "asc" ? 1 : -1;
    
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return multiplier * (a.name || "").localeCompare(b.name || "");
        case "price":
          const priceA = a.pricing?.[0]?.sellingPrice || 0;
          const priceB = b.pricing?.[0]?.sellingPrice || 0;
          return multiplier * (priceA - priceB);
        case "stock":
          const stockA = a.inventory?.reduce((s, i) => s + (i.availableQty || 0), 0) || 0;
          const stockB = b.inventory?.reduce((s, i) => s + (i.availableQty || 0), 0) || 0;
          return multiplier * (stockA - stockB);
        case "date":
        default:
          return multiplier * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      }
    });
  };

  const products = getSortedProducts();
  const suppliers = data?.suppliers || [];
  const stats = data?.stats || {};
  const pagination = data?.pagination || {};

  const tabs = [
    { value: "ALL", label: "All", count: stats.total || 0 },
    { value: "PENDING", label: "Pending", count: stats.pending || 0 },
    { value: "APPROVED", label: "Live", count: stats.approved || 0 },
    { value: "REJECTED", label: "Rejected", count: stats.rejected || 0 },
    { value: "INACTIVE", label: "Inactive", count: stats.inactive || 0 },
  ];

  const isLowStock = (p) => {
    const totalStock = p.inventory?.reduce((s, i) => s + (i.availableQty || 0), 0) || 0;
    return totalStock > 0 && totalStock <= 10;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Custom Confirm Popup */}
      <ConfirmPopup 
        isOpen={!!confirmPopup}
        title={confirmPopup?.title}
        message={confirmPopup?.message}
        confirmText={confirmPopup?.confirmText}
        type={confirmPopup?.type}
        onConfirm={confirmPopup?.onConfirm}
        onCancel={confirmPopup?.onCancel}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-blue-600" />
            Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.total || 0} total • {stats.pending || 0} pending • {stats.rejected || 0} rejected
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <p className="text-2xl font-bold text-red-700">{stats.rejected || 0}</p>
          <p className="text-sm text-red-600">Rejected</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-700">{stats.inactive || 0}</p>
          <p className="text-sm text-gray-500">Inactive</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === tab.value
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
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

        {/* Sort Controls + Limit */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="stock">Sort by Stock</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 flex items-center gap-1"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === "asc" ? "Ascending" : "Descending"}
          </button>
          <select
            value={limit}
            onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={9999}>Show All</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.length} product{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleBulkAction("APPROVE")}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-1"
            >
              <CheckCircle className="h-4 w-4" /> Approve All
            </button>
            <button
              onClick={() => handleBulkAction("REJECT")}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition flex items-center gap-1"
            >
              <XCircle className="h-4 w-4" /> Reject All
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
                  <th className="text-left p-3 w-10 shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-3 min-w-[200px]">Product</th>
                  <th className="text-left p-3 min-w-[120px]">Supplier</th>
                  <th className="text-left p-3 min-w-[100px]">Category</th>
                  <th className="text-left p-3 min-w-[80px]">Price</th>
                  <th className="text-left p-3 min-w-[80px]">Stock</th>
                  <th className="text-left p-3 min-w-[120px]">Status</th>
                  <th className="text-left p-3 min-w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const totalStock = p.inventory?.reduce((s, i) => s + (i.availableQty || 0), 0) || 0;
                  const warehouseName = p.inventory?.[0]?.warehouse?.name;
                  const lowStock = isLowStock(p);
                  const noImage = p._count?.images === 0;
                  // Check if product was previously approved and now re-submitted
                  const isResubmitted = p.updatedAt && p.createdAt && 
                    new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime() > 60000 && 
                    !p.isApproved && !p.rejectionReason;
                  return (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 transition ${!p.isApproved && !p.rejectionReason ? "bg-yellow-50/30" : ""}`}>
                      <td className="p-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Image Thumbnail */}
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                            {p.images?.[0]?.url ? (
                              <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setDetailProduct(p)}
                              className="font-medium text-gray-900 hover:text-blue-600 transition text-left truncate max-w-[200px]"
                            >
                              {p.name}
                            </button>
                            <p className="text-xs text-gray-400 mt-0.5">
                              SKU: {p.sku || "N/A"} • {p._count?.images || 0} img • {p._count?.variants || 0} var
                            </p>
                            {isResubmitted && (
                              <p className="text-xs text-blue-500 mt-0.5">
                                Updated: {new Date(p.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {p.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">❌ {p.rejectionReason}</p>
                            )}
                            {noImage && (
                              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                ⚠️ No Image
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{p.supplier?.businessName || "N/A"}</p>
                            {p.supplier?.isVerified && (
                              <span className="text-xs text-green-600">✓ Verified</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{p.category?.name || "N/A"}</td>
                      <td className="p-3">
                        <p className="font-medium">₹{p.pricing?.[0]?.sellingPrice || "N/A"}</p>
                        {p.pricing?.[0]?.mrp > p.pricing?.[0]?.sellingPrice && (
                          <p className="text-xs text-gray-400 line-through">₹{p.pricing?.[0]?.mrp}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Boxes className="h-4 w-4 text-gray-400 shrink-0" />
                          <div>
                            <p className={`text-sm font-medium ${totalStock === 0 ? 'text-red-600' : lowStock ? 'text-orange-600' : 'text-green-600'}`}>
                              {totalStock} units
                            </p>
                            {warehouseName && (
                              <p className="text-xs text-gray-400">{warehouseName}</p>
                            )}
                            {lowStock && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.isApproved ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Live
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
                          {isResubmitted && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              🔄 Updated
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {/* Preview (Buyer View) */}
                          <button
                            onClick={() => setPreviewProduct(p)}
                            className="p-2 bg-purple-100 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-200 transition"
                            title="Preview (Buyer View)"
                          >
                            <MonitorSmartphone className="h-3.5 w-3.5" />
                          </button>
                          
                          {/* View Details */}
                          <button
                            onClick={() => setDetailProduct(p)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          
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
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
            Page {page} of {pagination.totalPages} ({pagination.total} products)
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
            <p className="text-sm text-gray-500 mt-1">{rejectModal.name}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
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

      {/* Product Preview Modal (Buyer View) */}
      {previewProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreviewProduct(null)}>
          <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setPreviewProduct(null)} className="p-2 bg-white rounded-full shadow-lg">
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <ProductPreview 
              product={{
                name: previewProduct.name,
                brand: previewProduct.brand?.name || '',
                description: previewProduct.description || '',
                highlights: previewProduct.highlights || '',
                images: previewProduct.images || [],
                pricing: previewProduct.pricing || [],
                stockQty: previewProduct.inventory?.reduce((s, i) => s + (i.availableQty || 0), 0) || 0,
                variants: previewProduct.variants || [],
                weight: previewProduct.weight || 0,
                unit: previewProduct.unit || 'PCS',
                hsnCode: previewProduct.hsnCode || '',
                sku: previewProduct.sku || '',
                barcode: previewProduct.barcode || '',
                countryOfOrigin: previewProduct.countryOfOrigin || '',
                warranty: previewProduct.warranty || '',
              }}
              mode="detail"
              supplierName={previewProduct.supplier?.businessName || 'Supplier'}
              isVerified={previewProduct.supplier?.isVerified || false}
            />
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-gray-900">{detailProduct.name}</h3>
                <button onClick={() => setDetailProduct(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              {/* Images */}
              <div className="mt-4 flex gap-2 flex-wrap">
                {detailProduct.images?.length > 0 ? (
                  detailProduct.images.map((img, i) => (
                    <img key={i} src={img.url} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                  ))
                ) : (
                  <div className="w-20 h-20 rounded-lg border flex items-center justify-center bg-gray-50">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">SKU</p>
                  <p className="font-medium">{detailProduct.sku || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Barcode</p>
                  <p className="font-medium">{detailProduct.barcode || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">HSN Code</p>
                  <p className="font-medium">{detailProduct.hsnCode || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Unit</p>
                  <p className="font-medium">{detailProduct.unit || "PCS"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Weight</p>
                  <p className="font-medium">{detailProduct.weight ? `${detailProduct.weight} kg` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Supplier</p>
                  <p className="font-medium">{detailProduct.supplier?.businessName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Brand</p>
                  <p className="font-medium">{detailProduct.brand?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{detailProduct.category?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{detailProduct.createdAt ? new Date(detailProduct.createdAt).toLocaleDateString('en-IN') : "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium">
                    {detailProduct.isApproved ? "✅ Live" : detailProduct.rejectionReason ? "❌ Rejected" : "⏳ Pending"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {detailProduct.description && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Description</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{detailProduct.description}</p>
                </div>
              )}

              {/* Pricing */}
              {detailProduct.pricing?.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Pricing Tiers</p>
                  <div className="mt-2 space-y-2">
                    {detailProduct.pricing.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm border-b pb-2">
                        <span className="font-medium">{p.priceType}</span>
                        <span>₹{p.sellingPrice} (MRP: ₹{p.mrp})</span>
                        <span className="text-gray-500">Min: {p.minQty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => setDetailProduct(null)}
                className="w-full mt-6 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}