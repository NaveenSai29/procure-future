"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  RotateCcw, Search, CheckCircle, XCircle, Truck, Eye,
  AlertTriangle, Loader2, Package, IndianRupee, User,
  Calendar, X, Boxes
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Custom Confirm Popup
function ConfirmPopup({ isOpen, title, message, confirmText, onConfirm, onCancel, type = 'warning' }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-100' : type === 'success' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <AlertTriangle className={`h-5 w-5 ${type === 'danger' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-yellow-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [confirmPopup, setConfirmPopup] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [showRefundInput, setShowRefundInput] = useState(false);
  const [processing, setProcessing] = useState(false);

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
    setProcessing(true);
    try {
      const res = await fetch(`/api/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, refundAmount }),
      });
      const data = await res.json();
      if (data.success) { 
        toast.success(`Return ${status.toLowerCase()}!`); 
        fetchReturns(); 
        setSelectedReturn(null);
        setShowRefundInput(false);
        setRefundAmount("");
      } else { 
        toast.error(data.message || "Failed"); 
      }
    } catch { toast.error("Failed"); }
    finally { setProcessing(false); }
  };

  const filtered = returns.filter(r => {
    if (filter === "pending") return r.status === "PENDING";
    if (filter === "approved") return r.status === "APPROVED";
    if (filter === "rejected") return r.status === "REJECTED";
    if (filter === "completed") return r.status === "COMPLETED";
    
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches = 
        r.order?.product?.name?.toLowerCase().includes(q) ||
        r.buyer?.name?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    
    return true;
  });

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === "PENDING").length,
    approved: returns.filter(r => r.status === "APPROVED").length,
    completed: returns.filter(r => r.status === "COMPLETED").length,
    rejected: returns.filter(r => r.status === "REJECTED").length,
  };

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-blue-100 text-blue-700",
    REJECTED: "bg-red-100 text-red-700",
    PICKED_UP: "bg-purple-100 text-purple-700",
    INSPECTING: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100 text-green-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Confirm Popup */}
      <ConfirmPopup 
        isOpen={!!confirmPopup}
        title={confirmPopup?.title}
        message={confirmPopup?.message}
        confirmText={confirmPopup?.confirmText}
        type={confirmPopup?.type}
        onConfirm={confirmPopup?.onConfirm}
        onCancel={confirmPopup?.onCancel}
      />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" /> Returns & Refunds
        </h1>
        <p className="text-muted-foreground">{returns.length} return requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          <p className="text-sm text-yellow-600">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-2xl font-bold text-blue-700">{stats.approved}</p>
          <p className="text-sm text-blue-600">Approved</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
          <p className="text-sm text-red-600">Rejected</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-sm text-green-600">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by product, buyer, reason..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          {["all", "pending", "approved", "rejected", "completed"].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Return List */}
      {filtered.length === 0 ? (
        <div className="bg-background rounded-xl border p-12 text-center">
          <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No returns found</h3>
          <p className="text-muted-foreground">Return requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-background rounded-xl border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {/* Product Image */}
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {r.order?.product?.images?.[0]?.url ? (
                      <img src={r.order.product.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{r.order?.product?.name || "Product"}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {r.buyer?.name?.split(' ')[0] || "Buyer"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Boxes className="h-3.5 w-3.5" /> Qty: {r.order?.quantity}
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3.5 w-3.5" /> ₹{r.order?.totalAmount}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>
                    {r.status}
                  </span>
                  
                  {/* View Details */}
                  <Button size="sm" variant="outline" onClick={() => setSelectedReturn(r)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Details
                  </Button>
                  
                  {r.status === "PENDING" && (
                    <>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setConfirmPopup({
                            title: "Approve Return",
                            message: `Approve return for "${r.order?.product?.name}"? Refund amount: ₹${r.order?.totalAmount}`,
                            confirmText: "Approve",
                            type: 'success',
                            onConfirm: () => updateStatus(r.id, "APPROVED", r.order?.totalAmount),
                            onCancel: () => setConfirmPopup(null),
                          });
                        }}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          setConfirmPopup({
                            title: "Reject Return",
                            message: `Reject return for "${r.order?.product?.name}"?`,
                            confirmText: "Reject",
                            type: 'danger',
                            onConfirm: () => updateStatus(r.id, "REJECTED"),
                            onCancel: () => setConfirmPopup(null),
                          });
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}

                  {r.status === "APPROVED" && (
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setShowRefundInput(true);
                        setRefundAmount(String(r.refundAmount || r.order?.totalAmount || ''));
                      }}
                    >
                      <IndianRupee className="h-3.5 w-3.5 mr-1" /> Complete Refund
                    </Button>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-gray-600">Reason:</span> {r.reason}
                </p>
                {r.description && (
                  <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refund Amount Modal */}
      {showRefundInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900">Complete Refund</h3>
            <p className="text-sm text-gray-500 mt-1">Enter refund amount</p>
            <Input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-4"
              placeholder="₹0.00"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowRefundInput(false); setRefundAmount(""); }}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!refundAmount || parseFloat(refundAmount) <= 0) {
                    toast.error("Enter valid refund amount");
                    return;
                  }
                  setConfirmPopup({
                    title: "Complete Refund",
                    message: `Process refund of ₹${refundAmount}?`,
                    confirmText: "Process Refund",
                    type: 'success',
                    onConfirm: () => updateStatus(selectedReturn?.id, "COMPLETED", parseFloat(refundAmount)),
                    onCancel: () => setConfirmPopup(null),
                  });
                }}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReturn(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-gray-900">Return Details</h3>
                <button onClick={() => setSelectedReturn(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Product Info */}
              <div className="mt-4 flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  {selectedReturn.order?.product?.images?.[0]?.url ? (
                    <img src={selectedReturn.order.product.images[0].url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="h-7 w-7 text-gray-300" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedReturn.order?.product?.name}</p>
                  <p className="text-sm text-gray-500">Qty: {selectedReturn.order?.quantity} • ₹{selectedReturn.order?.totalAmount}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Return ID</p>
                  <p className="font-medium font-mono text-xs">{selectedReturn.id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedReturn.status]}`}>
                    {selectedReturn.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Buyer</p>
                  <p className="font-medium">{selectedReturn.buyer?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Requested On</p>
                  <p className="font-medium">{new Date(selectedReturn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-gray-500">Refund Type</p>
                  <p className="font-medium">{selectedReturn.returnType || "REFUND"}</p>
                </div>
                {selectedReturn.refundAmount && (
                  <div>
                    <p className="text-gray-500">Refund Amount</p>
                    <p className="font-medium">₹{selectedReturn.refundAmount}</p>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="mt-4">
                <p className="text-gray-500 text-sm">Reason</p>
                <p className="text-sm text-gray-700 mt-1 font-medium">{selectedReturn.reason}</p>
                {selectedReturn.description && (
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{selectedReturn.description}</p>
                )}
              </div>

              {/* Images if any */}
              {selectedReturn.images && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Return Images</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {JSON.parse(selectedReturn.images || '[]').map((img, i) => (
                      <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                    ))}
                  </div>
                </div>
              )}

              {/* Close */}
              <button
                onClick={() => setSelectedReturn(null)}
                className="w-full mt-6 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}