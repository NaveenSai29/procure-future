"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Plus, Package, Search, Edit, Trash2, Eye, EyeOff, Image, Tags, 
  MonitorSmartphone, Upload, Download, FileSpreadsheet 
} from "lucide-react";
import BulkImportDialog from "@/components/shared/BulkImportDialog";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch("/api/products?" + params.toString());
      const data = await res.json();
      if (data.success) setProducts(data.data.products);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
    if (!confirm("Delete this product permanently?")) return;
    try {
      const res = await fetch("/api/products/" + productId, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Deleted"); fetchProducts(); }
    } catch { toast.error("Failed"); }
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

  const filteredProducts = products.filter((p) => {
    if (statusFilter === "active") return p.isActive;
    if (statusFilter === "inactive") return !p.isActive;
    if (statusFilter === "pending") return !p.isApproved;
    return true;
  });

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <BulkImportDialog 
        isOpen={showImportDialog} 
        onClose={() => setShowImportDialog(false)}
        onSuccess={handleImportSuccess}
      />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowImportDialog(true)}
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

      <div className="bg-background rounded-xl border p-4">
        <div className="flex gap-3 flex-wrap">
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
          <Button variant="outline" onClick={fetchProducts}>
            <Search className="h-4 w-4 mr-1" />Search
          </Button>
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
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
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
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Brand</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">SKU</th>
                  <th className="text-left p-4">Price</th>
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

                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
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