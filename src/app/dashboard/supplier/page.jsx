"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, Package, ShoppingCart, Warehouse, Plus, ArrowLeft, Shield, AlertTriangle, CheckCircle, Upload, ArrowRight, BadgeCheck, Clock, XCircle, Mail, Ban, TrendingUp, Users, FileText } from "lucide-react";
import { toast } from "sonner";

export default function SupplierDashboard() {
  const router = useRouter();
  const [supplier, setSupplier] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [statsData, setStatsData] = useState({ products: 0, orders: 0, warehouses: 0, revenue: 0 });

  useEffect(() => {
    fetchSupplier();
    fetchKYCStatus();
    fetchStats();
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

  const fetchStats = async () => {
    try {
      const [productsRes, ordersRes, supplierRes, statsRes] = await Promise.all([
        fetch("/api/supplier/products?limit=1"),
        fetch("/api/orders?limit=1"),
        fetch("/api/supplier/me"),
        fetch("/api/supplier/stats"),
      ]);
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      const supplierData = await supplierRes.json();
      const statsDataRes = await statsRes.json();

      setStatsData({
        products: productsData.data?.total || productsData.data?.length || 0,
        orders: ordersData.data?.total || ordersData.data?.orders?.length || 0,
        warehouses: supplierData.data?.warehouses?.length || 0,
        revenue: statsDataRes.data?.totalRevenue || 0,
      });
    } catch {}
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  if (!supplier) return null;

  const isVerified = supplier.isVerified;
  const isGstVerified = supplier.gstVerified;
  const isEmailVerified = supplier.emailVerified;
  const kycProgress = kycStatus?.progress;
  const hasDocs = (kycStatus?.documents?.length || 0) > 0;

  const stats = [
    { label: "Products", value: String(statsData.products), icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Orders", value: String(statsData.orders), icon: ShoppingCart, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Warehouses", value: String(statsData.warehouses), icon: Warehouse, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    { label: "Revenue", value: `₹${(statsData.revenue || 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
  ];

  const quickActions = [
    { label: "Add Product", icon: Plus, href: "/dashboard/supplier/products/new", color: "bg-blue-600 hover:bg-blue-700" },
    { label: "View Orders", icon: ShoppingCart, href: "/dashboard/supplier/orders", color: "bg-green-600 hover:bg-green-700" },
    { label: "Manage Products", icon: Package, href: "/dashboard/supplier/products", color: "bg-purple-600 hover:bg-purple-700" },
    { label: "Reports", icon: FileText, href: "/dashboard/supplier/reports", color: "bg-orange-600 hover:bg-orange-700" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Link */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Email Verification Banner */}
      {!isEmailVerified && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <Mail className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-blue-800 text-sm">Verify your email address</p>
            <p className="text-xs text-blue-700 mt-0.5">Check your inbox for the verification link.</p>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
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
            <p className="font-semibold text-green-800 text-sm">Email Verified ✅</p>
            <p className="text-xs text-green-700 mt-0.5">Your email address has been verified.</p>
          </div>
        </div>
      )}

      {/* KYC RESTRICTION BANNER */}
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
                {[
                  { icon: Plus, label: "Add Products" },
                  { icon: Store, label: "Go Online" },
                  { icon: ShoppingCart, label: "Process Orders" },
                  { icon: Upload, label: "Bulk Import" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-red-600 bg-red-100 rounded-lg px-3 py-2">
                    <Ban className="h-4 w-4 flex-shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC UPLOAD BANNER */}
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
              <h2 className="text-lg font-bold text-gray-900">
                {hasDocs ? 'Documents Under Review' : 'Upload KYC Documents to Unlock Features'}
              </h2>
              <p className="text-sm text-gray-700 mt-1">
                {hasDocs 
                  ? 'Your documents are being reviewed. This usually takes 24-48 hours.'
                  : 'Upload your business documents (PAN, GST, Bank Proof) to get verified.'
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
                  <span className="text-xs font-medium text-gray-700">
                    {kycProgress.uploaded}/{kycProgress.total} uploaded
                  </span>
                </div>
              )}
              <Link href="/dashboard/supplier/settings?tab=kyc" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition shadow-md">
                {hasDocs ? <ArrowRight className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                {hasDocs ? 'View Documents' : 'Upload KYC Documents'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Verified Badge */}
      {isVerified && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Your store is VERIFIED & LIVE!</p>
            <p className="text-xs text-green-700 mt-0.5">All features unlocked. Buyers can see and order your products.</p>
          </div>
        </div>
      )}

      {/* GST Status */}
      <div className={`rounded-2xl p-5 border-2 ${isGstVerified ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isGstVerified ? 'bg-emerald-200' : 'bg-amber-200'}`}>
            {isGstVerified ? (
              <BadgeCheck className="h-7 w-7 text-emerald-700" />
            ) : (
              <Clock className="h-7 w-7 text-amber-700" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">
              {isGstVerified ? 'GST Verified' : 'GST Verification Pending'}
            </h3>
            <p className="text-xs text-gray-700 mt-1">
              {isGstVerified 
                ? `Your GSTIN ${supplier.gstin} has been verified.`
                : `Your GSTIN ${supplier.gstin} is pending verification by the admin team.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Store Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{supplier.businessName}</h1>
          <p className="text-sm text-gray-500 mt-1">{supplier.businessType} • {supplier.gstin}</p>
        </div>
        <Link href={isVerified ? "/dashboard/supplier/products/new" : "#"}>
          <Button 
            disabled={!isVerified} 
            title={!isVerified ? "Complete KYC verification to add products" : "Add a new product"}
            className={!isVerified ? "opacity-50 cursor-not-allowed text-sm" : "text-sm"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white rounded-xl border ${border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${bg} p-3 rounded-lg`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map(({ label, icon: Icon, href, color }) => (
          <Link key={label} href={href} className={`${color} text-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all text-sm font-medium`}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Supplier Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Supplier Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">KYC Status</span>
            <span className={`font-medium ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {isVerified ? "✓ Verified" : "Pending"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">GST Status</span>
            <span className={`font-medium ${isGstVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isGstVerified ? "✓ Verified" : "Pending"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{supplier.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Mobile</span>
            <span className="font-medium text-gray-900">{supplier.mobile}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-500">Joined</span>
            <span className="font-medium text-gray-900">{new Date(supplier.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          {supplier.gstBusinessName && (
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500">GST Business Name</span>
              <span className="font-medium text-emerald-700">{supplier.gstBusinessName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}