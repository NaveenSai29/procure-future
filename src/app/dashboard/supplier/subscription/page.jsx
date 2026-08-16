'use client';

import { useState, useEffect } from 'react';
import { Crown, Check, Zap, Users, Package, Warehouse, Building2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierSubscriptionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/supplier/subscription');
      const d = await res.json();
      setData(d);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleUpgrade = async (planId) => {
    if (!confirm('Confirm plan change? You will be charged immediately.')) return;
    setUpgrading(true);
    try {
      const res = await fetch('/api/supplier/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      if (res.ok) { toast.success('Plan updated!'); fetchData(); }
      else { toast.error('Failed to update plan'); }
    } catch { toast.error('Failed'); }
    finally { setUpgrading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">Failed to load</div>;

  const { currentSubscription, plans, usage } = data;
  const currentPlan = currentSubscription?.plan;
  const isTrialing = currentSubscription?.status === 'TRIAL' || 
    (currentSubscription?.trialEndDate && new Date(currentSubscription.trialEndDate) > new Date());

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan and billing</p>
      </div>

      {/* Current Plan Status */}
      {currentSubscription && (
        <div className={`rounded-xl p-6 mb-8 ${isTrialing ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isTrialing ? 'bg-blue-200' : 'bg-green-200'}`}>
                <Crown className={`h-6 w-6 ${isTrialing ? 'text-blue-700' : 'text-green-700'}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold">{currentPlan?.name} Plan</h2>
                <p className="text-sm">
                  {isTrialing ? (
                    <span className="text-blue-700">Trial ends {formatDate(currentSubscription.trialEndDate)}</span>
                  ) : (
                    <span className="text-green-700">
                      {formatCurrency(currentPlan?.price)}/{currentPlan?.billingCycle.toLowerCase()} • 
                      Renews {formatDate(currentSubscription.endDate)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              currentSubscription.status === 'ACTIVE' ? 'bg-green-200 text-green-800' :
              currentSubscription.status === 'TRIAL' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
            }`}>
              {currentSubscription.status}
            </span>
          </div>
        </div>
      )}

      {/* Usage Limits */}
      {currentPlan && (
        <div className="bg-white rounded-xl border p-5 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Your Usage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Products', used: usage.productCount, limit: currentPlan.maxProducts, icon: Package },
              { label: 'Staff', used: usage.staffCount, limit: currentPlan.maxStaff, icon: Users },
              { label: 'Pickup Locations', used: usage.warehouseCount, limit: currentPlan.maxWarehouses, icon: Warehouse },
              { label: 'Branches', used: usage.branchCount, limit: currentPlan.maxBranches, icon: Building2 },
            ].map(item => {
              const pct = item.limit > 0 ? (item.used / item.limit * 100) : 0;
              const isNearLimit = pct >= 80;
              const isOverLimit = pct >= 100;
              return (
                <div key={item.label} className="text-center">
                  <item.icon className={`h-5 w-5 mx-auto mb-2 ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <p className="text-lg font-bold">{item.used} / {item.limit === 0 ? '∞' : item.limit}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className={`h-1.5 rounded-full ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'}`}
                      style={{ width: Math.min(pct, 100) + '%' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <h3 className="font-semibold text-gray-900 mb-4">Available Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = currentPlan?.id === plan.id;
          const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
          
          return (
            <div key={plan.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition ${
              plan.isPopular ? 'ring-2 ring-yellow-400' : ''
            } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}>
              {plan.isPopular && <div className="bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1.5">MOST POPULAR</div>}
              {isCurrent && <div className="bg-green-500 text-white text-xs font-bold text-center py-1.5">CURRENT PLAN</div>}
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description || 'Plan description'}</p>
                
                <div className="mt-4 mb-6">
                  <p className="text-4xl font-bold text-gray-900">{formatCurrency(plan.price)}</p>
                  <p className="text-sm text-gray-500">per {plan.billingCycle.toLowerCase()}</p>
                  {plan.trialDays > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{plan.trialDays}-day free trial</p>
                  )}
                </div>

                <div className="space-y-2.5 mb-6">
                  <div className="flex items-center gap-2 text-sm"><Package className="h-4 w-4 text-gray-400" /> {plan.maxProducts === 0 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products</div>
                  <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-gray-400" /> {plan.maxStaff === 0 ? 'Unlimited' : plan.maxStaff} Staff Members</div>
                  <div className="flex items-center gap-2 text-sm"><Warehouse className="h-4 w-4 text-gray-400" /> {plan.maxWarehouses === 0 ? 'Unlimited' : plan.maxWarehouses} Pickup Locations</div>
                  <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-gray-400" /> {plan.maxBranches === 0 ? 'Unlimited' : plan.maxBranches} Branches</div>
                  <hr />
                  {features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> <span className="capitalize">{f.replace(/_/g, ' ')}</span></div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || upgrading}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm transition ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-500 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : upgrading ? 'Updating...' : plan.price === 0 ? 'Get Started Free' : 'Upgrade to ' + plan.name}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}