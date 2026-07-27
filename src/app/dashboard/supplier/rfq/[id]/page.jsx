"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, FileText, Building2, DollarSign, Clock, Package, Send, CheckCircle } from "lucide-react";

export default function RFQDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myResponse, setMyResponse] = useState(null);
  const [myQuotation, setMyQuotation] = useState(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteItems, setQuoteItems] = useState([]);
  const [terms, setTerms] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRFQ(); }, [id]);

  const fetchRFQ = async () => {
    try {
      const res = await fetch(`/api/rfq/${id}`);
      const data = await res.json();
      if (data.success) {
        setRfq(data.data);
        setMyResponse(data.data.myResponse || null);
        setMyQuotation(data.data.myQuotation || null);
        // Pre-fill quote items from RFQ items
        if (data.data.items?.length > 0) {
          setQuoteItems(data.data.items.map(item => ({
            rfqItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: "",
            totalPrice: "",
          })));
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const submitResponse = async () => {
    try {
      const res = await fetch(`/api/rfq/${id}/respond`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Interest registered!");
        fetchRFQ();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Failed"); }
  };

  const submitQuotation = async () => {
    if (quoteItems.some(i => !i.unitPrice)) {
      toast.error("Please fill all unit prices");
      return;
    }
    setSubmitting(true);
    try {
      const items = quoteItems.map(i => ({
        ...i,
        unitPrice: parseFloat(i.unitPrice),
        totalPrice: parseFloat(i.unitPrice) * i.quantity,
      }));
      const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

      const res = await fetch(`/api/rfq/${id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          totalAmount,
          terms,
          deliveryDays: parseInt(deliveryDays) || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Quotation submitted!");
        setShowQuoteForm(false);
        fetchRFQ();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  const updateQuoteItem = (index, field, value) => {
    const updated = [...quoteItems];
    updated[index][field] = value;
    if (field === "unitPrice") {
      updated[index].totalPrice = (parseFloat(value) || 0) * updated[index].quantity;
    }
    setQuoteItems(updated);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!rfq) return <div className="p-8 text-center">RFQ not found</div>;

  const alreadyQuoted = myQuotation && myQuotation.status !== "REJECTED";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/supplier/rfq" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to RFQs
      </Link>

      <div className="bg-background rounded-xl border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{rfq.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {rfq.buyer?.name}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(rfq.createdAt).toLocaleDateString()}</span>
              {rfq.deadline && <span className="text-red-500">Deadline: {new Date(rfq.deadline).toLocaleDateString()}</span>}
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${rfq.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {rfq.status}
          </span>
        </div>

        {rfq.description && <p className="text-muted-foreground">{rfq.description}</p>}

        {rfq.budgetMax && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Budget: Up to</span>
            <span className="font-bold">₹{rfq.budgetMax.toLocaleString()}</span>
          </div>
        )}

        {/* RFQ Items */}
        {rfq.items?.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Items Required</h3>
            <div className="space-y-2">
              {rfq.items.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.specifications && <p className="text-xs text-muted-foreground">{item.specifications}</p>}
                  </div>
                  <span className="text-sm font-semibold">{item.quantity} {item.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {rfq.status === "PUBLISHED" && (
          <div className="border-t pt-4 space-y-3">
            {!myResponse && !alreadyQuoted && (
              <Button onClick={submitResponse} className="w-full">
                <Send className="h-4 w-4 mr-2" /> I'm Interested — Submit Interest
              </Button>
            )}

            {myResponse && !alreadyQuoted && (
              <div>
                <div className="flex items-center gap-2 text-green-600 text-sm mb-3">
                  <CheckCircle className="h-4 w-4" /> Interest registered
                </div>
                {!showQuoteForm ? (
                  <Button onClick={() => setShowQuoteForm(true)} className="w-full">
                    <FileText className="h-4 w-4 mr-2" /> Submit Quotation
                  </Button>
                ) : (
                  <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-semibold">Submit Quotation</h3>
                    {quoteItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm flex-1">{item.name} (×{item.quantity})</span>
                        <Input
                          type="number"
                          placeholder="Unit price"
                          value={item.unitPrice}
                          onChange={e => updateQuoteItem(i, "unitPrice", e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm font-semibold w-24 text-right">
                          ₹{item.totalPrice?.toLocaleString() || "0"}
                        </span>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs">Delivery (days)</label>
                        <Input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} placeholder="7" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs">Terms & Conditions</label>
                      <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none" placeholder="Payment terms, warranty, etc." />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={submitQuotation} loading={submitting} className="flex-1">
                        <Send className="h-4 w-4 mr-2" /> Submit Quotation
                      </Button>
                      <Button variant="outline" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {alreadyQuoted && (
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Quotation submitted — Status: {myQuotation.status}
                {myQuotation.totalAmount && <span className="font-bold">(₹{myQuotation.totalAmount.toLocaleString()})</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}