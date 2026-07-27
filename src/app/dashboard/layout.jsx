import Sidebar from "@/components/layouts/Sidebar";

export const metadata = {
  title: "Dashboard - PROCURE",
};

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-muted/30">
        {children}
      </main>
    </div>
  );
}