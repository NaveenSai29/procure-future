"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { ShoppingCart, Filter, Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) setOrders(data.data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeUpdate = async (orderId, newStatus, isRevert = false) => {
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, revert: isRevert }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message);
        return;
      }
      toast.success(data.data.message);
      fetchOrders();
    } catch {
      toast.error("Failed to update order");
    }
  };

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    PROCESSING: "bg-purple-100 text-purple-800 border-purple-200",
    SHIPPED: "bg-orange-100 text-orange-800 border-orange-200",
    DELIVERED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };

  const supplierActions = {
    PENDING: [
      { label: "Confirm", status: "CONFIRMED", color: "bg-blue-500 hover:bg-blue-600", variant: "default", revert: false },
      { label: "Cancel", status: "CANCELLED", color: "bg-red-500 hover:bg-red-600", variant: "destructive", revert: false },
    ],
    CONFIRMED: [
      { label: "Process", status: "PROCESSING", color: "bg-purple-500 hover:bg-purple-600", variant: "default", revert: false },
      { label: "Undo", status: "PENDING", color: "bg-gray-500 hover:bg-gray-600", variant: "default", revert: true },
    ],
    PROCESSING: [
      { label: "Ship", status: "SHIPPED", color: "bg-orange-500 hover:bg-orange-600", variant: "default", revert: false },
      { label: "Undo", status: "CONFIRMED", color: "bg-gray-500 hover:bg-gray-600", variant: "default", revert: true },
    ],
    SHIPPED: [
      { label: "Delivered", status: "DELIVERED", color: "bg-green-500 hover:bg-green-600", variant: "success", revert: false },
      { label: "Undo", status: "PROCESSING", color: "bg-gray-500 hover:bg-gray-600", variant: "default", revert: true },
    ],
  };

  const actionMessages = {
    CONFIRMED: "Confirm this order and reserve stock?",
    PROCESSING: "Start processing this order?",
    SHIPPED: "Mark as shipped?",
    DELIVERED: "Mark as delivered? This is final and cannot be undone.",
    CANCELLED: "Cancel this order? Stock will be returned. Cannot be undone.",
    PENDING: "Revert this order back to Pending?",
  };

  const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  const filteredOrders = searchTerm
    ? orders.filter((o) =>
        o.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : orders;

  if (loading) return <div className="p-8 text-center">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">{orders.length} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-background rounded-xl border p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product or buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter("")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${!statusFilter ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted"}`}
            >
              All
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${statusFilter === s ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-background rounded-xl border p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No orders found</h3>
          <p className="text-muted-foreground">
            {statusFilter ? `No ${statusFilter.toLowerCase()} orders` : "Orders will appear here when customers place them"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-background rounded-xl border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 bg-muted rounded-lg shrink-0">
                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{order.product?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Buyer: {order.buyer?.name} • Qty: {order.quantity} • {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">₹{order.totalAmount?.toLocaleString()}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </div>

                  {supplierActions[order.status] && (
                    <div className="flex gap-1.5">
                      {supplierActions[order.status].map((action) => (
                        <button
                          key={action.status}
                          onClick={() => setConfirmAction({
                            orderId: order.id,
                            status: action.status,
                            variant: action.variant,
                            revert: action.revert,
                          })}
                          className={`px-3 py-1.5 text-white text-xs font-medium rounded-md ${action.color}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && executeUpdate(confirmAction.orderId, confirmAction.status, confirmAction.revert)}
        title={`${confirmAction?.revert ? "Undo to" : "Mark as"} ${confirmAction?.status}?`}
        message={confirmAction ? actionMessages[confirmAction.status] || "Are you sure?" : ""}
        confirmText={confirmAction?.revert ? "Yes, Undo" : `Yes, ${confirmAction?.status}`}
        variant={confirmAction?.variant || "default"}
      />
    </div>
  );
}