"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, Search, CheckCircle, XCircle, Clock, Store,
  FileText, ExternalLink, Download, Eye, ChevronDown,
  ChevronUp, Image, AlertTriangle, UserCheck, Ban, ArrowUpDown,
  MessageSquare, ZoomIn, X, Loader2, Filter,
} from "lucide-react";
import { toast } from "sonner";

const REJECTION_REASONS = {
  PAN: ["Image is blurry/not clear", "PAN card is expired", "Name doesn't match business details", "Wrong document uploaded", "Other"],
  GST: ["GST certificate is expired", "GSTIN doesn't match registered number", "Document is not readable", "Wrong document uploaded", "Other"],
  BANK_PROOF: ["Cheque image is not clear", "Account holder name doesn't match", "Bank statement is older than 3 months", "Wrong document uploaded", "Other"],
  BUSINESS_REGISTRATION: ["License is expired", "Business name doesn't match", "Document is not clear", "Wrong document uploaded", "Other"],
  IDENTITY_PROOF: ["ID is expired", "Name doesn't match", "Image is not clear", "Wrong document uploaded", "Other"],
  ADDRESS_PROOF: ["Bill is older than 3 months", "Address doesn't match business address", "Document is not clear", "Wrong document uploaded", "Other"],
};

const DOC_TYPE_LABELS = {
  PAN: "PAN Card",
  GST: "GST Certificate",
  BANK_PROOF: "Bank Proof",
  BUSINESS_REGISTRATION: "Business Registration",
  IDENTITY_PROOF: "Identity Proof",
  ADDRESS_PROOF: "Address Proof",
};

const REQUIRED_DOCS = ["PAN", "GST", "BANK_PROOF", "BUSINESS_REGISTRATION", "IDENTITY_PROOF", "ADDRESS_PROOF"];

export default function AdminKYCPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  const [processingDoc, setProcessingDoc] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kyc?status=${statusFilter}&page=${page}&limit=10`);
      const json = await res.json();
      if (json.success) setData(json.data || json);
    } catch {
      toast.error("Failed to load KYC data");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

// Handle supplierId from URL param
  useEffect(() => {
    if (data && initialLoad) {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('supplierId');
      if (sid) {
        setExpandedSuppliers(prev => ({ ...prev, [sid]: true }));
        // Scroll to that supplier
        setTimeout(() => {
          document.getElementById(`supplier-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
      setInitialLoad(false);
    }
  }, [data, initialLoad]);

  const handleApprove = async (docId) => {
    setProcessingDoc(docId);
    try {
      const res = await fetch(`/api/admin/kyc/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Document approved!");
        fetchData();
      } else {
        toast.error(json.error || "Failed to approve");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleReject = async (docId, rejectionReason) => {
    setProcessingDoc(docId);
    try {
      const res = await fetch(`/api/admin/kyc/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", rejectionReason }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Document rejected");
        setRejectModal(null);
        fetchData();
      } else {
        toast.error(json.error || "Failed to reject");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleApproveAll = async (supplierId, documents) => {
    const pendingDocs = documents.filter((d) => d.status === "PENDING");
    if (pendingDocs.length === 0) {
      toast.info("No pending documents to approve");
      return;
    }
    if (!confirm(`Approve all ${pendingDocs.length} pending documents for this supplier?`)) return;

    for (const doc of pendingDocs) {
      setProcessingDoc(doc.id);
      try {
        await fetch(`/api/admin/kyc/${doc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE" }),
        });
      } catch {}
    }
    setProcessingDoc(null);
    toast.success(`Approved ${pendingDocs.length} documents!`);
    fetchData();
  };

  const handleManualVerify = async (supplierId) => {
    if (!confirm("Manually verify this supplier? This will make their store LIVE even if some documents are pending. Only do this for pre-approved or enterprise suppliers.")) return;

    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, action: "verify" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Supplier manually verified and is now LIVE!");
        fetchData();
      } else {
        toast.error(json.error || "Failed to verify");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleManualUnverify = async (supplierId) => {
    if (!confirm("UNVERIFY this supplier?\n\n⚠️ Their store will go OFFLINE immediately.\n⚠️ All products will be hidden from buyers.\n⚠️ Only do this for fraud or compliance violations.\n\nAre you sure?")) return;

    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, action: "unverify" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Supplier unverified. Store is now offline.");
        fetchData();
      } else {
        toast.error(json.error || "Failed to unverify");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const toggleSupplier = (supplierId) => {
    setExpandedSuppliers((prev) => ({
      ...prev,
      [supplierId]: !prev[supplierId],
    }));
  };

  const stats = data?.stats || { pending: 0, approved: 0, rejected: 0, suppliersPending: 0 };
  const grouped = data?.grouped || [];

  const filteredGrouped = grouped.filter((group) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      group.supplier.businessName?.toLowerCase().includes(s) ||
      group.supplier.email?.toLowerCase().includes(s) ||
      group.supplier.gstin?.toLowerCase().includes(s)
    );
  });

  const tabs = [
    { value: "PENDING", label: "Pending", count: stats.pending, color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
    { value: "APPROVED", label: "Approved", count: stats.approved, color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
    { value: "REJECTED", label: "Rejected", count: stats.rejected, color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
    { value: "ALL", label: "All", count: stats.pending + stats.approved + stats.rejected, color: "bg-blue-50 text-blue-700 border-blue-200", icon: Filter },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            KYC Verification
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review supplier documents • {stats.suppliersPending} suppliers waiting
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="px-2 py-1 bg-gray-100 rounded-lg">{stats.pending + stats.approved + stats.rejected} total docs</span>
          <button onClick={fetchData} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition" title="Refresh">
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              <p className="text-sm text-green-600">Approved</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              <p className="text-sm text-red-600">Rejected</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.suppliersPending}</p>
              <p className="text-sm text-blue-600">Suppliers</p>
            </div>
            <Store className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === tab.value
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                statusFilter === tab.value ? "bg-gray-100" : "bg-white/50"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search supplier name, email, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredGrouped.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center">
          <Shield className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No KYC documents found</h3>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === "PENDING" ? "All documents have been reviewed! 🎉" : "Try changing the filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGrouped.map((group) => {
            const isExpanded = expandedSuppliers[group.supplier.id];
            const allApproved = group.approvedCount === REQUIRED_DOCS.length;
            const hasPending = group.pendingCount > 0;
            const isVerified = group.supplier.isVerified;

            return (
              <div key={group.supplier.id} id={`supplier-${group.supplier.id}`} className="bg-white rounded-xl border overflow-hidden">
                {/* Supplier Header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => toggleSupplier(group.supplier.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isVerified ? "bg-green-100" : allApproved ? "bg-green-100" : hasPending ? "bg-yellow-100" : "bg-blue-100"
                    }`}>
                      {group.supplier.logo ? (
                        <img src={group.supplier.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <Store className={`h-6 w-6 ${
                          isVerified ? "text-green-600" : allApproved ? "text-green-600" : hasPending ? "text-yellow-600" : "text-blue-600"
                        }`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{group.supplier.businessName}</h3>
                        {isVerified && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="truncate">{group.supplier.email}</span>
                        <span>•</span>
                        <span>{group.supplier.gstin || "No GSTIN"}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded-full text-xs">
                          {group.supplier.businessType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5">
                      {group.pendingCount > 0 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          {group.pendingCount} pending
                        </span>
                      )}
                      {group.approvedCount > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {group.approvedCount}/{REQUIRED_DOCS.length}
                        </span>
                      )}
                      {group.rejectedCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          {group.rejectedCount} rejected
                        </span>
                      )}
                    </div>
                    <div className="hidden md:block w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isVerified || allApproved ? "bg-green-500" : group.rejectedCount > 0 ? "bg-red-500" : "bg-yellow-500"
                        }`}
                        style={{ width: `${(group.approvedCount / REQUIRED_DOCS.length) * 100}%` }}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Document Cards */}
                {isExpanded && (
                  <div className="border-t bg-gray-50/50 p-5">
                    {/* Manual Verification Controls */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isVerified || allApproved ? "bg-green-100 text-green-700" :
                          group.approvedCount >= 4 ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {group.approvedCount}/{REQUIRED_DOCS.length} Documents Approved
                          {isVerified && " • Verified"}
                        </span>
                        {!isVerified && !allApproved && group.approvedCount >= 4 && (
                          <span className="text-xs text-gray-500">— Eligible for manual verification</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {hasPending && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveAll(group.supplier.id, group.documents); }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve All
                          </button>
                        )}

                        {/* Manual Verify - show if not verified but has enough docs */}
                        {!isVerified && group.approvedCount >= 4 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleManualVerify(group.supplier.id); }}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1"
                            title="Manually verify this supplier (for enterprise/pre-approved suppliers)"
                          >
                            <UserCheck className="h-4 w-4" />
                            Manual Verify
                          </button>
                        )}

                        {/* Unverify - show if already verified */}
                        {isVerified && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleManualUnverify(group.supplier.id); }}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition flex items-center gap-1"
                            title="Remove verification (for fraud/compliance issues)"
                          >
                            <Ban className="h-4 w-4" />
                            Unverify
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Document Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {REQUIRED_DOCS.map((docType) => {
                        const doc = group.documents.find((d) => d.documentType === docType);

                        if (!doc) {
                          return (
                            <div key={docType} className="bg-white rounded-xl border border-dashed border-gray-300 p-4 flex items-center justify-center min-h-[120px]">
                              <div className="text-center">
                                <FileText className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                                <p className="text-xs text-gray-400">{DOC_TYPE_LABELS[docType]}</p>
                                <p className="text-xs text-gray-300">Not uploaded</p>
                              </div>
                            </div>
                          );
                        }

                        const isPending = doc.status === "PENDING";
                        const isApproved = doc.status === "APPROVED";
                        const isRejected = doc.status === "REJECTED";
                        const isProcessing = processingDoc === doc.id;

                        return (
                          <div
                            key={doc.id}
                            className={`bg-white rounded-xl border-2 p-3 relative ${
                              isApproved ? "border-green-300" : isRejected ? "border-red-300" : "border-yellow-300"
                            }`}
                          >
                            {/* Status Badge */}
                            <div className="absolute top-2 right-2 z-10">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                isApproved ? "bg-green-100 text-green-700" :
                                isRejected ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {isApproved ? "✓" : isRejected ? "✗" : "⏳"}
                              </span>
                            </div>

                            {/* Document Preview */}
                            <div
                              className="cursor-pointer group relative"
                              onClick={() => setPreviewDoc(doc)}
                            >
                              {doc.fileType?.startsWith("image/") ? (
                                <div className="relative">
                                  <img
                                    src={doc.fileUrl}
                                    alt={doc.documentType}
                                    className="w-full h-32 object-cover rounded-lg border"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition flex items-center justify-center">
                                    <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg h-24">
                                  <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{doc.fileName}</p>
                                    <p className="text-xs text-gray-500">PDF • {(doc.fileSize / 1024).toFixed(0)} KB</p>
                                    <div className="flex gap-2 mt-2">
                                      <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" /> View
                                      </a>
                                      <a
                                        href={doc.fileUrl}
                                        download
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        <Download className="h-3 w-3" /> Download
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Document Info */}
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-gray-800">
                                {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                              </p>
                              {doc.documentNumber && (
                                <p className="text-xs text-gray-500 truncate">{doc.documentNumber}</p>
                              )}
                            </div>

                            {/* Rejection Reason */}
                            {isRejected && doc.rejectionReason && (
                              <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-start gap-1.5">
                                <MessageSquare className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-red-700">{doc.rejectionReason}</p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            {isPending && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApprove(doc.id); }}
                                  disabled={isProcessing}
                                  className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRejectModal({ docId: doc.id, docType: doc.documentType }); }}
                                  disabled={isProcessing}
                                  className="flex-1 px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50 transition disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Supplier Meta */}
                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                      <span>Joined: {new Date(group.supplier.createdAt).toLocaleDateString()}</span>
                      <span>Supplier ID: {group.supplier.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {DOC_TYPE_LABELS[previewDoc.documentType]} • {previewDoc.supplier?.businessName}
                </h3>
                <p className="text-sm text-gray-500">{previewDoc.fileName}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-100 min-h-[300px] max-h-[70vh] overflow-auto">
              {previewDoc.fileType?.startsWith("image/") ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.documentType}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">PDF Document</p>
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition inline-flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open PDF in New Tab
                  </a>
                </div>
              )}
            </div>
            {previewDoc.status === "PENDING" && (
              <div className="p-4 border-t flex gap-3 justify-end">
                <button
                  onClick={() => { setRejectModal({ docId: previewDoc.id, docType: previewDoc.documentType }); setPreviewDoc(null); }}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-xl font-medium hover:bg-red-50 transition"
                >
                  <XCircle className="h-4 w-4 inline mr-1" /> Reject
                </button>
                <button
                  onClick={() => { handleApprove(previewDoc.id); setPreviewDoc(null); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
                >
                  <CheckCircle className="h-4 w-4 inline mr-1" /> Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900">Reject Document</h3>
              <p className="text-sm text-gray-500 mt-1">
                {DOC_TYPE_LABELS[rejectModal.docType]} • Select a reason:
              </p>
            </div>
            <div className="p-5 space-y-2 max-h-[50vh] overflow-y-auto">
              {(REJECTION_REASONS[rejectModal.docType] || REJECTION_REASONS.PAN).map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReject(rejectModal.docId, reason)}
                  disabled={processingDoc === rejectModal.docId}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm border hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50"
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="p-5 border-t">
              <button
                onClick={() => setRejectModal(null)}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}