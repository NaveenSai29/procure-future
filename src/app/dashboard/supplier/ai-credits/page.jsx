"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, Coins, Plus, Minus, Loader2, CheckCircle,
  Wallet, Zap, TrendingUp, Image as ImageIcon, Sparkles
} from "lucide-react";

export default function AICreditsPage() {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState(null);
  const [selectedCredits, setSelectedCredits] = useState(null);

  useEffect(() => {
    fetchCreditsInfo();
  }, []);

  const fetchCreditsInfo = async () => {
    try {
      const res = await fetch('/api/supplier/ai-credits');
      const data = await res.json();
      if (data.success) {
        setCreditsInfo(data.data);
        // Set default selection to 100 credits
        setSelectedCredits(100);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
      toast.error('Failed to load credits info');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic packages based on credits
  const getPackages = () => {
    const pricePerCredit = creditsInfo?.creditPricePerUnit || 1;
    return [
      { credits: 100, label: "Starter", amount: 100 * pricePerCredit },
      { credits: 500, label: "Growth", amount: 500 * pricePerCredit, popular: true },
      { credits: 1000, label: "Business", amount: 1000 * pricePerCredit },
      { credits: 2000, label: "Professional", amount: 2000 * pricePerCredit },
      { credits: 5000, label: "Enterprise", amount: 5000 * pricePerCredit },
    ];
  };

  const packages = creditsInfo ? getPackages() : [];

  const calculateAmount = (credits) => {
    const pricePerCredit = creditsInfo?.creditPricePerUnit || 1;
    return credits * pricePerCredit;
  };

  const handlePurchase = async () => {
    const creditsToBuy = selectedCredits;
    
    if (!creditsToBuy || creditsToBuy <= 0) {
      toast.error('Please select credits amount');
      return;
    }

    setPurchasing(true);
    try {
      const res = await fetch('/api/supplier/ai-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: creditsToBuy }),
      });
      const data = await res.json();

      if (data.success) {
        const options = {
          key: data.data.razorpayKeyId,
          amount: Math.round(data.data.amount * 100),
          currency: 'INR',
          name: 'PROCURE',
          description: `Purchase ${creditsToBuy} AI Credits`,
          order_id: data.data.orderId,
          handler: async function (response) {
            try {
              const verifyRes = await fetch('/api/supplier/ai-credits/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  purchaseId: data.data.purchaseId,
                }),
              });
              const verifyData = await verifyRes.json();

              if (verifyData.success) {
                toast.success(verifyData.message);
                fetchCreditsInfo();
              } else {
                toast.error(verifyData.error || 'Payment verification failed');
              }
            } catch (err) {
              toast.error('Failed to verify payment');
            }
          },
          theme: {
            color: '#F97316',
          },
          modal: {
            ondismiss: function () {
              setPurchasing(false);
              toast.info('Payment cancelled');
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        toast.error(data.error || 'Failed to create order');
      }
    } catch (err) {
      toast.error('Failed to initiate purchase');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/supplier/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6 text-purple-600" /> AI Image Credits
          </h1>
          <p className="text-muted-foreground mt-1">Generate AI product images using credits</p>
        </div>
      </div>

      {/* Stats Cards - Same style as Admin */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4 text-purple-500" />
            Credits Remaining
          </div>
          <p className="text-2xl font-bold mt-2">{creditsInfo?.creditsRemaining || 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4 text-blue-500" />
            Total Images Generated
          </div>
          <p className="text-2xl font-bold mt-2">{creditsInfo?.totalGenerationsUsed || 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-orange-500" />
            Max per Product
          </div>
          <p className="text-2xl font-bold mt-2">{creditsInfo?.maxGenerationsPerProduct || 3}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-yellow-500" />
            Cost per Image
          </div>
          <p className="text-2xl font-bold mt-2">{creditsInfo?.creditCostPerGeneration || 1} credit(s)</p>
        </div>
      </div>

      {/* Purchase Packages */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-lg mb-4">Purchase Credits</h3>
        
        {/* Package Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {packages.map((pkg) => (
            <button
              key={pkg.credits}
              onClick={() => setSelectedCredits(pkg.credits)}
              className={`p-4 rounded-xl border-2 text-center transition-all relative ${
                selectedCredits === pkg.credits
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-purple-300 bg-white'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  POPULAR
                </span>
              )}
              <p className="text-xl font-bold text-gray-900">{pkg.credits}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{pkg.label}</p>
              <p className="text-sm font-semibold text-purple-600 mt-2">
                ₹{pkg.amount}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                ₹{creditsInfo?.creditPricePerUnit || 1}/credit
              </p>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center border rounded-lg">
            <button 
              onClick={() => setSelectedCredits(Math.max(10, (selectedCredits || 100) - 100))}
              className="p-2.5 hover:bg-gray-50 rounded-l-lg"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              value={selectedCredits || ''}
              onChange={(e) => setSelectedCredits(parseInt(e.target.value) || 0)}
              className="border-0 text-center w-28 font-semibold"
              min="10"
            />
            <button 
              onClick={() => setSelectedCredits((selectedCredits || 0) + 100)}
              className="p-2.5 hover:bg-gray-50 rounded-r-lg"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-bold text-gray-900">₹{calculateAmount(selectedCredits || 0)}</span>
          </span>
        </div>
      </div>

      {/* Purchase Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handlePurchase}
          disabled={purchasing || !selectedCredits || selectedCredits <= 0}
          size="lg"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
        >
          {purchasing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              Purchase {selectedCredits || 0} Credits for ₹{calculateAmount(selectedCredits || 0)}
            </>
          )}
        </Button>
      </div>

      {/* How it works - Same style as Admin */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-800">💡 How it works:</p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>• Each AI image costs {creditsInfo?.creditCostPerGeneration || 1} credit(s)</li>
          <li>• Max {creditsInfo?.maxGenerationsPerProduct || 3} AI images per product</li>
          <li>• Upload your own photos - it's FREE!</li>
          <li>• Credits never expire</li>
        </ul>
      </div>
    </div>
  );
}