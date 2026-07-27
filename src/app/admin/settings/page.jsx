'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Building2, Receipt, CreditCard, Bell,
  Zap, Save, RefreshCw, TrendingUp,
  Globe, Mail, Phone, Smartphone,
  RotateCcw, Wallet, Banknote, Building, ArrowRightLeft, Percent
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

  const [taxForm, setTaxForm] = useState({
    defaultRate: 18, cgst: 9, sgst: 9, igst: 18, tds: 1, tcs: 0.1,
    hsnRequired: true, einvoiceEnabled: false, taxInclusivePricing: false,
    reverseChargeEnabled: false,
  });

  const [paymentForm, setPaymentForm] = useState({
    codEnabled: true, codMaxAmount: 50000,
    walletEnabled: true, walletMinBalance: 0,
    bankTransferEnabled: true, upiEnabled: true,
    razorpayEnabled: false, stripeEnabled: false,
    settlementCycle: 'WEEKLY', minSettlement: 1000, holdPeriod: 7,
    refundApprovalRequired: true, maxRefundDays: 30,
    partialRefundEnabled: true, autoRefundBelow: 0,
    refundToWallet: true, refundToBank: true, refundToOriginal: true,
    platformCommissionOnRefund: false, platformCommissionRate: 0,
  });

  const [commissionForm, setCommissionForm] = useState({
    defaultRate: 5,
    commissionOnDelivery: false,
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

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setPlatformData(data);

      if (data.settings?.GENERAL) setGeneralForm(prev => ({ ...prev, ...data.settings.GENERAL }));
      if (data.settings?.TAX) setTaxForm(prev => ({ ...prev, ...data.settings.TAX }));
      if (data.settings?.PAYMENT) setPaymentForm(prev => ({ ...prev, ...data.settings.PAYMENT }));
      if (data.settings?.COMMISSION) setCommissionForm(prev => ({ ...prev, ...data.settings.COMMISSION }));
      if (data.settings?.NOTIFICATION) setNotifForm(prev => ({ ...prev, ...data.settings.NOTIFICATION }));
      if (data.settings?.FEATURES) setFeatureForm(prev => ({ ...prev, ...data.settings.FEATURES }));
      if (data.platform) {
        setGeneralForm(prev => ({
          ...prev, platformName: data.platform.name, supportEmail: data.platform.supportEmail,
          supportPhone: data.platform.supportPhone, language: data.platform.language,
          currency: data.platform.currency, timezone: data.platform.timezone,
        }));
      }
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleSave = async (category, formData) => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, settings: formData })
      });
      if (res.ok) { toast.success(category + ' settings saved'); fetchSettings(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: 'GENERAL', label: 'General', icon: Building2 },
    { id: 'TAX', label: 'Tax', icon: Receipt },
    { id: 'COMMISSION', label: 'Commission', icon: Percent },
    { id: 'PAYMENT', label: 'Payments', icon: CreditCard },
    { id: 'NOTIFICATION', label: 'Notifications', icon: Bell },
    { id: 'FEATURES', label: 'Features', icon: Zap },
  ];

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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* GENERAL */}
      {activeTab === 'GENERAL' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-100 rounded-lg"><Globe className="h-5 w-5 text-blue-600" /></div><div><h3 className="font-semibold text-gray-900">Platform Information</h3><p className="text-xs text-gray-500">Basic platform configuration</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="text-sm font-medium">Platform Name *</label><input type="text" value={generalForm.platformName} onChange={(e) => setGeneralForm(prev => ({ ...prev, platformName: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              <div><label className="text-sm font-medium">Support Email *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="email" value={generalForm.supportEmail} onChange={(e) => setGeneralForm(prev => ({ ...prev, supportEmail: e.target.value }))} className="w-full pl-10 pr-3 py-2.5 border rounded-lg mt-1.5" /></div></div>
              <div><label className="text-sm font-medium">Support Phone</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" value={generalForm.supportPhone} onChange={(e) => setGeneralForm(prev => ({ ...prev, supportPhone: e.target.value }))} className="w-full pl-10 pr-3 py-2.5 border rounded-lg mt-1.5" /></div></div>
              <div><label className="text-sm font-medium">Website URL</label><input type="text" value={generalForm.website || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, website: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" placeholder="https://procure.com" /></div>
              <div><label className="text-sm font-medium">Default Language</label><select value={generalForm.language} onChange={(e) => setGeneralForm(prev => ({ ...prev, language: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option>English</option><option>Hindi</option><option>Tamil</option><option>Telugu</option><option>Bengali</option></select></div>
              <div><label className="text-sm font-medium">Default Currency</label><select value={generalForm.currency} onChange={(e) => setGeneralForm(prev => ({ ...prev, currency: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></div>
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
              <div className="space-y-3">
                <input type="text" value={generalForm.metaTitle || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, metaTitle: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Meta Title" />
                <textarea value={generalForm.metaDescription || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, metaDescription: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Meta Description" />
                <input type="text" value={generalForm.metaKeywords || ''} onChange={(e) => setGeneralForm(prev => ({ ...prev, metaKeywords: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Meta Keywords" />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('GENERAL', generalForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save General Settings'}</button></div>
          </div>
        </div>
      )}

      {/* TAX */}
      {activeTab === 'TAX' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-green-100 rounded-lg"><Receipt className="h-5 w-5 text-green-600" /></div><div><h3 className="font-semibold text-gray-900">GST & Tax Configuration</h3><p className="text-xs text-gray-500">Indian GST and tax compliance settings</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div><label className="text-sm font-medium">Default GST Rate (%)</label><select value={taxForm.defaultRate} onChange={(e) => setTaxForm(prev => ({ ...prev, defaultRate: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select></div>
              <div><label className="text-sm font-medium">CGST (%)</label><input type="number" value={taxForm.cgst} onChange={(e) => setTaxForm(prev => ({ ...prev, cgst: parseFloat(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              <div><label className="text-sm font-medium">SGST (%)</label><input type="number" value={taxForm.sgst} onChange={(e) => setTaxForm(prev => ({ ...prev, sgst: parseFloat(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              <div><label className="text-sm font-medium">IGST (%)</label><input type="number" value={taxForm.igst} onChange={(e) => setTaxForm(prev => ({ ...prev, igst: parseFloat(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              <div><label className="text-sm font-medium">TDS (%)</label><input type="number" step="0.1" value={taxForm.tds} onChange={(e) => setTaxForm(prev => ({ ...prev, tds: parseFloat(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
              <div><label className="text-sm font-medium">TCS (%)</label><input type="number" step="0.1" value={taxForm.tcs} onChange={(e) => setTaxForm(prev => ({ ...prev, tcs: parseFloat(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-5">
              <label className="flex items-center gap-2"><input type="checkbox" checked={taxForm.hsnRequired} onChange={(e) => setTaxForm(prev => ({ ...prev, hsnRequired: e.target.checked }))} />HSN Required</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={taxForm.einvoiceEnabled} onChange={(e) => setTaxForm(prev => ({ ...prev, einvoiceEnabled: e.target.checked }))} />E-Invoicing</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={taxForm.taxInclusivePricing} onChange={(e) => setTaxForm(prev => ({ ...prev, taxInclusivePricing: e.target.checked }))} />Tax Inclusive Pricing</label>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('TAX', taxForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Tax Settings'}</button></div>
          </div>
        </div>
      )}

      {/* COMMISSION */}
      {activeTab === 'COMMISSION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg"><Percent className="h-5 w-5 text-green-600" /></div>
              <div>
                <h3 className="font-semibold text-gray-900">Platform Commission</h3>
                <p className="text-xs text-gray-500">Commission earned per completed order from suppliers</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium">How it works:</p>
              <p className="text-xs text-blue-700 mt-1">
                When a buyer places an order and it's delivered, the platform automatically deducts 
                a commission percentage from the supplier's wallet. No monthly fees, no hidden charges.
              </p>
            </div>

            <div className="max-w-md">
              <label className="text-sm font-medium text-gray-700">Commission Rate (%)</label>
              <div className="relative mt-1.5">
                <input 
                  type="number" 
                  step="0.1" 
                  value={commissionForm.defaultRate || 5} 
                  onChange={(e) => setCommissionForm(prev => ({ ...prev, defaultRate: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 border rounded-lg text-lg font-bold" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Example: On a Rs. 1,000 order, platform earns Rs. {(1000 * (commissionForm.defaultRate || 5) / 100).toFixed(0)}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500">100 orders/mo</p>
                <p className="text-xl font-bold text-green-600">Rs. {((100 * 1000 * (commissionForm.defaultRate || 5)) / 100).toLocaleString()}</p>
                <p className="text-xs text-gray-400">at Rs. 1,000 avg order</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500">1,000 orders/mo</p>
                <p className="text-xl font-bold text-green-600">Rs. {((1000 * 1000 * (commissionForm.defaultRate || 5)) / 100).toLocaleString()}</p>
                <p className="text-xs text-gray-400">at Rs. 1,000 avg order</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500">10,000 orders/mo</p>
                <p className="text-xl font-bold text-green-600">Rs. {((10000 * 1000 * (commissionForm.defaultRate || 5)) / 100).toLocaleString()}</p>
                <p className="text-xs text-gray-400">at Rs. 1,000 avg order</p>
              </div>
            </div>

            <div className="mt-4 flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={commissionForm.commissionOnDelivery || false} 
                  onChange={(e) => setCommissionForm(prev => ({ ...prev, commissionOnDelivery: e.target.checked }))} />
                <span className="text-sm">Also charge commission on delivery/shipping fees</span>
              </label>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end">
              <button onClick={() => handleSave('COMMISSION', { defaultRate: commissionForm.defaultRate, commissionOnDelivery: commissionForm.commissionOnDelivery })} disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Commission Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT */}
      {activeTab === 'PAYMENT' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-purple-100 rounded-lg"><CreditCard className="h-5 w-5 text-purple-600" /></div><div><h3 className="font-semibold text-gray-900">Payment Methods</h3><p className="text-xs text-gray-500">Configure available payment options</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ key: 'razorpayEnabled', label: 'Razorpay', desc: 'UPI, Cards, Net Banking', icon: CreditCard },{ key: 'upiEnabled', label: 'UPI Direct', desc: 'Google Pay, PhonePe', icon: Smartphone },{ key: 'bankTransferEnabled', label: 'Bank Transfer', desc: 'NEFT/RTGS/IMPS', icon: Building },{ key: 'walletEnabled', label: 'Wallet', desc: 'PROCURE Wallet', icon: Wallet },{ key: 'codEnabled', label: 'Cash on Delivery', desc: 'Pay on delivery', icon: Banknote }].map(item => (
                <label key={item.key} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={paymentForm[item.key]} onChange={(e) => setPaymentForm(prev => ({ ...prev, [item.key]: e.target.checked }))} className="w-5 h-5" />
                  <item.icon className="h-5 w-5 text-gray-500" /><div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4"><div><label className="text-sm font-medium">COD Max (Rs.)</label><input type="number" value={paymentForm.codMaxAmount} onChange={(e) => setPaymentForm(prev => ({ ...prev, codMaxAmount: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div><div><label className="text-sm font-medium">Wallet Min (Rs.)</label><input type="number" value={paymentForm.walletMinBalance} onChange={(e) => setPaymentForm(prev => ({ ...prev, walletMinBalance: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div></div>
            <div className="mt-4 pt-4 border-t flex justify-end"><button onClick={() => handleSave('PAYMENT', paymentForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Payment Settings'}</button></div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-green-100 rounded-lg"><ArrowRightLeft className="h-5 w-5 text-green-600" /></div><div><h3 className="font-semibold text-gray-900">Settlement Configuration</h3></div></div>
            <div className="grid grid-cols-3 gap-4"><div><label className="text-sm font-medium">Cycle</label><select value={paymentForm.settlementCycle} onChange={(e) => setPaymentForm(prev => ({ ...prev, settlementCycle: e.target.value }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5"><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select></div><div><label className="text-sm font-medium">Min (Rs.)</label><input type="number" value={paymentForm.minSettlement} onChange={(e) => setPaymentForm(prev => ({ ...prev, minSettlement: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div><div><label className="text-sm font-medium">Hold (Days)</label><input type="number" value={paymentForm.holdPeriod} onChange={(e) => setPaymentForm(prev => ({ ...prev, holdPeriod: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div></div>
            <div className="mt-4 pt-4 border-t flex justify-end"><button onClick={() => handleSave('SETTLEMENT', paymentForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Settlement Settings'}</button></div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-orange-100 rounded-lg"><RotateCcw className="h-5 w-5 text-orange-600" /></div><div><h3 className="font-semibold text-gray-900">Refund Configuration</h3><p className="text-xs text-gray-500">Per-request based - buyer/admin chooses method</p></div></div>
            <div className="flex flex-wrap gap-3 mb-4">
              <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer"><input type="checkbox" checked={paymentForm.refundToWallet} onChange={(e) => setPaymentForm(prev => ({ ...prev, refundToWallet: e.target.checked }))} /><Wallet className="h-4 w-4" />Wallet</label>
              <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer"><input type="checkbox" checked={paymentForm.refundToBank} onChange={(e) => setPaymentForm(prev => ({ ...prev, refundToBank: e.target.checked }))} /><Building className="h-4 w-4" />Bank Transfer</label>
              <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer"><input type="checkbox" checked={paymentForm.refundToOriginal} onChange={(e) => setPaymentForm(prev => ({ ...prev, refundToOriginal: e.target.checked }))} /><ArrowRightLeft className="h-4 w-4" />Original Payment</label>
            </div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Auto-Approve Below (Rs.)</label><input type="number" value={paymentForm.autoRefundBelow} onChange={(e) => setPaymentForm(prev => ({ ...prev, autoRefundBelow: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div><div><label className="text-sm font-medium">Max Refund Days</label><input type="number" value={paymentForm.maxRefundDays} onChange={(e) => setPaymentForm(prev => ({ ...prev, maxRefundDays: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border rounded-lg mt-1.5" /></div></div>
            <label className="flex items-center gap-2 mt-3"><input type="checkbox" checked={paymentForm.partialRefundEnabled} onChange={(e) => setPaymentForm(prev => ({ ...prev, partialRefundEnabled: e.target.checked }))} />Allow Partial Refunds</label>
            <div className="mt-4 pt-4 border-t flex justify-end"><button onClick={() => handleSave('REFUND', paymentForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Refund Settings'}</button></div>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      {activeTab === 'NOTIFICATION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-orange-100 rounded-lg"><Bell className="h-5 w-5 text-orange-600" /></div><div><h3 className="font-semibold text-gray-900">Notification Configuration</h3></div></div>
            <h4 className="font-medium text-sm mb-3">Channels</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[{ key: 'emailEnabled', label: 'Email', icon: Mail },{ key: 'smsEnabled', label: 'SMS', icon: Smartphone },{ key: 'pushEnabled', label: 'Push', icon: Bell },{ key: 'whatsappEnabled', label: 'WhatsApp', icon: Smartphone }].map(item => (
                <label key={item.key} className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer text-center"><input type="checkbox" checked={notifForm[item.key]} onChange={(e) => setNotifForm(prev => ({ ...prev, [item.key]: e.target.checked }))} /><item.icon className="h-5 w-5 text-gray-500" /><p className="font-medium text-sm">{item.label}</p></label>
              ))}
            </div>
            {notifForm.emailEnabled && <div className="mb-6 p-4 bg-gray-50 rounded-lg"><h4 className="font-medium text-sm mb-3">SMTP Config</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><input type="text" value={notifForm.smtpHost || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpHost: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="Host" /><input type="number" value={notifForm.smtpPort || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))} className="px-3 py-2 border rounded-lg" placeholder="Port" /><input type="text" value={notifForm.smtpUser || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpUser: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="User" /><input type="password" value={notifForm.smtpPass || ''} onChange={(e) => setNotifForm(prev => ({ ...prev, smtpPass: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="Password" /></div></div>}
            <h4 className="font-medium text-sm mb-3">Events</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[{ key: 'orderConfirmation', label: 'Order Confirmation' },{ key: 'shippingUpdate', label: 'Shipping Updates' },{ key: 'deliveryOTP', label: 'Delivery OTP' },{ key: 'rfqAlert', label: 'RFQ Alerts' },{ key: 'paymentReceipt', label: 'Payment Receipts' },{ key: 'promotionalEmail', label: 'Promotional' }].map(item => (
                <label key={item.key} className="flex items-center gap-2"><input type="checkbox" checked={notifForm[item.key]} onChange={(e) => setNotifForm(prev => ({ ...prev, [item.key]: e.target.checked }))} />{item.label}</label>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => handleSave('NOTIFICATION', notifForm)} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Notification Settings'}</button></div>
          </div>
        </div>
      )}

      {/* FEATURES */}
      {activeTab === 'FEATURES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-yellow-100 rounded-lg"><Zap className="h-5 w-5 text-yellow-600" /></div><div><h3 className="font-semibold text-gray-900">Feature Flags</h3></div></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(featureForm).map(([key, enabled]) => (
                <label key={key} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer">
                  <div><p className="font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p></div>
                  <input type="checkbox" checked={enabled} onChange={(e) => setFeatureForm(prev => ({ ...prev, [key]: e.target.checked }))} className="w-5 h-5" />
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