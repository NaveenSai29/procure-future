"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Search, Clock, DollarSign, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SupplierRFQPage() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/rfq?role=supplier")
      .then(r => r.json())
      .then(d => { if (d.success) setRfqs(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = rfqs.filter(r => {
    if (filter === "open") return r.status === "PUBLISHED";
    if (filter === "closed") return ["CLOSED", "AWARDED"].includes(r.status);
    if (search) return r.title?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-600",
    PUBLISHED: "bg-green-100 text-green-700",
    CLOSED: "bg-red-100 text-red-700",
    AWARDED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">RFQ Marketplace</h1>
        <p className="text-muted-foreground">Browse and respond to buyer requests for quotations</p>
      </div>

      <div className="bg-background rounded-xl border p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search RFQs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["all", "open", "closed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium border capitalize ${filter === f ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted"}`}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-background rounded-xl border p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No RFQs found</h3>
          <p className="text-muted-foreground">No open requests at the moment. Check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(rfq => (
            <Link key={rfq.id} href={`/dashboard/supplier/rfq/${rfq.id}`} className="bg-background rounded-xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold">{rfq.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[rfq.status]}`}>{rfq.status}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{rfq.description || "No description"}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {rfq.buyer?.name}</span>
                {rfq.budgetMax && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Up to ₹{rfq.budgetMax?.toLocaleString()}</span>}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(rfq.createdAt).toLocaleDateString()}</span>
              </div>
              {rfq.responses?.length > 0 && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  {rfq.responses.length} supplier(s) responded
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}