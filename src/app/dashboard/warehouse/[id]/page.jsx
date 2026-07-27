"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Warehouse, MapPin, Package, Plus, Minus, Layers, Edit3, Save, X, Bell, Check } from "lucide-react";

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const [warehouse, setWarehouse] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("10");
  const [action, setAction] = useState("ADD");

  // Edit warehouse state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
  const [updating, setUpdating] = useState(false);

  // Edit min stock inline state
  const [editingMinStock, setEditingMinStock] = useState(null);
  const [newMinStock, setNewMinStock] = useState("");

  useEffect(() => {
    fetchWarehouse();
    fetchProducts();
  }, [id]);

  const fetchWarehouse = async () => {
    try {
      const res = await fetch("/api/warehouses/" + id);
      const data = await res.json();
      if (data.success) setWarehouse(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) setProducts(data.data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = () => {
    if (warehouse) {
      setEditForm({
        name: warehouse.name || '',
        addressLine1: warehouse.addressLine1 || '',
        addressLine2: warehouse.addressLine2 || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        pincode: warehouse.pincode || '',
      });
      setEditing(true);
    }
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.addressLine1 || !editForm.city || !editForm.state || !editForm.pincode) {
      toast.error("All fields except Address Line 2 are required");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Warehouse updated!');
        setEditing(false);
        fetchWarehouse();
      } else {
        toast.error(result.message || result.error);
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const updateInventory = async (inventoryAction) => {
    if (!selectedProduct || !quantity) {
      toast.error("Select product and enter quantity");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: id,
          productId: selectedProduct,
          quantity: parseInt(quantity),
          action: inventoryAction,
          minStockLevel: parseInt(minStockLevel) || 10,
        }),
      });
      const result = await res.json();
      if (result.success) {
        const actionLabels = { ADD: "added", REMOVE: "removed", SET: "updated" };
        toast.success(`Stock ${actionLabels[inventoryAction]}!`);
        setShowForm(false);
        setSelectedProduct("");
        setQuantity("");
        setMinStockLevel("10");
        fetchWarehouse();
      } else {
        toast.error(result.message || result.error);
      }
    } catch {
      toast.error("Failed to update inventory");
    } finally {
      setSaving(false);
    }
  };

  const updateMinStock = async (inventoryId) => {
    if (!newMinStock || parseInt(newMinStock) < 0) {
      toast.error("Enter a valid minimum stock level");
      return;
    }
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: id,
          productId: editingMinStock,
          quantity: parseInt(newMinStock),
          action: "SET_MIN_STOCK",
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Min stock level updated!");
        setEditingMinStock(null);
        fetchWarehouse();
      } else {
        toast.error(result.message || result.error);
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!warehouse) return <div className="p-8">Warehouse not found</div>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/warehouse" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Warehouses
      </Link>

      {/* Warehouse Header */}
      <div className="bg-background rounded-xl border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Warehouse className="h-6 w-6 text-blue-600" />
            </div>
            {editing ? (
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Warehouse Name *</label>
                    <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Main Warehouse" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Address Line 1 *</label>
                    <Input value={editForm.addressLine1} onChange={e => setEditForm({...editForm, addressLine1: e.target.value})} placeholder="123 Street Name" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Address Line 2</label>
                    <Input value={editForm.addressLine2} onChange={e => setEditForm({...editForm, addressLine2: e.target.value})} placeholder="Landmark, Area" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">City *</label>
                    <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} placeholder="Mumbai" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">State *</label>
                    <Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} placeholder="Maharashtra" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Pincode *</label>
                    <Input value={editForm.pincode} onChange={e => setEditForm({...editForm, pincode: e.target.value})} placeholder="400001" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEdit} disabled={updating} size="sm">
                    {updating ? <><span className="animate-spin mr-1">⏳</span> Saving...</> : <><Save className="h-4 w-4 mr-1" /> Save Changes</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold">{warehouse.name}</h1>
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  {warehouse.addressLine1}
                  {warehouse.addressLine2 && `, ${warehouse.addressLine2}`}, {warehouse.city}, {warehouse.state} - {warehouse.pincode}
                </div>
                <button onClick={startEditing} className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1.5 flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit warehouse details
                </button>
              </div>
            )}
          </div>
          {!editing && (
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/dashboard/warehouse/${id}/zones`}>
                <Button variant="outline">
                  <Layers className="h-4 w-4 mr-2" /> Manage Zones
                </Button>
              </Link>
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-2" /> Manage Stock
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stock Form */}
      {showForm && (
        <div className="bg-background rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Update Stock</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {['ADD', 'SET', 'REMOVE'].map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    action === a 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {a === 'ADD' ? '➕ Add' : a === 'SET' ? '📝 Set Exact' : '➖ Remove'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Product *</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {action === 'REMOVE' ? 'Quantity to Remove *' : action === 'SET' ? 'New Exact Quantity *' : 'Quantity to Add *'}
              </label>
              <Input
                type="number"
                min="1"
                placeholder={action === 'SET' ? 'Set to this number' : '100'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Bell className="h-3.5 w-3.5" /> Low Stock Alert
              </label>
              <Input
                type="number"
                min="0"
                placeholder="10"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-0.5">Get notified when stock drops below this</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => updateInventory(action)}
              disabled={saving}
              className={
                action === 'ADD' ? 'bg-green-600 hover:bg-green-700' :
                action === 'REMOVE' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {saving ? 'Updating...' : action === 'ADD' ? 'Add Stock' : action === 'REMOVE' ? 'Remove Stock' : 'Set Stock Level'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-background rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Inventory ({(warehouse.inventory && warehouse.inventory.length) || 0} products)</h2>
          <span className="text-xs text-gray-400">
            Total: {warehouse.inventory?.reduce((s, i) => s + i.availableQty, 0) || 0} units
          </span>
        </div>
        {(!warehouse.inventory || warehouse.inventory.length === 0) ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No inventory</h3>
            <p className="text-muted-foreground">Click "Manage Stock" to add products</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Available</th>
                  <th className="text-left p-4">Reserved</th>
                  <th className="text-left p-4">Damaged</th>
                  <th className="text-left p-4">Min Stock Alert</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {warehouse.inventory.map((inv) => {
                  const isLow = inv.availableQty <= inv.minStockLevel && inv.availableQty > 0;
                  const isOut = inv.availableQty === 0;
                  const isEditingMin = editingMinStock === inv.productId;
                  return (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="p-4 font-medium">{inv.product?.name}</td>
                      <td className="p-4">
                        <span className={(isLow || isOut) ? "text-red-600 font-semibold" : ""}>
                          {inv.availableQty}
                        </span>
                      </td>
                      <td className="p-4">{inv.reservedQty}</td>
                      <td className="p-4">{inv.damagedQty}</td>
                      <td className="p-4">
                        {isEditingMin ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={newMinStock}
                              onChange={(e) => setNewMinStock(e.target.value)}
                              className="w-20 h-8 text-sm"
                              autoFocus
                            />
                            <button onClick={() => updateMinStock(inv.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingMinStock(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{inv.minStockLevel}</span>
                            <button
                              onClick={() => { setEditingMinStock(inv.productId); setNewMinStock(String(inv.minStockLevel)); }}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit min stock alert"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {isOut && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Out of Stock</span>
                        )}
                        {isLow && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                            <Bell className="h-3 w-3" /> Low Stock
                          </span>
                        )}
                        {!isOut && !isLow && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">In Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}