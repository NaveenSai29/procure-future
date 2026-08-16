"use client";

import { useState } from "react";
import { Package, ShieldCheck, Clock, MapPin, Scale, Box, Barcode, Globe, ChevronRight } from "lucide-react";

const ORANGE = '#F97316';
const ORANGE_LIGHT = '#FFF7ED';
const GREEN = '#22C55E';
const RED = '#EF4444';
const YELLOW = '#F59E0B';

export default function ProductPreview({ product, mode = 'detail', supplierName = 'Demo Supplier', isVerified = true, shopStatus = { isOpen: true, reason: null, nextOpenTime: null, closesIn: null } }) {
  const [activeTab, setActiveTab] = useState('description');
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedPricingIndex, setSelectedPricingIndex] = useState(0);
  const [cartQuantity, setCartQuantity] = useState(0);

  if (!product?.name) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm text-center px-4">
        Start typing product name to see live preview...
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : [{ url: null }];
  const pricing = product.pricing?.filter(p => p.sellingPrice) || [];
  const selectedPricing = pricing[selectedPricingIndex] || pricing[0] || {};
  const price = Number(selectedPricing.sellingPrice) || Number(product.price) || 0;
  const mrp = Number(selectedPricing.mrp) || Number(product.mrp) || price;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stock = product.stockQty ? parseInt(product.stockQty) : null;
  const isOutOfStock = stock !== null && stock <= 0;
  const isOpen = shopStatus.isOpen;
  const isClosingSoon = isOpen && shopStatus.closesIn != null && shopStatus.closesIn <= 30 && shopStatus.closesIn > 0;
  const hasDescription = product.description && product.description.trim().length > 0;
  const hasSpecs = product.weight > 0 || product.unit || product.hsnCode || product.sku || product.barcode || product.countryOfOrigin || product.warranty;

  const formatNextOpenTime = (nextOpenTime) => {
    if (!nextOpenTime) return '';
    const d = new Date(nextOpenTime);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${days[d.getDay()]} at ${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatClosingTime = (minutes) => {
    if (!minutes && minutes !== 0) return '';
    if (minutes <= 0) return 'Closing now';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `Closes in ${hrs}h ${mins}m`;
    return `Closes in ${mins} mins`;
  };

  // ============ CARD MODE ============
  if (mode === 'card') {
    return (
      <div className="w-[170px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="h-[130px] bg-gray-100 flex items-center justify-center relative">
          {images[selectedImage]?.url ? <img src={images[selectedImage].url} alt="" className="w-full h-full object-cover" /> : <Package className="h-10 w-10 text-gray-300" />}
          {discount > 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">{discount}% OFF</span>}
          {!isOpen ? (
            <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <Clock className="h-4 w-4 text-yellow-700" />
            </div>
          ) : isOutOfStock ? (
            <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
              <span className="text-red-600 text-xs">✕</span>
            </div>
          ) : cartQuantity > 0 ? (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-1" style={{ backgroundColor: ORANGE }}>
              <button onClick={() => setCartQuantity(Math.max(0, cartQuantity - 1))} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm">−</button>
              <span className="text-white text-xs font-bold min-w-4 text-center">{cartQuantity}</span>
              <button onClick={() => setCartQuantity(cartQuantity + 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm">+</button>
            </div>
          ) : (
            <button onClick={() => setCartQuantity(1)} className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: ORANGE }}>
              <span className="text-white text-lg leading-none">+</span>
            </button>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-4">{product.name}</p>
          <p className="text-[10px] text-gray-400 mt-1">{supplierName}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-sm font-bold text-gray-900">₹{price.toLocaleString()}</span>
            {mrp > price && <span className="text-[10px] text-gray-400 line-through">₹{mrp.toLocaleString()}</span>}
          </div>
        </div>
      </div>
    );
  }

  // ============ DETAIL MODE (matches ProductDetailScreen) ============
  return (
    <div className="bg-white rounded-t-2xl border border-gray-200 overflow-hidden shadow-xl flex flex-col">
      {/* IMAGE GALLERY with dots */}
      <div className="h-[220px] bg-gray-100 flex items-center justify-center relative">
        {images[selectedImage]?.url ? (
          <img src={images[selectedImage].url} alt="" className="w-full h-full object-contain" />
        ) : (
          <Package className="h-16 w-16 text-gray-300" />
        )}
        {discount > 0 && (
          <span className="absolute top-3 left-3 rounded text-white text-xs font-bold px-2.5 py-1" style={{ backgroundColor: RED }}>
            {discount}% OFF
          </span>
        )}
        {/* Image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 flex justify-center gap-1.5 w-full">
            {images.map((_, i) => (
              <button key={i} onClick={() => setSelectedImage(i)} className="h-1.5 rounded-full transition-all" style={{ width: i === selectedImage ? 18 : 6, backgroundColor: i === selectedImage ? ORANGE : 'rgba(0,0,0,0.25)' }} />
            ))}
          </div>
        )}
      </div>

      {/* SHOP STATUS BANNERS */}
      {!isOpen && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
          <Clock className="h-3.5 w-3.5 text-yellow-700 shrink-0" />
          <span className="text-[11px] font-medium text-yellow-800">
            {shopStatus.reason === 'not_set' ? 'Shop hours not configured · Currently unavailable' :
             shopStatus.reason === 'offline' ? 'Shop is temporarily unavailable' :
             shopStatus.reason === 'day_off' ? `Shop is closed today · Opens ${formatNextOpenTime(shopStatus.nextOpenTime)}` :
             shopStatus.reason === 'not_open_yet' ? `Shop opens ${formatNextOpenTime(shopStatus.nextOpenTime)}` :
             `Shop is currently closed · Opens ${formatNextOpenTime(shopStatus.nextOpenTime)}`}
          </span>
        </div>
      )}
      {isClosingSoon && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
          <Clock className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          <span className="text-[11px] font-medium text-orange-700">{formatClosingTime(shopStatus.closesIn)} · Order soon!</span>
        </div>
      )}
      {isOutOfStock && isOpen && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
          <span className="text-[11px] font-medium text-red-700">Out of Stock</span>
        </div>
      )}

      {/* SCROLLABLE CONTENT */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)', minHeight: '200px' }}>
        <div className="p-4">
          {/* PRODUCT NAME */}
          <p className="text-base font-bold text-gray-900 leading-snug">{product.name}</p>

          {/* BRAND */}
          {product.brand && <p className="text-sm font-semibold mt-1" style={{ color: ORANGE }}>{product.brand}</p>}

          {/* SUPPLIER ROW */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600 flex-wrap cursor-pointer">
            <span>{supplierName}</span>
            {isVerified && <ShieldCheck className="h-3.5 w-3.5 text-green-500" />}
            <span className="text-[10px] text-green-600">Verified</span>
            <span className="w-0.5 h-0.5 rounded-full bg-gray-400 mx-0.5" />
            <MapPin className="h-3 w-3" style={{ color: ORANGE }} />
            <span className="text-[10px] font-medium" style={{ color: ORANGE }}>2.5 km away</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </div>

          {/* PRICE SECTION */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-2xl font-bold text-gray-900">₹{price.toLocaleString()}</span>
            {mrp > price && <span className="text-sm text-gray-400 line-through">₹{mrp.toLocaleString()}</span>}
            {discount > 0 && <span className="text-xs font-semibold text-green-600">{discount}% off</span>}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">Inclusive of all taxes</p>

          {/* PRICING TIERS — CLICKABLE */}
          {pricing.length > 1 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Pricing Tiers</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {pricing.map((p, i) => (
                  <button key={i} onClick={() => setSelectedPricingIndex(i)} className="text-center px-3 py-2 rounded-lg border min-w-[70px] transition-all" style={{ borderColor: i === selectedPricingIndex ? ORANGE : '#E5E7EB', backgroundColor: i === selectedPricingIndex ? ORANGE_LIGHT : '#F9FAFB' }}>
                    <p className="text-[9px] font-semibold uppercase" style={{ color: i === selectedPricingIndex ? ORANGE : '#6B7280' }}>{p.priceType}</p>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">₹{Number(p.sellingPrice).toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Min {p.minQty || 1} {product.unit || 'pcs'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DETAILS GRID — ALL FIELDS */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {product.weight > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-full bg-gray-100 text-gray-600">
                <Scale className="h-3 w-3" /> {product.weight} kg
              </span>
            )}
            {product.unit && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-full bg-gray-100 text-gray-600">
                <Box className="h-3 w-3" /> {product.unit}
              </span>
            )}
            {product.hsnCode && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-full bg-gray-100 text-gray-600">
                <Barcode className="h-3 w-3" /> HSN: {product.hsnCode}
              </span>
            )}
            {product.countryOfOrigin && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-full bg-gray-100 text-gray-600">
                <Globe className="h-3 w-3" /> {product.countryOfOrigin}
              </span>
            )}
            {product.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-full bg-gray-100 text-gray-600">
                📏 {product.length} cm
              </span>
            )}
            {product.width > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-full bg-gray-100 text-gray-600">
                ↔️ {product.width} cm
              </span>
            )}
            {product.height > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-full bg-gray-100 text-gray-600">
                ↕️ {product.height} cm
              </span>
            )}
          </div>

          {/* TABS */}
          <div className="flex mt-4 border-b border-gray-200">
            <button onClick={() => setActiveTab('description')} className="flex-1 text-center text-xs font-medium py-2.5 border-b-2 transition-colors" style={activeTab === 'description' ? { borderColor: ORANGE, color: ORANGE } : { borderColor: 'transparent', color: '#6B7280' }}>
              Description
            </button>
            <button onClick={() => setActiveTab('specifications')} className="flex-1 text-center text-xs font-medium py-2.5 border-b-2 transition-colors" style={activeTab === 'specifications' ? { borderColor: ORANGE, color: ORANGE } : { borderColor: 'transparent', color: '#6B7280' }}>
              Specifications
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="py-3">
            {activeTab === 'description' ? (
              <div>
                <p className="text-xs text-gray-600 leading-5">
                  {hasDescription ? product.description : 'No description available.'}
                </p>
                {product.highlights && product.highlights.trim() && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Key Highlights</p>
                    <p className="text-xs text-gray-600 leading-5 whitespace-pre-line">{product.highlights}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-600 space-y-1.5">
                {product.weight > 0 && <p>• Weight: {product.weight} kg</p>}
                {product.unit && <p>• Unit: {product.unit}</p>}
                {product.hsnCode && <p>• HSN Code: {product.hsnCode}</p>}
                {product.sku && <p>• SKU: {product.sku}</p>}
                {product.barcode && <p>• Barcode: {product.barcode}</p>}
                {product.warranty && <p>• Warranty: {product.warranty}</p>}
                {product.countryOfOrigin && <p>• Country of Origin: {product.countryOfOrigin}</p>}
                {product.length > 0 && <p>• Length: {product.length} cm</p>}
                {product.width > 0 && <p>• Width: {product.width} cm</p>}
                {product.height > 0 && <p>• Height: {product.height} cm</p>}
                {!hasSpecs && <p>No specifications available.</p>}
              </div>
            )}
          </div>

          {/* VARIANTS */}
          {product.variants?.length > 0 && (
            <div className="border-t border-gray-100 pt-3 mb-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Variants</p>
              <div className="flex gap-1.5 flex-wrap">
                {product.variants.filter(v => v.value).map((v, i) => (
                  <span key={i} className="text-[10px] px-2 py-1.5 rounded-lg bg-gray-100 text-gray-700">
                    {v.value}{v.sellingPrice ? ` - ₹${Number(v.sellingPrice).toLocaleString()}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-200 p-3 flex gap-2 items-center">
        {!isOpen ? (
          <div className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-center flex items-center justify-center gap-1.5" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
            <Clock className="h-4 w-4" /> Currently Unavailable
          </div>
        ) : isOutOfStock ? (
          <div className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-center flex items-center justify-center gap-1.5" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            ✕ Out of Stock
          </div>
        ) : cartQuantity > 0 ? (
          <>
            <div className="flex items-center gap-1 rounded-lg px-2" style={{ backgroundColor: ORANGE }}>
              <button onClick={() => setCartQuantity(Math.max(0, cartQuantity - 1))} className="w-8 h-8 rounded flex items-center justify-center text-white text-lg">−</button>
              <span className="text-white text-sm font-bold min-w-6 text-center">{cartQuantity}</span>
              <button onClick={() => setCartQuantity(cartQuantity + 1)} className="w-8 h-8 rounded flex items-center justify-center text-white text-lg">+</button>
            </div>
            <button className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white" style={{ background: `linear-gradient(90deg, ${ORANGE}, #E05F00)` }}>
              Go to Cart
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setCartQuantity(1)} className="rounded-lg py-2.5 text-sm font-semibold border-2 flex items-center justify-center gap-1 px-4" style={{ borderColor: ORANGE, color: ORANGE }}>
              🛒 Add
            </button>
            <button className="rounded-lg py-2.5 text-xs font-semibold flex flex-col items-center justify-center px-2" style={{ color: ORANGE }}>
              📄
              <span className="text-[9px]">RFQ</span>
            </button>
            <button onClick={() => setCartQuantity(1)} className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white" style={{ background: `linear-gradient(90deg, ${ORANGE}, #E05F00)` }}>
              Buy Now
            </button>
          </>
        )}
      </div>
    </div>
  );
}