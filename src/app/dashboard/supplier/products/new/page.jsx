"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Package, Plus, X, ChevronDown, ChevronUp, Building, MonitorSmartphone, Tags, Upload } from "lucide-react";
import AIGenerateButton from "@/components/products/AIGenerateButton";
import SEOSection from "@/components/products/SEOSection";
import HsnSearchInput from "@/components/products/HsnSearchInput";
import ProductPreview from "@/components/products/ProductPreview";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showPricing, setShowPricing] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [previewMode, setPreviewMode] = useState('detail');

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [description, setDescription] = useState("");
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

  // Images state (uploaded after product creation)
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Variants state
  const [variantType, setVariantType] = useState("");
  const [variants, setVariants] = useState([]);

  const [pricingTiers, setPricingTiers] = useState([
    { priceType: "RETAIL", mrp: "", sellingPrice: "", minQty: "1" },
  ]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => { if (d.success) setCategories(d.data); });
    fetch("/api/admin/brands").then(r => r.json()).then(d => { if (d.brands) setBrands(d.brands); }).catch(() => {});
    fetch("/api/warehouses").then(r => r.text()).then(text => { if (!text) return; try { const d = JSON.parse(text); if (d.success) setWarehouses(d.data || []); else if (Array.isArray(d)) setWarehouses(d); } catch {} }).catch(() => {});
  }, []);

  const addTier = () => setPricingTiers([...pricingTiers, { priceType: "WHOLESALE", mrp: "", sellingPrice: "", minQty: "10" }]);
  const removeTier = (i) => setPricingTiers(pricingTiers.filter((_, idx) => idx !== i));
  const updateTier = (i, f, v) => { const u = [...pricingTiers]; u[i][f] = v; setPricingTiers(u); };

  // Image selection (preview only — uploaded after product creation)
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        toast.error(`${file.name} has invalid type`);
        return;
      }
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => [...prev, { file, previewUrl: event.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images after product creation
  const uploadImagesForProduct = async (productId) => {
    if (images.length === 0) return;
    setUploadingImages(true);
    try {
      for (const img of images) {
        const formData = new FormData();
        formData.append('file', img.file);
        formData.append('productId', productId);
        await fetch('/api/products/images/upload', { method: 'POST', body: formData });
      }
      toast.success(`${images.length} image(s) uploaded`);
    } catch {
      toast.error('Some images failed to upload');
    } finally {
      setUploadingImages(false);
    }
  };

  // Variant handlers
  const addVariantValue = () => setVariants([...variants, { value: "", mrp: "", sellingPrice: "", minQty: "1" }]);
  const removeVariantValue = (i) => setVariants(variants.filter((_, idx) => idx !== i));
  const updateVariantValue = (i, f, v) => { const u = [...variants]; u[i][f] = v; setVariants(u); };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedBrand = brands.find(b => b.id === brandId);

  const handleSaveDraft = async () => {
    if (!name || !categoryId) { toast.error("Name and category required for draft"); return; }
    if (!weight) { toast.error("Weight is required"); return; }
    if (!warehouseId) { toast.error("Please select a warehouse"); return; }
    if (!stockQty || parseInt(stockQty) < 0) { toast.error("Stock quantity is required"); return; }

    setLoading(true);
    const pricing = pricingTiers.filter(t => t.mrp && t.sellingPrice).map(t => ({
      priceType: t.priceType, mrp: parseFloat(t.mrp), sellingPrice: parseFloat(t.sellingPrice), minQty: parseInt(t.minQty) || 1,
    }));
    if (pricing.length === 0) { toast.error("Add at least one price"); setLoading(false); return; }

    try {
      let finalBrandId = brandId || null;
      if (newBrandName && newBrandName.trim()) {
        try {
          const brandRes = await fetch('/api/admin/brands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newBrandName.trim(), isActive: true }),
          });
          const brandData = await brandRes.json();
          if (brandData.id) finalBrandId = brandData.id;
        } catch (err) {}
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, categoryId, brandId: finalBrandId, description, longDescription: description,
          metaTitle, metaDescription,
          sku, hsnCode, barcode, unit,
          weight: weight ? parseFloat(weight) : null,
          length: length || null, width: width || null, height: height || null,
          warranty: warranty || null, countryOfOrigin: countryOfOrigin || "India",
          pricing, warehouseId, stockQty: parseInt(stockQty) || 0,
          isActive: false,
          isApproved: false,
          variants: variants.filter(v => v.value.trim()).map(v => ({
            type: variantType || 'Variant',
            value: v.value.trim(),
            mrp: parseFloat(v.mrp) || null,
            sellingPrice: parseFloat(v.sellingPrice) || null,
            minQty: parseInt(v.minQty) || 1,
          })),
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Draft saved! Add image later to submit for approval.");
        router.push('/dashboard/supplier/products');
      } else {
        toast.error(result.message || result.error);
      }
    } catch { toast.error("Failed to save draft"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !categoryId) { toast.error("Name and category required"); return; }
    if (!weight) { toast.error("Weight is required for delivery"); return; }
    if (!warehouseId) { toast.error("Please select a warehouse for initial stock"); return; }
    if (!stockQty || parseInt(stockQty) < 0) { toast.error("Initial stock quantity is required"); return; }
    if (images.length === 0) { toast.error("Please upload at least one product image"); return; }

    setLoading(true);
    setSubmittingForApproval(true);
    const pricing = pricingTiers.filter(t => t.mrp && t.sellingPrice).map(t => ({
      priceType: t.priceType, mrp: parseFloat(t.mrp), sellingPrice: parseFloat(t.sellingPrice), minQty: parseInt(t.minQty) || 1,
    }));
    if (pricing.length === 0) { toast.error("Add at least one price"); setLoading(false); return; }

    try {
      let finalBrandId = brandId || null;
      if (newBrandName && newBrandName.trim()) {
        try {
          const brandRes = await fetch('/api/admin/brands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newBrandName.trim(), isActive: true }),
          });
          const brandData = await brandRes.json();
          if (brandData.id) {
            finalBrandId = brandData.id;
          }
        } catch (err) {
          console.error('Brand creation error:', err);
        }
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, categoryId, brandId: finalBrandId, description, longDescription: description,
          metaTitle, metaDescription,
          sku, hsnCode, barcode, unit,
          weight: weight ? parseFloat(weight) : null,
          length: length || null, width: width || null, height: height || null,
          warranty: warranty || null, countryOfOrigin: countryOfOrigin || "India",
          pricing, warehouseId, stockQty: parseInt(stockQty) || 0,
          isActive: images.length > 0,
          isApproved: false,
          variants: variants.filter(v => v.value.trim()).map(v => ({
            type: variantType || 'Variant',
            value: v.value.trim(),
            mrp: parseFloat(v.mrp) || null,
            sellingPrice: parseFloat(v.sellingPrice) || null,
            minQty: parseInt(v.minQty) || 1,
          })),
        }),
      });
      const result = await res.json();
      if (result.success) {
        const productId = result.data.product.id;
        // Upload images if any were selected
        if (images.length > 0) {
          await uploadImagesForProduct(productId);
        }
        toast.success("Product created successfully!");
        router.push('/dashboard/supplier/products');
      } else {
        toast.error(result.message || result.error);
      }
    } catch { toast.error("Failed"); }
    finally { setLoading(false); setSubmittingForApproval(false); }
  };

  const previewData = {
    name,
    brand: selectedBrand?.name || newBrandName || '',
    description,
    highlights,
    images: images.map(img => ({ url: img.previewUrl || img.url })),
    pricing: pricingTiers.filter(t => t.sellingPrice),
    stockQty: parseInt(stockQty) || 0,
    variants,
    weight: parseFloat(weight) || 0,
    unit,
    hsnCode,
    sku,
    barcode,
    countryOfOrigin,
    warranty,
    length: parseFloat(length) || 0,
    width: parseFloat(width) || 0,
    height: parseFloat(height) || 0,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/supplier/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button type="button" onClick={() => setPreviewMode('detail')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${previewMode === 'detail' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Detail View</button>
          <button type="button" onClick={() => setPreviewMode('card')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${previewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Card View</button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* LEFT — FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          {/* Basic Info */}
          <div className="bg-background rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Basic Information</h3>
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
            <div>
              <label className="text-sm font-medium">Brand</label>
              <div className="flex gap-2 mt-1">
                <select value={brandId} onChange={e => { setBrandId(e.target.value); setNewBrandName(''); }} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" style={{width: '55%'}}>
                  <option value="">Select brand</option>
                  {brands.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <Input value={newBrandName} placeholder="Or type custom brand" onChange={e => { setNewBrandName(e.target.value); if (e.target.value) setBrandId(''); }} className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Select from list or type a custom brand — it will be auto-created</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Description</label>
                <AIGenerateButton type="description" productName={name} category={selectedCategory?.name} onResult={(result) => setDescription(result.content)} label="AI Write" />
              </div>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Describe your product - features, specifications, applications..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none" />
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

          {/* Product Images */}
          <div className="bg-background rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Product Images * <span className="text-xs text-gray-400 font-normal">(At least 1 required)</span></h3>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-2">Max 5MB each. JPG, PNG, or WebP.</p>
          </div>

          {/* Weight & Dimensions */}
          <div className="bg-background rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Weight & Dimensions (Required for Delivery) *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Weight (kg) *</label><Input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g., 2.5" required /></div>
              <div><label className="text-sm font-medium">Length (cm)</label><Input type="number" step="0.1" value={length} onChange={e => setLength(e.target.value)} placeholder="e.g., 30" /></div>
              <div><label className="text-sm font-medium">Width (cm)</label><Input type="number" step="0.1" value={width} onChange={e => setWidth(e.target.value)} placeholder="e.g., 20" /></div>
              <div><label className="text-sm font-medium">Height (cm)</label><Input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g., 10" /></div>
            </div>
          </div>

          {/* Stock Location */}
          <div className="bg-background rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Stock Location *</h3>
            {warehouses.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-800 font-medium mb-2">No warehouse found</p>
                <p className="text-sm text-amber-700 mb-3">Create a warehouse first — it can be your shop, godown, or storage location.</p>
                <div className="flex gap-2 justify-center">
                  <Link href="/dashboard/warehouse" target="_blank" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition inline-flex items-center gap-2">
                    <Building className="h-4 w-4" /> Create Warehouse (New Tab)
                  </Link>
                  <button type="button" onClick={() => { fetch("/api/warehouses").then(r => r.text()).then(text => { if (!text) return; try { const d = JSON.parse(text); const list = d.success ? (d.data || []) : (Array.isArray(d) ? d : []); setWarehouses(list); if (list.length > 0) toast.success(`${list.length} warehouse(s) found!`); } catch {} }).catch(() => {}); }} className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition">🔄 Refresh</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Warehouse *</label>
                  <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" required>
                    <option value="">Select warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.city || ""})</option>)}
                  </select>
                  <Link href="/dashboard/warehouse" target="_blank" className="text-xs text-blue-600 hover:underline mt-1 inline-block">+ Add new warehouse</Link>
                </div>
                <div><label className="text-sm font-medium">Quantity *</label><Input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="e.g., 100" required /></div>
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

          {/* Variants — below Pricing */}
          <div className="bg-background rounded-xl border">
            <button type="button" onClick={() => setShowVariants(!showVariants)} className="w-full p-4 flex items-center justify-between font-semibold text-lg">
              <span className="flex items-center gap-2"><Tags className="h-5 w-5" /> Variants (Optional)</span>{showVariants ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {showVariants && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Variant Type</label>
                  <select value={variantType} onChange={e => setVariantType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    <option value="">Select type</option>
                    <option value="Pack Size">Pack Size</option>
                    <option value="Weight">Weight</option>
                    <option value="Length">Length</option>
                    <option value="Volume">Volume</option>
                    <option value="Color">Color</option>
                    <option value="Size">Size</option>
                  </select>
                </div>
                {variants.length > 0 && (
                  <div className="space-y-2">
                    {variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 items-center">
                        <Input value={v.value} onChange={e => updateVariantValue(i, 'value', e.target.value)} placeholder="e.g., 50kg" className="col-span-1" />
                        <Input type="number" value={v.mrp} onChange={e => updateVariantValue(i, 'mrp', e.target.value)} placeholder="MRP" className="col-span-1" />
                        <Input type="number" value={v.sellingPrice} onChange={e => updateVariantValue(i, 'sellingPrice', e.target.value)} placeholder="Price" className="col-span-1" />
                        <Input type="number" value={v.minQty} onChange={e => updateVariantValue(i, 'minQty', e.target.value)} placeholder="MOQ" className="col-span-1" />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeVariantValue(i)}><X className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addVariantValue}><Plus className="h-4 w-4 mr-1" /> Add Variant Value</Button>
              </div>
            )}
          </div>

          {/* Advanced — Specifications & SEO (collapsed by default) */}
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

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              size="lg"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              size="lg" 
              loading={loading && submittingForApproval}
              disabled={loading}
            >
              {images.length === 0 ? "Upload Image to Submit" : "Submit for Approval"}
            </Button>
          </div>
        </form>

        {/* RIGHT — LIVE PREVIEW */}
        <div className="w-[320px] shrink-0 sticky top-4">
          <div className="text-center mb-3">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <MonitorSmartphone className="h-3.5 w-3.5" /> Live Preview
            </span>
          </div>
          <div className="bg-gray-100 rounded-2xl p-4 max-h-[80vh] overflow-y-auto">
            <ProductPreview product={previewData} mode={previewMode} />
          </div>
        </div>
      </div>
    </div>
  );
}