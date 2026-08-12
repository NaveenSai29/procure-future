"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw, Search, Filter, CheckCircle, XCircle, Truck, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    try {
      const res = await fetch("/api/returns");
      const data = await res.json();
      if (data.success) setReturns(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (returnId, status, refundAmount) => {
    try {
      const res = await fetch(`/api/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, refundAmount }),
        });
      const data = await res.json();
      if (data.success) { toast.success(`Return ${status.toLowerCase()}!`); fetchReturns(); }
      else { toast.error(data.message); }
    } catch { toast.error("Failed"); }
  };

  const filtered = returns.filter(r => {
    if (filter === "pending") return r.status === "PENDING";
    if (filter === "approved") return r.status === "APPROVED";
    if (filter === "completed") return r.status === "COMPLETED";
    return true;
  });

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-blue-100 text-blue-700",
    REJECTED: "bg-red-100 text-red-700",
    PICKED_UP: "bg-purple-100 text-purple-700",
    INSPECTING: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100 text-green-700",
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="h-6 w-6 text-primary" />Returns & Refunds</h1>
        <p className="text-muted-foreground">{returns.length} return requests</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "completed"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${filter === f ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-background rounded-xl border p-12 text-center">
          <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No returns</h3>
          <p className="text-muted-foreground">Return requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-background rounded-xl border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${r.status === "PENDING" ? "bg-yellow-50" : r.status === "COMPLETED" ? "bg-green-50" : "bg-blue-50"}`}>
                    <RotateCcw className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{r.order?.product?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Buyer: {r.buyer?.name?.split(' ')[0]} • Qty: {r.order?.quantity} • ₹{r.order?.totalAmount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Reason: {r.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>{r.status}</span>
                  
                  {r.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => updateStatus(r.id, "APPROVED", r.order?.totalAmount)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500" onClick={() => updateStatus(r.id, "REJECTED")}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {r.status === "APPROVED" && (
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(r.id, "COMPLETED", r.refundAmount)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Complete Refund
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "PENDING")}>
                        Undo
                        </Button>
                    </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}