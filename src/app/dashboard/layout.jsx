import Sidebar from "@/components/layouts/Sidebar";
import Script from "next/script";

export const metadata = {
  title: "Dashboard - PROCURE",
};

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* Razorpay Script for AI Credit Purchase */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <Sidebar />
      <main className="flex-1 p-6 bg-muted/30">
        {children}
      </main>
    </div>
  );
}