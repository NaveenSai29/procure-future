"use client";

import { useState } from "react";
import { Eye, Trash2, Download, FileText, Image, ExternalLink, Loader2, AlertTriangle, Video } from "lucide-react";

const ENTITY_LABELS = {
  KYC: "KYC Document",
  PRODUCT: "Product",
  BANNER: "Banner",
  CATEGORY: "Category",
  BRAND: "Brand",
  VARIANT: "Variant",
  GENERAL: "General",
  AI_GENERATED: "AI Generated",
  SUPPLIER: "Supplier",
};

function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function getFullUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://vantagemarketspvt.com${url}`;
}

export default function MediaCard({ media, onDelete, onPreview }) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isImage = media.fileType?.startsWith("image/") || media.fileType === 'SUPPLIER_LOGO' || media.fileType === 'SUPPLIER_BANNER' || media.fileType === 'SUPPLIER_PHOTO';
  const isVideo = media.fileType?.startsWith("video/") || media.fileType === 'SUPPLIER_VIDEO';
  const fullUrl = getFullUrl(media.fileUrl);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media?id=${media.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(media.id);
      }
    } catch {} finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden group hover:shadow-md transition">
        {/* Preview */}
        <div
          className="relative cursor-pointer h-40 bg-gray-100 flex items-center justify-center"
          onClick={() => onPreview?.(media)}
        >
          {isImage ? (
            <img
              src={fullUrl}
              alt={media.originalName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
            />
          ) : isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                src={fullUrl}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
          ) : (
            <div className="text-center p-4">
              <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 truncate max-w-[150px]">{media.originalName}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye className="h-6 w-6 text-white" />
          </div>
          
          {/* AI Generated Badge */}
          {media.entityType === 'PRODUCT' && media.originalName.includes('ai-generated') && (
            <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 bg-purple-500 text-white rounded-full font-medium">
              AI
            </span>
          )}

          {/* Video Badge */}
          {isVideo && (
            <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-medium">
              VIDEO
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs font-medium text-gray-900 truncate" title={media.originalName}>
            {media.originalName}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">{formatSize(media.fileSize)}</span>
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
              {ENTITY_LABELS[media.entityType] || media.entityType}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(media.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Actions */}
        <div className="border-t flex divide-x">
          <button
            onClick={() => onPreview?.(media)}
            className="flex-1 py-2 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50 transition"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <a
            href={fullUrl}
            download
            className="flex-1 py-2 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50 transition"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="flex-1 py-2 flex items-center justify-center text-xs text-red-500 hover:bg-red-50 transition disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Delete Confirm Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete File</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Delete "{media.originalName}"? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}