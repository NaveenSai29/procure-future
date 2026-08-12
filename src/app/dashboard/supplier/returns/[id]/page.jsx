"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Package, User, DollarSign, Calendar, CheckCircle, XCircle, Truck } from "lucide-react";

export default function ReturnDetailPage() {
  const { id } = useParams();
  const [returnReq, setReturnReq] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReturn(); }, [id]);

  const fetchReturn = async () => {
    try {
      const res = await fetch(`/api/returns/${id}`);
      const data = await res.json();
      if (data.success) setReturnReq(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (status) => {
    try {
      const res = await fetch(`/api/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, refundAmount: returnReq.refundAmount }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Status updated!`); fetchReturn(); }
      else { toast.error(data.message); }
    } catch { toast.error("Failed"); }
  };

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
    APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
    PICKED_UP: "bg-purple-100 text-purple-700 border-purple-200",
    INSPECTING: "bg-orange-100 text-orange-700 border-orange-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
  };

  const steps = ["PENDING", "APPROVED", "PICKED_UP", "INSPECTING", "COMPLETED"];
  const currentStep = steps.indexOf(returnReq?.status);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!returnReq) return <div className="p-8 text-center">Return not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/supplier/returns" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Returns
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="h-6 w-6 text-primary" />Return Request</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[returnReq.status]}`}>{returnReq.status}</span>
      </div>

      {/* Progress Steps */}
      <div className="bg-background rounded-xl border p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i <= currentStep && currentStep >= 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>
                {i < currentStep ? <CheckCircle className="h-5 w-5" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i <= currentStep ? "text-primary font-medium" : "text-muted-foreground"}`}>{step}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStep ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-background rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><Package className="h-5 w-5" />Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="font-medium">{returnReq.order?.product?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span>{returnReq.order?.quantity}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Order Amount</span><span className="font-bold">₹{returnReq.order?.totalAmount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Refund Amount</span><span className="font-bold text-green-600">₹{returnReq.refundAmount}</span></div>
          </div>
        </div>

        <div className="bg-background rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><User className="h-5 w-5" />Buyer Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{returnReq.buyer?.name?.split(' ')[0]}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reason</span><span className="text-red-600">{returnReq.reason}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{returnReq.returnType}</span></div>
          </div>
        </div>
      </div>

      {returnReq.description && (
        <div className="bg-background rounded-xl border p-6">
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-muted-foreground">{returnReq.description}</p>
        </div>
      )}

      {/* Actions */}
      {returnReq.status === "PENDING" && (
        <div className="flex gap-3">
          <Button className="flex-1 bg-green-500 hover:bg-green-600" size="lg" onClick={() => updateStatus("APPROVED")}>
            <CheckCircle className="h-5 w-5 mr-2" /> Approve Return
          </Button>
          <Button className="flex-1" variant="outline" size="lg" onClick={() => updateStatus("REJECTED")}>
            <XCircle className="h-5 w-5 mr-2" /> Reject
          </Button>
        </div>
      )}

      {returnReq.status === "APPROVED" && (
        <Button className="w-full" size="lg" onClick={() => updateStatus("COMPLETED")}>
          <CheckCircle className="h-5 w-5 mr-2" /> Mark as Refunded & Complete
        </Button>
      )}
    </div>
  );
}