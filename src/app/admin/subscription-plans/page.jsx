'use client';

import { useState, useEffect } from 'react';
import {
  Crown, Plus, Edit, Trash2, X, Save, Check, Star,
  Users, Package, Warehouse, Building2, Zap, TrendingUp, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_FEATURES = [
  'products', 'orders', 'inventory', 'rfq', 'analytics',
  'coupons', 'offers', 'bulk_import', 'api_access', 'priority_support'
];

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [form, setForm] = useState({
    name: '', code: '', description: '', price: 0, billingCycle: 'MONTHLY', trialDays: 14,
    maxProducts: 100, maxStaff: 5, maxWarehouses: 2, maxBranches: 3,
    features: ['products', 'orders', 'inventory', 'rfq'], isActive: true, isPopular: false, sortOrder: 0
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch('/api/admin/subscription-plans'),
        fetch('/api/admin/subscriptions?limit=50')
      ]);
      const plansData = await plansRes.json();
      const subsData = await subsRes.json();
      setPlans(plansData.plans || []);
      setStats(plansData.stats);
      setSubscriptions(subsData.subscriptions || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const url = editingPlan ? '/api/admin/subscription-plans/' + editingPlan.id : '/api/admin/subscription-plans';
      const method = editingPlan ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success(editingPlan ? 'Plan updated' : 'Plan created');
        setShowModal(false); resetForm(); fetchData();
      } else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this plan?')) return;
    const res = await fetch('/api/admin/subscription-plans/' + id, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); fetchData(); }
    else { const d = await res.json(); toast.error(d.error); }
  };

  const toggleFeature = (feature) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const resetForm = () => {
    setEditingPlan(null);
    setForm({ name: '', code: '', description: '', price: 0, billingCycle: 'MONTHLY', trialDays: 14, maxProducts: 100, maxStaff: 5, maxWarehouses: 2, maxBranches: 3, features: ['products', 'orders', 'inventory', 'rfq'], isActive: true, isPopular: false, sortOrder: 0 });
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1><p className="text-gray-500">Manage pricing tiers and features</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Plan</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border p-3 text-center"><p className="text-xl font-bold">{stats.totalPlans}</p><p className="text-xs text-gray-500">Plans</p></div>
          <div className="bg-green-50 rounded-xl border p-3 text-center"><p className="text-xl font-bold text-green-600">{stats.activeSubscriptions}</p><p className="text-xs text-gray-500">Active Subs</p></div>
          <div className="bg-blue-50 rounded-xl border p-3 text-center"><p className="text-xl font-bold text-blue-600">{stats.trialSubscriptions}</p><p className="text-xs text-gray-500">Trials</p></div>
          <div className="bg-purple-50 rounded-xl border p-3 text-center"><p className="text-xl font-bold text-purple-600">{formatCurrency(stats.estimatedMRR)}</p><p className="text-xs text-gray-500">Est. MRR</p></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('plans')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'plans' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Plans</button>
        <button onClick={() => setActiveTab('subscriptions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'subscriptions' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Subscriptions ({subscriptions.length})</button>
      </div>

      {/* Plans Grid */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${plan.isPopular ? 'ring-2 ring-yellow-400' : ''}`}>
              {plan.isPopular && <div className="bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1">MOST POPULAR</div>}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingPlan(plan); setForm({ name: plan.name, code: plan.code, description: plan.description || '', price: plan.price, billingCycle: plan.billingCycle, trialDays: plan.trialDays || 14, maxProducts: plan.maxProducts, maxStaff: plan.maxStaff, maxWarehouses: plan.maxWarehouses, maxBranches: plan.maxBranches, features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || [], isActive: plan.isActive, isPopular: plan.isPopular, sortOrder: plan.sortOrder }); setShowModal(true); }} className="p-1 hover:bg-gray-100 rounded"><Edit className="h-4 w-4 text-gray-400" /></button>
                    <button onClick={() => handleDelete(plan.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(plan.price)}<span className="text-sm font-normal text-gray-500">/{plan.billingCycle.toLowerCase()}</span></p>
                {plan.trialDays > 0 && (
                  <p className="text-xs text-blue-600 mb-2 flex items-center gap-1"><Clock className="h-3 w-3" /> {plan.trialDays}-day free trial included</p>
                )}
                <p className="text-sm text-gray-500 mb-4">{plan.description || 'No description'}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm"><Package className="h-4 w-4 text-gray-400" /> {plan.maxProducts === 0 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products</div>
                  <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-gray-400" /> {plan.maxStaff === 0 ? 'Unlimited' : plan.maxStaff} Staff</div>
                  <div className="flex items-center gap-2 text-sm"><Warehouse className="h-4 w-4 text-gray-400" /> {plan.maxWarehouses === 0 ? 'Unlimited' : plan.maxWarehouses} Warehouses</div>
                  <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-gray-400" /> {plan.maxBranches === 0 ? 'Unlimited' : plan.maxBranches} Branches</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || []).slice(0, 4).map(f => (
                    <span key={f} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs capitalize">{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t text-xs text-gray-400">
                  {plan._count?.subscriptions || 0} active subscribers
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && <div className="col-span-full text-center py-12 text-gray-400"><Crown className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No plans created</p></div>}
        </div>
      )}

      {/* Subscriptions List */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Start</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Next Payment</th></tr></thead>
            <tbody className="divide-y">
              {subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{sub.supplier?.businessName}</td>
                  <td className="px-4 py-3 text-sm">{sub.plan?.name} - {formatCurrency(sub.plan?.price)}/{sub.plan?.billingCycle}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : sub.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{sub.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(sub.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{sub.nextPaymentDate ? new Date(sub.nextPaymentDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {subscriptions.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No subscriptions yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Name</label><input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">Code</label><input type="text" value={form.code} onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium">Price (Rs.)</label><input type="number" value={form.price} onChange={(e) => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">Billing Cycle</label><select value={form.billingCycle} onChange={(e) => setForm(prev => ({ ...prev, billingCycle: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1"><option>MONTHLY</option><option>QUARTERLY</option><option>YEARLY</option></select></div>
                <div>
                  <label className="text-sm font-medium">Trial (Days)</label>
                  <input type="number" value={form.trialDays || 14} onChange={(e) => setForm(prev => ({ ...prev, trialDays: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
                  <p className="text-xs text-gray-400 mt-0.5">0 = no trial</p>
                </div>
              </div>
              <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Max Products</label><input type="number" value={form.maxProducts} onChange={(e) => setForm(prev => ({ ...prev, maxProducts: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">Max Staff</label><input type="number" value={form.maxStaff} onChange={(e) => setForm(prev => ({ ...prev, maxStaff: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">Max Warehouses</label><input type="number" value={form.maxWarehouses} onChange={(e) => setForm(prev => ({ ...prev, maxWarehouses: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div><label className="text-sm font-medium">Max Branches</label><input type="number" value={form.maxBranches} onChange={(e) => setForm(prev => ({ ...prev, maxBranches: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Features</label>
                <div className="grid grid-cols-2 gap-1">
                  {DEFAULT_FEATURES.map(f => (
                    <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.features.includes(f)} onChange={() => toggleFeature(f)} className="rounded" />
                      <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} /> Active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPopular} onChange={(e) => setForm(prev => ({ ...prev, isPopular: e.target.checked }))} /> Popular (Highlighted)</label>
              </div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button><button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg"><Save className="h-4 w-4 inline mr-1" />{editingPlan ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}