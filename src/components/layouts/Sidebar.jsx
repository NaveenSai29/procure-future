"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Package, Store, LayoutDashboard, ShoppingCart, Warehouse,
  Truck, DollarSign, Users, Settings, BarChart3, ChevronLeft,
  FileText, RotateCcw, Bell, TrendingUp, Megaphone, Building2, Building, MessageSquare, Brain,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const menuItems = [
  {
    group: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { title: "Orders", href: "/dashboard/supplier/orders", icon: ShoppingCart },
    ],
  },
  {
    group: "Catalog",
    items: [
      { title: "Products", href: "/dashboard/supplier/products", icon: Package },
      { title: "Warehouses & Inventory", href: "/dashboard/warehouse", icon: Warehouse },
    ],
  },
  {
    group: "Operations",
    items: [
      { title: "Branches", href: "/dashboard/supplier/branches", icon: Building2 },
      { title: "Delivery", href: "/dashboard/supplier/delivery", icon: Truck },
      { title: "Messages", href: "/dashboard/supplier/messages", icon: MessageSquare },
      { title: "Customers", href: "/dashboard/supplier/customers", icon: Users },
      { title: "RFQ Marketplace", href: "/dashboard/supplier/rfq", icon: FileText },
      { title: "Returns", href: "/dashboard/supplier/returns", icon: RotateCcw },
      { title: "Marketing", href: "/dashboard/supplier/marketing", icon: Megaphone },
      { title: "AI Insights", href: "/dashboard/supplier/ai-insights", icon: Brain },
      { title: "Support", href: "/dashboard/supplier/support", icon: MessageSquare },
    ],
  },
  {
    group: "Finance",
    items: [
      { title: "Finance", href: "/dashboard/supplier/finance", icon: DollarSign },
      { title: "Reports", href: "/dashboard/supplier/reports", icon: BarChart3 },
      { title: "Analytics", href: "/dashboard/supplier/analytics", icon: TrendingUp },
    ],
  },
  {
    group: "Management",
    items: [
      { title: "Bank Accounts", href: "/dashboard/supplier/settings/bank", icon: Building },
      { title: "Staff", href: "/dashboard/supplier/staff", icon: Users },
      { title: "Settings", href: "/dashboard/supplier/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/notifications?limit=1&unreadOnly=true');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.pagination?.unreadCount || 0);
        }
      } catch {}
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/");
  };

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/supplier';
    if (href === '/dashboard/warehouse') return pathname.startsWith('/dashboard/warehouse');
    return pathname.startsWith(href);
  };

  return (
    <aside className={cn("h-screen bg-background border-r flex flex-col transition-all duration-300 sticky top-0", collapsed ? "w-16" : "w-64")}>
      <div className="h-16 flex items-center gap-2 px-4 border-b">
        <Store className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && <span className="text-lg font-bold">Supplier</span>}
        <Button variant="ghost" size="icon" className="ml-auto shrink-0" onClick={() => setCollapsed(!collapsed)}>
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-5 overflow-y-auto">
        {menuItems.map((group) => (
          <div key={group.group}>
            {!collapsed && <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.group}</p>}
            <div className="space-y-1">
              {group.items.map(({ title, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href}
                    className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={collapsed ? title : undefined}>
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{title}</span>}
                    {title === 'Notifications' && unreadCount > 0 && !collapsed && (
                      <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-2 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {!collapsed && <div className="px-4 pb-4 text-xs text-muted-foreground"><p>PROCURE Enterprise v1.0</p></div>}
    </aside>
  );
}