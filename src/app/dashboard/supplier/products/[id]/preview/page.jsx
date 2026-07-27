"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Star, ShoppingCart, ChevronLeft, ChevronRight, Heart, Share2, Minus, Plus } from "lucide-react";

export default function ProductPreviewPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}/full`);
      const data = await res.json();
      if (data.success) {
        setProduct(data.data);
        if (data.data.variants?.length > 0) {
          const first = data.data.variants.find(v => v.isActive);
          if (first) {
            setSelectedVariant(first);
            setSelectedAttributes(first.attributes || {});
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAttributeClick = (groupName, value) => {
    const newAttrs = { ...selectedAttributes, [groupName]: value };
    setSelectedAttributes(newAttrs);
    const match = product.variants.find(v =>
      v.isActive && Object.entries(newAttrs).every(([k, val]) => v.attributes?.[k] === val)
    );
    if (match) {
      setSelectedVariant(match);
      setActiveImage(0);
    }
  };

  const getAttributeGroups = () => {
    if (!product?.variants?.length) return [];
    const groups = {};
    product.variants.forEach(v => {
      if (v.attributes) {
        Object.entries(v.attributes).forEach(([key, val]) => {
          if (!groups[key]) groups[key] = new Set();
          groups[key].add(val);
        });
      }
    });
    return Object.entries(groups).map(([name, values]) => ({ name, values: [...values] }));
  };

  const displayImages = selectedVariant?.images?.length > 0
    ? selectedVariant.images.sort((a, b) => a.sortOrder - b.sortOrder)
    : product?.images?.sort((a, b) => a.sortOrder - b.sortOrder) || [];

  const currentPrice = selectedVariant?.price || product?.pricing?.[0]?.sellingPrice || 0;
  const mrp = product?.pricing?.[0]?.mrp || 0;
  const discount = mrp > currentPrice ? Math.round(((mrp - currentPrice) / mrp) * 100) : 0;
  const stock = product?.variants?.length > 0 ? (selectedVariant?.stock || 0) : (product?.inventory?.[0]?.availableQty || 0);
  const attributeGroups = getAttributeGroups();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard/supplier/products" className="flex items-center gap-2 text-sm text-gray-600">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">Mobile Preview</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white min-h-[calc(100vh-56px)] shadow-sm border-x">
        <div className="px-4 py-3 flex items-center gap-3 border-b">
          <ArrowLeft className="h-5 w-5" />
          <div className="flex-1 text-sm text-gray-400 bg-gray-100 rounded-full px-3 py-1.5">Search products...</div>
          <Heart className="h-5 w-5 text-gray-400" />
          <Share2 className="h-5 w-5 text-gray-400" />
          <ShoppingCart className="h-5 w-5 text-gray-400" />
        </div>

        <div className="relative bg-gray-50 aspect-square">
          {displayImages.length > 0 ? (
            <>
              <img src={displayImages[activeImage]?.url} alt={product?.name} className="w-full h-full object-contain p-6" />
              {displayImages.length > 1 && (
                <>
                  <button onClick={() => setActiveImage(p => p === 0 ? displayImages.length - 1 : p - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setActiveImage(p => (p + 1) % displayImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {discount > 0 && (
                <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">{discount}% OFF</span>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="h-16 w-16 text-gray-200" /></div>
          )}
          {displayImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {displayImages.map((_, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`rounded-full transition-all ${i === activeImage ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-gray-300"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-wide">{product?.category?.name}</p>
            <h1 className="text-lg font-bold mt-0.5">{product?.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{product?.supplier?.businessName}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
            <span className="text-xs text-gray-400">0 reviews</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">₹{currentPrice.toLocaleString()}</span>
            {discount > 0 && (
              <>
                <span className="text-sm text-gray-400 line-through">₹{mrp.toLocaleString()}</span>
                <span className="text-xs font-semibold text-green-600">{discount}% off</span>
              </>
            )}
          </div>

          <div>
            {stock > 10 && <p className="text-xs text-green-600 font-medium">In stock</p>}
            {stock > 0 && stock <= 10 && <p className="text-xs text-orange-600 font-medium">Only {stock} left</p>}
            {stock === 0 && <p className="text-xs text-red-500 font-medium">Out of stock</p>}
          </div>

          {attributeGroups.map((group) => (
            <div key={group.name} className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{group.name}</p>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const testAttrs = { ...selectedAttributes, [group.name]: value };
                  const exists = product.variants.some(v => v.isActive && Object.entries(testAttrs).every(([k, val]) => v.attributes?.[k] === val));
                  const isSelected = selectedAttributes[group.name] === value;
                  return (
                    <button key={value} onClick={() => handleAttributeClick(group.name, value)} disabled={!exists}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        isSelected ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" :
                        exists ? "border-gray-200 hover:border-gray-300 active:scale-95" : "border-gray-100 text-gray-300 line-through cursor-not-allowed"
                      }`}>
                      {group.name.toLowerCase() === "color" && <span className="inline-block w-3.5 h-3.5 rounded-full mr-1.5 align-middle border" style={{ backgroundColor: value.toLowerCase() }} />}
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {product?.description && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-1">Description</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
            </div>
          )}

          {(product?.weight || product?.dimensions) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">Specifications</h3>
              <div className="space-y-2 text-sm">
                {product.weight && <div className="flex justify-between"><span className="text-gray-500">Weight</span><span>{product.weight} kg</span></div>}
                {product.warranty && <div className="flex justify-between"><span className="text-gray-500">Warranty</span><span>{product.warranty}</span></div>}
                {product.countryOfOrigin && <div className="flex justify-between"><span className="text-gray-500">Made in</span><span>{product.countryOfOrigin}</span></div>}
              </div>
            </div>
          )}
          <div className="h-4" />
        </div>

        <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex items-center gap-3">
          <div className="flex items-center border rounded-lg">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2"><Minus className="h-4 w-4" /></button>
            <span className="px-2 py-2 text-sm font-bold min-w-[24px] text-center">{quantity}</span>
            <button onClick={() => setQuantity(Math.min(stock, quantity + 1))} className="px-3 py-2"><Plus className="h-4 w-4" /></button>
          </div>
          <button disabled={stock === 0} className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-bold disabled:bg-gray-300">
            <ShoppingCart className="h-4 w-4 inline mr-1" />
            {stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}