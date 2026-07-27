'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText, Search, Filter, Eye, Award, XCircle, CheckCircle,
  Clock, DollarSign, TrendingUp, Building2, Tag, Calendar,
  ChevronRight, Users, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-orange-100 text-orange-700',
  AWARDED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminRFQPage() {
  const [rfqs, setRfqs] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => { fetchRFQs(); fetchAnalytics(); }, [activeTab, pagination.page]);

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(activeTab !== 'ALL' && { status: activeTab }),
        ...(searchTerm && { search: searchTerm })
      });
      const res = await fetch('/api/admin/rfq?' + params.toString());
      const data = await res.json();
      setRfqs(data.rfqs || []);
      setStats(data.stats);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      toast.error('Failed to load RFQs');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/rfq/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch {}
  };

  const handleAward = async (rfqId, supplierId) => {
    if (!confirm('Award this RFQ to the selected supplier? Other quotations will be rejected.')) return;
    try {
      const res = await fetch('/api/admin/rfq/' + rfqId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'AWARDED', awardedSupplierId: supplierId })
      });
      if (res.ok) {
        toast.success('RFQ awarded successfully');
        fetchRFQs();
      }
    } catch { toast.error('Failed to award RFQ'); }
  };

  const handleStatusChange = async (rfqId, newStatus) => {
    try {
      const res = await fetch('/api/admin/rfq/' + rfqId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success('Status updated to ' + newStatus);
        fetchRFQs();
      }
    } catch { toast.error('Failed to update status'); }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const tabs = ['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ Management</h1>
          <p className="text-gray-500 mt-1">Oversee all procurement requests and quotations</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total RFQs</p>
          </div>
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.published}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-2xl font-bold text-green-600">{stats.awarded}</p>
            <p className="text-xs text-gray-500">Awarded</p>
          </div>
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.closed}</p>
            <p className="text-xs text-gray-500">Closed</p>
          </div>
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            <p className="text-xs text-gray-500">Cancelled</p>
          </div>
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalBudget)}</p>
            <p className="text-xs text-gray-500">Total Budget</p>
          </div>
        </div>
      )}

      {/* Analytics Row */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-2">Top Supplier Participants</h3>
            <div className="space-y-2">
              {analytics.topSuppliers?.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{s.supplierId}</span>
                  <span className="font-medium">{s._count} quotes</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-2">Category Distribution</h3>
            <div className="space-y-2">
              {analytics.categoryData?.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{c.category}</span>
                  <span className="font-medium">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <h3 className="font-medium text-sm text-gray-700 mb-2">Insights</h3>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold text-blue-600">{analytics.avgQuotationsPerRFQ?.toFixed(1) || '0'}</p>
                <p className="text-xs text-gray-500">Avg Quotes per RFQ</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{analytics.totalRFQs}</p>
                <p className="text-xs text-gray-500">Total RFQs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPagination(prev => ({ ...prev, page: 1 })); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {tab === 'ALL' ? 'All' : tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search RFQs by title or buyer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchRFQs()}
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
        />
      </div>

      {/* RFQs Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">RFQ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Buyer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Budget</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Quotes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rfqs.map(rfq => {
                const lowestQuote = rfq.quotations?.sort((a, b) => a.totalAmount - b.totalAmount)[0];
                return (
                  <tr key={rfq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">{rfq.title}</p>
                          <p className="text-xs text-gray-400">{rfq.quantity} {rfq.unit} • {new Date(rfq.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rfq.buyer?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{rfq.category?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {rfq.budgetMin || rfq.budgetMax ? (
                        <span>{formatCurrency(rfq.budgetMin)} - {formatCurrency(rfq.budgetMax)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rfq._count?.quotations || 0}</span>
                        {lowestQuote && (
                          <span className="text-xs text-green-600">{formatCurrency(lowestQuote.totalAmount)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[rfq.status] || 'bg-gray-100'}`}>
                        {rfq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={'/admin/rfq/' + rfq.id}>
                          <button className="p-1.5 hover:bg-gray-100 rounded" title="View Details">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                        </Link>
                        {rfq.status === 'PUBLISHED' && rfq.quotations?.length > 0 && (
                          <button
                            onClick={() => {
                              const best = rfq.quotations.sort((a, b) => a.totalAmount - b.totalAmount)[0];
                              if (best) handleAward(rfq.id, best.supplierId);
                            }}
                            className="p-1.5 hover:bg-green-50 rounded"
                            title="Award to Lowest Bidder"
                          >
                            <Award className="h-4 w-4 text-green-500" />
                          </button>
                        )}
                        {rfq.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleStatusChange(rfq.id, 'CLOSED')}
                            className="p-1.5 hover:bg-orange-50 rounded"
                            title="Close RFQ"
                          >
                            <XCircle className="h-4 w-4 text-orange-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rfqs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No RFQs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}