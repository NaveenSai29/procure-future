"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Warehouse, Plus, MapPin, Package, Layers, CheckCircle, AlertTriangle } from "lucide-react";

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [whRes, invRes] = await Promise.all([
        fetch("/api/warehouses"),
        fetch("/api/inventory?summary=true")
      ]);
      
      const whData = await whRes.json();
      const invData = await invRes.json();
      
      if (whData.success) {
        setWarehouses(whData.data || []);
      }
      if (invData.success) {
        setSummary(invData.data || invData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Warehouse created!");
        reset();
        setShowForm(false);
        fetchData();
      } else {
        toast.error(result.message || result.error);
      }
    } catch {
      toast.error("Failed to create warehouse");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
      </div>
    </div>
  );

  const totalProducts = summary?.totalProducts || warehouses.reduce((sum, w) => sum + (w._count?.inventory || 0), 0);
  const totalStock = summary?.totalStock || 0;
  const lowStock = summary?.lowStock || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses & Inventory</h1>
          <p className="text-gray-500 mt-1">{warehouses.length} warehouses • {totalProducts} products in stock</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Warehouse
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{warehouses.length}</p>
          <p className="text-xs text-gray-500">Warehouses</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xl font-bold text-green-600">{totalProducts}</p>
          <p className="text-xs text-gray-500">Total Products</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-xl font-bold text-purple-600">{totalStock}</p>
          <p className="text-xs text-gray-500">Total Stock</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className={`text-xl font-bold ${lowStock > 0 ? 'text-red-600' : 'text-orange-600'}`}>{lowStock}</p>
          <p className="text-xs text-gray-500">Low Stock Alerts</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border p-6 space-y-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">New Warehouse</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Warehouse Name *</label>
              <Input {...register("name", { required: "Name required" })} placeholder="Main Warehouse" className="mt-1" />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Address *</label>
              <Input {...register("addressLine1", { required: "Address required" })} placeholder="Street address" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">City *</label>
              <Input {...register("city", { required: "City required" })} placeholder="Mumbai" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">State *</label>
              <Input {...register("state", { required: "State required" })} placeholder="Maharashtra" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Pincode *</label>
              <Input {...register("pincode", { required: "Pincode required" })} placeholder="400001" className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Warehouse'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Warehouse Grid */}
      {warehouses.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Warehouse className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No warehouses</h3>
          <p className="text-gray-400 mb-4">Add your first warehouse to manage inventory</p>
          <Button onClick={() => setShowForm(true)}>Add Warehouse</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map((wh) => (
            <div key={wh.id} className="bg-white rounded-xl border hover:shadow-md transition">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${wh.isActive !== false ? 'bg-blue-50' : 'bg-gray-100'}`}>
                      <Warehouse className={`h-5 w-5 ${wh.isActive !== false ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {wh.city}, {wh.state} - {wh.pincode}
                      </div>
                    </div>
                  </div>
                  {wh.isActive !== false ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600">{wh._count?.inventory || 0}</p>
                    <p className="text-xs text-gray-500">Products</p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-600">
                      {wh.inventory?.reduce((s, i) => s + i.availableQty, 0) || 0}
                    </p>
                    <p className="text-xs text-gray-500">Stock</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/warehouse/${wh.id}`} className="flex-1">
                    <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-1">
                      <Package className="h-3.5 w-3.5" /> Inventory
                    </button>
                  </Link>
                  <Link href={`/dashboard/warehouse/${wh.id}/zones`} className="flex-1">
                    <button className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center gap-1">
                      <Layers className="h-3.5 w-3.5" /> Zones
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}