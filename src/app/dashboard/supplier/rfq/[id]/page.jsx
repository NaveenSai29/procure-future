"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, DollarSign, Clock, Package,
  Send, CheckCircle, Calendar, User, MessageCircle,
  Tag, AlertCircle,
} from "lucide-react";

export default function SupplierRFQDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myResponse, setMyResponse] = useState(null);
  const [myQuotation, setMyQuotation] = useState(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
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
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Parse description - handle both JSON and plain text
  const getRFQInfo = () => {
    if (!rfq?.description) return {};
    try {
      const parsed = JSON.parse(rfq.description);
      return {
        productName: parsed.productName || null,
        marketPrice: parsed.marketPrice || null,
        expectedPrice: parsed.expectedPrice || null,
        neededBy: parsed.neededBy || null,
        notes: parsed.notes || null,
        isJson: true,
      };
    } catch (e) {
      return { isJson: false, raw: rfq.description };
    }
  };

  const rfqInfo = getRFQInfo();

  const handleExpressInterest = async () => {
    try {
      const res = await fetch(`/api/rfq/${id}/respond`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Interest registered! Now send your quotation.");
        fetchRFQ();
        setShowQuoteForm(true);
      } else { toast.error(data.message); }
    } catch { toast.error("Failed"); }
  };

  const submitQuotation = async () => {
    if (!quoteAmount || !deliveryDays) {
      toast.error("Please fill price and delivery time");
      return;
    }
    setSubmitting(true);
    try {
      const unitPrice = parseFloat(quoteAmount);
      const totalAmount = unitPrice * (rfq.quantity || 1);
      
      const res = await fetch(`/api/rfq/${id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            name: rfqInfo.productName || rfq.title,
            quantity: rfq.quantity,
            unitPrice: unitPrice,
            totalPrice: totalAmount,
          }],
          totalAmount,
          terms: quoteMessage,
          deliveryDays: parseInt(deliveryDays),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Quotation sent successfully!");
        fetchRFQ();
        setShowQuoteForm(false);
        setQuoteAmount("");
        setQuoteMessage("");
        setDeliveryDays("");
      } else { toast.error(data.message); }
    } catch { toast.error("Failed to send quotation"); }
    finally { setSubmitting(false); }
  };

  const getStatusColor = (status) => {
    const colors = {
      PUBLISHED: "bg-blue-100 text-blue-700",
      CLOSED: "bg-gray-100 text-gray-600",
      AWARDED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">RFQ not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" /> Back
          </button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(rfq.status)}`}>
            {rfq.status}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Buyer Info */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <User className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{rfq.buyer?.name || "Buyer"}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(rfq.createdAt).toLocaleDateString()}</span>
                {rfq.deadline && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <Clock className="h-3.5 w-3.5" />Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RFQ Details */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" /> Request Details
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Product</p>
              <p className="font-semibold text-gray-900 mt-1">{rfqInfo.productName || rfq.title?.replace('RFQ: ', '')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Quantity</p>
              <p className="font-semibold text-gray-900 mt-1">{rfq.quantity} {rfq.unit || 'units'}</p>
            </div>
          </div>

          {rfqInfo.marketPrice && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs text-blue-600 uppercase tracking-wide">Market Price</p>
                <p className="font-bold text-blue-700 mt-1 text-lg">₹{Number(rfqInfo.marketPrice).toLocaleString()}/{rfq.unit}</p>
              </div>
              {rfqInfo.expectedPrice && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wide">Buyer's Offer Price</p>
                  <p className="font-bold text-green-700 mt-1 text-lg">₹{Number(rfqInfo.expectedPrice).toLocaleString()}/{rfq.unit}</p>
                </div>
              )}
            </div>
          )}

          {rfqInfo.neededBy && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 mb-4">
              <p className="text-xs text-orange-600 uppercase tracking-wide">Needed By</p>
              <p className="font-semibold text-orange-700 mt-1">
                {new Date(rfqInfo.neededBy).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {rfqInfo.notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Additional Notes</p>
              <p className="text-sm text-gray-700 mt-1">{rfqInfo.notes}</p>
            </div>
          )}

          {rfqInfo.isJson === false && rfqInfo.raw && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{rfqInfo.raw}</p>
            </div>
          )}
        </div>

        {/* Your Response */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-orange-500" /> Your Response
          </h3>

          {/* No response yet */}
          {!myResponse && rfq.status === 'PUBLISHED' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4 border border-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700">Opportunity Available</p>
                  <p className="text-sm text-blue-600 mt-1">You haven't responded to this RFQ. Express interest and send your best quotation.</p>
                </div>
              </div>
              <Button onClick={handleExpressInterest} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base">
                <CheckCircle className="h-5 w-5 mr-2" /> I'm Interested — Send Quotation
              </Button>
            </div>
          )}

          {/* Response submitted - showing what was sent */}
          {myResponse && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3 border border-green-100">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700 font-medium">You responded on {new Date(myResponse.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Show what supplier sent */}
              {myQuotation && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm font-medium text-gray-700 mb-3">Your Quotation Details:</p>
                  <div className="space-y-3">
                    {myQuotation.items?.map((item, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name}</span>
                          <span className="font-medium">x{item.quantity}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-gray-500">Price per unit:</span>
                          <span className="font-semibold">₹{Number(item.unitPrice).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500">Line total:</span>
                          <span className="font-semibold">₹{Number(item.totalPrice).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t font-semibold text-base">
                      <span>Total Amount:</span>
                      <span className="text-orange-600">₹{Number(myQuotation.totalAmount).toLocaleString()}</span>
                    </div>
                    {myQuotation.deliveryDays && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery Time:</span>
                        <span>{myQuotation.deliveryDays} days</span>
                      </div>
                    )}
                    {myQuotation.terms && (
                      <div className="bg-white rounded-lg p-3 border mt-2">
                        <p className="text-xs text-gray-500 mb-1">Your Message:</p>
                        <p className="text-sm text-gray-700">{myQuotation.terms}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        myQuotation.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-700' :
                        myQuotation.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {myQuotation.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Show send quotation button if responded but not quoted */}
              {!myQuotation && !showQuoteForm && (
                <Button onClick={() => setShowQuoteForm(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  <DollarSign className="h-4 w-4 mr-2" /> Send Quotation Now
                </Button>
              )}
            </div>
          )}

          {/* Quotation Form */}
          {showQuoteForm && (
            <div className="border-2 border-orange-200 rounded-xl p-5 space-y-4 bg-orange-50/50 mt-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-orange-500" /> Send Your Best Quotation
              </h4>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Price per {rfq.unit || 'unit'} (₹)
                </label>
                <Input
                  type="number"
                  placeholder="Enter your best price per unit"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="text-lg"
                />
                {rfqInfo.marketPrice && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Market price: ₹{Number(rfqInfo.marketPrice).toLocaleString()}/{rfq.unit}
                  </p>
                )}
                {quoteAmount && (
                  <div className="mt-3 bg-white rounded-lg p-3 border">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Per {rfq.unit}:</span>
                      <span className="font-semibold">₹{Number(quoteAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Quantity:</span>
                      <span>{rfq.quantity} {rfq.unit}(s)</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2 pt-2 border-t font-bold">
                      <span>Total:</span>
                      <span className="text-orange-600">₹{(Number(quoteAmount) * rfq.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Delivery Time (days)</label>
                <Input
                  type="number"
                  placeholder="e.g., 7"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Message to Buyer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Any terms, conditions, delivery details..."
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={() => setShowQuoteForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={submitQuotation} disabled={submitting} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  {submitting ? "Sending..." : "Submit Quotation"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}