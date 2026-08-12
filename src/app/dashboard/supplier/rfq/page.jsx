"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Search, Clock, DollarSign, Building2, Package, Calendar, Award } from "lucide-react";
import { Input } from "@/components/ui/input";

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

  const parseDescription = (desc) => {
    try {
      const parsed = JSON.parse(desc);
      return {
        isJson: true,
        productName: parsed.productName,
        quantity: parsed.quantity,
        marketPrice: parsed.marketPrice,
        expectedPrice: parsed.expectedPrice,
        neededBy: parsed.neededBy,
        notes: parsed.notes,
      };
    } catch (e) {
      return { isJson: false, raw: desc };
    }
  };

  const filtered = rfqs.filter(r => {
    const matchesFilter = filter === "all" 
      ? true 
      : filter === "open" ? r.status === "PUBLISHED"
      : filter === "awarded" ? r.status === "AWARDED"
      : ["CLOSED", "CANCELLED"].includes(r.status);
    
    if (search) {
      const info = parseDescription(r.description);
      const searchLower = search.toLowerCase();
      return r.title?.toLowerCase().includes(searchLower) ||
        (info.isJson && info.productName?.toLowerCase().includes(searchLower)) ||
        (info.isJson && info.notes?.toLowerCase().includes(searchLower));
    }
    return matchesFilter;
  });

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-600",
    PUBLISHED: "bg-green-100 text-green-700",
    CLOSED: "bg-red-100 text-red-700",
    AWARDED: "bg-yellow-100 text-yellow-700 border border-yellow-300",
    CANCELLED: "bg-red-100 text-red-700",
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
      <p className="text-gray-500 mt-4">Loading RFQs...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RFQ Marketplace</h1>
        <p className="text-gray-500 mt-1">Browse and respond to buyer requests for quotations</p>
      </div>

      <div className="bg-white rounded-xl border p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search RFQs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["all", "open", "awarded", "closed"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                filter === f 
                  ? "bg-orange-500 text-white border-orange-500" 
                  : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No RFQs found</h3>
          <p className="text-gray-500 mt-1">
            {filter === "open" ? "No open requests at the moment." : 
             filter === "awarded" ? "No awarded RFQs yet." :
             "No RFQs match your criteria."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(rfq => {
            const info = parseDescription(rfq.description);
            return (
              <Link
                key={rfq.id}
                href={`/dashboard/supplier/rfq/${rfq.id}`}
                className="bg-white rounded-xl border p-5 hover:shadow-md hover:border-orange-200 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {rfq.title}
                  </h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[rfq.status]}`}>
                    {rfq.status}
                  </span>
                </div>

                {info.isJson ? (
                  <div className="space-y-2 mb-3">
                    {info.productName && (
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                        {info.productName}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Market: ₹{Number(info.marketPrice || 0).toLocaleString()}
                      </span>
                      {info.expectedPrice && (
                        <span className="flex items-center gap-1 text-orange-600 font-medium">
                          Offer: ₹{Number(info.expectedPrice).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {info.neededBy && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Needed by: {new Date(info.neededBy).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {info.notes && (
                      <p className="text-xs text-gray-400 italic">"{info.notes}"</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {rfq.description || "No description"}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {rfq.buyer?.name?.split(' ')[0]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(rfq.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {rfq.status === 'AWARDED' && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <span className="text-xs text-yellow-700 font-medium flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" /> RFQ Awarded to you
                    </span>
                  </div>
                )}

                {rfq.responses?.length > 0 && rfq.status !== 'AWARDED' && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-xs text-orange-600 font-medium">
                      {rfq.responses.length} supplier(s) responded
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}