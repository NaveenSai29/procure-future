"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Warehouse, DollarSign, TrendingUp, AlertTriangle, Plus, ArrowUp, ArrowDown, Megaphone, Info, X, Clock, Building, Shield, Store, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [supplierSettings, setSupplierSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchAnnouncements();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, supplierRes, settingsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/supplier/me"),
        fetch("/api/supplier/settings"),
      ]);

      const userData = await userRes.json();
      const supplierData = await supplierRes.json();

      if (!userData.success) {
        router.push("/login");
        return;
      }
      setUser(userData.data);

      if (supplierData.success) {
        setSupplier(supplierData.data);
        fetchStats(supplierData.data.id);
      } else {
        setLoading(false);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSupplierSettings(settingsData.settings);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchStats = async (supplierId) => {
    try {
      const res = await fetch(`/api/supplier/stats`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/admin/cms/announcements');
      const data = await res.json();
      if (data.announcements) {
        const now = new Date();
        const relevant = data.announcements.filter(a => {
          if (a.isActive === false) return false;
          if (a.targetUsers && a.targetUsers !== 'ALL' && a.targetUsers !== 'SUPPLIERS') return false;
          if (a.startDate && new Date(a.startDate) > now) return false;
          if (a.endDate && new Date(a.endDate) < now) return false;
          return true;
        });
        setAnnouncements(relevant);
      }
    } catch {}
  };

  const dismissAnnouncement = (id) => {
    setDismissedAnnouncements(prev => [...prev, id]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not a supplier yet
  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h2>
          <p className="text-muted-foreground mb-6">
            Register as a supplier to start managing your products, inventory, and orders on PROCURE.
          </p>
          <Link href="/dashboard/become-supplier">
            <Button size="lg">
              <Store className="h-5 w-5 mr-2" />
              Become a Supplier
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Build alerts for missing items
  const alerts = [];
  const hasShopHours = supplierSettings?.shopOpenTime && supplierSettings?.shopCloseTime;
  const hasBankAccount = supplier?.bankAccounts?.length > 0;
  const isVerified = supplier?.isVerified;
  const isGstVerified = supplier?.gstVerified;

  if (!isVerified) {
    alerts.push({
      icon: Shield,
      title: 'KYC Verification Pending',
      desc: 'Complete your KYC to go online and start selling.',
      href: '/dashboard/supplier/settings?tab=kyc',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      btnText: 'Upload KYC',
    });
  }

  if (!hasShopHours) {
    alerts.push({
      icon: Clock,
      title: 'Shop Hours Not Set',
      desc: 'Your shop is CLOSED. Set your opening hours to accept orders.',
      href: '/dashboard/supplier/settings',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      btnText: 'Set Hours',
    });
  }

  if (!hasBankAccount) {
    alerts.push({
      icon: Building,
      title: 'Bank Account Not Added',
      desc: 'Add your bank account to receive settlement payments.',
      href: '/dashboard/supplier/settings/bank',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      btnText: 'Add Bank',
    });
  }

  if (!isGstVerified) {
    alerts.push({
      icon: Info,
      title: 'GST Not Verified',
      desc: 'Verify your GST to build trust and get more orders.',
      href: '/dashboard/supplier/settings',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      btnText: 'Verify GST',
    });
  }

  const statCards = [
    {
      label: "Today's Orders",
      value: stats?.todayOrders || 0,
      change: "+12%",
      up: true,
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/supplier/orders",
    },
    {
      label: "Active Products",
      value: stats?.activeProducts || 0,
      change: "+5",
      up: true,
      icon: Package,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/dashboard/supplier/products",
    },
    {
      label: "Total Inventory",
      value: stats?.totalInventory || 0,
      change: "-3%",
      up: false,
      icon: Warehouse,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/dashboard/warehouse",
    },
    {
      label: "Revenue (Month)",
      value: `₹${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      change: "+18%",
      up: true,
      icon: DollarSign,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/dashboard/supplier/finance",
    },
  ];

  const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncements.includes(a.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {supplier.businessName}</h1>
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <span className={`inline-block w-2 h-2 rounded-full ${isVerified ? "bg-green-500" : "bg-yellow-500"}`} />
            {isVerified ? "Verified Supplier" : "Pending Verification"} • {supplier.businessType}
            {hasShopHours && <span className="ml-1">• {supplierSettings.shopOpenTime} - {supplierSettings.shopCloseTime}</span>}
          </p>
        </div>
        <Link href="/dashboard/supplier/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Announcements */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-2">
          {visibleAnnouncements.map(a => {
            const colors = {
              INFO: 'bg-blue-50 border-blue-200 text-blue-800',
              WARNING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              SUCCESS: 'bg-green-50 border-green-200 text-green-800',
              MAINTENANCE: 'bg-orange-50 border-orange-200 text-orange-800',
            };
            return (
              <div key={a.id} className={`${colors[a.type] || colors.INFO} border rounded-xl p-4 flex items-start gap-3`}>
                <Megaphone className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-sm mt-0.5 opacity-80">{a.content}</p>
                </div>
                <button onClick={() => dismissAnnouncement(a.id)} className="p-1 hover:bg-black/5 rounded flex-shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Setup Alerts — show what's missing */}
      {alerts.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Action Required
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert, i) => (
              <Link
                key={i}
                href={alert.href}
                className={`${alert.bg} ${alert.border} border rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow group`}
              >
                <alert.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${alert.color}`} />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{alert.desc}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border group-hover:bg-gray-50 flex items-center gap-1 ${alert.color}`}>
                  {alert.btnText} <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Good Banner */}
      {alerts.length === 0 && isVerified && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">All set up! 🎉</p>
            <p className="text-sm text-green-700">Your shop is live and ready to accept orders.</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, change, up, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="bg-background rounded-xl border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`${bg} p-2.5 rounded-lg`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${up ? "text-green-600" : "text-red-600"}`}>
                {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {change}
              </div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders + Alerts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-background rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link href="/dashboard/supplier/orders" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="p-4">
            {stats?.recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{order.product?.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {order.quantity} • {order.buyer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₹{order.totalAmount}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No orders yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-background rounded-xl border">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Low Stock Alerts
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {stats?.lowStockProducts?.length > 0 ? (
              stats.lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-red-600">Low stock: {p.stock || 0} left</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>All good! No low stock alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}