"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Package, Plus, X, ChevronDown, ChevronUp, Building } from "lucide-react";
import AIGenerateButton from "@/components/products/AIGenerateButton";
import SEOSection from "@/components/products/SEOSection";
import HsnSearchInput from "@/components/products/HsnSearchInput";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showPricing, setShowPricing] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [sku, setSku] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("PCS");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [warranty, setWarranty] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("India");
  const [warehouseId, setWarehouseId] = useState("");
  const [stockQty, setStockQty] = useState("");

  const [pricingTiers, setPricingTiers] = useState([
    { priceType: "RETAIL", mrp: "", sellingPrice: "", minQty: "1" },
  ]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => { if (d.success) setCategories(d.data); });
    fetch("/api/warehouses").then(r => r.text()).then(text => { if (!text) return; try { const d = JSON.parse(text); if (d.success) setWarehouses(d.data || []); else if (Array.isArray(d)) setWarehouses(d); } catch {} }).catch(() => {});
  }, []);

  const addTier = () => setPricingTiers([...pricingTiers, { priceType: "WHOLESALE", mrp: "", sellingPrice: "", minQty: "10" }]);
  const removeTier = (i) => setPricingTiers(pricingTiers.filter((_, idx) => idx !== i));
  const updateTier = (i, f, v) => { const u = [...pricingTiers]; u[i][f] = v; setPricingTiers(u); };

  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !categoryId) { toast.error("Name and category required"); return; }
    if (!weight) { toast.error("Weight is required for delivery"); return; }
    if (!warehouseId) { toast.error("Please select a warehouse for initial stock"); return; }
    if (!stockQty || parseInt(stockQty) < 0) { toast.error("Initial stock quantity is required"); return; }

    setLoading(true);
    const pricing = pricingTiers.filter(t => t.mrp && t.sellingPrice).map(t => ({
      priceType: t.priceType, mrp: parseFloat(t.mrp), sellingPrice: parseFloat(t.sellingPrice), minQty: parseInt(t.minQty) || 1,
    }));
    if (pricing.length === 0) { toast.error("Add at least one price"); setLoading(false); return; }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, categoryId, description, longDescription: description, highlights,
          metaTitle, metaDescription,
          sku, hsnCode, barcode, unit,
          weight: weight ? parseFloat(weight) : null,
          length: length || null, width: width || null, height: height || null,
          warranty: warranty || null, countryOfOrigin: countryOfOrigin || "India",
          pricing, warehouseId, stockQty: parseInt(stockQty) || 0,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Product created with stock!");
        router.push(`/dashboard/supplier/products/${result.data.product.id}/images`);
      } else {
        toast.error(result.message || result.error);
      }
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard/supplier/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Add Product</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="bg-background rounded-xl border p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Product Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Steel Pipe 2 inch" required />
          </div>
          <div>
            <label className="text-sm font-medium">Category *</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" required>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Description + AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Description</label>
              <AIGenerateButton type="description" productName={name} category={selectedCategory?.name} onResult={(result) => setDescription(result.content)} label="AI Write" />
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Describe your product - features, specifications, applications..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none" />
          </div>

          {/* Highlights + AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Key Highlights</label>
              <AIGenerateButton type="highlights" productName={name} category={selectedCategory?.name} existingDescription={description} onResult={(result) => setHighlights(result.content)} label="AI Suggest" />
            </div>
            <textarea value={highlights} onChange={e => setHighlights(e.target.value)} rows={3} placeholder="• Key feature 1&#10;• Key feature 2&#10;• Key feature 3" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">SKU</label><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="PROD-001" /></div>
            <HsnSearchInput value={hsnCode} onChange={setHsnCode} />
            <div><label className="text-sm font-medium">Barcode</label><Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="8901234567890" /></div>
            <div>
              <label className="text-sm font-medium">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="PCS">PCS</option><option value="KG">KG</option><option value="LTR">LTR</option><option value="MTR">MTR</option><option value="BOX">BOX</option><option value="SET">SET</option>
              </select>
            </div>
          </div>
        </div>

        {/* Weight & Dimensions - MANDATORY */}
        <div className="bg-background rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Weight & Dimensions (Required for Delivery) *</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Weight (kg) *</label>
              <Input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g., 2.5" required />
            </div>
            <div>
              <label className="text-sm font-medium">Length (cm)</label>
              <Input type="number" step="0.1" value={length} onChange={e => setLength(e.target.value)} placeholder="e.g., 30" />
            </div>
            <div>
              <label className="text-sm font-medium">Width (cm)</label>
              <Input type="number" step="0.1" value={width} onChange={e => setWidth(e.target.value)} placeholder="e.g., 20" />
            </div>
            <div>
              <label className="text-sm font-medium">Height (cm)</label>
              <Input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g., 10" />
            </div>
          </div>
        </div>

        {/* Initial Stock - MANDATORY */}
        <div className="bg-background rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Stock Location *</h3>
          
          {warehouses.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-800 font-medium mb-2">No warehouse found</p>
              <p className="text-sm text-amber-700 mb-3">
                Create a warehouse first — it can be your shop, godown, or storage location.
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/dashboard/warehouse" target="_blank" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition inline-flex items-center gap-2">
                  <Building className="h-4 w-4" /> Create Warehouse (New Tab)
                </Link>
                  <button type="button" onClick={() => { fetch("/api/warehouses").then(r => r.text()).then(text => { if (!text) return; try { const d = JSON.parse(text); const list = d.success ? (d.data || []) : (Array.isArray(d) ? d : []); setWarehouses(list); if (list.length > 0) toast.success(`${list.length} warehouse(s) found!`); } catch {} }).catch(() => {}); }} className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition">
                  🔄 Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Warehouse *</label>
                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" required>
                  <option value="">Select warehouse</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.city || ""})</option>
                  ))}
                </select>
                <Link href="/dashboard/warehouse" target="_blank" className="text-xs text-blue-600 hover:underline mt-1 inline-block">+ Add new warehouse</Link>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity *</label>
                <Input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="e.g., 100" required />
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-background rounded-xl border">
          <button type="button" onClick={() => setShowPricing(!showPricing)} className="w-full p-4 flex items-center justify-between font-semibold text-lg">
            <span>Pricing</span>{showPricing ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {showPricing && (
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Set different prices for customer types</p><Button type="button" variant="outline" size="sm" onClick={addTier}><Plus className="h-4 w-4 mr-1" /> Add Tier</Button></div>
              {pricingTiers.map((t, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <select value={t.priceType} onChange={e => updateTier(i, "priceType", e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium">
                      <option value="RETAIL">Retail</option><option value="WHOLESALE">Wholesale</option><option value="BULK">Bulk</option><option value="CORPORATE">Corporate</option>
                    </select>
                    {pricingTiers.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(i)}><X className="h-4 w-4 text-red-500" /></Button>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs">MRP (₹) *</label><Input type="number" step="0.01" value={t.mrp} onChange={e => updateTier(i, "mrp", e.target.value)} placeholder="0.00" /></div>
                    <div><label className="text-xs">Selling Price (₹) *</label><Input type="number" step="0.01" value={t.sellingPrice} onChange={e => updateTier(i, "sellingPrice", e.target.value)} placeholder="0.00" /></div>
                    <div><label className="text-xs">Min Qty</label><Input type="number" value={t.minQty} onChange={e => updateTier(i, "minQty", e.target.value)} placeholder="1" /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced */}
        <div className="bg-background rounded-xl border">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full p-4 flex items-center justify-between font-semibold text-lg">
            <span>Specifications & SEO</span>{showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {showAdvanced && (
            <div className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Warranty</label><Input value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="1 year" /></div>
                <div><label className="text-sm font-medium">Country of Origin</label><Input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)} placeholder="India" /></div>
              </div>
              <div className="border-t pt-4">
                <SEOSection metaTitle={metaTitle} setMetaTitle={setMetaTitle} metaDescription={metaDescription} setMetaDescription={setMetaDescription} productName={name} category={selectedCategory?.name} description={description} />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>Create Product</Button>
      </form>
    </div>
  );
}