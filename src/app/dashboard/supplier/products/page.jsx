"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Plus, Package, Search, Edit, Trash2, Eye, EyeOff, X,
  Upload, Download, FileSpreadsheet, FileCode, Tags,
  ArrowUpDown, CheckSquare, Square, AlertTriangle, Coins
} from "lucide-react";
import BulkImportDialog from "@/components/shared/BulkImportDialog";

// Custom Confirm Popup Component
function ConfirmPopup({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, type = 'warning' }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-100' : type === 'success' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <AlertTriangle className={`h-5 w-5 ${type === 'danger' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-yellow-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onCancel}
          >
            {cancelText || "Cancel"}
          </Button>
          <Button 
            className={`flex-1 ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={onConfirm}
          >
            {confirmText || "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importDialogMode, setImportDialogMode] = useState('csv');
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // AI Credits state
  const [aiCredits, setAiCredits] = useState(null);

  // Confirm popup state
  const [confirmPopup, setConfirmPopup] = useState(null); // { title, message, confirmText, type, onConfirm }

  useEffect(() => { 
    fetchProducts(); 
    fetchAiCredits();
  }, []);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", "9999");
      const res = await fetch("/api/products?" + params.toString());
      const data = await res.json();
      if (data.success) setProducts(data.data.products);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAiCredits = async () => {
    try {
      const res = await fetch('/api/supplier/ai-credits');
      const data = await res.json();
      if (data.success) {
        setAiCredits(data.data);
      }
    } catch (err) { console.error('Failed to fetch AI credits:', err); }
  };

  const toggleActive = async (productId, currentStatus) => {
    try {
      await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isActive: !currentStatus }),
      });
      toast.success(currentStatus ? "Deactivated" : "Activated");
      fetchProducts();
    } catch { toast.error("Failed"); }
  };

  const deleteProduct = async (productId) => {
    setConfirmPopup({
      title: "Delete Product",
      message: "Are you sure you want to delete this product permanently? This action cannot be undone.",
      confirmText: "Delete",
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch("/api/products/" + productId, { method: "DELETE" });
          const data = await res.json();
          if (data.success) { toast.success("Deleted"); fetchProducts(); }
          else { toast.error("Failed to delete"); }
        } catch { toast.error("Failed"); }
        setConfirmPopup(null);
      },
      onCancel: () => setConfirmPopup(null),
    });
  };

  // Bulk toggle active - only change products that need changing
  const bulkToggleActive = (activate) => {
    if (selectedIds.length === 0) { toast.error("No products selected"); return; }
    
    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
    
    if (activate) {
      // Only count products that are currently INACTIVE
      const inactiveProducts = selectedProducts.filter(p => !p.isActive);
      if (inactiveProducts.length === 0) {
        toast.info("All selected products are already active");
        return;
      }
      
      setConfirmPopup({
        title: "Activate Products",
        message: `Activate ${inactiveProducts.length} product(s)?\n\n${selectedProducts.length - inactiveProducts.length} product(s) are already active and will be skipped.`,
        confirmText: "Activate",
        type: 'success',
        onConfirm: async () => {
          try {
            let successCount = 0;
            for (const p of inactiveProducts) {
              try {
                const res = await fetch("/api/admin/products", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: p.id, isActive: true }),
                });
                if (res.ok) successCount++;
              } catch {}
            }
            toast.success(`${successCount}/${inactiveProducts.length} products activated`);
            setSelectedIds([]);
            setSelectAll(false);
            fetchProducts();
          } catch { toast.error("Bulk action failed"); }
          setConfirmPopup(null);
        },
        onCancel: () => setConfirmPopup(null),
      });
    } else {
      // Only count products that are currently ACTIVE
      const activeProducts = selectedProducts.filter(p => p.isActive);
      if (activeProducts.length === 0) {
        toast.info("All selected products are already inactive");
        return;
      }
      
      setConfirmPopup({
        title: "Deactivate Products",
        message: `Deactivate ${activeProducts.length} product(s)?\n\n${selectedProducts.length - activeProducts.length} product(s) are already inactive and will be skipped.`,
        confirmText: "Deactivate",
        type: 'warning',
        onConfirm: async () => {
          try {
            let successCount = 0;
            for (const p of activeProducts) {
              try {
                const res = await fetch("/api/admin/products", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: p.id, isActive: false }),
                });
                if (res.ok) successCount++;
              } catch {}
            }
            toast.success(`${successCount}/${activeProducts.length} products deactivated`);
            setSelectedIds([]);
            setSelectAll(false);
            fetchProducts();
          } catch { toast.error("Bulk action failed"); }
          setConfirmPopup(null);
        },
        onCancel: () => setConfirmPopup(null),
      });
    }
  };

  // Bulk delete
  const bulkDelete = () => {
    if (selectedIds.length === 0) { toast.error("No products selected"); return; }
    
    setConfirmPopup({
      title: "Delete Products",
      message: `Permanently delete ${selectedIds.length} product(s)?\n\nThis action cannot be undone.`,
      confirmText: "Delete All",
      type: 'danger',
      onConfirm: async () => {
        try {
          let successCount = 0;
          for (const id of selectedIds) {
            try {
              const res = await fetch("/api/products/" + id, { method: "DELETE" });
              if (res.ok) successCount++;
            } catch {}
          }
          toast.success(`${successCount}/${selectedIds.length} products deleted`);
          setSelectedIds([]);
          setSelectAll(false);
          fetchProducts();
        } catch { toast.error("Bulk delete failed"); }
        setConfirmPopup(null);
      },
      onCancel: () => setConfirmPopup(null),
    });
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
      setSelectAll(true);
    }
  };

  // Toggle individual selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id];
      setSelectAll(newSelection.length === filteredProducts.length && filteredProducts.length > 0);
      return newSelection;
    });
  };

  const submitAllDrafts = () => {
    const drafts = products.filter(p => !p.isApproved && !p.isActive && !p.rejectionReason);
    
    if (drafts.length === 0) { toast.error("No drafts to submit"); return; }

    const validDrafts = drafts.filter(p => 
      p.name && 
      p.categoryId && 
      p.weight && 
      p.inventory?.length > 0 && 
      p.pricing?.length > 0
    );
    
    const invalidDrafts = drafts.filter(p => 
      !p.name || 
      !p.categoryId || 
      !p.weight || 
      !p.inventory?.length || 
      !p.pricing?.length
    );
    
    if (validDrafts.length === 0) {
      toast.error(`No valid drafts. ${invalidDrafts.length} draft(s) missing mandatory fields.`);
      return;
    }
    
    const skipMessage = invalidDrafts.length > 0 
      ? `\n\n⚠️ ${invalidDrafts.length} draft(s) will be SKIPPED (missing fields).`
      : '';
    
    setConfirmPopup({
      title: "Submit Drafts",
      message: `Submit ${validDrafts.length} valid draft(s) for approval? Images are exempted.${skipMessage}`,
      confirmText: "Submit",
      type: 'success',
      onConfirm: async () => {
        try {
          let submitted = 0;
          let failed = 0;
          for (const draft of validDrafts) {
            try {
              const res = await fetch(`/api/products/${draft.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: true, isApproved: false, rejectionReason: null }),
              });
              const data = await res.json();
              if (data.success) submitted++;
              else failed++;
            } catch { failed++; }
          }
          
          if (submitted > 0 && invalidDrafts.length === 0 && failed === 0) {
            toast.success(`${submitted} products submitted for approval!`);
          } else if (submitted > 0 && invalidDrafts.length > 0) {
            toast.success(`${submitted} submitted ✅ | ${invalidDrafts.length} skipped (missing fields) | ${failed} failed`);
          } else if (submitted > 0 && failed > 0) {
            toast.success(`${submitted} submitted, ${failed} failed`);
          } else {
            toast.error("Failed to submit products");
          }
          fetchProducts();
        } catch { toast.error("Failed to submit products"); }
        setConfirmPopup(null);
      },
      onCancel: () => setConfirmPopup(null),
    });
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/supplier/products/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products-export-" + new Date().toISOString().split("T")[0] + ".csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Products exported successfully");
    } catch (error) {
      toast.error("Failed to export products");
    }
  };

  const handleImportSuccess = (result) => {
    setShowImportDialog(false);
    fetchProducts();
  };

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    switch (sortBy) {
      case "name":
        return multiplier * (a.name || "").localeCompare(b.name || "");
      case "price":
        const priceA = a.pricing?.[0]?.sellingPrice || a.variants?.[0]?.price || 0;
        const priceB = b.pricing?.[0]?.sellingPrice || b.variants?.[0]?.price || 0;
        return multiplier * (priceA - priceB);
      case "stock":
        const stockA = a.inventory?.reduce((sum, inv) => sum + inv.availableQty, 0) || 0;
        const stockB = b.inventory?.reduce((sum, inv) => sum + inv.availableQty, 0) || 0;
        return multiplier * (stockA - stockB);
      case "date":
      default:
        return multiplier * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
  });

  const filteredProducts = sortedProducts.filter((p) => {
    if (statusFilter === "active" && !p.isActive) return false;
    if (statusFilter === "inactive" && p.isActive) return false;
    if (statusFilter === "pending" && p.isApproved) return false;
    
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches = 
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    
    return true;
  });

  const isLowStock = (p) => {
    const totalStock = p.inventory?.reduce((sum, inv) => sum + inv.availableQty, 0) || 0;
    return totalStock > 0 && totalStock <= 10;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
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

      <BulkImportDialog 
        isOpen={showImportDialog} 
        onClose={() => setShowImportDialog(false)}
        onSuccess={handleImportSuccess}
        mode={importDialogMode}
      />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={submitAllDrafts}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Submit Drafts
          </Button>
          <Button 
            variant="outline" 
            onClick={() => { setImportDialogMode('tally'); setShowImportDialog(true); }}
            className="flex items-center gap-2"
          >
            <FileCode className="h-4 w-4" />
            Import from Tally
          </Button>
          <Button 
            variant="outline" 
            onClick={() => { setImportDialogMode('csv'); setShowImportDialog(true); }}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/dashboard/supplier/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-blue-700 font-medium">
            {selectedIds.length} product(s) selected
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkToggleActive(true)}>
              <Eye className="h-4 w-4 mr-1" /> Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkToggleActive(false)}>
              <EyeOff className="h-4 w-4 mr-1" /> Deactivate
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={bulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelectedIds([]); setSelectAll(false); }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* AI Credits Bar */}
      {aiCredits !== null && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-purple-800">
                AI Credits: {aiCredits.creditsRemaining} remaining
              </p>
              <p className="text-xs text-purple-600 mt-0.5">
                {aiCredits.maxGenerationsPerProduct} AI images per product allowed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-purple-600">
            <span>Used: {aiCredits.totalGenerationsUsed}</span>
            <span className="w-px h-4 bg-purple-300"></span>
            <span>Cost: {aiCredits.creditCostPerGeneration} credit(s)/image</span>
            {aiCredits.creditsRemaining <= 10 && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                Low balance
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-background rounded-xl border p-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && fetchProducts()} 
              className="pl-9" 
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending Approval</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="stock">Sort by Stock</option>
          </select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          
          {search && (
            <Button variant="outline" onClick={() => setSearch("")}>
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-background rounded-xl border p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No products found</h3>
          <p className="text-muted-foreground mb-4">Start adding products to your catalog</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard/supplier/products/new">
              <Button>Add Your First Product</Button>
            </Link>
            <Button variant="outline" onClick={() => { setImportDialogMode('tally'); setShowImportDialog(true); }}>
              <FileCode className="h-4 w-4 mr-2" />
              Import from Tally
            </Button>
            <Button variant="outline" onClick={() => { setImportDialogMode('csv'); setShowImportDialog(true); }}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import from CSV
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-background rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground bg-muted/30">
                  <th className="text-left p-4 w-10">
                    <button onClick={handleSelectAll} className="hover:text-foreground">
                      {selectAll ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Brand</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">SKU</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Stock</th>
                  <th className="text-left p-4">Variants</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const activeVariants = p.variants?.filter(v => v.isActive) || [];
                  const variantPrices = activeVariants.filter(v => v.price).map(v => parseFloat(v.price));
                  let priceDisplay = "-";
                  if (variantPrices.length > 0) {
                    priceDisplay = "Rs." + Math.min(...variantPrices).toLocaleString() + " - Rs." + Math.max(...variantPrices).toLocaleString();
                  } else if (p.pricing?.[0]?.sellingPrice) {
                    priceDisplay = "Rs." + p.pricing[0].sellingPrice.toLocaleString();
                  }
                  
                  const totalStock = p.inventory?.reduce((sum, inv) => sum + inv.availableQty, 0) || 0;
                  const lowStock = isLowStock(p);

                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-4">
                        <button onClick={() => toggleSelect(p.id)} className="hover:text-foreground">
                          {selectedIds.includes(p.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            {p.images?.[0] ? (
                              <img src={p.images[0].url} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{p.name}</p>
                            {p.variants?.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Tags className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {activeVariants.length}/{p.variants.length} active
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{p.brand?.name || "-"}</td>
                      <td className="p-4 text-sm">{p.category?.name || "-"}</td>
                      <td className="p-4 text-sm font-mono">{p.sku || "-"}</td>
                      <td className="p-4 text-sm font-semibold">{priceDisplay}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{totalStock}</span>
                          {lowStock && (
                            <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{p.variants?.length || 0}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!p.images?.length && !p.isActive ? (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                              DRAFT — Image Missing
                            </span>
                          ) : !p.isApproved && p.isActive && !p.rejectionReason ? (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                              ⏳ Pending Approval
                            </span>
                          ) : !p.isApproved && p.rejectionReason ? (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                              ❌ Rejected
                            </span>
                          ) : p.isApproved && p.isActive ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                              ✅ Live
                            </span>
                          ) : p.isApproved && !p.isActive ? (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                              ⏸️ Inactive
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                              {p.isActive ? "Active" : "Inactive"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-0.5">
                          <Link href={"/dashboard/supplier/products/" + p.id}>
                            <button className="p-2 hover:bg-muted rounded-md" title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                          </Link>
                          <button 
                            onClick={() => toggleActive(p.id, p.isActive)} 
                            className="p-2 hover:bg-muted rounded-md" 
                            title={p.isActive ? "Deactivate" : "Activate"}
                          >
                            {p.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={() => deleteProduct(p.id)} 
                            className="p-2 hover:bg-red-50 text-red-500 rounded-md" 
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
}