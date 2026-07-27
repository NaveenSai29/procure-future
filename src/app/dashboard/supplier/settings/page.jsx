"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Save, Power, PowerOff, Store, AlertCircle, CheckCircle,
  Building, CreditCard, FileText, Bell, Shield, Upload, Loader2,
  BadgeCheck, Clock,
} from "lucide-react";
import { toast } from "sonner";
import KYCProgressBar from "@/components/kyc/KYCProgressBar";
import KYCUploadCard from "@/components/kyc/KYCUploadCard";

const TABS = [
  { id: "business", label: "Business Info", icon: Store },
  { id: "kyc", label: "KYC Documents", icon: Shield },
];

// Business Info Edit Form Component
function BusinessInfoForm({ supplier, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    businessType: '',
    description: '',
    website: '',
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        businessName: supplier.businessName || '',
        email: supplier.email || '',
        mobile: supplier.mobile || '',
        gstin: supplier.gstin || '',
        pan: supplier.pan || '',
        businessType: supplier.businessType || '',
        description: supplier.description || '',
        website: supplier.website || '',
      });
    }
  }, [supplier]);

  const handleSave = async () => {
    if (!form.businessName.trim()) { toast.error('Business name is required'); return; }
    if (!form.mobile.trim()) { toast.error('Mobile is required'); return; }
    if (!form.businessType) { toast.error('Business type is required'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/supplier/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Business information updated!');
        setEditing(false);
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const businessTypes = [
    'Retail', 'Wholesale', 'Manufacturing', 'Distribution',
    'Import/Export', 'Service Provider', 'E-Commerce', 'Other'
  ];

  return (
    <div className="bg-white rounded-xl border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Business Information</h3>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        /* Display Mode */
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Business Name</label>
            <p className="font-medium">{supplier?.businessName || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="font-medium">{supplier?.email || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Mobile</label>
            <p className="font-medium">{supplier?.mobile || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Verification Status</label>
            <p className={`font-medium ${supplier?.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {supplier?.isVerified ? '✅ Verified' : '⏳ Pending Verification'}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email Verification</label>
            <p className={`font-medium flex items-center gap-1 ${supplier?.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {supplier?.emailVerified ? (
                <><BadgeCheck className="h-4 w-4" /> Verified</>
              ) : (
                <><Clock className="h-4 w-4" /> Not Verified</>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">GST Verification</label>
            <p className={`font-medium flex items-center gap-1 ${supplier?.gstVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {supplier?.gstVerified ? (
                <><BadgeCheck className="h-4 w-4" /> Verified by GST Portal</>
              ) : (
                <><Clock className="h-4 w-4" /> Pending Verification</>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">GSTIN</label>
            <p className="font-medium">{supplier?.gstin || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">PAN</label>
            <p className="font-medium">{supplier?.pan || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Business Type</label>
            <p className="font-medium">{supplier?.businessType || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Website</label>
            <p className="font-medium">{supplier?.website || 'Not provided'}</p>
          </div>
          {supplier?.gstBusinessName && (
            <div>
              <label className="text-sm text-gray-500">GST Business Name</label>
              <p className="font-medium text-emerald-700">{supplier.gstBusinessName}</p>
            </div>
          )}
          {supplier?.gstVerificationDate && (
            <div>
              <label className="text-sm text-gray-500">GST Verified On</label>
              <p className="font-medium">{new Date(supplier.gstVerificationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
          {supplier?.description && (
            <div className="col-span-2">
              <label className="text-sm text-gray-500">Description</label>
              <p className="font-medium text-sm">{supplier.description}</p>
            </div>
          )}
        </div>
      ) : (
        /* Edit Mode */
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 font-medium">Business Name *</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Mobile *</label>
            <input
              type="text"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Business Type *</label>
            <select
              value={form.businessType}
              onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select type...</option>
              {businessTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">GSTIN</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="22ABCDE1234F1Z5"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">PAN</label>
            <input
              type="text"
              value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="ABCDE1234F"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.example.com"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-500 font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Brief description of your business..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupplierSettingsPage() {
  const [supplier, setSupplier] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  const [kycData, setKycData] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  // Read tab from URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'kyc') setActiveTab('kyc');
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/supplier/settings");
      const data = await res.json();
      setSupplier(data.supplier);
      setSettings(data.settings);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchKYC = async () => {
    try {
      const res = await fetch("/api/supplier/kyc");
      const json = await res.json();
      if (res.ok) setKycData(json);
    } catch {
      toast.error("Failed to load KYC");
    }
  };

  useEffect(() => {
    if (activeTab === "kyc") fetchKYC();
  }, [activeTab]);

  const handleToggleStore = async () => {
    if (!confirm(supplier.isActive
      ? "Going offline will hide all your products from buyers. Continue?"
      : "Going online will make your products visible to buyers. Continue?"
    )) return;

    setToggling(true);
    try {
      const res = await fetch("/api/supplier/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });
      if (res.ok) {
        toast.success(supplier.isActive ? "Store is now offline" : "Store is now online!");
        fetchSettings();
      }
    } catch {
      toast.error("Failed to toggle");
    } finally {
      setToggling(false);
    }
  };

  const quickCards = [
    { title: "Bank Accounts", desc: "Manage settlement bank accounts", icon: Building, href: "/dashboard/supplier/settings/bank", color: "bg-blue-50 text-blue-600" },
    { title: "Notifications", desc: "Email, SMS & alert preferences", icon: Bell, href: "/dashboard/notifications", color: "bg-orange-50 text-orange-600" },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Store Status Toggle */}
      <div className={`rounded-xl p-6 mb-6 ${supplier?.isActive ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${supplier?.isActive ? "bg-green-200" : "bg-red-200"}`}>
              <Store className={`h-6 w-6 ${supplier?.isActive ? "text-green-700" : "text-red-700"}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Store Status</h2>
              <p className="text-sm mt-1">
                {supplier?.isActive ? (
                  <span className="text-green-700 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Your store is ONLINE
                  </span>
                ) : (
                  <span className="text-red-700 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Your store is OFFLINE
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleStore}
            disabled={toggling || !supplier?.isVerified}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition ${
              !supplier?.isVerified
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : supplier?.isActive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
            title={!supplier?.isVerified ? "Complete KYC verification to go online" : ""}
          >
            {supplier?.isActive ? (
              <><PowerOff className="h-5 w-5" /> Go Offline</>
            ) : (
              <><Power className="h-5 w-5" /> Go Online</>
            )}
          </button>
        </div>
        {!supplier?.isVerified && (
          <p className="text-xs text-yellow-700 mt-3 bg-yellow-100 rounded-lg p-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Complete KYC verification in the "KYC Documents" tab below to enable going online.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Business Info Tab */}
      {activeTab === "business" && (
        <>
          <BusinessInfoForm supplier={supplier} onUpdate={fetchSettings} />

          <h3 className="font-semibold text-gray-900 mb-3">Quick Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="bg-white rounded-xl border p-5 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{card.title}</h4>
                    <p className="text-xs text-gray-500">{card.desc}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-500 transition">→</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* KYC Tab */}
      {activeTab === "kyc" && (
        <div className="space-y-6">
          {supplier?.isVerified && (!kycData?.documents || kycData.documents.length === 0) ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-green-800">Your Store is Verified ✅</h3>
              <p className="text-sm text-green-700 mt-1">
                Your business was verified before the document upload system was introduced.
              </p>
              <p className="text-xs text-green-600 mt-3 bg-green-100 rounded-lg p-2 inline-block">
                No additional documents required. You're all set to sell!
              </p>
            </div>
          ) : supplier?.isVerified && kycData?.documents?.length > 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">All documents verified! 🎉</p>
                <p className="text-sm text-green-700">Your store is LIVE and visible to buyers.</p>
              </div>
            </div>
          ) : kycData?.progress?.isComplete ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Documents under review</p>
                <p className="text-sm text-yellow-700">Our team will verify within 24-48 hours.</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <Upload className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-800">Upload documents to get verified</p>
                <p className="text-sm text-blue-700">All 6 documents required to go LIVE.</p>
              </div>
            </div>
          )}

          {!(supplier?.isVerified && (!kycData?.documents || kycData.documents.length === 0)) && (
            <>
              <KYCProgressBar documents={kycData?.documents || []} />
              <h3 className="font-semibold text-gray-900">Upload Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["PAN", "GST", "BANK_PROOF", "BUSINESS_REGISTRATION", "IDENTITY_PROOF", "ADDRESS_PROOF"].map(
                  (docType) => {
                    const existingDoc = (kycData?.documents || []).find((d) => d.documentType === docType);
                    return (
                      <KYCUploadCard
                        key={docType}
                        documentType={docType}
                        existingDoc={existingDoc}
                        onUpload={() => fetchKYC()}
                        onDelete={() => fetchKYC()}
                      />
                    );
                  }
                )}
              </div>
              <div className="bg-gray-50 rounded-xl border p-5">
                <h4 className="font-semibold text-gray-900 mb-2">Document Guidelines</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Documents must be clearly visible and not expired</li>
                  <li>PDF, JPG, or PNG (Max 5MB per file)</li>
                  <li>Name on documents must match business registration</li>
                  <li>Verification takes 24-48 hours after all documents uploaded</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}