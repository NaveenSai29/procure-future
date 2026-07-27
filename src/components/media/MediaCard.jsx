"use client";

import { useState } from "react";
import { Eye, Trash2, Download, FileText, Image, ExternalLink, Loader2 } from "lucide-react";

const ENTITY_LABELS = {
  KYC: "KYC Document",
  PRODUCT: "Product",
  BANNER: "Banner",
  CATEGORY: "Category",
  BRAND: "Brand",
  VARIANT: "Variant",
  GENERAL: "General",
};

function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function MediaCard({ media, onDelete, onPreview }) {
  const [deleting, setDeleting] = useState(false);
  const isImage = media.fileType?.startsWith("image/");

  const handleDelete = async () => {
    if (!confirm(`Delete "${media.originalName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media?id=${media.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(media.id);
      }
    } catch {} finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden group hover:shadow-md transition">
      {/* Preview */}
      <div
        className="relative cursor-pointer h-40 bg-gray-100 flex items-center justify-center"
        onClick={() => onPreview?.(media)}
      >
        {isImage ? (
          <img
            src={media.fileUrl}
            alt={media.originalName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-center p-4">
            <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500 truncate max-w-[150px]">{media.originalName}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Eye className="h-6 w-6 text-white" />
        </div>
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
        <a
          href={media.fileUrl}
          target="_blank"
          className="flex-1 py-2 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href={media.fileUrl}
          download
          className="flex-1 py-2 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50 transition"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 py-2 flex items-center justify-center text-xs text-red-500 hover:bg-red-50 transition disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}