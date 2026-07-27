"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen, Search, Trash2, Image, FileText,
  AlertTriangle, Loader2, X, Download, RefreshCw, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import MediaGrid from "@/components/media/MediaGrid";

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(1) + " GB";
}

export default function AdminMediaPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (entityFilter !== "ALL") params.set("entityType", entityFilter);
      if (typeFilter !== "ALL") params.set("fileType", typeFilter);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/admin/media?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data || json);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [entityFilter, typeFilter, page, searchTerm]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/admin/media/scan", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const msg = json.data?.message || json.message || "Scan complete!";
        toast.success(msg);
        fetchMedia();
      } else {
        toast.error(json.error || "Scan failed");
      }
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = (id) => {
    setData((prev) => ({
      ...prev,
      media: prev.media.filter((m) => m.id !== id),
      stats: { ...prev.stats, total: prev.stats.total - 1 },
    }));
    toast.success("File deleted");
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} files permanently? This cannot be undone.`)) return;

    setBulkDeleting(true);
    try {
      await fetch(`/api/admin/media?ids=${selectedIds.join(",")}`, { method: "DELETE" });
      toast.success(`${selectedIds.length} files deleted`);
      setSelectedIds([]);
      fetchMedia();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setBulkDeleting(false);
    }
  };

  const stats = data?.stats || {};
  const media = data?.media || [];
  const entityTypes = data?.entityTypes || [];
  const pagination = data?.pagination || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-blue-600" />
            Media Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.total || 0} files • {formatSize(stats.totalSize)} used
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition flex items-center gap-2"
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete ({selectedIds.length})
            </button>
          )}
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Scan Files
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xl font-bold">{stats.total || 0}</p>
          <p className="text-xs text-gray-500">Total Files</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xl font-bold text-blue-600">{stats.images || 0}</p>
          <p className="text-xs text-gray-500">Images</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xl font-bold text-purple-600">{stats.documents || 0}</p>
          <p className="text-xs text-gray-500">Documents</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xl font-bold text-green-600">{formatSize(stats.totalSize)}</p>
          <p className="text-xs text-gray-500">Storage</p>
        </div>
        <div className={`bg-white rounded-xl border p-3 ${stats.orphaned > 0 ? "border-orange-300" : ""}`}>
          <p className={`text-xl font-bold ${stats.orphaned > 0 ? "text-orange-600" : "text-gray-600"}`}>
            {stats.orphaned || 0}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {stats.orphaned > 0 && <AlertTriangle className="h-3 w-3 text-orange-500" />}
            Orphaned
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
        >
          <option value="ALL">All Types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
        >
          <option value="ALL">All Files</option>
          <option value="IMAGE">Images Only</option>
          <option value="DOCUMENT">Documents Only</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <MediaGrid
          media={media}
          onDelete={handleDelete}
          onPreview={setPreviewFile}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold text-gray-900">{previewFile.originalName}</p>
                <p className="text-xs text-gray-500">{formatSize(previewFile.fileSize)} • {previewFile.entityType}</p>
              </div>
              <div className="flex gap-2">
                <a href={previewFile.fileUrl} download className="p-2 hover:bg-gray-100 rounded-xl transition">
                  <Download className="h-5 w-5 text-gray-500" />
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-100 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
              {previewFile.fileType?.startsWith("image/") ? (
                <img src={previewFile.fileUrl} alt={previewFile.originalName} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <a href={previewFile.fileUrl} target="_blank" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition inline-flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" /> Open File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}