'use client';

import { useState, useEffect } from 'react';
import { 
  Building, Search, Eye, EyeOff, Copy, Bike, Store, 
  Shield, BadgeCheck, Phone, RefreshCw, XCircle, 
  CheckCircle, Clock, Ban, Loader2, Download, FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBankAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAccountNumber, setShowAccountNumber] = useState({});
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/finance/bank-accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
      setStats(data.stats || { total: 0, verified: 0, pending: 0 });
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleVerify = async (accountId, type) => {
    setProcessingId(accountId);
    try {
      const res = await fetch('/api/admin/finance/bank-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, type, action: 'VERIFY' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account verified!');
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Failed'); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (accountId, type) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // Cancelled
    
    setProcessingId(accountId);
    try {
      const res = await fetch('/api/admin/finance/bank-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, type, action: 'REJECT', reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account rejected');
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Failed'); }
    finally { setProcessingId(null); }
  };

  const toggleShowNumber = (id) => {
    setShowAccountNumber(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const handleExportCSV = () => {
    const headers = ['Type', 'Name', 'Account Holder', 'Bank', 'Account Number', 'IFSC', 'Branch', 'UPI', 'Status', 'Mobile', 'Date'];
    const rows = filtered.map(a => [
      a.type,
      a.owner?.name,
      a.accountHolder,
      a.bankName,
      a.accountNumber,
      a.ifscCode,
      a.branchName || '',
      a.upiId || '',
      a.pennyDropVerified || a.verificationStatus === 'VERIFIED' ? 'Verified' : 'Pending',
      a.owner?.mobile || '',
      new Date(a.createdAt).toLocaleDateString('en-IN'),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-accounts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const isVerified = (acc) => acc.pennyDropVerified || acc.verificationStatus === 'VERIFIED';
  const isRejected = (acc) => acc.verificationStatus === 'REJECTED';

  const filtered = accounts.filter(a => {
    const matchSearch = !searchTerm ||
      a.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.accountHolder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.bankName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.accountNumber?.includes(searchTerm) ||
      a.upiId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.owner?.mobile?.includes(searchTerm);
    
    const matchType = typeFilter === 'ALL' || a.type === typeFilter;
    
    const matchStatus = statusFilter === 'ALL' || 
      (statusFilter === 'VERIFIED' && isVerified(a)) ||
      (statusFilter === 'PENDING' && !isVerified(a) && !isRejected(a)) ||
      (statusFilter === 'REJECTED' && isRejected(a));
    
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Verify and manage supplier & delivery partner bank accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={fetchAccounts} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500 flex items-center gap-1"><Shield className="h-4 w-4 text-green-500" /> Verified</p>
          <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500 flex items-center gap-1"><Clock className="h-4 w-4 text-amber-500" /> Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Suppliers / Partners</p>
          <p className="text-2xl font-bold text-gray-900">{stats.suppliers}/{stats.partners}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'SUPPLIER', label: 'Suppliers' },
              { key: 'DELIVERY_PARTNER', label: 'Partners' },
            ].map(f => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  typeFilter === f.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'ALL', label: 'All Status' },
              { key: 'PENDING', label: 'Pending' },
              { key: 'VERIFIED', label: 'Verified' },
              { key: 'REJECTED', label: 'Rejected' },
            ].map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === f.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by name, bank, UPI or mobile..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-gray-400" />
            <p className="text-gray-400">Loading accounts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No bank accounts found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map(acc => {
            const verified = isVerified(acc);
            const rejected = isRejected(acc);
            
            return (
              <div key={acc.id} className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
                rejected ? 'border-red-200 bg-red-50/30' : 
                !verified ? 'border-amber-200 bg-amber-50/20' : ''
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Type Icon */}
                    <div className={`p-3 rounded-xl shrink-0 ${
                      verified ? 'bg-green-100' : rejected ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      {acc.type === 'SUPPLIER' ? (
                        <Store className={`h-6 w-6 ${verified ? 'text-green-600' : rejected ? 'text-red-600' : 'text-amber-600'}`} />
                      ) : (
                        <Bike className={`h-6 w-6 ${verified ? 'text-green-600' : rejected ? 'text-red-600' : 'text-amber-600'}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + Badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{acc.owner?.name || 'Unknown'}</h3>
                        
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          acc.type === 'SUPPLIER' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {acc.type === 'SUPPLIER' ? 'Supplier' : 'Partner'}
                        </span>

                        {verified && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Verified
                          </span>
                        )}
                        {rejected && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <Ban className="h-3 w-3" /> Rejected
                          </span>
                        )}
                        {!verified && !rejected && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </div>

                      {/* Owner Info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                        {acc.owner?.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +91 {acc.owner.mobile}</span>}
                        {acc.owner?.vehicle && (
                          <span className="flex items-center gap-1"><Bike className="h-3 w-3" /> {acc.owner.vehicle} {acc.owner?.vehicleNumber && `(${acc.owner.vehicleNumber})`}</span>
                        )}
                      </div>

                      {/* Bank Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-400 text-xs">Account Holder</span>
                          <p className="font-medium text-gray-700 truncate">{acc.accountHolder || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Bank</span>
                          <p className="font-medium text-gray-700 truncate">{acc.bankName || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Account Number</span>
                          <p className="font-mono font-medium text-gray-700">
                            {acc.accountNumber ? (
                              <>
                                {showAccountNumber[acc.id] ? acc.accountNumber : '••••' + acc.accountNumber?.slice(-4)}
                                <button onClick={() => toggleShowNumber(acc.id)} className="ml-1 p-0.5 hover:bg-gray-100 rounded"><Eye className="h-3 w-3 text-gray-400" /></button>
                                <button onClick={() => copyToClipboard(acc.accountNumber)} className="ml-1 p-0.5 hover:bg-gray-100 rounded"><Copy className="h-3 w-3 text-gray-400" /></button>
                              </>
                            ) : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">IFSC</span>
                          <p className="font-mono font-medium text-gray-700">{acc.ifscCode || '-'}</p>
                        </div>
                        {acc.upiId && (
                          <div className="col-span-2">
                            <span className="text-gray-400 text-xs">UPI</span>
                            <p className="font-mono font-medium text-purple-600">{acc.upiId}</p>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Added: {new Date(acc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!verified && !rejected && (
                      <>
                        <button
                          onClick={() => handleVerify(acc.id, acc.type)}
                          disabled={processingId === acc.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          {processingId === acc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          Verify
                        </button>
                        <button
                          onClick={() => handleReject(acc.id, acc.type)}
                          disabled={processingId === acc.id}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          <Ban className="h-4 w-4" /> Reject
                        </button>
                      </>
                    )}
                    {verified && (
                      <button
                        onClick={() => handleReject(acc.id, acc.type)}
                        disabled={processingId === acc.id}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
                      >
                        Revoke
                      </button>
                    )}
                    {rejected && (
                      <button
                        onClick={() => handleVerify(acc.id, acc.type)}
                        disabled={processingId === acc.id}
                        className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100"
                      >
                        Re-verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}