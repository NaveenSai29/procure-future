"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Settings, Save, Coins, Image as ImageIcon, 
  TrendingUp, Users, DollarSign, Loader2,
  Plus, Minus, Search, Building2, History, ShoppingCart
} from "lucide-react";

export default function AIGenerationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    freeCredits: 100,
    maxGenerationsPerProduct: 3,
    creditCostPerGeneration: 1,
    creditPricePerUnit: 1.0,
    isEnabled: true,
  });
  const [stats, setStats] = useState({
    totalGenerations: 0,
    suppliersUsingAI: 0,
    creditsPurchased: 0,
    revenueFromCredits: 0,
  });

  // Manual credit management state
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditNote, setCreditNote] = useState("");
  const [manualAction, setManualAction] = useState('add');
  const [manualLoading, setManualLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");

  // History state
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState('purchases'); // 'purchases' or 'generations'
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchSuppliers();
    fetchPurchaseHistory();
    fetchGenerationHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai-generation/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data.settings);
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/admin/suppliers?limit=9999');
      const data = await res.json();
      if (data.success && data.data) {
        const suppliersList = data.data.suppliers || data.data || [];
        setSuppliers(suppliersList);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  const fetchPurchaseHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/ai-generation/purchases');
      const data = await res.json();
      if (data.success) {
        setPurchaseHistory(data.data.purchases || []);
      }
    } catch (err) {
      console.error('Failed to fetch purchase history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchGenerationHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/ai-generation/logs');
      const data = await res.json();
      if (data.success) {
        setGenerationHistory(data.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch generation history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-generation/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings updated successfully!');
        fetchSettings();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleManualCreditAction = async () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }
    if (!creditAmount || parseInt(creditAmount) <= 0) {
      toast.error('Enter valid credit amount');
      return;
    }

    setManualLoading(true);
    try {
      const action = manualAction === 'add' ? 'add' : 'deduct';
      const res = await fetch(`/api/admin/ai-generation/${action}-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          credits: parseInt(creditAmount),
          note: creditNote,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setCreditAmount(100);
        setCreditNote("");
        setSelectedSupplier("");
        fetchSettings();
        fetchSuppliers();
      } else {
        toast.error(data.error || 'Failed to update credits');
      }
    } catch (err) {
      toast.error('Failed to update credits');
    } finally {
      setManualLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.businessName?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.mobile?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> AI Image Generation Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Control AI image generation credits and limits
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4 text-purple-500" />
            Total Generations
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalGenerations}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-blue-500" />
            Suppliers Using AI
          </div>
          <p className="text-2xl font-bold mt-2">{stats.suppliersUsingAI}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4 text-yellow-500" />
            Credits Purchased
          </div>
          <p className="text-2xl font-bold mt-2">{stats.creditsPurchased}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 text-green-500" />
            Revenue
          </div>
          <p className="text-2xl font-bold mt-2">₹{stats.revenueFromCredits}</p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-xl border p-6 space-y-6">
        <h3 className="font-semibold text-lg">Credit Settings</h3>

        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">AI Generation Enabled</p>
            <p className="text-sm text-muted-foreground">Turn AI generation on/off for all suppliers</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium">Free Credits per New Supplier</label>
            <Input
              type="number"
              value={settings.freeCredits}
              onChange={(e) => setSettings({ ...settings, freeCredits: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Given on supplier signup</p>
          </div>

          <div>
            <label className="text-sm font-medium">Max Generations per Product</label>
            <Input
              type="number"
              value={settings.maxGenerationsPerProduct}
              onChange={(e) => setSettings({ ...settings, maxGenerationsPerProduct: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Maximum AI images per product</p>
          </div>

          <div>
            <label className="text-sm font-medium">Credit Cost per Generation</label>
            <Input
              type="number"
              value={settings.creditCostPerGeneration}
              onChange={(e) => setSettings({ ...settings, creditCostPerGeneration: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Credits deducted per AI image</p>
          </div>

          <div>
            <label className="text-sm font-medium">Credit Price (₹ per credit)</label>
            <Input
              type="number"
              step="0.5"
              value={settings.creditPricePerUnit}
              onChange={(e) => setSettings({ ...settings, creditPricePerUnit: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Price when suppliers buy credits</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Manual Credit Management */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Manual Credit Management
        </h3>
        <p className="text-sm text-muted-foreground">
          Manually add or deduct credits from a supplier's account
        </p>

        {/* Supplier Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search supplier by name, email, or mobile..."
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Supplier Select */}
        <div>
          <label className="text-sm font-medium">Select Supplier</label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select supplier...</option>
            {filteredSuppliers.map(s => (
              <option key={s.id} value={s.id}>
                {s.businessName} (Credits: {s.aiCredits || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Action Type */}
        <div className="flex gap-3">
          <button
            onClick={() => setManualAction('add')}
            className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition ${
              manualAction === 'add' 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-gray-200 text-gray-500'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-1" /> Add Credits
          </button>
          <button
            onClick={() => setManualAction('deduct')}
            className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition ${
              manualAction === 'deduct' 
                ? 'border-red-500 bg-red-50 text-red-700' 
                : 'border-gray-200 text-gray-500'
            }`}
          >
            <Minus className="h-4 w-4 inline mr-1" /> Deduct Credits
          </button>
        </div>

        {/* Credit Amount + Note */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Credit Amount</label>
            <Input
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
              className="mt-1"
              min="1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Note (Optional)</label>
            <Input
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
              className="mt-1"
              placeholder="e.g., Bonus credits, Refund, etc."
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleManualCreditAction}
            disabled={manualLoading || !selectedSupplier || !creditAmount}
            className={manualAction === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {manualLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : manualAction === 'add' ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add {creditAmount} Credits
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 mr-2" />
                Deduct {creditAmount} Credits
              </>
            )}
          </Button>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <History className="h-5 w-5" /> History
          </h3>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setHistoryTab('purchases')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                historyTab === 'purchases' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5 inline mr-1" />
              Purchases
            </button>
            <button
              onClick={() => setHistoryTab('generations')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                historyTab === 'generations' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5 inline mr-1" />
              Generations
            </button>
          </div>
        </div>

        <div className="p-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : historyTab === 'purchases' ? (
            purchaseHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No purchase history yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground bg-muted/30">
                      <th className="text-left p-3">Supplier</th>
                      <th className="text-left p-3">Credits</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Payment ID</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseHistory.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-3 text-sm font-medium">{p.supplier?.businessName || '-'}</td>
                        <td className="p-3 text-sm">{p.creditsPurchased}</td>
                        <td className="p-3 text-sm">₹{p.amount}</td>
                        <td className="p-3 text-xs font-mono">{p.razorpayPaymentId || '-'}</td>
                        <td className="p-3">
                          {p.status === 'COMPLETED' ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✅ Completed</span>
                          ) : p.status === 'PENDING' ? (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">⏳ Pending</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">❌ Failed</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            generationHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No generation history yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground bg-muted/30">
                      <th className="text-left p-3">Supplier</th>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">Action</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generationHistory.map((g) => (
                      <tr key={g.id} className="border-b last:border-0">
                        <td className="p-3 text-sm font-medium">{g.supplier?.businessName || '-'}</td>
                        <td className="p-3 text-sm">{g.product?.name || '-'}</td>
                        <td className="p-3 text-xs">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {g.action}
                          </span>
                        </td>
                        <td className="p-3">
                          {g.status === 'SUCCESS' ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✅ Success</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">❌ Failed</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(g.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-800">💡 How it works:</p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>• Each new supplier gets {settings.freeCredits} free credits</li>
          <li>• Each AI image costs {settings.creditCostPerGeneration} credit(s)</li>
          <li>• Max {settings.maxGenerationsPerProduct} AI images per product</li>
          <li>• Suppliers can buy more at ₹{settings.creditPricePerUnit}/credit</li>
          <li>• Admin can manually add/deduct credits anytime</li>
        </ul>
      </div>
    </div>
  );
}