"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Package, Store, Truck, Shield, ArrowRight, Check, 
  BarChart3, ShoppingCart, CreditCard,
  LogOut, Menu, X, TrendingUp, Star, Play,
  Smartphone, Apple, Download, Users, Globe, Zap,
  ChevronRight, Headphones, Clock, IndianRupee, Building2
} from "lucide-react";
import { toast } from "sonner";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [platform, setPlatform] = useState({
    name: 'PROCURE',
    description: 'Enterprise procurement platform for modern businesses.',
    supportEmail: 'support@procure.com',
    supportPhone: '1800-PROCURE',
  });

  useEffect(() => {
    fetchUser();
    fetchPlatform();
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) setUser(data.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchPlatform = async () => {
    try {
      const res = await fetch('/api/public/settings');
      const data = await res.json();
      if (data.platform) setPlatform(data.platform);
    } catch {}
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    toast.success("Logged out");
  };

  const roles = user?.roles || [];
  const isSupplier = roles.includes("SUPPLIER") || roles.includes("SUPPLIER_ADMIN");
  const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto animate-bounce shadow-xl shadow-orange-200">
            <Package className="h-8 w-8 text-white" />
          </div>
          <p className="mt-4 text-gray-500">Loading {platform.name}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-200 group-hover:shadow-orange-300 group-hover:scale-105 transition-all">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">{platform.name}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {["Features", "How It Works", "Download App"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isSupplier && (
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 font-medium">Dashboard</Button>
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="font-medium">Admin Panel</Button>
                  </Link>
                )}
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{user.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-200 font-semibold rounded-xl">
                    Get Started <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 rounded-xl hover:bg-gray-100">
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white border-t shadow-xl px-4 py-4 space-y-2 animate-in slide-in-from-top">
            {["Features", "How It Works", "Download App"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMobileMenu(false)}
                className="block px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50">
                {item}
              </a>
            ))}
            <div className="pt-2 border-t">
              {user ? (
                <>
                  {isSupplier && <Link href="/dashboard" className="block px-4 py-3 text-sm font-medium text-orange-600">Dashboard</Link>}
                  {isAdmin && <Link href="/admin" className="block px-4 py-3 text-sm font-medium">Admin Panel</Link>}
                  <button onClick={handleLogout} className="block px-4 py-3 text-sm text-red-500">Logout</button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Link href="/login" className="flex-1"><Button variant="outline" className="w-full rounded-xl">Sign In</Button></Link>
                  <Link href="/register" className="flex-1"><Button className="w-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-xl">Register</Button></Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center px-4 overflow-hidden bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-200/40 to-yellow-200/40 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-200/40 to-pink-200/40 blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-4 h-4 rounded-full bg-orange-400 animate-float" />
          <div className="absolute top-1/3 left-1/4 w-3 h-3 rounded-full bg-rose-400 animate-float-delayed" />
          <div className="absolute bottom-1/3 right-1/3 w-5 h-5 rounded-full bg-yellow-400 animate-float" />
        </div>

        <div className="max-w-7xl mx-auto relative w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-sm border border-orange-200 shadow-lg shadow-orange-100">
                <span className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />)}
                </span>
                <span className="text-sm font-semibold text-gray-700">Trusted by 2,500+ businesses</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
                India's Smartest{" "}
                <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 bg-clip-text text-transparent">B2B</span>
                <br />Procurement Platform
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed">
                From small retailers to large enterprises — source products, manage orders, and grow your business with zero commission on signup.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <>
                    {isSupplier && (
                      <Link href="/dashboard">
                        <Button size="lg" className="text-base px-8 h-14 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-2xl shadow-orange-200 rounded-2xl font-bold">
                          Go to Dashboard <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                      </Link>
                    )}
                    {isAdmin && (
                      <Link href="/admin">
                        <Button size="lg" variant="outline" className="text-base px-8 h-14 rounded-2xl font-bold border-2">
                          Admin Panel <Shield className="h-5 w-5 ml-2" />
                        </Button>
                      </Link>
                    )}
                    {!isSupplier && !isAdmin && (
                      <Link href="/dashboard/become-supplier">
                        <Button size="lg" className="text-base px-8 h-14 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-2xl shadow-orange-200 rounded-2xl font-bold">
                          Become a Supplier <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/register">
                      <Button size="lg" className="text-base px-8 h-14 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-2xl shadow-orange-200 rounded-2xl font-bold">
                        Start Free Trial <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>
                    </Link>
                    <Link href="#how-it-works">
                      <Button size="lg" variant="outline" className="text-base px-8 h-14 rounded-2xl font-bold border-2 hover:bg-gray-50">
                        <Play className="h-5 w-5 mr-2 fill-orange-500 text-orange-500" /> How It Works
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> Free registration</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> 24/7 support</span>
              </div>
            </div>

            {/* Hero Image */}
            <div className="hidden lg:block relative">
              <div className="relative w-full h-[500px]">
                <div className="absolute top-0 right-0 w-80 h-96 bg-white rounded-3xl shadow-2xl p-6 rotate-3 animate-float border border-gray-100">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                      <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                      <div className="h-20 bg-gradient-to-br from-orange-100 to-rose-100 rounded-xl mt-3" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-16 bg-gray-50 rounded-xl" />
                        <div className="h-16 bg-gray-50 rounded-xl" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-10 left-0 w-72 h-80 bg-white rounded-3xl shadow-2xl p-6 -rotate-2 animate-float-delayed border border-gray-100">
                  <div className="space-y-3">
                    <div className="h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl" />
                    <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                    <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                    <div className="flex gap-1 mt-2">
                      {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400" />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-bold text-orange-500 uppercase tracking-wider">Why {platform.name}</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3">Everything You Need</h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">One platform for your entire procurement workflow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Store, title: "Supplier Portal", desc: "Manage products, inventory, orders. Real-time analytics. Multi-warehouse with zone/shelf/bin tracking.", gradient: "from-orange-500 to-yellow-500", bg: "bg-orange-50", shadow: "shadow-orange-100" },
              { icon: ShoppingCart, title: "Smart Procurement", desc: "AI-powered recommendations. RFQ with quotation comparison. Bulk ordering with multi-tier pricing.", gradient: "from-purple-500 to-pink-500", bg: "bg-purple-50", shadow: "shadow-purple-100" },
              { icon: Truck, title: "Logistics Network", desc: "Live delivery tracking. Route optimization for 9 vehicle types. OTP verification & digital signatures.", gradient: "from-green-500 to-emerald-500", bg: "bg-green-50", shadow: "shadow-green-100" },
              { icon: Shield, title: "Enterprise Security", desc: "RBAC with 32 permissions. KYC verification. Fraud detection with 6 alert types.", gradient: "from-red-500 to-rose-500", bg: "bg-red-50", shadow: "shadow-red-100" },
              { icon: BarChart3, title: "Advanced Analytics", desc: "Real-time monitoring. Tax reports (GSTR-1). Revenue analytics with CSV downloads.", gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-50", shadow: "shadow-blue-100" },
              { icon: CreditCard, title: "Seamless Payments", desc: "Razorpay: UPI, cards, netbanking. Auto commission. Supplier wallet with settlements.", gradient: "from-teal-500 to-cyan-500", bg: "bg-teal-50", shadow: "shadow-teal-100" },
            ].map(({ icon: Icon, title, desc, gradient, bg, shadow }) => (
              <div key={title} className="group relative p-8 rounded-3xl border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-500 bg-white hover:-translate-y-2">
                <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-xl ${shadow} transition-all duration-300`}>
                  <Icon className={`h-7 w-7 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-bold text-orange-500 uppercase tracking-wider">Simple Process</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3">Start in 3 Easy Steps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Building2, title: "Register Business", desc: "Create account, upload KYC, and get GST auto-verified. Go live in 24-48 hours.", gradient: "from-orange-500 to-yellow-500" },
              { step: "02", icon: Package, title: "List Products", desc: "Add products with images, variants, pricing tiers, and HSN codes. Set up warehouses.", gradient: "from-purple-500 to-pink-500" },
              { step: "03", icon: TrendingUp, title: "Start Earning", desc: "Go online, receive orders, fulfill deliveries, and get automated settlements.", gradient: "from-green-500 to-emerald-500" },
            ].map(({ step, icon: Icon, title, desc, gradient }) => (
              <div key={step} className="relative text-center group">
                <div className={`w-24 h-24 mx-auto rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 relative z-10`}>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <span className="text-5xl font-black text-gray-100 absolute top-0 left-1/2 -translate-x-1/2 -z-0">{step}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOWNLOAD APP SECTION */}
      <section id="download-app" className="py-24 px-4 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white space-y-6">
              <span className="text-sm font-bold text-orange-400 uppercase tracking-wider">Coming Soon</span>
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">Get the {platform.name} App</h2>
              <p className="text-lg text-gray-300 max-w-md">Download our mobile app for the best procurement experience — browse products, track orders, and manage your business on the go.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex items-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl font-semibold hover:bg-gray-100 transition shadow-xl shadow-orange-500/20 group">
                  <Apple className="h-8 w-8" />
                  <div className="text-left">
                    <p className="text-xs text-gray-500">Download on the</p>
                    <p className="text-lg font-bold">App Store</p>
                  </div>
                  <Download className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                </button>
                <button className="flex items-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl font-semibold hover:bg-gray-100 transition shadow-xl shadow-orange-500/20 group">
                  <Smartphone className="h-8 w-8" />
                  <div className="text-left">
                    <p className="text-xs text-gray-500">Get it on</p>
                    <p className="text-lg font-bold">Google Play</p>
                  </div>
                  <Download className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative w-64 h-[500px] bg-white rounded-[3rem] shadow-2xl border-8 border-gray-800 overflow-hidden rotate-6 hover:rotate-0 transition-all duration-700">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-gray-800 rounded-b-2xl z-10" />
                <div className="p-4 pt-10 space-y-3 h-full bg-gradient-to-b from-orange-50 to-white">
                  <div className="h-8 bg-orange-100 rounded-xl w-2/3" />
                  <div className="h-32 bg-gradient-to-br from-orange-200 to-rose-200 rounded-2xl" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded-full w-full" />
                    <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-20 bg-gray-50 rounded-xl" />
                    <div className="h-20 bg-gray-50 rounded-xl" />
                    <div className="h-20 bg-gray-50 rounded-xl" />
                    <div className="h-20 bg-gray-50 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white">Ready to Transform Your Business?</h2>
          <p className="mt-6 text-xl text-white/90">Join thousands of businesses already using {platform.name}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            {!user ? (
              <Link href="/register">
                <Button size="lg" className="text-base px-10 h-14 bg-white text-gray-900 hover:bg-gray-100 rounded-2xl font-bold shadow-2xl">
                  Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            ) : isSupplier ? (
              <Link href="/dashboard">
                <Button size="lg" className="text-base px-10 h-14 bg-white text-gray-900 hover:bg-gray-100 rounded-2xl font-bold shadow-2xl">
                  Go to Dashboard <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* DYNAMIC FOOTER */}
      <footer className="py-16 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">{platform.name}</span>
              </div>
              <p className="text-sm leading-relaxed">{platform.description}</p>
              <div className="flex gap-3 mt-4">
                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-500 transition cursor-pointer">
                  <span className="text-white text-xs font-bold">X</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-500 transition cursor-pointer">
                  <span className="text-white text-xs font-bold">f</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-500 transition cursor-pointer">
                  <span className="text-white text-xs">in</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Solutions</h4>
              <div className="space-y-3 text-sm">
                <p className="hover:text-white transition cursor-pointer">For Suppliers</p>
                <p className="hover:text-white transition cursor-pointer">For Buyers</p>
                <p className="hover:text-white transition cursor-pointer">For Delivery Partners</p>
                <p className="hover:text-white transition cursor-pointer">For Enterprises</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Features</h4>
              <div className="space-y-3 text-sm">
                <p className="hover:text-white transition cursor-pointer">Product Sourcing</p>
                <p className="hover:text-white transition cursor-pointer">Order Management</p>
                <p className="hover:text-white transition cursor-pointer">Bulk Procurement (RFQ)</p>
                <p className="hover:text-white transition cursor-pointer">Real-time Tracking</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Contact</h4>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2"><Headphones className="h-4 w-4" /> {platform.supportEmail}</p>
                <p className="flex items-center gap-2"><Headphones className="h-4 w-4" /> {platform.supportPhone}</p>
                {platform.url && (
                  <p className="flex items-center gap-2"><Globe className="h-4 w-4" /> {platform.url.replace('https://', '')}</p>
                )}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} {platform.name}. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white transition cursor-pointer">Privacy Policy</span>
              <span className="hover:text-white transition cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}