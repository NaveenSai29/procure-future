"use client";

import { useState, useEffect } from 'react';
import {
  Wallet, Search, RefreshCw, IndianRupee,
  Loader2, Clock, CheckCircle2, XCircle, Bike, Building2,
  Eye, Image, ArrowUpRight, ArrowDownRight, Filter,
  User, Phone, AlertCircle, Banknote, CreditCard, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CODDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [processingId, setProcessingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalPendingAmount: 0 });

  useEffect(() => { fetchDeposits(); }, [statusFilter]);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cod-deposits?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setDeposits(data.data?.deposits || []);
      }

      // Fetch stats for all statuses
      const statsRes = await fetch('/api/admin/cod-deposits?status=ALL');
      const statsData = await statsRes.json();
      if (statsData.success) {
        const all = statsData.data?.deposits || [];
        const pending = all.filter(d => d.status === 'PENDING');
        const approved = all.filter(d => d.status === 'APPROVED');
        const rejected = all.filter(d => d.status === 'REJECTED');
        setStats({
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          totalPendingAmount: pending.reduce((sum, d) => sum + (d.amount || 0), 0),
        });
      }
    } catch (e) {
      toast.error('Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (depositId, action) => {
    setProcessingId(depositId);
    try {
      const res = await fetch('/api/admin/cod-deposits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId, action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'APPROVE' ? '✅ Deposit approved! COD limit reduced.' : '❌ Deposit rejected.');
        fetchDeposits();
      } else {
        toast.error(data.message || data.error || 'Failed');
      }
    } catch (e) {
      toast.error('Failed to process');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '-';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusTabs = [
    { value: 'PENDING', label: 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700 border-amber-300', count: stats.pending },
    { value: 'APPROVED', label: 'Approved', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300', count: stats.approved },
    { value: 'REJECTED', label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300', count: stats.rejected },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">COD Deposit Management</h1>
          <p className="text-gray-500 mt-1">Review and approve delivery partner COD deposits</p>
        </div>
        <button onClick={fetchDeposits} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">How COD Deposits Work</p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              Delivery partners collect cash from COD orders. They deposit this cash to PROCURE's bank account and upload proof here. 
              Approving a deposit reduces their <strong>COD Pending</strong> balance, allowing them to take more COD orders. 
              Rejected deposits keep the pending balance unchanged.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Clock className="h-4 w-4 text-amber-500" /> Pending</div>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-gray-400 mt-1">{formatCurrency(stats.totalPendingAmount)} awaiting</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Approved</div>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><XCircle className="h-4 w-4 text-red-500" /> Rejected</div>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Bike className="h-4 w-4 text-purple-500" /> Total Deposits</div>
          <p className="text-2xl font-bold text-purple-600">{stats.pending + stats.approved + stats.rejected}</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
              statusFilter === tab.value
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${statusFilter === tab.value ? 'bg-gray-100 text-gray-700' : 'bg-white/50'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Deposits List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-gray-400" />
            <p className="text-gray-400">Loading deposits...</p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No {statusFilter.toLowerCase()} deposits found</p>
            <p className="text-gray-400 text-sm mt-1">Deposits will appear here when partners submit COD payments</p>
          </div>
        ) : (
          deposits.map(deposit => (
            <div key={deposit.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Partner Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <Bike className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {deposit.partner?.user?.name || 'Delivery Partner'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          deposit.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          deposit.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {deposit.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {deposit.partner?.user?.mobile || 'N/A'}</span>
                        <span className="flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> {deposit.partner?.activeVehicle?.vehicleType || 'N/A'}</span>
                        <span className="text-xs text-gray-400">{deposit.partner?.activeVehicle?.vehicleNumber || ''}</span>
                      </div>

                      {/* Deposit Details */}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="text-xs text-gray-400">Deposit Amount</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(deposit.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Reference</p>
                          <p className="text-sm font-mono font-semibold text-gray-700">{deposit.referenceNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">COD Pending (Before)</p>
                          <p className="text-sm font-bold text-orange-600">{formatCurrency(deposit.wallet?.codPending)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Total Collected</p>
                          <p className="text-sm font-bold text-blue-600">{formatCurrency(deposit.wallet?.codCollected)}</p>
                        </div>
                      </div>

                      {/* Wallet Summary */}
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                        <span>Total Earned: <strong className="text-gray-600">{formatCurrency(deposit.wallet?.totalEarned)}</strong></span>
                        <span>Submitted: <strong className="text-gray-600">{formatDate(deposit.createdAt)}</strong></span>
                        {deposit.processedAt && (
                          <span>Processed: <strong className={deposit.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}>{formatDate(deposit.processedAt)}</strong></span>
                        )}
                      </div>

                      {/* Admin Note */}
                      {deposit.adminNote && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-blue-700">Admin Note: <span className="font-normal">{deposit.adminNote}</span></p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proof Image & Actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {/* Proof Thumbnail */}
                    {deposit.proofImage && (
                      <button
                        onClick={() => setPreviewImage(deposit.proofImage)}
                        className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors"
                      >
                        <img src={deposit.proofImage} alt="Proof" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    )}

                    {/* Action Buttons (only for PENDING) */}
                    {deposit.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(deposit.id, 'APPROVE')}
                          disabled={processingId === deposit.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          {processingId === deposit.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(deposit.id, 'REJECT')}
                          disabled={processingId === deposit.id}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          {processingId === deposit.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10"
            >
              <XCircle className="h-6 w-6 text-gray-600" />
            </button>
            <img src={previewImage} alt="Deposit Proof" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              📸 Deposit Proof Screenshot
            </div>
          </div>
        </div>
      )}
    </div>
  );
}