"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Search, X, Eye, Clock, Download, Calendar } from "lucide-react";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [declineModal, setDeclineModal] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [declineProcessing, setDeclineProcessing] = useState(false);
  const [viewNotes, setViewNotes] = useState(null);
  const [prevOrderIds, setPrevOrderIds] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(50);
  const [soundFileUrl, setSoundFileUrl] = useState(null);
  const [newOrderRepeat, setNewOrderRepeat] = useState(true);
  const [newOrderRepeatInterval, setNewOrderRepeatInterval] = useState(120);
  const [pickupSoundEnabled, setPickupSoundEnabled] = useState(true);
  const [pickupSoundFileUrl, setPickupSoundFileUrl] = useState(null);
  const [pickupRepeat, setPickupRepeat] = useState(true);
  const [pickupRepeatInterval, setPickupRepeatInterval] = useState(120);
  
  const audioCtxRef = useRef(null);
  const newOrderRepeatTimerRef = useRef(null);
  const pickupRepeatTimerRef = useRef(null);
  const ordersRef = useRef([]);

  // Fetch sound settings from public settings API
  useEffect(() => {
    const fetchSoundSetting = async () => {
      try {
        const res = await fetch('/api/public/settings');
        const data = await res.json();
        const notifSettings = data?.data?.notificationSettings || {};
        setSoundEnabled(notifSettings.newOrderSound !== false);
        setSoundVolume(parseInt(notifSettings.soundVolume) || 50);
        setSoundFileUrl(notifSettings.soundFileUrl || null);
        setNewOrderRepeat(notifSettings.newOrderRepeat !== false);
        setNewOrderRepeatInterval(parseInt(notifSettings.newOrderRepeatInterval) || 120);
        setPickupSoundEnabled(notifSettings.pickupSound !== false);
        setPickupSoundFileUrl(notifSettings.pickupSoundFileUrl || null);
        setPickupRepeat(notifSettings.pickupRepeat !== false);
        setPickupRepeatInterval(parseInt(notifSettings.pickupRepeatInterval) || 120);
      } catch {
        setSoundEnabled(true);
        setSoundVolume(50);
        setSoundFileUrl(null);
        setNewOrderRepeat(true);
        setNewOrderRepeatInterval(120);
        setPickupSoundEnabled(true);
        setPickupSoundFileUrl(null);
        setPickupRepeat(true);
        setPickupRepeatInterval(120);
      }
    };
    fetchSoundSetting();
  }, []);

  useEffect(() => { 
    fetchOrders(); 
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [dateFrom, dateTo]);

  // Cleanup repeat timers on unmount
  useEffect(() => {
    return () => {
      if (newOrderRepeatTimerRef.current) clearInterval(newOrderRepeatTimerRef.current);
      if (pickupRepeatTimerRef.current) clearInterval(pickupRepeatTimerRef.current);
    };
  }, []);

  // Play default beep sound with volume
  const playDefaultBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const playBeep = (frequency, startTime, duration) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        const volumeLevel = soundVolume / 300;
        gainNode.gain.setValueAtTime(volumeLevel, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playBeep(880, now, 0.2);
      playBeep(1100, now + 0.25, 0.3);

      setTimeout(() => {
        audioCtx.close().catch(() => {});
      }, 1000);
    } catch (e) {
      console.log('Beep error:', e.message);
    }
  };

  // Play pickup beep (different pattern - three beeps)
  const playPickupBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const playBeep = (frequency, startTime, duration) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        const volumeLevel = soundVolume / 300;
        gainNode.gain.setValueAtTime(volumeLevel, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playBeep(660, now, 0.15);
      playBeep(660, now + 0.2, 0.15);
      playBeep(660, now + 0.4, 0.3);

      setTimeout(() => {
        audioCtx.close().catch(() => {});
      }, 1000);
    } catch (e) {
      console.log('Pickup beep error:', e.message);
    }
  };

  // Play new order sound (custom or default)
  const playNewOrderSound = () => {
    try {
      if (soundFileUrl) {
        const audio = new Audio(soundFileUrl);
        audio.volume = soundVolume / 100;
        audio.play().catch((e) => {
          console.log('Custom sound play error:', e.message);
          playDefaultBeep();
        });
        return;
      }
      playDefaultBeep();
    } catch (e) {
      console.log('Sound play error:', e.message);
    }
  };

  // Play pickup sound (custom or default)
  const playPickupSound = () => {
    try {
      if (pickupSoundFileUrl) {
        const audio = new Audio(pickupSoundFileUrl);
        audio.volume = soundVolume / 100;
        audio.play().catch((e) => {
          console.log('Custom pickup sound play error:', e.message);
          playPickupBeep();
        });
        return;
      }
      playPickupBeep();
    } catch (e) {
      console.log('Pickup sound play error:', e.message);
    }
  };

  // Start repeat timer for new order sound
  const startNewOrderRepeat = () => {
    if (!newOrderRepeat) return;
    if (newOrderRepeatTimerRef.current) clearInterval(newOrderRepeatTimerRef.current);
    
    newOrderRepeatTimerRef.current = setInterval(() => {
      const currentOrders = ordersRef.current;
      const hasPending = currentOrders.some(o => o.status === 'PENDING');
      if (hasPending && soundEnabled) {
        playNewOrderSound();
      } else {
        // Stop repeating if no pending orders
        if (newOrderRepeatTimerRef.current) {
          clearInterval(newOrderRepeatTimerRef.current);
          newOrderRepeatTimerRef.current = null;
        }
      }
    }, newOrderRepeatInterval * 1000);
  };

  // Start repeat timer for pickup sound
  const startPickupRepeat = () => {
    if (!pickupRepeat) return;
    if (pickupRepeatTimerRef.current) clearInterval(pickupRepeatTimerRef.current);
    
    pickupRepeatTimerRef.current = setInterval(() => {
      const currentOrders = ordersRef.current;
      const hasReadyForPickup = currentOrders.some(o => o.status === 'READY_FOR_PICKUP');
      if (hasReadyForPickup && pickupSoundEnabled) {
        playPickupSound();
      } else {
        // Stop repeating if no ready-for-pickup orders
        if (pickupRepeatTimerRef.current) {
          clearInterval(pickupRepeatTimerRef.current);
          pickupRepeatTimerRef.current = null;
        }
      }
    }, pickupRepeatInterval * 1000);
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      params.set("limit", "100");
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        const newOrders = data.data.orders || [];
        
        // Update ordersRef for repeat timers
        ordersRef.current = newOrders;
        
        // Detect new orders for toast + sound
        if (prevOrderIds.length > 0) {
          const existingIds = new Set(prevOrderIds);
          const freshOrders = newOrders.filter(o => !existingIds.has(o.id));
          
          // Check for new PENDING orders
          const freshPending = freshOrders.filter(o => o.status === 'PENDING');
          if (freshPending.length > 0) {
            toast.success(`🔔 ${freshPending.length} new order${freshPending.length > 1 ? 's' : ''} received!`);
            if (soundEnabled) {
              playNewOrderSound();
              // Start repeat timer
              startNewOrderRepeat();
            }
          }
          
          // Check for new READY_FOR_PICKUP orders
          const freshPickup = freshOrders.filter(o => o.status === 'READY_FOR_PICKUP');
          if (freshPickup.length > 0) {
            toast.success(`📦 ${freshPickup.length} order${freshPickup.length > 1 ? 's' : ''} ready for pickup!`);
            if (pickupSoundEnabled) {
              playPickupSound();
              // Start pickup repeat timer
              startPickupRepeat();
            }
          }
        }
        
        setOrders(newOrders);
        setPrevOrderIds(newOrders.map(o => o.id));
      }
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
    RETURNING: "bg-amber-100 text-amber-800",
    RETURNED: "bg-orange-100 text-orange-800",
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

  const statuses = ["PENDING", "ACCEPTED", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED", "DECLINED", "CANCELLED", "EXPIRED", "RETURNING", "RETURNED"];

  const filteredOrders = searchTerm
    ? orders.filter((o) => o.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || o.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || formatOrderId(o.id).includes(searchTerm))
    : orders;

  const handleExportCSV = () => {
    try {
      const headers = ['Order ID', 'Product', 'Buyer', 'Quantity', 'Amount', 'Status', 'Date', 'Payment Method'];
      const rows = filteredOrders.map(o => [
        formatOrderId(o.id),
        o.product?.name || 'N/A',
        o.buyer?.name?.split(' ')[0] || 'N/A',
        o.quantity,
        o.netAmount ?? o.totalAmount,
        o.status,
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.paymentMethod || 'ONLINE',
      ]);
      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Orders exported as CSV');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">{orders.length} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-blue-700 font-medium">{orders.filter(o => o.status === 'PENDING').length} pending</span>
          </div>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
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
      </div>

      {/* Search + Date Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search by order ID, product, buyer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <span className="text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
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
                  const slaRemaining = getSLARemaining(order);
                  const actions = slaRemaining?.expired ? [] : (supplierActions[order.status] || []);
                  const declineReasonText = getDeclineReason(order);
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
                          <p className="text-xs text-gray-400">₹{order.totalAmount?.toLocaleString('en-IN')} - {Math.round((1 - order.netAmount / order.totalAmount) * 100)}%fee</p>
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
                          {slaRemaining?.expired && ['PENDING', 'ACCEPTED', 'PROCESSING', 'READY_FOR_PICKUP'].includes(order.status) ? (
                            <span className="text-xs text-red-500 font-medium">
                              SLA Breached
                            </span>
                          ) : !actions.length && order.status !== 'DELIVERED' && order.status !== 'DECLINED' && order.status !== 'CANCELLED' && order.status !== 'EXPIRED' && order.status !== 'RETURNED' && order.status !== 'RETURNING' && (
                            <span className="text-xs text-gray-400">
                              {order.status === 'ACCEPTED' ? 'Auto-processing...' : order.status === 'READY_FOR_PICKUP' ? 'Awaiting pickup' : order.status ==='SHIPPED' ? 'In transit' : 'Auto-processing...'}
                            </span>
                          )}
                          {(order.status === 'RETURNED' || order.status === 'RETURNING') && (
                            <span className="text-xs text-orange-500 font-medium">
                              {order.status === 'RETURNING' ? 'Returning to supplier...' : 'Returned — stock restored'}
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