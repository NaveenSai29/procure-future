"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Save, Tags, Upload } from "lucide-react";

export default function VariantsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [attributeGroups, setAttributeGroups] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}/full`);
      const data = await res.json();
      if (!data.success) { toast.error("Product not found"); return; }
      setProduct(data.data);

      const existingVariants = data.data.variants || [];
      setVariants(existingVariants.map(v => ({
        ...v,
        price: v.price || "",
        stock: v.stock || 0,
        attributes: v.attributes || {},
        images: v.images || [],
      })));

      if (existingVariants.length > 0 && existingVariants[0].attributes) {
        const groups = [];
        const seenNames = new Set();
        existingVariants.forEach(v => {
          if (v.attributes) {
            Object.entries(v.attributes).forEach(([name, value]) => {
              if (!seenNames.has(name)) {
                seenNames.add(name);
                groups.push({
                  name,
                  values: [...new Set(existingVariants.map(v => v.attributes?.[name]).filter(Boolean))],
                });
              }
            });
          }
        });
        setAttributeGroups(groups);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addGroup = () => setAttributeGroups([...attributeGroups, { name: "", values: [""] }]);
  const removeGroup = (index) => { const updated = attributeGroups.filter((_, i) => i !== index); setAttributeGroups(updated); generateVariants(updated); };
  const updateGroupName = (index, name) => { const updated = [...attributeGroups]; updated[index].name = name; setAttributeGroups(updated); };
  const addValue = (groupIndex) => { const updated = [...attributeGroups]; updated[groupIndex].values.push(""); setAttributeGroups(updated); };
  const updateValue = (groupIndex, valueIndex, value) => { const updated = [...attributeGroups]; updated[groupIndex].values[valueIndex] = value; setAttributeGroups(updated); };
  const removeValue = (groupIndex, valueIndex) => { const updated = [...attributeGroups]; updated[groupIndex].values = updated[groupIndex].values.filter((_, i) => i !== valueIndex); setAttributeGroups(updated); };

  const generateVariants = (groups = attributeGroups) => {
    if (groups.length === 0 || groups.some(g => !g.name || g.values.length === 0 || g.values.some(v => !v))) return;
    const combinations = cartesianProduct(groups.map(g => g.values));
    const newVariants = combinations.map(combo => {
      const attrs = {};
      groups.forEach((g, i) => { attrs[g.name] = combo[i]; });
      const name = combo.join(" / ");
      const existing = variants.find(v => v.name === name);
      return existing || { id: null, name, attributes: attrs, sku: "", barcode: "", price: "", stock: 0, isActive: true, images: [] };
    });
    setVariants(newVariants);
  };

  const updateVariant = (index, field, value) => { const updated = [...variants]; updated[index][field] = value; setVariants(updated); };

  const uploadVariantImage = async (variantIndex, file) => {
    const v = variants[variantIndex];
    if (!v.id) { toast.error("Save variants first before uploading images"); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("variantId", v.id);
    try {
      const res = await fetch("/api/products/variants/images/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) { toast.success("Image uploaded!"); fetchProduct(); }
      else { toast.error(data.message); }
    } catch { toast.error("Upload failed"); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variants: variants.map(v => ({
            id: v.id || undefined, name: v.name, attributes: v.attributes,
            sku: v.sku || null, barcode: v.barcode || null,
            price: v.price ? parseFloat(v.price) : null,
            stock: v.stock ? parseInt(v.stock) : 0,
            isActive: v.isActive !== false,
          })),
        }),
      });
      const result = await res.json();
      if (result.success) { toast.success("Variants saved!"); fetchProduct(); }
      else { toast.error(result.message); }
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard/supplier/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tags className="h-6 w-6 text-primary" /> Product Variants</h1>
        <p className="text-muted-foreground">{product?.name}</p>
      </div>

      <div className="bg-background rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Attribute Groups</h2>
          <Button variant="outline" size="sm" onClick={addGroup}><Plus className="h-4 w-4 mr-1" />Add Group</Button>
        </div>
        <p className="text-sm text-muted-foreground">Define attributes like Color, Size. Variants auto-generate from combinations.</p>

        {attributeGroups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No attribute groups. Add groups to create variants.</p>
          </div>
        )}

        {attributeGroups.map((group, gi) => (
          <div key={gi} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <Input placeholder="Group name (e.g., Color, Size)" value={group.name} onChange={(e) => updateGroupName(gi, e.target.value)} className="flex-1 font-medium" />
              <Button variant="ghost" size="sm" onClick={() => removeGroup(gi)}><X className="h-4 w-4 text-red-500" /></Button>
            </div>
            <div className="space-y-2 ml-4">
              {group.values.map((value, vi) => (
                <div key={vi} className="flex items-center gap-2">
                  <Input placeholder={`Value ${vi + 1}`} value={value} onChange={(e) => updateValue(gi, vi, e.target.value)} className="flex-1" />
                  {group.values.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeValue(gi, vi)}><X className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addValue(gi)}><Plus className="h-4 w-4 mr-1" />Add value</Button>
            </div>
          </div>
        ))}

        {attributeGroups.length > 0 && (
          <Button className="w-full" onClick={() => generateVariants()}><Tags className="h-4 w-4 mr-2" />Generate Variants</Button>
        )}
      </div>

      {variants.length > 0 && (
        <div className="bg-background rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">{variants.length} Variants</h2>
          <p className="text-sm text-muted-foreground">Set prices, stock, SKU, and images per variant. Leave price empty to use base price.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Image</th>
                  <th className="text-left p-2">Variant</th>
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Price (₹)</th>
                  <th className="text-left p-2">Stock</th>
                  <th className="text-left p-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadVariantImage(i, file); }} />
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center hover:bg-muted/80">
                          {v.images?.[0] ? (
                            <img src={v.images[0].url} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <Upload className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </label>
                    </td>
                    <td className="p-2 font-medium">{v.name}</td>
                    <td className="p-2"><Input value={v.sku || ""} onChange={(e) => updateVariant(i, "sku", e.target.value)} className="h-8 text-xs" placeholder="SKU" /></td>
                    <td className="p-2"><Input type="number" value={v.price || ""} onChange={(e) => updateVariant(i, "price", e.target.value)} className="h-8 text-xs w-28" placeholder="Base price" /></td>
                    <td className="p-2"><Input type="number" value={v.stock ?? 0} onChange={(e) => updateVariant(i, "stock", e.target.value)} className="h-8 text-xs w-20" /></td>
                    <td className="p-2"><input type="checkbox" checked={v.isActive} onChange={(e) => updateVariant(i, "isActive", e.target.checked)} className="w-4 h-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <Button className="w-full" onClick={handleSave} loading={saving}><Save className="h-4 w-4 mr-2" />Save All Variants</Button>
      )}
    </div>
  );
}

function cartesianProduct(arrays) {
  return arrays.reduce((acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])), [[]]);
}