// src/app/admin/gst/page.jsx
// GST Auto-Verification Dashboard

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Search, CheckCircle, XCircle, Clock, RefreshCw,
  AlertTriangle, Building2, Hash, FileCheck, ExternalLink,
  ChevronDown, ChevronUp, Upload, Download, Eye, Zap,
  Filter, ArrowUpDown, BadgeCheck, Ban, Loader2, Info,
  IndianRupee, Calendar, UserCheck, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminGSTPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [verifyingId, setVerifyingId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, filter });
      const res = await fetch(`/api/admin/gst/verify?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error('Failed to load GST data');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerify = async (supplierId) => {
    setVerifyingId(supplierId);
    try {
      const res = await fetch('/api/admin/gst/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      });
      const json = await res.json();
      if (json.success) {
        const result = json.data;
        if (result.verified && result.status === 'ACTIVE') {
          toast.success(`GST verified: ${result.businessName}`);
        } else if (result.verified) {
          toast.warning(`GST found but status: ${result.status}`);
        } else {
          toast.error(result.error || 'Verification failed');
        }
        fetchData();
      }
    } catch {
      toast.error('Verification request failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleBulkVerify = async () => {
    const lines = bulkInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Enter at least one GSTIN');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/admin/gst/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: lines }),
      });
      const json = await res.json();
      if (json.success) {
        const verified = json.data.filter(r => r.verified).length;
        toast.success(`Verified ${verified}/${json.count} GSTINs`);
        setBulkInput('');
        setBulkMode(false);
        fetchData();
      }
    } catch {
      toast.error('Bulk verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyAllUnverified = async () => {
    if (!data?.suppliers) return;
    const unverified = data.suppliers.filter(s => !s.gstVerified);
    if (unverified.length === 0) {
      toast.info('All suppliers already verified');
      return;
    }
    toast.info(`Verifying ${unverified.length} suppliers...`);
    for (const supplier of unverified) {
      await handleVerify(supplier.id);
    }
  };

  const filteredSuppliers = data?.suppliers?.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.businessName?.toLowerCase().includes(term) ||
      s.gstin?.toLowerCase().includes(term) ||
      s.gstBusinessName?.toLowerCase().includes(term)
    );
  }) || [];

  const statusBadge = (verified, status) => {
    if (verified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" /> Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Auto-Verification</h1>
          <p className="text-gray-500 mt-1">
            {data?.stats ? `${data.stats.verified} verified, ${data.stats.unverified} pending of ${data.stats.total} total` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Verify
          </button>
          <button
            onClick={handleVerifyAllUnverified}
            disabled={!data?.suppliers?.some(s => !s.gstVerified)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Verify All Pending
          </button>
        </div>
      </div>

      {/* Bulk Verify Panel */}
      {bulkMode && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">Bulk GST Verification</h3>
          <p className="text-sm text-blue-700 mb-3">Enter GSTINs separated by commas or new lines (max 50)</p>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="22AAAAA0000A1Z5, 24BBBBB1111B2Z6..."
            rows={4}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleBulkVerify}
              disabled={verifying}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {verifying ? 'Verifying...' : 'Verify All'}
            </button>
            <button
              onClick={() => { setBulkMode(false); setBulkInput(''); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Suppliers', value: data.stats.total, icon: Building2, color: 'bg-blue-50 text-blue-600' },
            { label: 'Verified', value: data.stats.verified, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
            { label: 'Pending', value: data.stats.unverified, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
            { label: 'Verification Rate', value: `${data.stats.total > 0 ? Math.round((data.stats.verified / data.stats.total) * 100) : 0}%`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['ALL', 'VERIFIED', 'UNVERIFIED'].map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'VERIFIED' ? 'Verified' : 'Pending'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Supplier Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Shield className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>No suppliers found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GSTIN</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Verified Business</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Verification Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSuppliers.map(supplier => (
                    <tr key={supplier.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{supplier.businessName}</p>
                            <p className="text-xs text-gray-500">
                              {supplier.isVerified ? (
                                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> KYC Verified</span>
                              ) : (
                                <span className="text-yellow-600 flex items-center gap-1"><Clock className="h-3 w-3" /> KYC Pending</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{supplier.gstin}</code>
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(supplier.gstVerified)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {supplier.gstBusinessName || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {supplier.gstVerificationDate
                            ? new Date(supplier.gstVerificationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleVerify(supplier.id)}
                          disabled={verifyingId === supplier.id}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1 ml-auto"
                        >
                          {verifyingId === supplier.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          {supplier.gstVerified ? 'Re-verify' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, data.pagination.total)} of {data.pagination.total}
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        page === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}