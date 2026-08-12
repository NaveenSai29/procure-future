'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Building2, CreditCard, Bell,
  Zap, Save, RefreshCw,
  Globe, Mail, Phone,
  RotateCcw, Wallet, Banknote, Building, Percent,
  Truck, CloudRain, Clock, MapPin, Gauge, DollarSign, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('GENERAL');
  const [platformData, setPlatformData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [generalForm, setGeneralForm] = useState({
    platformName: 'PROCURE', supportEmail: '', supportPhone: '',
    language: 'English', currency: 'INR', timezone: 'Asia/Kolkata',
    addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
    website: '', metaTitle: '', metaDescription: '', metaKeywords: '',
  });

  const [commissionForm, setCommissionForm] = useState({
    defaultRate: 5, commissionOnDelivery: false,
  });

  const [deliveryCommissionForm, setDeliveryCommissionForm] = useState({
    defaultRate: 10,
  });

  const [deliveryForm, setDeliveryForm] = useState({
    vehicles: [], freeWeightUpTo: 5, weightChargePerKg: 3, maxWeight: 40000,
    freeDeliveryAbove: 4999, maxDistance: 200, platformFee: 5, gstPercent: 5,
    codCharge: 30, minDeliveryFee: 20,
    riderIconUrl: '',
    surgeEnabled: false, rainSurgeMultiplier: 1.5, autoWeatherEnabled: true, peakHours: [],
    deliveryRadiusMeters: 50,
    waitTimerMinutes: 5,
    photoProofRequired: true,
  });

  const [paymentForm, setPaymentForm] = useState({
    codEnabled: true, codMaxAmount: 50000,
    walletEnabled: true, walletMinBalance: 0,
    bankTransferEnabled: true, upiEnabled: true,
    razorpayEnabled: false,
    settlementCycle: 'WEEKLY', minSettlement: 1000, holdPeriod: 7,
    refundApprovalRequired: true, maxRefundDays: 30,
    partialRefundEnabled: true, autoRefundBelow: 0,
    refundToWallet: true, refundToBank: true, refundToOriginal: true,
    platformCommissionOnRefund: false, platformCommissionRate: 0,
  });

  const [notifForm, setNotifForm] = useState({
    emailEnabled: true, smsEnabled: false, pushEnabled: true, whatsappEnabled: false,
    orderConfirmation: true, shippingUpdate: true, deliveryOTP: true,
    rfqAlert: true, paymentReceipt: true, promotionalEmail: false,
    smsProvider: 'TWILIO', smsApiKey: '', senderId: 'PROCURE',
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '',
  });

  const [featureForm, setFeatureForm] = useState({
    ai: false, sms: false, payments: true, delivery: true, rfq: true,
    wallet: true, referrals: false, loyalty: false, bulkImport: true,
    sponsoredProducts: false, marketplace: true,
  });

  const [bankForm, setBankForm] = useState({
    bankName: '', accountHolder: '', accountNumber: '', ifscCode: '',
    branchName: '', upiId: '', qrCodeUrl: '', notes: '',
  });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setPlatformData(data);
      if (data.settings?.GENERAL) setGeneralForm(prev => ({ ...prev, ...data.settings.GENERAL }));
      if (data.settings?.COMMISSION) setCommissionForm(prev => ({ ...prev, ...data.settings.COMMISSION }));
      if (data.settings?.DELIVERY_COMMISSION) setDeliveryCommissionForm(prev => ({ ...prev, ...data.settings.DELIVERY_COMMISSION }));
      if (data.settings?.PAYMENT) setPaymentForm(prev => ({ ...prev, ...data.settings.PAYMENT }));
      if (data.settings?.NOTIFICATION) setNotifForm(prev => ({ ...prev, ...data.settings.NOTIFICATION }));
      if (data.settings?.FEATURES) setFeatureForm(prev => ({ ...prev, ...data.settings.FEATURES }));
      if (data.settings?.BANK_DETAILS) setBankForm(prev => ({ ...prev, ...data.settings.BANK_DETAILS }));
      if (data.settings?.DELIVERY) {
        const d = data.settings.DELIVERY;
        setDeliveryForm(prev => ({
          ...prev,
          vehicles: d.vehicles || prev.vehicles,
          freeWeightUpTo: d.freeWeightUpTo ?? prev.freeWeightUpTo,
          weightChargePerKg: d.weightChargePerKg ?? prev.weightChargePerKg,
          maxWeight: d.maxWeight ?? prev.maxWeight,
          freeDeliveryAbove: d.freeDeliveryAbove ?? prev.freeDeliveryAbove,
          maxDistance: d.maxDistance ?? prev.maxDistance,
          platformFee: d.platformFee ?? prev.platformFee,
          gstPercent: d.gstPercent ?? prev.gstPercent,
          codCharge: d.codCharge ?? prev.codCharge,
          minDeliveryFee: d.minDeliveryFee ?? prev.minDeliveryFee,
          riderIconUrl: d.riderIconUrl ?? prev.riderIconUrl,
          surgeEnabled: d.surgeEnabled ?? prev.surgeEnabled,
          rainSurgeMultiplier: d.rainSurgeMultiplier ?? prev.rainSurgeMultiplier,
          autoWeatherEnabled: d.autoWeatherEnabled ?? prev.autoWeatherEnabled,
          peakHours: d.peakHours || prev.peakHours,
          deliveryRadiusMeters: d.deliveryRadiusMeters ?? prev.deliveryRadiusMeters ?? 50,
          waitTimerMinutes: d.waitTimerMinutes ?? prev.waitTimerMinutes ?? 5,
          photoProofRequired: d.photoProofRequired ?? prev.photoProofRequired ?? true,
        }));
      }
      if (data.platform) {
        setGeneralForm(prev => ({ ...prev, platformName: data.platform.name, supportEmail: data.platform.supportEmail, supportPhone: data.platform.supportPhone, language: data.platform.language, currency: data.platform.currency, timezone: data.platform.timezone }));
      }
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleSave = async (category, formData) => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, settings: formData }) });
      if (res.ok) { toast.success(category + ' settings saved'); fetchSettings(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: 'GENERAL', label: 'General', icon: Building2 },
    { id: 'BANK_DETAILS', label: 'Bank Details', icon: Building },
    { id: 'COMMISSION', label: 'Supplier Commission', icon: Percent },
    { id: 'DELIVERY_COMMISSION', label: 'Delivery Commission', icon: Truck },
    { id: 'DELIVERY', label: 'Delivery', icon: MapPin },
    { id: 'PAYMENT', label: 'Payments', icon: CreditCard },
    { id: 'NOTIFICATION', label: 'Notifications', icon: Bell },
    { id: 'FEATURES', label: 'Features', icon: Zap },
  ];

    const handleRiderIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'BRANDING');
    formData.append('entityId', 'rider-icon');
    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setDeliveryForm(prev => ({ ...prev, riderIconUrl: data.url }));
        toast.success('Icon uploaded');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
  };

  if (loading) return <div className="p-6"><div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}</div></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1><p className="text-gray-500 mt-1">Configure and manage your PROCURE platform</p></div>
        <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {platformData?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200"><p className="text-xl font-bold text-blue-600">{platformData.stats.users}</p><p className="text-xs text-gray-500">Users</p></div>
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200"><p className="text-xl font-bold text-green-600">{platformData.stats.suppliers}</p><p className="text-xs text-gray-500">Suppliers</p></div>
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200"><p className="text-xl font-bold text-purple-600">{platformData.stats.products}</p><p className="text-xs text-gray-500">Products</p></div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200"><p className="text-xl font-bold text-orange-600">{platformData.stats.orders}</p><p className="text-xs text-gray-500">Orders</p></div>
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto border-b pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* GENERAL TAB */}
      {activeTab === 'GENERAL' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-100 rounded-lg"><Globe className="h-5 w-5 text-blue-600" /></div><div><h3 className="font-semibold text-gray-900">Platform Information</h3><p className="text-xs text-gray-500">Basic platform configuration</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="text-sm font-medium">Platform Name *</label><input type="text" value={generalForm.platformName} onChange={(e) => setGeneralForm(prev => ({ ...prev, platformName: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              <div><label className="text-sm font-medium">Support Email *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="email" value={generalForm.supportEmail} onChange={(e) => setGeneralForm(prev => ({ ...prev, supportEmail: e.target.value }))} className="w-full pl-10 pr-3 py-2.5 border rounded-lg mt-1.5" /></div></div>
              <div><label className="text-sm font-medium">Support Phone</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" value={generalForm.supportPhone} onChange={(e) => setGeneralForm(prev => ({ ...prev, supportPhone: e.target.value }))} className="w-full pl-10 pr-3 py-2.5 border rounded-lg mt-1.5" /></div></div>
              <div><label className="text-sm font-medium">Website URL</label><input type="text" value={generalForm.website || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, website: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" placeholder="https://procure.com" /></div>
              <div><label className="text-sm font-medium">Default Language</label><select value={generalForm.language} onChange={(e) => setGeneralForm(prev=> ({ ...prev, language: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option>English</option><option>Hindi</option><option>Tamil</option><option>Telugu</option><option>Bengali</option></select></div>
              <div><label className="text-sm font-medium">Default Currency</label><select value={generalForm.currency} onChange={(e) => setGeneralForm(prev=> ({ ...prev, currency: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></div>
              <div><label className="text-sm font-medium">Timezone</label><select value={generalForm.timezone} onChange={(e) => setGeneralForm(prev => ({ ...prev, timezone: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option>Asia/Kolkata</option><option>Asia/Dubai</option><option>UTC</option><option>America/New_York</option></select></div>
            </div>
            <div className="mt-6 pt-4 border-t"><h4 className="font-medium text-sm text-gray-700 mb-3">Business Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2"><input type="text" value={generalForm.addressLine1 || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, addressLine1: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Address Line 1" /></div>
                <div className="col-span-2"><input type="text" value={generalForm.addressLine2 || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, addressLine2: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Address Line 2" /></div>
                <input type="text" value={generalForm.city || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, city: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="City" />
                <input type="text" value={generalForm.state || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, state: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="State" />
                <input type="text" value={generalForm.pincode || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, pincode: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="Pincode" />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t"><h4 className="font-medium text-sm text-gray-700 mb-3">SEO Settings</h4>
              <div className="space-y-3"><input type="text" value={generalForm.metaTitle || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, metaTitle: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Meta Title" /><textarea value={generalForm.metaDescription || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, metaDescription: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="MetaDescription" /><input type="text" value={generalForm.metaKeywords || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, metaKeywords: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Meta Keywords" /></div>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('GENERAL', generalForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ?'Saving...' : 'Save General Settings'}</button></div>
          </div>
        </div>
      )}

      {/* BANK DETAILS TAB */}
      {activeTab === 'BANK_DETAILS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-indigo-100 rounded-lg"><Building className="h-5 w-5 text-indigo-600" /></div><div><h3 className="font-semibold text-gray-900">PROCURE Bank Details</h3><p className="text-xs text-gray-500">Bank account where delivery partners deposit COD collections</p></div></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"><p className="text-sm text-blue-800 font-medium">ℹ️ Visible to Delivery Partners</p><p className="text-xs text-blue-700 mt-1">These bank details are shown to delivery partners in their wallet deposit screen so they know where to transfer COD money.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="text-sm font-medium text-gray-700">Bank Name *</label><input type="text" value={bankForm.bankName || ''} onChange={(e) => setBankForm(prev => ({ ...prev, bankName: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" placeholder="e.g. HDFC Bank" /></div>
              <div><label className="text-sm font-medium text-gray-700">Account Holder Name *</label><input type="text" value={bankForm.accountHolder || ''} onChange={(e) => setBankForm(prev => ({ ...prev, accountHolder: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" placeholder="e.g. PROCURE TECHNOLOGIES PVT LTD" /></div>
              <div><label className="text-sm font-medium text-gray-700">Account Number *</label><input type="text" value={bankForm.accountNumber || ''} onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5 font-mono" placeholder="e.g. 12345678901" /></div>
              <div><label className="text-sm font-medium text-gray-700">IFSC Code *</label><input type="text" value={bankForm.ifscCode || ''} onChange={(e) => setBankForm(prev => ({ ...prev, ifscCode: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5 font-mono uppercase" placeholder="e.g. HDFC0001234" /></div>
              <div><label className="text-sm font-medium text-gray-700">Branch Name</label><input type="text" value={bankForm.branchName || ''} onChange={(e) => setBankForm(prev => ({ ...prev, branchName: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" placeholder="e.g. Andheri West, Mumbai" /></div>
              <div><label className="text-sm font-medium text-gray-700">UPI ID (Optional)</label><input type="text" value={bankForm.upiId || ''} onChange={(e) => setBankForm(prev => ({ ...prev, upiId: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" placeholder="e.g. procure@hdfcbank" /></div>
              <div className="col-span-2"><label className="text-sm font-medium text-gray-700">Additional Notes (Optional)</label><textarea value={bankForm.notes || ''} onChange={(e) => setBankForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" rows={2} placeholder="e.g. Use UPI ID or Account Number + IFSC for NEFT/IMPS transfer" /></div>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('BANK_DETAILS', bankForm)} disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Bank Details'}</button></div>
          </div>
        </div>
      )}

      {/* SUPPLIER COMMISSION TAB */}
      {activeTab === 'COMMISSION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-green-100 rounded-lg"><Percent className="h-5 w-5 text-green-600" /></div><div><h3 className="font-semibold text-gray-900">Supplier Commission</h3><p className="text-xs text-gray-500">Deducted from supplier wallet on completed orders</p></div></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"><p className="text-sm text-blue-800 font-medium">How it works</p><p className="text-xs text-blue-700 mt-1">Commission auto-deducted from supplier wallet. Supplier sees net amount after deduction.</p></div>
            <div className="max-w-md"><label className="text-sm font-medium text-gray-700">Commission Rate (%)</label><div className="relative mt-1.5"><input type="number" step="0.1" value={commissionForm.defaultRate || 5} onChange={(e) => setCommissionForm(prev => ({ ...prev, defaultRate: parseFloat(e.target.value) }))} className="w-full px-4 py-3 border rounded-lg text-lg font-bold" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">%</span></div><p className="text-xs text-gray-400 mt-2">Example: On a ₹1,000 order at 5%, supplier earns ₹950</p></div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('COMMISSION', commissionForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Supplier Commission'}</button></div>
          </div>
        </div>
      )}

      {/* DELIVERY COMMISSION TAB */}
      {activeTab === 'DELIVERY_COMMISSION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-orange-100 rounded-lg"><Truck className="h-5 w-5 text-orange-600" /></div><div><h3 className="font-semibold text-gray-900">Delivery Partner Commission</h3><p className="text-xs text-gray-500">Deducted from delivery partner earnings on completed deliveries</p></div></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"><p className="text-sm text-blue-800 font-medium">How it works</p><p className="text-xs text-blue-700 mt-1">Commission auto-deducted from delivery partner's delivery fee. Partner sees only net earnings after deduction.</p></div>
            <div className="max-w-md"><label className="text-sm font-medium text-gray-700">Commission Rate (%)</label><div className="relative mt-1.5"><input type="number" step="0.1" value={deliveryCommissionForm.defaultRate || 10} onChange={(e) => setDeliveryCommissionForm(prev => ({ ...prev, defaultRate: parseFloat(e.target.value) }))} className="w-full px-4 py-3 border rounded-lg text-lg font-bold" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">%</span></div><p className="text-xs text-gray-400 mt-2">Example: If delivery fee is ₹40 and rate is 10%, partner earns ₹36</p></div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('DELIVERY_COMMISSION', deliveryCommissionForm)} disabled={saving} className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Delivery Commission'}</button></div>
          </div>
        </div>
      )}

      {/* DELIVERY TAB */}
      {activeTab === 'DELIVERY' && (
        <div className="space-y-6">

          {deliveryForm.vehicles.length === 0 ? (
            <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
              <Truck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Vehicles Configured</h3>
              <p className="text-gray-500 mb-4">Run the seed script to add vehicle types</p>
              <code className="bg-gray-900 text-green-400 px-4 py-2 rounded-lg text-sm">node scripts/seed-delivery.js</code>
            </div>
          ) : (
            deliveryForm.vehicles.map((vehicle, vIdx) => (
              <div key={vIdx} className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg"><Truck className="h-5 w-5 text-orange-600" /></div>
                    <div className="flex items-center gap-3">
                      <input type="text" value={vehicle.type} onChange={e => { const u = [...deliveryForm.vehicles]; u[vIdx].type = e.target.value; setDeliveryForm(prev => ({ ...prev, vehicles: u })); }} className="font-semibold text-gray-900 text-lg bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-40" />
                      <span className="text-xs text-gray-400">Max: {vehicle.maxWeight} kg</span>
                    </div>
                  </div>
                  <button onClick={() => setDeliveryForm(prev => ({ ...prev, vehicles: prev.vehicles.filter((_, i) => i !== vIdx) }))} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Max Weight (kg)</label>
                  <input type="number" value={vehicle.maxWeight} onChange={e => { const u = [...deliveryForm.vehicles]; u[vIdx].maxWeight = parseInt(e.target.value) || 0; setDeliveryForm(prev => ({ ...prev, vehicles: u })); }} className="w-28 px-3 py-2 border rounded-lg font-medium" />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div><span className="text-sm font-medium text-gray-700">Per-Km Rate Slabs</span><p className="text-xs text-gray-400 mt-0.5">0-{(vehicle.distanceSlabs?.[0]?.upToKm || 5)}km = Rs {vehicle.distanceSlabs?.[0]?.perKmRate || 0}/km, {(vehicle.distanceSlabs?.[0]?.upToKm || 5)}-{(vehicle.distanceSlabs?.[1]?.upToKm || 10)}km = Rs {vehicle.distanceSlabs?.[1]?.perKmRate || 0}/km...</p></div>
                    <button onClick={() => { const u = [...deliveryForm.vehicles]; if (!u[vIdx].distanceSlabs) u[vIdx].distanceSlabs = []; const last = u[vIdx].distanceSlabs[u[vIdx].distanceSlabs.length - 1]; u[vIdx].distanceSlabs.push({ upToKm: (last?.upToKm || 50) + 50, perKmRate: (last?.perKmRate || 50) + 20 }); setDeliveryForm(prev => ({ ...prev, vehicles: u })); }} className="text-blue-600 text-xs font-medium hover:text-blue-800">+ Add Slab</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(vehicle.distanceSlabs || []).map((slab, sIdx) => (
                      <div key={sIdx} className="bg-white border rounded-lg p-3 relative">
                        <button onClick={() => { if ((vehicle.distanceSlabs || []).length <= 1) return; const u = [...deliveryForm.vehicles]; u[vIdx].distanceSlabs = u[vIdx].distanceSlabs.filter((_, i) => i !== sIdx); setDeliveryForm(prev => ({ ...prev, vehicles: u })); }} className="absolute top-1 right-2 text-gray-300 hover:text-red-500 text-xs">×</button>
                        <label className="text-xs text-gray-400">Up to (km)</label>
                        <input type="number" value={slab.upToKm} onChange={e => { const u = [...deliveryForm.vehicles]; u[vIdx].distanceSlabs[sIdx].upToKm = parseInt(e.target.value) || 0; setDeliveryForm(prev => ({ ...prev, vehicles: u })); }} className="w-full px-2 py-1.5 border rounded text-center font-bold text-sm mt-0.5" />
                        <label className="text-xs text-gray-400 mt-2 block">Per Km (Rs)</label>
                        <input type="number" value={slab.perKmRate || 0} onChange={e => { const u = [...deliveryForm.vehicles]; u[vIdx].distanceSlabs[sIdx].perKmRate = parseInt(e.target.value) || 0; setDeliveryForm(prev => ({ ...prev, vehicles: u })); }} className="w-full px-2 py-1.5 border rounded text-centerfont-bold text-green-600 text-sm mt-0.5" />
                        <p className="text-xs text-gray-400 text-center mt-1">Ex: 3km = Rs {((slab.perKmRate || 0) * 3).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}

          <button onClick={() => { setDeliveryForm(prev => ({ ...prev, vehicles: [...prev.vehicles, { type: 'New Vehicle', maxWeight: 100, distanceSlabs: [{ upToKm: 5, perKmRate: 25 }, { upToKm: 10, perKmRate: 35 }, { upToKm: 20, perKmRate: 50 }, { upToKm: 999, perKmRate: 70 }] }] })); }} className="w-full py-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 font-medium text-sm">+ Add Vehicle Type</button>

          {/* VERIFICATION SETTINGS */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-100 rounded-lg"><ShieldCheck className="h-5 w-5 text-cyan-600" /></div>
              <div>
                <h3 className="font-semibold text-gray-900">Delivery Verification</h3>
                <p className="text-xs text-gray-500">GPS proximity, wait timer, and photo proof settings</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium">Delivery Radius (meters)</label>
                <input type="number" value={deliveryForm.deliveryRadiusMeters} onChange={e => setDeliveryForm(prev => ({ ...prev, deliveryRadiusMeters: parseInt(e.target.value) || 50 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5 font-bold" min="10" max="500" />
                <p className="text-xs text-gray-400 mt-1">Partner must be within this distance to swipe deliver</p>
              </div>
              <div>
                <label className="text-sm font-medium">Wait Timer (minutes)</label>
                <input type="number" value={deliveryForm.waitTimerMinutes} onChange={e => setDeliveryForm(prev => ({ ...prev, waitTimerMinutes: parseInt(e.target.value) || 5 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5 font-bold" min="1" max="30" />
                <p className="text-xs text-gray-400 mt-1">Customer wait time before partner can proceed</p>
              </div>
              <div className="flex items-end">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700 font-medium">Photo Proof Required</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={deliveryForm.photoProofRequired} onChange={e => setDeliveryForm(prev => ({ ...prev, photoProofRequired: e.target.checked }))} />
                      <span className="text-xs font-medium">{deliveryForm.photoProofRequired ? 'ON' : 'OFF'}</span>
                    </label>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Partner must capture location photo before delivery</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-blue-100 rounded-lg"><MapPin className="h-5 w-5 text-blue-600" /></div><h3 className="font-semibold text-gray-900">Distance Limits</h3></div>
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Max Distance (km)</label><input type="number" value={deliveryForm.maxDistance} onChange={e => setDeliveryForm(prev => ({ ...prev, maxDistance: parseInt(e.target.value) || 200 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                <div><label className="text-sm font-medium">Free Delivery Above (Rs)</label><input type="number" value={deliveryForm.freeDeliveryAbove} onChange={e => setDeliveryForm(prev => ({ ...prev, freeDeliveryAbove: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                <div><label className="text-sm font-medium">Min Delivery Fee (Rs)</label><input type="number" value={deliveryForm.minDeliveryFee} onChange={e => setDeliveryForm(prev => ({ ...prev, minDeliveryFee: parseInt(e.target.value) || 20 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-purple-100 rounded-lg"><Gauge className="h-5 w-5 text-purple-600" /></div><h3 className="font-semibold text-gray-900">Weight Handling</h3></div>
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Free Weight (kg)</label><input type="number" value={deliveryForm.freeWeightUpTo} onChange={e =>setDeliveryForm(prev => ({ ...prev, freeWeightUpTo: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                <div><label className="text-sm font-medium">Per Extra Kg (Rs)</label><input type="number" value={deliveryForm.weightChargePerKg} onChange={e => setDeliveryForm(prev => ({ ...prev, weightChargePerKg: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                <div><label className="text-sm font-medium mb-1 block">Max Weight (kg)</label><input type="number" value={deliveryForm.maxWeight} onChange={e => setDeliveryForm(prev => ({ ...prev, maxWeight: parseInt(e.target.value) || 40000 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div><h3 className="font-semibold text-gray-900">Fees & GST</h3></div>
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Platform Fee (Rs)</label><input type="number" value={deliveryForm.platformFee} onChange={e => setDeliveryForm(prev => ({ ...prev, platformFee: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                <div><label className="text-sm font-medium">GST on Delivery (%)</label><input type="number" value={deliveryForm.gstPercent} onChange={e => setDeliveryForm(prev => ({ ...prev, gstPercent: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /><p className="text-xs text-gray-400 mt-1">GST is charged on delivery + platform fee only</p></div>
                <div><label className="text-sm font-medium">COD Charge (Rs)</label><input type="number" value={deliveryForm.codCharge} onChange={e => setDeliveryForm(prev => ({ ...prev, codCharge: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><CloudRain className="h-5 w-5 text-red-600" /></div><div><h3 className="font-semibold text-gray-900">Surge Pricing & Weather</h3><p className="text-xs text-gray-500">Auto-adjust price during peak hours and rain</p></div></div>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg"><input type="checkbox" checked={deliveryForm.surgeEnabled} onChange={e => setDeliveryForm(prev => ({ ...prev, surgeEnabled: e.target.checked }))} className="w-4 h-4" /><span className="text-sm font-medium">{deliveryForm.surgeEnabled ? 'ON' : 'OFF'}</span></label>
            </div>
            {deliveryForm.surgeEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div><label className="text-sm font-medium">Rain Surge Multiplier</label><input type="number" step="0.1" value={deliveryForm.rainSurgeMultiplier} onChange={e => setDeliveryForm(prev => ({ ...prev, rainSurgeMultiplier: parseFloat(e.target.value) || 1 }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                  <div className="flex items-end"><div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full"><div className="flex items-center justify-between"><span className="text-xs text-blue-700 font-medium">Auto Weather Detection</span><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={deliveryForm.autoWeatherEnabled} onChange={e => setDeliveryForm(prev => ({ ...prev, autoWeatherEnabled: e.target.checked }))} /><span className="text-xs font-medium">{deliveryForm.autoWeatherEnabled ? 'ON' : 'OFF'}</span></label></div><p className="text-xs text-blue-500 mt-1">Set OPENWEATHER_API_KEY in .env</p></div></div>
                </div>
                <h4 className="font-medium text-sm text-gray-700 mb-3">Peak Hours</h4>
                <div className="space-y-2 mb-3">
                  {deliveryForm.peakHours.map((ph, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                      <input type="text" value={ph.label} onChange={e => { const u = [...deliveryForm.peakHours]; u[idx].label = e.target.value; setDeliveryForm(prev => ({ ...prev, peakHours: u })); }} className="w-32 px-2 py-1.5 border rounded text-sm font-medium" />
                      <input type="time" value={ph.start} onChange={e => { const u = [...deliveryForm.peakHours]; u[idx].start = e.target.value; setDeliveryForm(prev => ({ ...prev, peakHours: u })); }} className="px-2 py-1.5 border rounded" />
                      <span className="text-gray-400">to</span>
                      <input type="time" value={ph.end} onChange={e => { const u = [...deliveryForm.peakHours]; u[idx].end = e.target.value; setDeliveryForm(prev => ({ ...prev, peakHours: u })); }} className="px-2 py-1.5 border rounded" />
                      <span className="text-gray-400">×</span>
                      <input type="number" step="0.1" value={ph.multiplier} onChange={e => { const u = [...deliveryForm.peakHours]; u[idx].multiplier = parseFloat(e.target.value) || 1; setDeliveryForm(prev => ({ ...prev, peakHours: u })); }} className="w-16 px-2 py-1.5 border rounded font-bold text-orange-600"/>
                      <button onClick={() => setDeliveryForm(prev => ({ ...prev, peakHours: prev.peakHours.filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-600 ml-auto">×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setDeliveryForm(prev => ({ ...prev, peakHours: [...prev.peakHours, { start: '12:00', end: '14:00', multiplier: 1.2, label: 'Lunch Rush' }] }))} className="text-blue-600 text-sm font-medium hover:text-blue-800">+ Add Peak Hour</button>
              </>
            )}
          </div>

          {/* Rider Icon Upload */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-purple-100 rounded-lg"><Truck className="h-5 w-5 text-purple-600" /></div><div><h3 className="font-semibold text-gray-900">Branding</h3><p className="text-xs text-gray-500">Custom rider marker on tracking map</p></div></div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                {deliveryForm.riderIconUrl ? <img src={deliveryForm.riderIconUrl} alt="Rider" className="w-full h-full object-cover" /> : <Truck className="h-7 w-7 text-orange-500" />}
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Rider Map Icon URL</label>
                  <div className="flex gap-2">
                  <input type="text" value={deliveryForm.riderIconUrl || ''} onChange={e => setDeliveryForm(prev => ({ ...prev, riderIconUrl: e.target.value }))} className="flex-1 px-3 py-2.5 border rounded-lg" placeholder="Or paste image URL..." />
                  <label className="px-4 py-2.5 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload
                    <input type="file" accept="image/*" onChange={handleRiderIconUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">Upload a PNG image (60x60px recommended) or paste a URL.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={fetchSettings} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">Reset</button>
            <button onClick={() => handleSave('DELIVERY', {
              vehicles: deliveryForm.vehicles, freeWeightUpTo: deliveryForm.freeWeightUpTo, weightChargePerKg: deliveryForm.weightChargePerKg,
              maxWeight: deliveryForm.maxWeight, freeDeliveryAbove: deliveryForm.freeDeliveryAbove, maxDistance: deliveryForm.maxDistance,
              platformFee: deliveryForm.platformFee, gstPercent: deliveryForm.gstPercent, codCharge: deliveryForm.codCharge,
              minDeliveryFee: deliveryForm.minDeliveryFee,
              surgeEnabled: deliveryForm.surgeEnabled, rainSurgeMultiplier: deliveryForm.rainSurgeMultiplier,
              autoWeatherEnabled: deliveryForm.autoWeatherEnabled, peakHours: deliveryForm.peakHours,
              riderIconUrl: deliveryForm.riderIconUrl,
              deliveryRadiusMeters: parseInt(deliveryForm.deliveryRadiusMeters) || 50,
              waitTimerMinutes: parseInt(deliveryForm.waitTimerMinutes) || 5,
              photoProofRequired: deliveryForm.photoProofRequired,
            })} disabled={saving} className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-lg"><Save className="h-5 w-5" />{saving ? 'Saving...' : 'Save Delivery Settings'}</button>
          </div>
        </div>
      )}

      {/* PAYMENT TAB */}
      {activeTab === 'PAYMENT' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-purple-100 rounded-lg"><CreditCard className="h-5 w-5 text-purple-600" /></div><div><h3 className="font-semibold text-gray-900">Payment Methods</h3><p className="text-xs text-gray-500">Toggle payment methods available to buyers</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'razorpayEnabled', label: 'Online Payment (Razorpay)', desc: 'UPI, Cards, Net Banking' },
                { key: 'codEnabled', label: 'Cash on Delivery', desc: 'Pay when you receive' },
                { key: 'walletEnabled', label: 'PROCURE Wallet', desc: 'Use wallet balance' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={paymentForm[item.key]} onChange={(e) => setPaymentForm(prev => ({ ...prev, [item.key]: e.target.checked }))} className="w-5 h-5" />
                  <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><label className="text-sm font-medium">COD Max Amount (Rs.)</label><input type="number" value={paymentForm.codMaxAmount} onChange={(e) => setPaymentForm(prev => ({ ...prev, codMaxAmount: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              <div><label className="text-sm font-medium">Wallet Min Balance (Rs.)</label><input type="number" value={paymentForm.walletMinBalance} onChange={(e) => setPaymentForm(prev => ({ ...prev, walletMinBalance: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Settlement Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-sm font-medium">Settlement Cycle</label><select value={paymentForm.settlementCycle} onChange={(e) => setPaymentForm(prev => ({ ...prev, settlementCycle: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option>DAILY</option><option>WEEKLY</option><option>BIWEEKLY</option><option>MONTHLY</option></select></div>
                <div><label className="text-sm font-medium">Min Settlement (Rs.)</label><input type="number" value={paymentForm.minSettlement} onChange={(e) => setPaymentForm(prev => ({ ...prev, minSettlement: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                <div><label className="text-sm font-medium">Hold Period (Days)</label><input type="number" value={paymentForm.holdPeriod} onChange={(e) => setPaymentForm(prev => ({ ...prev, holdPeriod: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Refund Settings</h4>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div><label className="text-sm font-medium">Max Refund Days</label><input type="number" value={paymentForm.maxRefundDays} onChange={(e) => setPaymentForm(prev => ({ ...prev, maxRefundDays: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
                <div><label className="text-sm font-medium">Auto Refund Below (Rs.)</label><input type="number" value={paymentForm.autoRefundBelow} onChange={(e) => setPaymentForm(prev => ({ ...prev, autoRefundBelow: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={paymentForm.refundApprovalRequired} onChange={(e) => setPaymentForm(prev => ({ ...prev, refundApprovalRequired: e.target.checked }))} /><span className="text-sm">Refund Requires Approval</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={paymentForm.partialRefundEnabled} onChange={(e) => setPaymentForm(prev => ({ ...prev, partialRefundEnabled: e.target.checked }))} /><span className="text-sm">Partial Refunds</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={paymentForm.refundToWallet} onChange={(e) => setPaymentForm(prev=> ({ ...prev, refundToWallet: e.target.checked }))} /><span className="text-sm">Refund to Wallet</span></label>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('PAYMENT', paymentForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ?'Saving...' : 'Save Payment Settings'}</button></div>
          </div>
        </div>
      )}

      {/* NOTIFICATION TAB */}
      {activeTab === 'NOTIFICATION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-orange-100 rounded-lg"><Bell className="h-5 w-5 text-orange-600" /></div><div><h3 className="font-semibold text-gray-900">Notification Configuration</h3><p className="text-xs text-gray-500">These settings control which notifications are sent system-wide</p></div></div>
            <h4 className="font-medium text-sm mb-3">Channels</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[{ key: 'emailEnabled', label: 'Email', desc: 'SMTP' }, { key: 'smsEnabled', label: 'SMS', desc: 'Twilio' }, { key: 'pushEnabled', label: 'Push', desc: 'Firebase' }, { key: 'whatsappEnabled', label: 'WhatsApp', desc: 'Business API' }].map(item => (
                <label key={item.key} className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer text-center">
                  <input type="checkbox" checked={notifForm[item.key]} onChange={(e) => setNotifForm(prev => ({ ...prev, [item.key]: e.target.checked }))} />
                  <p className="font-medium text-sm">{item.label}</p><p className="text-xs text-gray-400">{item.desc}</p>
                </label>
              ))}
            </div>
            {notifForm.emailEnabled && <div className="mb-6 p-4 bg-gray-50 rounded-lg"><h4 className="font-medium text-sm mb-3">SMTP Config</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><input type="text" value={notifForm.smtpHost || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpHost: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="Host" /><input type="number" value={notifForm.smtpPort || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))} className="px-3 py-2 border rounded-lg" placeholder="Port" /><input type="text" value={notifForm.smtpUser || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpUser: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="User" /><input type="password" value={notifForm.smtpPass || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpPass: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="Password" /></div></div>}
            <h4 className="font-medium text-sm mb-3">Event Triggers</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[{ key: 'orderConfirmation', label: 'Order Confirmation' }, { key: 'shippingUpdate', label: 'Shipping Updates' }, { key: 'deliveryOTP', label: 'Delivery OTP' }, { key: 'rfqAlert', label: 'RFQ Alerts' }, { key: 'paymentReceipt', label: 'Payment Receipts' }, { key: 'promotionalEmail', label: 'Promotional' }].map(item => (
                <label key={item.key} className="flex items-center gap-2"><input type="checkbox" checked={notifForm[item.key]} onChange={(e) => setNotifForm(prev => ({ ...prev, [item.key]: e.target.checked }))} />{item.label}</label>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('NOTIFICATION', notifForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Notification Settings'}</button></div>
          </div>
        </div>
      )}

      {/* FEATURES TAB */}
      {activeTab === 'FEATURES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-yellow-100 rounded-lg"><Zap className="h-5 w-5 text-yellow-600" /></div><div><h3 className="font-semibold text-gray-900">Feature Flags</h3><p className="text-xs text-gray-500">Enable or disable platform features. Disabled featuresare hidden from users.</p></div></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'marketplace', label: 'Marketplace', desc: 'Product listings & orders' },
                { key: 'rfq', label: 'RFQ / Quotations', desc: 'Request for quotes' },
                { key: 'wallet', label: 'Wallet', desc: 'Buyer wallet & balance' },
                { key: 'delivery', label: 'Delivery', desc: 'Delivery & logistics' },
                { key: 'payments', label: 'Payments', desc: 'Razorpay integration' },
                { key: 'referrals', label: 'Referrals', desc: 'Referral program' },
                { key: 'loyalty', label: 'Loyalty', desc: 'Loyalty points' },
                { key: 'ai', label: 'AI Features', desc: 'AI descriptions & insights' },
                { key: 'bulkImport', label: 'Bulk Import', desc: 'Bulk product upload' },
                { key: 'sponsoredProducts', label: 'Sponsored Products', desc: 'Paid promotions' },
                { key: 'sms', label: 'SMS', desc: 'SMS notifications' },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-gray-400">{item.desc}</p></div>
                  <input type="checkbox" checked={featureForm[item.key] || false} onChange={(e) => setFeatureForm(prev => ({ ...prev, [item.key]: e.target.checked }))} className="w-5 h-5" />
                </label>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('FEATURES', featureForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Feature Settings'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}