"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Search, X, Eye, Clock } from "lucide-react";

const formatOrderId = (id) => {
  if (!id) return '#N/A';
  const hex = id.replace(/-/g, '').slice(0, 6);
  const num = parseInt(hex, 16) % 100000;
  return `#${num.toString().padStart(5, '0')}`;
};

const DECLINE_REASONS = [
  "Out of Stock",
  "Price Mismatch",
  "Delivery Not Possible",
  "Minimum Order Not Met",
  "Product Discontinued",
  "Other",
];

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [declineModal, setDeclineModal] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [declineProcessing, setDeclineProcessing] = useState(false);
  const [viewNotes, setViewNotes] = useState(null);

  useEffect(() => { 
    fetchOrders(); 
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) setOrders(data.data.orders || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const executeUpdate = async (orderId, newStatus, extraData = {}) => {
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extraData }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message); return; }
      toast.success(`Order ${newStatus.toLowerCase().replace('_', ' ')} successfully`);
      fetchOrders();
      window.dispatchEvent(new CustomEvent('order-updated'));
    } catch { toast.error("Failed to update order"); }
  };

  const handleDecline = (order) => { 
    setDeclineModal(order); 
    setDeclineReason(""); 
    setCustomReason(""); 
  };

  const submitDecline = async () => {
    const finalReason = declineReason === "Other" 
      ? `Other: ${customReason.trim()}` 
      : declineReason;
    
    if (!finalReason || finalReason === "Other: ") { 
      toast.error("Please select or type a reason"); 
      return; 
    }
    
    setDeclineProcessing(true);
    try {
      const res = await fetch(`/api/orders/${declineModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DECLINED", declineReason: finalReason }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message); return; }
      toast.success("Order declined");
      setDeclineModal(null); 
      setDeclineReason(""); 
      setCustomReason("");
      fetchOrders();
      window.dispatchEvent(new CustomEvent('order-updated'));
    } catch { toast.error("Failed"); }
    finally { setDeclineProcessing(false); }
  };

  const getDeclineReason = (order) => {
    if (order.status !== 'DECLINED' && order.status !== 'CANCELLED' && order.status !== 'EXPIRED') return null;
    const historyNote = order.statusHistory?.find(h => 
      h.notes?.includes('Declined:') || h.notes?.includes('Cancelled:') || h.notes?.includes('Auto-expired:') || h.notes?.includes('Auto-cancelled:')
    );
    if (historyNote) {
      return historyNote.notes
        .replace('Declined: ', '')
        .replace('Cancelled: ', '')
        .replace('Auto-expired: ', '')
        .replace('Auto-cancelled: ', '')
        .replace('Other: ', '');
    }
    return null;
  };

  const getSLARemaining = (order) => {
    if (!order.orderSLA || order.orderSLA.status !== 'ACTIVE') return null;
    const deadline = new Date(order.orderSLA.deadline);
    const now = new Date();
    const diffMs = deadline - now;
    if (diffMs <= 0) return { expired: true, text: 'Breached' };
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return { expired: false, text: `${hours}h ${mins}m left`, urgent: hours < 1 };
    return { expired: false, text: `${mins}m left`, urgent: true };
  };

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACCEPTED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    READY_FOR_PICKUP: "bg-cyan-100 text-cyan-800",
    SHIPPED: "bg-orange-100 text-orange-800",
    DELIVERED: "bg-green-100 text-green-800",
    DECLINED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
    EXPIRED: "bg-red-100 text-red-800",
  };

  const supplierActions = {
    PENDING: [
      { label: "Accept", status: "ACCEPTED", color: "bg-green-500 hover:bg-green-600" },
      { label: "Decline", status: "DECLINED", color: "bg-gray-500 hover:bg-gray-600", isDecline: true },
    ],
    PROCESSING: [
      { label: "Ready for Pickup", status: "READY_FOR_PICKUP", color: "bg-cyan-500 hover:bg-cyan-600" },
    ],
  };

  const actionMessages = {
    ACCEPTED: "Accept this order? Stock will be reserved.",
    READY_FOR_PICKUP: "Mark order as packed and ready for pickup?",
  };

  const statuses = ["PENDING", "ACCEPTED", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED", "DECLINED", "CANCELLED", "EXPIRED"];

  const filteredOrders = searchTerm
    ? orders.filter((o) => o.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || o.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    : orders;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">{orders.length} orders</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-blue-700 font-medium">{orders.filter(o => o.status === 'PENDING').length} pending</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${statusFilter === "" ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
          All ({orders.length})
        </button>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${statusFilter === s ? 'bg-white shadow-sm text-gray-900 border border-gray-300' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
            {s.replace('_', ' ')} ({orders.filter(o => o.status === s).length})
          </button>
        ))}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Buyer</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SLA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">No orders found</td></tr>
              ) : (
                filteredOrders.map(order => {
                  const actions = supplierActions[order.status] || [];
                  const declineReasonText = getDeclineReason(order);
                  const slaRemaining = getSLARemaining(order);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-gray-900">{formatOrderId(order.id)}</p>
                        <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{order.product?.name || 'Product'}</p><p className="text-xs text-gray-500">Qty: {order.quantity}</p></td>
                      <td className="px-4 py-3"><p className="text-sm text-gray-900">{order.buyer?.name?.split(' ')[0] || 'Buyer'}</p></td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-bold">₹{(order.netAmount ?? order.totalAmount)?.toLocaleString('en-IN')}</p>
                        {order.netAmount !== undefined && order.netAmount !== order.totalAmount && (
                          <p className="text-xs text-gray-400">₹{order.totalAmount?.toLocaleString('en-IN')} - {Math.round((1 - order.netAmount / order.totalAmount) * 100)}% fee</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[order.status] || 'bg-gray-100'}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {slaRemaining ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${slaRemaining.expired ? 'bg-red-100 text-red-700' : slaRemaining.urgent ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                            <Clock className="h-3 w-3" />
                            {slaRemaining.text}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {declineReasonText ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 max-w-[120px] truncate">{declineReasonText}</span>
                            <button onClick={() => setViewNotes(declineReasonText)} className="p-1 hover:bg-gray-100 rounded">
                              <Eye className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {actions.map(action => (
                            <button key={action.label}
                              onClick={() => action.isDecline ? handleDecline(order) : setConfirmAction({ orderId: order.id, status: action.status, message: actionMessages[action.status] })}
                              className={`px-2 py-1 text-xs rounded font-medium text-white transition ${action.color}`}>
                              {action.label}
                            </button>
                          ))}
                          {!actions.length && order.status !== 'DELIVERED' && order.status !== 'DECLINED' && order.status !== 'CANCELLED' && order.status !== 'EXPIRED' && (
                            <span className="text-xs text-gray-400">
                              {order.status === 'ACCEPTED' ? 'Auto-processing...' : order.status === 'READY_FOR_PICKUP' ? 'Awaiting pickup' : order.status === 'SHIPPED' ? 'In transit' : 'Auto-processing...'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => executeUpdate(confirmAction.orderId, confirmAction.status)}
          title="Update Order"
          message={confirmAction.message || `Change to ${confirmAction.status}?`}
          confirmText={confirmAction.status === 'ACCEPTED' ? 'Accept' : 'Ready for Pickup'}
        />
      )}

      {/* View Notes Modal */}
      {viewNotes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Decline / Cancel / Expiry Reason</h3>
              <button onClick={() => setViewNotes(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700">{viewNotes}</p>
            </div>
            <button onClick={() => setViewNotes(null)} className="mt-4 w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Decline Modal with Custom Reason */}
      {declineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Decline Order</h3>
              <button onClick={() => setDeclineModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm"><strong>Order:</strong> {formatOrderId(declineModal.id)}</p>
              <p className="text-sm mt-1"><strong>Product:</strong> {declineModal.product?.name}</p>
              <p className="text-sm mt-1"><strong>Buyer:</strong> {declineModal.buyer?.name?.split(' ')[0]}</p>
              <p className="text-sm mt-1"><strong>Amount:</strong> ₹{(declineModal.netAmount ?? declineModal.totalAmount)?.toLocaleString('en-IN')}</p>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Reason for declining</label>
              <div className="space-y-2">
                {DECLINE_REASONS.map(reason => (
                  <button 
                    key={reason} 
                    onClick={() => { setDeclineReason(reason); if (reason !== "Other") setCustomReason(""); }}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${declineReason === reason ? 'border-red-500 bg-red-50 text-red-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    {reason}
                  </button>
                ))}
              </div>
              {declineReason === "Other" && (
                <div>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Type your reason here..."
                    className="w-full px-3 py-2.5 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">{customReason.length} characters</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setDeclineModal(null)} className="flex-1 px-4 py-2.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              <button 
                onClick={submitDecline} 
                disabled={!declineReason || (declineReason === "Other" && !customReason.trim()) || declineProcessing}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {declineProcessing ? 'Declining...' : 'Decline Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}