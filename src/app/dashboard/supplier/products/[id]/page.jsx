// src/app/dashboard/supplier/products/[id]/page.jsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Package, Plus, X, Save, ChevronDown, ChevronUp, Building, MonitorSmartphone, Tags, Upload, AlertTriangle, Image as ImageIcon, Loader2, CheckCircle, Coins, Sparkles } from "lucide-react";
import AIGenerateButton from "@/components/products/AIGenerateButton";
import SEOSection from "@/components/products/SEOSection";
import HsnSearchInput from "@/components/products/HsnSearchInput";
import ProductPreview from "@/components/products/ProductPreview";

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

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [submitStage, setSubmitStage] = useState('idle'); // idle, saving, done
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
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [currentStock, setCurrentStock] = useState(null);
  const [productStatus, setProductStatus] = useState({ isActive: false, isApproved: false, rejectionReason: null });
  const [productData, setProductData] = useState(null);
  const [pricingTiers, setPricingTiers] = useState([{ priceType: "RETAIL", mrp: "", sellingPrice: "", minQty: "1" }]);

  // Images state
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Temporary AI-generated images (not yet saved to database)
  const [tempGeneratedImages, setTempGeneratedImages] = useState([]);
  
  // Track if there are unsaved changes
  const [hasUnsavedImages, setHasUnsavedImages] = useState(false);

  // AI Credits state
  const [aiCredits, setAiCredits] = useState(null);

  // Variants state
  const [variantType, setVariantType] = useState("");
  const [variants, setVariants] = useState([]);

  // Confirm popup state
  const [confirmPopup, setConfirmPopup] = useState(null);

  useEffect(() => {
    async function loadData() {
      await Promise.all([
        fetch("/api/categories").then(r => r.json()).then(d => { if (d.success) setCategories(d.data); }),
        fetch("/api/admin/brands").then(r => r.json()).then(d => { if (d.brands) setBrands(d.brands); }).catch(() => {}),
        fetchWarehouses(),
        fetch("/api/supplier/ai-credits").then(r => r.json()).then(d => { 
          if (d.success) setAiCredits(d.data); 
        }).catch(() => {}),
      ]);
      fetchProduct();
    }
    loadData();
  }, [id]);

  // Ctrl+S keyboard shortcut for Save Draft
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && !loading) {
          handleSaveDraft();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, categoryId, brandId, newBrandName, description, highlights, metaTitle, metaDescription, sku, hsnCode, barcode, unit, weight, length, width, height, warranty, countryOfOrigin, warehouseId, stockQty, pricingTiers, variants, saving, loading]);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/warehouses");
      const text = await res.text();
      if (!text) return;
      try {
        const data = JSON.parse(text);
        if (data.success && data.data) {
          setWarehouses(Array.isArray(data.data) ? data.data : []);
        } else if (Array.isArray(data)) {
          setWarehouses(data);
        }
      } catch {}
    } catch {}
  };

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (!data.success) { toast.error("Product not found"); router.back(); return; }
      const p = data.data;
      setName(p.name || "");
      setCategoryId(p.categoryId || "");
      setBrandId(p.brandId || "");
      setNewBrandName("");
      setDescription(p.description || "");
      setHighlights(p.highlights || "");
      setMetaTitle(p.metaTitle || "");
      setMetaDescription(p.metaDescription || "");
      setSku(p.sku || "");
      setHsnCode(p.hsnCode || "");
      setBarcode(p.barcode || "");
      setUnit(p.unit || "PCS");
      setWeight(p.weight ? String(p.weight) : "");
      
      // Fixed dimensions parsing with trim
      if (p.dimensions) {
        const cleanDimensions = String(p.dimensions).replace(" cm", "").trim();
        const parts = cleanDimensions.split("x").map(part => part.trim());
        setLength(parts[0] || "");
        setWidth(parts[1] || "");
        setHeight(parts[2] || "");
      }
      
      setWarranty(p.warranty || "");
      setCountryOfOrigin(p.countryOfOrigin || "");
      setProductStatus({
        isActive: p.isActive || false,
        isApproved: p.isApproved || false,
        rejectionReason: p.rejectionReason || null,
      });
      setProductData({
        name: p.name || "",
        categoryId: p.categoryId || "",
        brandId: p.brandId || "",
        description: p.description || "",
        sku: p.sku || "",
        hsnCode: p.hsnCode || "",
        unit: p.unit || "PCS",
        weight: p.weight ? String(p.weight) : "",
        imagesCount: p.images?.length || 0,
        pricing: p.pricing?.map(t => ({ pt: t.priceType, m: String(t.mrp || ""), s: String(t.sellingPrice || ""), mq: String(t.minQty || "1") })) || [],
      });
      
      // Load images
      if (p.images && p.images.length > 0) {
        setImages(p.images.map(img => ({ url: img.url, id: img.id, source: 'UPLOADED' })));
      }

      // Load variants
      if (p.variants && p.variants.length > 0) {
        setVariants(p.variants.map(v => ({
          value: v.name || v.value || '',
          mrp: String(v.mrp || ''),
          sellingPrice: String(v.sellingPrice || v.price || ''),
          minQty: String(v.minQty || '1'),
        })));
        if (p.variants[0]?.type) setVariantType(p.variants[0].type);
      }

      if (p.inventory && p.inventory.length > 0) {
        const inv = p.inventory[0];
        setWarehouseId(inv.warehouseId || "");
        setStockQty(String(inv.availableQty || 0));
        setCurrentStock(inv.availableQty || 0);
      }

      setPricingTiers(p.pricing?.length > 0 ? p.pricing.map(t => ({
        priceType: t.priceType, mrp: String(t.mrp || ""), sellingPrice: String(t.sellingPrice || ""), minQty: String(t.minQty || "1")
      })) : [{ priceType: "RETAIL", mrp: "", sellingPrice: "", minQty: "1" }]);
    } catch (err) { console.error(err); toast.error("Failed to load product"); }
    finally { setLoading(false); }
  };

  const addTier = () => setPricingTiers([...pricingTiers, { priceType: "WHOLESALE", mrp: "", sellingPrice: "", minQty: "10" }]);
  const removeTier = (i) => setPricingTiers(pricingTiers.filter((_, idx) => idx !== i));
  const updateTier = (i, f, v) => { const u = [...pricingTiers]; u[i][f] = v; setPricingTiers(u); };

  // Image handlers
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImages(true);
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} too large (max 5MB)`); return; }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) { toast.error(`${file.name} invalid type`); return; }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', id);
      
      fetch('/api/products/images/upload', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setImages(prev => [...prev, { url: data.data.image.url, id: data.data.image.id, source: 'UPLOADED' }]);
          }
        })
        .catch(() => {})
        .finally(() => setUploadingImages(false));
    });
  };

  const removeImage = async (index, imageId) => {
    const imgToRemove = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    
    // Delete from database if has ID
    const deleteId = imageId || imgToRemove?.id;
    if (deleteId) {
      try { 
        const res = await fetch(`/api/products/images/${deleteId}`, { method: 'DELETE' });
        if (!res.ok) {
          toast.error('Failed to delete image from server');
        }
      } catch {}
    }
  };

  // Generate AI image NOW (deduct credit, temporary - not saved until submit)
  const handleGenerateAIImage = async () => {
    setGeneratingImage(true);
    try {
      const res = await fetch('/api/products/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: id,
          action: 'generate-temp',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('AI image generated! Click Save/Submit to keep it.');
        // Add to temporary gallery (not saved to database yet)
        setImages(prev => [...prev, { 
          url: data.data.imageUrl, 
          source: 'AI_GENERATED',
          temp: true,
        }]);
        setTempGeneratedImages(prev => [...prev, data.data.imageUrl]);
        setHasUnsavedImages(true);
        // Refresh credits
        fetch("/api/supplier/ai-credits").then(r => r.json()).then(d => { 
          if (d.success) setAiCredits(d.data); 
        }).catch(() => {});
      } else {
        toast.error(data.error || 'Failed to generate image');
      }
    } catch (error) {
      toast.error('Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  };

  // Variant handlers
  const addVariantValue = () => setVariants([...variants, { value: "", mrp: "", sellingPrice: "", minQty: "1" }]);
  const removeVariantValue = (i) => setVariants(variants.filter((_, idx) => idx !== i));
  const updateVariantValue = (i, f, v) => { const u = [...variants]; u[i][f] = v; setVariants(u); };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedBrand = brands.find(b => b.id === brandId);

  const handleSaveDraft = async () => {
    if (!name || !categoryId) { toast.error("Name and category required"); return; }
    if (!weight) { toast.error("Weight is required"); return; }

    setSaving(true);
    const pricing = pricingTiers.filter(t => t.mrp && t.sellingPrice).map(t => ({
      priceType: t.priceType, mrp: parseFloat(t.mrp), sellingPrice: parseFloat(t.sellingPrice), minQty: parseInt(t.minQty) || 1,
    }));
    
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

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, categoryId, brandId: finalBrandId, description,
          longDescription: description, highlights,
          metaTitle, metaDescription,
          sku, hsnCode, barcode, unit,
          weight: weight ? parseFloat(weight) : null,
          length: length || null, width: width || null, height: height || null,
          warranty: warranty || null, countryOfOrigin: countryOfOrigin || null,
          pricing: pricing.length > 0 ? pricing : [],
          warehouseId: warehouseId || null,
          stockQty: stockQty ? parseInt(stockQty) : null,
          isActive: false,
          isApproved: false,
          rejectionReason: null,
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
        // Save temporary AI-generated images
        if (tempGeneratedImages.length > 0) {
          await fetch('/api/products/images/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: id,
              action: 'save-generated',
              imageUrls: tempGeneratedImages,
            }),
          });
          setTempGeneratedImages([]);
          setHasUnsavedImages(false);
        }
        toast.success("Draft saved!"); 
        router.push("/dashboard/supplier/products"); 
      }
      else { toast.error(result.message || result.error); }
    } catch { toast.error("Failed to save draft"); }
    finally { setSaving(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !categoryId) { toast.error("Name and category required"); return; }
    if (!weight) { toast.error("Weight is required for delivery"); return; }

    const currentPricingKey = JSON.stringify(pricingTiers.filter(t => t.mrp && t.sellingPrice).map(t => ({ pt: t.priceType, m: t.mrp, s: t.sellingPrice, mq: t.minQty })));
    const originalPricingKey = JSON.stringify(productData?.pricing || []);
    
    const isStockOnlyUpdate = (
      name === productData?.name &&
      categoryId === productData?.categoryId &&
      brandId === productData?.brandId &&
      description === productData?.description &&
      sku === productData?.sku &&
      hsnCode === productData?.hsnCode &&
      unit === productData?.unit &&
      String(weight || '') === String(productData?.weight || '') &&
      images.length === productData?.imagesCount &&
      currentPricingKey === originalPricingKey
    );

    // Check if NO actual change was made (stock also unchanged)
    const isNoChange = (
      isStockOnlyUpdate &&
      String(stockQty || '') === String(currentStock || '')
    );

    setSaving(true);
    setSubmittingForApproval(true);
    setSubmitStage('saving');
    const pricing = pricingTiers.filter(t => t.mrp && t.sellingPrice).map(t => ({
      priceType: t.priceType, mrp: parseFloat(t.mrp), sellingPrice: parseFloat(t.sellingPrice), minQty: parseInt(t.minQty) || 1,
    }));
    
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

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, categoryId, brandId: finalBrandId, description,
          longDescription: description, highlights,
          metaTitle, metaDescription,
          sku, hsnCode, barcode, unit,
          weight: weight ? parseFloat(weight) : null,
          length: length || null, width: width || null, height: height || null,
          warranty: warranty || null, countryOfOrigin: countryOfOrigin || null,
          pricing,
          warehouseId: warehouseId || null,
          stockQty: stockQty ? parseInt(stockQty) : null,
          isActive: true,
          isApproved: isNoChange || isStockOnlyUpdate ? (productStatus.isApproved || false) : false,
          rejectionReason: null,
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
        // Save temporary AI-generated images to database
        if (tempGeneratedImages.length > 0) {
          await fetch('/api/products/images/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: id,
              action: 'save-generated',
              imageUrls: tempGeneratedImages,
            }),
          });
          setTempGeneratedImages([]);
          setHasUnsavedImages(false);
        }
        
        setSubmitStage('done');
        if (isNoChange) {
          toast.info("No changes detected. Product remains live."); 
        } else if (isStockOnlyUpdate) {
          toast.success("Stock updated! Product is still live."); 
        } else {
          toast.success("Product updated! Waiting for admin approval."); 
        }
        
        setTimeout(() => {
          router.push("/dashboard/supplier/products");
        }, 1500);
      }
      else { 
        toast.error(result.message || result.error); 
        setSubmitStage('idle');
      }
    } catch { 
      toast.error("Failed to save"); 
      setSubmitStage('idle');
    }
    finally { setSaving(false); setSubmittingForApproval(false); }
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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

      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={() => {
            if (hasUnsavedImages || tempGeneratedImages.length > 0) {
              setConfirmPopup({
                title: "Unsaved AI Images",
                message: `You have ${tempGeneratedImages.length} unsaved AI-generated image(s). ${tempGeneratedImages.length} credit(s) will be wasted if you leave without saving.`,
                confirmText: "Discard & Leave",
                cancelText: "Stay & Save",
                type: 'danger',
                onConfirm: () => {
                  setTempGeneratedImages([]);
                  setHasUnsavedImages(false);
                  router.push('/dashboard/supplier/products');
                },
                onCancel: () => setConfirmPopup(null),
              });
            } else {
              router.push('/dashboard/supplier/products');
            }
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </button>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button type="button" onClick={() => setPreviewMode('detail')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${previewMode === 'detail' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Detail View</button>
          <button type="button" onClick={() => setPreviewMode('card')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${previewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Card View</button>
        </div>
      </div>

      {/* Ctrl+S Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
        💡 Tip: Press <kbd className="bg-white px-1.5 py-0.5 rounded border font-bold">Ctrl</kbd> + <kbd className="bg-white px-1.5 py-0.5 rounded border font-bold">S</kbd> to quickly save as draft
      </div>

      <div className="flex gap-6 items-start">
        {/* LEFT — FORM */}
        <form onSubmit={handleSave} className="space-y-4 flex-1">
          {/* PRODUCT STATUS BANNER */}
          {!productStatus.isApproved && productStatus.rejectionReason ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <p className="text-sm font-bold text-red-800">❌ Product Rejected</p>
              <p className="text-sm text-red-700 mt-1">{productStatus.rejectionReason}</p>
              <p className="text-xs text-red-600 mt-2">Fix the issue and save to resubmit for approval.</p>
            </div>
          ) : !productStatus.isApproved && productStatus.isActive ? (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
              <p className="text-sm font-bold text-yellow-800">⏳ Pending Admin Approval</p>
              <p className="text-xs text-yellow-700 mt-1">Your product is waiting for admin review. It is not visible to buyers yet.</p>
            </div>
          ) : !productStatus.isActive && !productStatus.isApproved && images.length === 0 ? (
            <div className="bg-gray-50 border border-gray-300 rounded-xl p-4">
              <p className="text-sm font-bold text-gray-700">📝 DRAFT</p>
              <p className="text-xs text-gray-600 mt-1">Generate AI image or upload your own.</p>
            </div>
          ) : productStatus.isApproved && productStatus.isActive ? (
            <div className="bg-green-50 border border-green-300 rounded-xl p-4">
              <p className="text-sm font-bold text-green-800">✅ LIVE — Visible to Buyers</p>
              <p className="text-xs text-green-700 mt-1">Your product is approved and visible in the buyer app.</p>
            </div>
          ) : productStatus.isApproved && !productStatus.isActive ? (
            <div className="bg-gray-50 border border-gray-300 rounded-xl p-4">
              <p className="text-sm font-bold text-gray-700">⏸️ Inactive</p>
              <p className="text-xs text-gray-600 mt-1">This product is approved but currently inactive.</p>
            </div>
          ) : null}

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
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Describe your product..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none" />
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
            <h3 className="font-semibold text-gray-900 mb-3">Product Images</h3>
            
            {/* Credits Info */}
            {aiCredits !== null && (
              <div className="mb-3 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2">
                <Coins className="h-4 w-4 text-purple-500 shrink-0" />
                <span className="text-xs text-purple-700 font-medium">
                  {aiCredits.creditsRemaining} credits remaining
                </span>
                <span className="text-xs text-purple-400">•</span>
                <span className="text-xs text-purple-600">
                  AI image costs {aiCredits.creditCostPerGeneration} credit(s)
                </span>
              </div>
            )}
            
            {/* Image Gallery */}
            <div className="flex flex-wrap gap-3 mb-3">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {img.source === 'AI_GENERATED' && (
                    <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-purple-500 text-white text-center py-0.5">
                      AI
                    </span>
                  )}
                  <button type="button" onClick={() => removeImage(i, img.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {/* Upload Button */}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">{uploadingImages ? 'Uploading...' : 'Upload'}</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
              </label>
            </div>

            {/* Generate AI Button */}
            <button
              type="button"
              onClick={handleGenerateAIImage}
              disabled={generatingImage}
              className="w-full py-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generatingImage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating AI Image...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate AI Image (1 credit)
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-400 mt-2">Upload your own photos FREE or generate AI images using credits.</p>
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
            <h3 className="font-semibold text-gray-900 mb-3">Pickup Location</h3>
            {currentStock !== null && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">Current Stock: <span className="font-bold">{currentStock} {unit}</span></p>
              </div>
            )}
            {warehouses.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-800 font-medium mb-2">No pickup location found</p>
                <p className="text-sm text-amber-700 mb-3">Create a pickup location first.</p>
                <Link href="/dashboard/warehouse" target="_blank" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition inline-flex items-center gap-2">
                  <Building className="h-4 w-4" /> Create Pickup Location
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Pickup Location</label>
                  <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="">Select pickup location</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.city || ""})</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium">Stock Quantity</label><Input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="Update stock" /></div>
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

          {/* Variants */}
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

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              size="lg"
              onClick={handleSaveDraft}
              disabled={saving || generatingImage}
            >
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              size="lg" 
              disabled={saving || generatingImage}
            >
              {submitStage === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : submitStage === 'done' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Submitted!
                </>
              ) : (
                "Submit for Approval"
              )}
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