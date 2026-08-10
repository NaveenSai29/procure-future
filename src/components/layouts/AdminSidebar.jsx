"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Store, Package, ShoppingCart, Settings,
  Shield, ChevronLeft, Bell, BarChart3, Truck,
  RotateCcw, Activity, Database,
  Megaphone, CreditCard, Image,
  Globe, ShieldCheck, MessageSquare, FolderOpen, Hash, Receipt, Map,
  BadgeCheck, Zap, AlertTriangle, Lock, ClipboardList, HeartHandshake,
  ScrollText, Tag, Layers, Landmark, Banknote, TrendingUp,
  PieChart, Radio, ListTodo, Wrench, Server, Key, LogOut, UserPlus, Wallet,
  Bike, Building2, IndianRupee, Users2, FileText,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const menuGroups = [
  {
    group: "Dashboard",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
      { title: "Analytics", href: "/admin/analytics", icon: PieChart },
      { title: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    group: "Buyers",
    items: [
      { title: "Users / Buyers", href: "/admin/users", icon: Users },
      { title: "RFQ Management", href: "/admin/rfq", icon: ClipboardList },
      { title: "Messages", href: "/admin/messages", icon: MessageSquare },
      { title: "Referrals", href: "/admin/referrals", icon: UserPlus },
      { title: "Wallet", href: "/admin/wallet", icon: Wallet },
    ],
  },
  {
    group: "Suppliers",
    items: [
      { title: "Suppliers", href: "/admin/suppliers", icon: Store },
      { title: "KYC Verification", href: "/admin/kyc", icon: ShieldCheck },
      { title: "Products", href: "/admin/products", icon: Package },
      { title: "Categories", href: "/admin/categories", icon: Layers },
      { title: "Brands", href: "/admin/brands", icon: Tag },
      { title: "GST Verification", href: "/admin/gst", icon: BadgeCheck },
      { title: "HSN Codes", href: "/admin/hsn", icon: Hash },
      { title: "Supplier Settlements", href: "/admin/finance", icon: IndianRupee },
    ],
  },
  {
    group: "Orders & Delivery",
    items: [
      { title: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { title: "Deliveries", href: "/admin/deliveries", icon: Truck },
      { title: "Delivery Partners", href: "/admin/delivery-partners", icon: Bike },
      { title: "Delivery Chats", href: "/admin/delivery-chats", icon: MessageSquare },
      { title: "COD Deposits", href: "/admin/wallet/cod-deposits", icon: Banknote },
      { title: "Delivery Settlements", href: "/admin/finance/settlements", icon: CreditCard },
      { title: "Live Map", href: "/admin/map", icon: Map },
      { title: "Returns & Refunds", href: "/admin/returns", icon: RotateCcw },
    ],
  },
  {
    group: "Finance",
    items: [
      { title: "Payments", href: "/admin/finance/payments", icon: CreditCard },
      { title: "Bank Accounts", href: "/admin/finance/bank-accounts", icon: Landmark },
      { title: "Tax Reports", href: "/admin/reports/tax", icon: Receipt },
    ],
  },
  {
    group: "Marketing",
    items: [
      { title: "Marketing", href: "/admin/marketing", icon: Radio },
      { title: "Banners", href: "/admin/cms/banners", icon: Image },
      { title: "Announcements", href: "/admin/cms/announcements", icon: Megaphone },
    ],
  },
  {
    group: "Content",
    items: [
      { title: "CMS Pages", href: "/admin/cms", icon: ScrollText },
      { title: "Media Library", href: "/admin/media", icon: FolderOpen },
    ],
  },
  {
    group: "Support",
    items: [
      { title: "Support Tickets", href: "/admin/support", icon: HeartHandshake },
    ],
  },
  {
    group: "System",
    items: [
      { title: "Settings", href: "/admin/settings", icon: Wrench },
      { title: "API Management", href: "/admin/api-management", icon: Key },
      { title: "Monitoring", href: "/admin/monitoring", icon: Activity },
      { title: "System Health", href: "/admin/health", icon: Server },
      { title: "Fraud Detection", href: "/admin/fraud", icon: AlertTriangle },
      { title: "Security", href: "/admin/security", icon: Lock },
      { title: "Audit Logs", href: "/admin/audit-logs", icon: ListTodo },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);

  // Build a Set of all menu hrefs for quick lookup
  const allMenuHrefs = useMemo(() => {
    const hrefs = new Set();
    menuGroups.forEach(group => {
      group.items.forEach(item => hrefs.add(item.href));
    });
    return hrefs;
  }, []);

  // Poll unread delivery chat count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/admin/delivery-chats?unreadOnly=true');
        const data = await res.json();
        if (data.success) setUnreadChats(data.data?.unreadCount || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/");
  };

  const isActive = (href, exact = false) => {
    // Exact match requested
    if (exact) {
      return pathname === href;
    }

    // Dashboard special case
    if (href === '/admin') {
      return pathname === '/admin';
    }

    // Check if this href is a PARENT of another menu item
    const isParentRoute = Array.from(allMenuHrefs).some(
      otherHref => otherHref !== href && otherHref.startsWith(href + '/')
    );

    if (isParentRoute) {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside
      className={cn(
        "h-screen bg-background border-r flex flex-col transition-all duration-300 sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-16 flex items-center gap-2 px-4 border-b">
        <Zap className="h-6 w-6 text-red-600 shrink-0" />
        {!collapsed && <span className="text-lg font-bold">Admin Panel</span>}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-5 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.group}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ title, href, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                const isChats = href === '/admin/delivery-chats';
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                      active
                        ? "bg-red-50 text-red-700"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={collapsed ? title : undefined}
                  >
                    <div className="relative shrink-0">
                      <Icon className="h-5 w-5" />
                      {isChats && unreadChats > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold leading-none">
                          {unreadChats > 99 ? '99+' : unreadChats}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <span className="flex-1">{title}</span>
                    )}
                    {isChats && unreadChats > 0 && !collapsed && (
                      <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                        {unreadChats > 99 ? '99+' : unreadChats}
                      </span>
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

      {!collapsed && (
        <div className="px-4 pb-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            PROCURE Admin v1.0
          </p>
        </div>
      )}
    </aside>
  );
}