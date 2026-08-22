'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Search,
} from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  REVIEWED: { label: 'Reviewed', color: 'bg-blue-100 text-blue-700', icon: Eye },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

const REASON_COLORS = {
  'Fake business': 'bg-red-50 text-red-700 border-red-200',
  'Wrong GST details': 'bg-orange-50 text-orange-700 border-orange-200',
  'Poor product quality': 'bg-amber-50 text-amber-700 border-amber-200',
  'Overpriced products': 'bg-purple-50 text-purple-700 border-purple-200',
  'Poor delivery service': 'bg-blue-50 text-blue-700 border-blue-200',
  'Other': 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function SupplierReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/supplier-reports?page=${page}&limit=20&status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.data.reports || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch reports error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const res = await fetch('/api/admin/supplier-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReports();
      } else {
        alert(data.message || 'Failed to update');
      }
    } catch (err) {
      alert('Failed to update report');
    }
  };

  const filteredReports = reports.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.supplier?.businessName?.toLowerCase().includes(q) ||
      r.buyer?.name?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Buyer reports against suppliers</p>
        </div>
        <button
          onClick={() => router.push('/admin/suppliers')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition"
        >
          View Suppliers
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search supplier, buyer, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20">
          <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No reports found</h3>
          <p className="text-sm text-gray-500 mt-1">Try changing filters or search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const statusInfo = STATUS_CONFIG[report.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusInfo.icon;
            const reasonColor = REASON_COLORS[report.reason] || 'bg-gray-50 text-gray-600 border-gray-200';

            return (
              <div
                key={report.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Supplier + Buyer */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/suppliers/${report.supplier?.id}`)}
                        className="text-sm font-semibold text-gray-900 hover:text-orange-600 truncate"
                      >
                        {report.supplier?.businessName || 'Unknown Supplier'}
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${reasonColor}`}>
                        {report.reason}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Reported by <span className="font-medium">{report.buyer?.name || 'Unknown'}</span>
                      {report.buyer?.mobile && <span> ({report.buyer.mobile})</span>}
                      {' '}• {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Right: Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusInfo.label}
                    </span>
                    <select
                      value={report.status}
                      onChange={(e) => handleStatusChange(report.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="REVIEWED">Reviewed</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="DISMISSED">Dismissed</option>
                    </select>
                    <button
                      onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                    >
                      <EyeIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {report.notes && (
                  <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">
                    📝 {report.notes}
                  </p>
                )}

                {/* Expanded - More details */}
                {expandedReport === report.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                    <p><strong>Supplier GST:</strong> {report.supplier?.gstin || 'N/A'}</p>
                    <p><strong>Report ID:</strong> {report.id}</p>
                    {report.reviewedBy && (
                      <p><strong>Reviewed by:</strong> {report.reviewedBy}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}