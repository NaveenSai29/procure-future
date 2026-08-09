'use client';
import { useState, useEffect } from 'react';
import { Banknote, CheckCircle, Clock, IndianRupee, History, Bike, Store, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('ALL');

  useEffect(() => { fetchDeliveryPartners(); }, []);
  useEffect(() => { fetchSettlements(); }, [statusFilter, selectedPartnerId]);

  const fetchDeliveryPartners = async () => {
    try {
      const res = await fetch('/api/admin/delivery-partners?limit=200');
      const data = await res.json();
      if (data.success) {
        setDeliveryPartners(data.partners || []);
      }
    } catch (e) {
      console.error('Failed to load delivery partners');
    }
  };

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (selectedPartnerId !== 'ALL') params.append('partnerId', selectedPartnerId);
      params.append('limit', '200');
      
      const res = await fetch(`/api/admin/finance/settlements?${params}`);
      const data = await res.json();
      if (data.success) {
        setSettlements(data.data.settlements || []);
        setStats(data.data.stats || {});
      }
    } catch (e) {
      toast.error('Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (settlementId, force = false) => {
    try {
      const settlement = settlements.find(s => s.id === settlementId);
      if (settlement && settlement.status !== 'PENDING' && !force) {
        if (confirm('This settlement is already processed. Process anyway?')) {
          return handleProcess(settlementId, true);
        }
        return;
      }

      const res = await fetch('/api/admin/finance/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId, action: 'process', force }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settlement processed!');
        fetchSettlements();
      } else if (res.status === 409) {
        if (confirm('This settlement is already processed. Process anyway?')) {
          handleProcess(settlementId, true);
        }
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('Failed to process settlement');
    }
  };

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '-';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const selectedPartner = selectedPartnerId !== 'ALL' 
    ? deliveryPartners.find(p => p.id === selectedPartnerId)
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Partner Settlements</h1>
          <p className="text-sm text-gray-500 mt-1">Manage delivery partner COD settlements and payouts</p>
        </div>
        <button onClick={fetchSettlements} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: stats.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completed', value: stats.completed || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Amount', value: formatCurrency(stats.totalAmount || 0), icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-5 border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
              <s.icon className={`h-8 w-8 ${s.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Filter by Delivery Partner</label>
            <div className="relative">
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="ALL">All Delivery Partners</option>
                {deliveryPartners.map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.user?.name || partner.user?.mobile || 'Partner'} 
                    {partner.activeVehicle?.vehicleType ? ` (${partner.activeVehicle.vehicleType})` : ''}
                    {partner.user?.mobile ? ` - ${partner.user.mobile}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            {[
              { value: 'PENDING', label: 'Pending' },
              { value: 'PROCESSED', label: 'Processed' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: '', label: 'All' },
            ].map(f => (
              <button key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold border transition ${
                  statusFilter === f.value 
                    ? 'bg-orange-500 text-white border-orange-500' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {selectedPartner 
                ? `Settlements: ${selectedPartner.user?.name || selectedPartner.user?.mobile || 'Partner'}`
                : 'All Delivery Partner Settlements'
              }
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{settlements.length} settlement(s) found</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Partner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>Loading settlements...</p>
                </td></tr>
              ) : settlements.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No settlements found</p>
                </td></tr>
              ) : (
                settlements.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bike className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{s.partner?.user?.name || 'Partner'}</p>
                          <p className="text-xs text-gray-400">{s.partner?.user?.mobile || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{s.partner?.activeVehicle?.vehicleType || 'N/A'}</p>
                      <p className="text-xs text-gray-400">{s.partner?.activeVehicle?.vehicleNumber || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(s.amount)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full font-semibold capitalize bg-purple-100 text-purple-700">
                        {s.settlementType?.replace('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(s.periodStart)} - {formatDate(s.periodEnd)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        s.status === 'PROCESSED' || s.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-700' 
                          : s.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <p>{formatDate(s.createdAt)}</p>
                      {s.processedAt && <p className="text-green-600 mt-0.5">Paid: {formatDate(s.processedAt)}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.status === 'PENDING' && (
                        <button onClick={() => handleProcess(s.id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                          Process Payout
                        </button>
                      )}
                      {(s.status === 'PROCESSED' || s.status === 'COMPLETED') && (
                        <span className="text-xs text-gray-400">
                          {s.processedBy ? 'Manual' : 'Auto'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}