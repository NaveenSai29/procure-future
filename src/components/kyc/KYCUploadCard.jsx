"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Image, Loader2, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPE_LABELS = {
  PAN: { label: "PAN Card", desc: "Upload clear photo/scanned copy of PAN card" },
  GST: { label: "GST Registration Certificate", desc: "Upload GST registration certificate (PDF)" },
  BANK_PROOF: { label: "Bank Account Proof", desc: "Cancelled cheque or bank statement" },
  BUSINESS_REGISTRATION: { label: "Business Registration", desc: "Shop Act license, Udyam certificate, or incorporation certificate" },
  IDENTITY_PROOF: { label: "Identity Proof", desc: "Aadhaar card, Voter ID, or Driving License of owner" },
  ADDRESS_PROOF: { label: "Address Proof", desc: "Electricity bill, rent agreement, or property tax receipt" },
};

const REJECTION_TEMPLATES = {
  PAN: [
    "Image is blurry/not clear",
    "PAN card is expired",
    "Name doesn't match business details",
    "Wrong document uploaded",
  ],
  GST: [
    "GST certificate is expired",
    "GSTIN doesn't match registered number",
    "Document is not readable",
    "Wrong document uploaded",
  ],
  BANK_PROOF: [
    "Cheque image is not clear",
    "Account holder name doesn't match",
    "Bank statement is older than 3 months",
    "Wrong document uploaded",
  ],
  BUSINESS_REGISTRATION: [
    "License is expired",
    "Business name doesn't match",
    "Document is not clear",
    "Wrong document uploaded",
  ],
  IDENTITY_PROOF: [
    "ID is expired",
    "Name doesn't match",
    "Image is not clear",
    "Wrong document uploaded",
  ],
  ADDRESS_PROOF: [
    "Bill is older than 3 months",
    "Address doesn't match business address",
    "Document is not clear",
    "Wrong document uploaded",
  ],
};

export default function KYCUploadCard({ documentType, existingDoc, onUpload, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const docInfo = DOC_TYPE_LABELS[documentType] || { label: documentType, desc: "" };

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, JPG, and PNG files are allowed");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Show preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const res = await fetch("/api/supplier/kyc", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      toast.success(`${docInfo.label} uploaded successfully!`);
      onUpload?.(data.document);
    } catch (error) {
      toast.error(error.message || "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/supplier/kyc?id=${existingDoc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Document deleted");
      setPreview(null);
      onDelete?.();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const statusBadge = () => {
    if (!existingDoc) return null;
    switch (existingDoc.status) {
      case "APPROVED":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Verified</span>;
      case "REJECTED":
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">✗ Rejected</span>;
      case "PENDING":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">⏳ Pending</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            {docInfo.label}
          </h4>
          <p className="text-xs text-gray-500 mt-1">{docInfo.desc}</p>
        </div>
        {statusBadge()}
      </div>

      {/* Existing Document Display */}
      {existingDoc && existingDoc.status !== "REJECTED" && (
        <div className="mb-3">
          {existingDoc.fileType.startsWith("image/") ? (
            <img
              src={existingDoc.fileUrl}
              alt={existingDoc.fileName}
              className="w-full h-40 object-cover rounded-lg border"
            />
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
              <FileText className="h-8 w-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{existingDoc.fileName}</p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
              <a href={existingDoc.fileUrl} target="_blank" className="text-blue-600 hover:underline text-sm">
                <Eye className="h-4 w-4" />
              </a>
            </div>
          )}
          <button
            onClick={handleDelete}
            className="mt-2 text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" /> Delete & Re-upload
          </button>
        </div>
      )}

      {/* Rejection Message */}
      {existingDoc?.status === "REJECTED" && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-700">Rejected: {existingDoc.rejectionReason}</p>
          <p className="text-xs text-red-600 mt-1">Please upload a new corrected document.</p>
        </div>
      )}

      {/* Upload Area (show if no doc or rejected) */}
      {(!existingDoc || existingDoc.status === "REJECTED") && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">Uploading...</p>
            </div>
          ) : preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
              <button
                onClick={(e) => { e.stopPropagation(); setPreview(null); }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="text-sm text-gray-500 mt-2">Click "Upload" to submit or select another file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </div>
      )}

      {/* Quick Rejection Templates (Admin use) */}
      {existingDoc?.status === "PENDING" && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-2">Quick reject reasons:</p>
          <div className="flex flex-wrap gap-1">
            {(REJECTION_TEMPLATES[documentType] || []).slice(0, 3).map((reason) => (
              <button
                key={reason}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-red-100 rounded-full text-gray-600"
                onClick={() => {
                  // This is for the admin panel to use
                }}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}