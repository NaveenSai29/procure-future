"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, Package, ShoppingCart, Warehouse, Plus, ArrowLeft, Shield, AlertTriangle, CheckCircle, Upload, ArrowRight, BadgeCheck, Clock, XCircle, Mail, Ban } from "lucide-react";
import { toast } from "sonner";

export default function SupplierDashboard() {
  const router = useRouter();
  const [supplier, setSupplier] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    fetchSupplier();
    fetchKYCStatus();
  }, []);

  const fetchSupplier = async () => {
    try {
      const res = await fetch("/api/supplier/me");
      const data = await res.json();
      if (!data.success) {
        router.push("/dashboard/become-supplier");
        return;
      }
      setSupplier(data.data);
    } catch {
      router.push("/dashboard");
    }
  };

  const fetchKYCStatus = async () => {
    try {
      const res = await fetch("/api/supplier/kyc");
      if (res.ok) {
        const json = await res.json();
        setKycStatus(json.data || json);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (data.success) toast.success('Verification email sent! Check your inbox.');
      else toast.error(data.message || 'Failed to resend');
    } catch {
      toast.error('Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!supplier) return null;

  const isVerified = supplier.isVerified;
  const isGstVerified = supplier.gstVerified;
  const isEmailVerified = supplier.emailVerified;
  const kycProgress = kycStatus?.progress;
  const hasDocs = (kycStatus?.documents?.length || 0) > 0;

  const stats = [
    { label: "Products", value: "0", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Orders", value: "0", icon: ShoppingCart, color: "text-green-600", bg: "bg-green-50" },
    { label: "Warehouses", value: "0", icon: Warehouse, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Revenue", value: "₹0", icon: Store, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  // Features that are restricted without KYC
  const restrictedFeatures = [
    { icon: Plus, label: "Add Products", blocked: true },
    { icon: Store, label: "Go Online", blocked: true },
    { icon: ShoppingCart, label: "Process Orders", blocked: true },
    { icon: Upload, label: "Bulk Import", blocked: true },
  ];

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Email Verification Banner */}
      {!isEmailVerified && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <Mail className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-blue-800">Verify your email address</p>
            <p className="text-sm text-blue-700">Check your inbox for the verification link. Didn&apos;t receive it?</p>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
          >
            {resending ? 'Sending...' : 'Resend Link'}
          </button>
        </div>
      )}

      {/* Email Verified Badge */}
      {isEmailVerified && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Email Verified ✅</p>
            <p className="text-sm text-green-700">Your email address has been verified.</p>
          </div>
        </div>
      )}

      {/* KYC RESTRICTION BANNER - Shows what's blocked */}
      {!isVerified && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-200">
              <Ban className="h-7 w-7 text-red-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-800">KYC Verification Required</h2>
              <p className="text-sm text-red-700 mt-1">
                Your account is in <strong>view-only mode</strong>. Complete KYC verification to unlock all features.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {restrictedFeatures.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm text-red-600 bg-red-100 rounded-lg px-3 py-2">
                    <Ban className="h-4 w-4 flex-shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC VERIFICATION BANNER - Documents upload prompt */}
      {!isVerified && (
        <div className={`rounded-2xl p-6 border-2 ${hasDocs ? 'bg-yellow-50 border-yellow-400' : 'bg-amber-50 border-amber-400'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${hasDocs ? 'bg-yellow-200' : 'bg-amber-200'}`}>
              {hasDocs ? (
                <AlertTriangle className="h-8 w-8 text-yellow-700" />
              ) : (
                <Shield className="h-8 w-8 text-amber-700" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {hasDocs ? 'Documents Under Review' : 'Upload KYC Documents to Unlock Features'}
              </h2>
              <p className="text-sm text-gray-700 mt-2">
                {hasDocs 
                  ? 'Your documents are being reviewed by our team. This usually takes 24-48 hours. You\'ll be notified once verified.'
                  : 'Upload your business documents (PAN, GST, Bank Proof) to get verified and unlock all selling features.'
                }
              </p>
              {kycProgress && !kycProgress.isComplete && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 max-w-xs bg-white rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${kycProgress.completionPercentage || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {kycProgress.uploaded}/{kycProgress.total} uploaded
                  </span>
                </div>
              )}
              {!hasDocs && (
                <Link href="/dashboard/supplier/settings?tab=kyc" className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition shadow-lg shadow-amber-200">
                  <Upload className="h-5 w-5" />
                  Upload KYC Documents
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )}
              {hasDocs && (
                <Link href="/dashboard/supplier/settings?tab=kyc" className="mt-4 inline-flex items-center gap-2 text-sm text-yellow-700 font-medium hover:text-yellow-800">
                  View submitted documents →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verified Badge */}
      {isVerified && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Your store is VERIFIED & LIVE!</p>
            <p className="text-sm text-green-700">All features unlocked. Buyers can see and order your products.</p>
          </div>
        </div>
      )}

      {/* GST Verification Status */}
      <div className={`rounded-2xl p-5 border-2 ${
        isGstVerified 
          ? 'bg-emerald-50 border-emerald-300' 
          : 'bg-amber-50 border-amber-300'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isGstVerified ? 'bg-emerald-200' : 'bg-amber-200'}`}>
            {isGstVerified ? (
              <BadgeCheck className="h-7 w-7 text-emerald-700" />
            ) : (
              <Clock className="h-7 w-7 text-amber-700" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">
              {isGstVerified ? 'GST Verified' : 'GST Verification Pending'}
            </h3>
            <p className="text-sm text-gray-700 mt-1">
              {isGstVerified 
                ? `Your GSTIN ${supplier.gstin} has been verified. Business name on GST portal: ${supplier.gstBusinessName || 'N/A'}.`
                : `Your GSTIN ${supplier.gstin} is pending verification by the admin team. This is required for tax compliance.`
              }
            </p>
            {isGstVerified && supplier.gstVerificationDate && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                Verified on: {new Date(supplier.gstVerificationDate).toLocaleDateString('en-IN', { 
                  day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </p>
            )}
            {!isGstVerified && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                The admin team will verify your GSTIN soon. No action needed from your side.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Store Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{supplier.businessName}</h1>
          <p className="text-muted-foreground">{supplier.businessType} • {supplier.gstin}</p>
        </div>
        <Link href={isVerified ? "/dashboard/supplier/products/new" : "#"}>
          <Button 
            disabled={!isVerified} 
            title={!isVerified ? "Complete KYC verification to add products" : "Add a new product"}
            className={!isVerified ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-background rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
              <div className={`${bg} p-3 rounded-lg`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-background rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Supplier Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">KYC Status: </span>
            <span className={`font-medium ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {isVerified ? "Verified" : "Pending Verification"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">GST Status: </span>
            <span className={`font-medium flex items-center gap-1 ${isGstVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isGstVerified ? (
                <><BadgeCheck className="h-4 w-4" /> Verified</>
              ) : (
                <><Clock className="h-4 w-4" /> Pending</>
              )}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Email Verification: </span>
            <span className={`font-medium flex items-center gap-1 ${isEmailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {isEmailVerified ? (
                <><CheckCircle className="h-4 w-4" /> Verified</>
              ) : (
                <><Clock className="h-4 w-4" /> Not Verified</>
              )}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{supplier.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Mobile: </span>
            <span className="font-medium">{supplier.mobile}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Joined: </span>
            <span className="font-medium">{new Date(supplier.createdAt).toLocaleDateString()}</span>
          </div>
          {supplier.gstBusinessName && (
            <div>
              <span className="text-muted-foreground">GST Business Name: </span>
              <span className="font-medium text-emerald-700">{supplier.gstBusinessName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}