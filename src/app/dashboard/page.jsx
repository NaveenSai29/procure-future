"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Warehouse, DollarSign, TrendingUp, AlertTriangle, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, supplierRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/supplier/me"),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {supplier.businessName}</h1>
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <span className={`inline-block w-2 h-2 rounded-full ${supplier.isVerified ? "bg-green-500" : "bg-yellow-500"}`} />
            {supplier.isVerified ? "Verified Supplier" : "Pending Verification"} • {supplier.businessType}
          </p>
        </div>
        <Link href="/dashboard/supplier/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

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

        {/* Alerts */}
        <div className="bg-background rounded-xl border">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Alerts
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
                <p>All good! No alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}