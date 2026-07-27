'use client';

import { useState, useEffect } from 'react';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  DollarSign, Package, ShoppingCart, BarChart3, RefreshCw,
  CheckCircle2, XCircle, Zap, Target, ArrowUp, ArrowDown,
  Plus, Store, Truck, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AiInsightsPage() {
  const [insights, setInsights] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [products, setProducts] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(false);

  useEffect(() => { fetchInsights(); fetchProducts(); }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/supplier/ai/insights');
      const data = await res.json();
      if (data.success) setInsights(data.data);
      else toast.error(data.message || 'Failed to load insights');
    } catch { toast.error('Failed to load insights'); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) setProducts(data.data?.products || []);
    } catch {}
  };

  const getPricingRecommendation = async () => {
    if (!selectedProduct) return;
    try {
      setPricingLoading(true);
      const product = products.find(p => p.id === selectedProduct);
      const res = await fetch('/api/supplier/ai/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          categoryId: product?.categoryId,
          currentPrice: product?.pricing?.[0]?.sellingPrice,
        }),
      });
      const data = await res.json();
      if (data.success) setPricingData(data.data);
      else toast.error(data.message || 'Failed to analyze');
    } catch { toast.error('Failed to get pricing recommendation'); }
    finally { setPricingLoading(false); }
  };

  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

  if (loading) {
    return (
      <div className="p-6"><div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}</div>
      </div></div>
    );
  }

  const hasActivity = insights && (insights.overview.totalOrders > 0 || insights.overview.activeProducts > 0);
  const hasAlerts = insights && insights.alerts.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-600" /> AI Insights
          </h1>
          <p className="text-gray-500 mt-1">Smart analytics and recommendations for your business</p>
        </div>
        <button onClick={fetchInsights} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {!hasActivity ? (
        /* Empty state - new supplier with no orders */
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <Brain className="h-20 w-20 mx-auto text-purple-200 mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to AI Insights!</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Your AI-powered business dashboard will show real-time analytics once you start getting orders. 
            Complete these steps to unlock insights:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <Link href="/dashboard/supplier/products/new" className="p-5 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition block">
              <Package className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">1. Add Products</h3>
              <p className="text-sm text-gray-500">Create product listings with pricing, images, and stock</p>
              <span className="text-xs text-blue-600 font-medium mt-2 inline-block">Add Product →</span>
            </Link>
            
            <Link href="/dashboard/warehouse" className="p-5 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition block">
              <Store className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">2. Set Up Warehouse</h3>
              <p className="text-sm text-gray-500">Configure your storage locations and manage inventory</p>
              <span className="text-xs text-green-600 font-medium mt-2 inline-block">Manage Warehouses →</span>
            </Link>
            
            <Link href="/dashboard/supplier/rfq" className="p-5 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition block">
              <FileText className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">3. Respond to RFQs</h3>
              <p className="text-sm text-gray-500">Find and respond to buyer quotation requests</p>
              <span className="text-xs text-purple-600 font-medium mt-2 inline-block">View RFQs →</span>
            </Link>
          </div>

          {/* Show current product count if exists */}
          {insights && insights.overview.activeProducts > 0 && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-700">
                You have <strong>{insights.overview.activeProducts} active product{insights.overview.activeProducts > 1 ? 's' : ''}</strong>. 
                Insights will appear as orders start coming in.
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Overview Cards - only show when there's data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <ShoppingCart className="h-5 w-5 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{insights.overview.ordersThisMonth || 0}</p>
              <p className="text-xs text-gray-500">Orders This Month</p>
              {(insights.overview.ordersLastMonth > 0 || insights.overview.ordersThisMonth > 0) && insights.overview.orderGrowth !== 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${insights.overview.orderGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {insights.overview.orderGrowth > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(insights.overview.orderGrowth)}% vs last month
                </p>
              )}
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <DollarSign className="h-5 w-5 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{formatINR(insights.overview.revenueThisMonth)}</p>
              <p className="text-xs text-gray-500">Revenue This Month</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <Package className="h-5 w-5 text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-700">{insights.overview.activeProducts}</p>
              <p className="text-xs text-gray-500">Active Products</p>
            </div>
            <div className={`rounded-xl p-4 border ${insights.overview.lowStockProducts > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <AlertTriangle className={`h-5 w-5 mb-2 ${insights.overview.lowStockProducts > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <p className={`text-2xl font-bold ${insights.overview.lowStockProducts > 0 ? 'text-orange-700' : 'text-gray-700'}`}>{insights.overview.lowStockProducts}</p>
              <p className="text-xs text-gray-500">Low Stock Alerts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Insights */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Business Insights</h3>
              </div>
              <div className="p-4 space-y-3">
                {insights.insights.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">More data needed for insights</p>
                ) : (
                  insights.insights.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {item.type === 'positive' ? <TrendingUp className="h-5 w-5 text-green-500" /> : 
                       item.type === 'negative' ? <TrendingDown className="h-5 w-5 text-red-500" /> :
                       item.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-orange-500" /> :
                       <Brain className="h-5 w-5 text-blue-500" />}
                      <p className="text-sm text-gray-700">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Alerts</h3>
                {hasAlerts && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{insights.alerts.length}</span>}
              </div>
              <div className="p-4 space-y-3">
                {!hasAlerts ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400" />
                    <p className="text-sm">All good - nothing needs attention</p>
                  </div>
                ) : (
                  insights.alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <p className="text-sm text-gray-700">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Inventory Alerts */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center gap-2">
                <Package className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Low Stock Products</h3>
              </div>
              <div className="p-4">
                {insights.inventoryAlerts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No low stock items</p>
                ) : (
                  <div className="space-y-2">
                    {insights.inventoryAlerts.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.product}</p>
                          <p className="text-xs text-gray-500">{item.warehouse}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{item.qty} left</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
              </div>
              <div className="p-4 space-y-2">
                {insights.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <Zap className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-gray-700">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* AI Pricing - always show if products exist */}
      {products.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">AI Price Recommendation</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Market Analysis</span>
          </div>
          <div className="p-4">
            <div className="flex gap-3 mb-4">
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
                className="flex-1 px-3 py-2.5 border rounded-lg text-sm bg-white">
                <option value="">Select a product for pricing analysis</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={getPricingRecommendation} disabled={!selectedProduct || pricingLoading}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap">
                {pricingLoading ? 'Analyzing...' : 'Analyze Price'}
              </button>
            </div>

            {pricingData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Recommended Price</p>
                  <p className="text-3xl font-bold text-green-700">{formatINR(pricingData.suggestedPrice)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pricingData.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {pricingData.confidence} confidence
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Market Average</p>
                  <p className="text-3xl font-bold text-blue-700">{formatINR(pricingData.marketData.avgSellingPrice)}</p>
                  <p className="text-xs text-gray-400">{pricingData.marketData.comparableProducts} comparable products</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Market Range</p>
                  <p className="text-lg font-bold text-gray-700">{formatINR(pricingData.marketData.minPrice)} - {formatINR(pricingData.marketData.maxPrice)}</p>
                </div>
                <div className="md:col-span-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">AI Recommendation</p>
                      <p className="text-sm text-purple-800 mt-1">{pricingData.recommendation}</p>
                      {pricingData.insights.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {pricingData.insights.map((insight, i) => (
                            <li key={i} className="text-xs text-purple-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {insight}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}