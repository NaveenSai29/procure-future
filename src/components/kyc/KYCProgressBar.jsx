"use client";

import { CheckCircle, Clock, AlertCircle, Upload, FileText } from "lucide-react";

const DOC_TYPES = [
  { key: "PAN", label: "PAN Card", icon: FileText },
  { key: "GST", label: "GST Certificate", icon: FileText },
  { key: "BANK_PROOF", label: "Bank Proof", icon: FileText },
  { key: "BUSINESS_REGISTRATION", label: "Business Registration", icon: FileText },
  { key: "IDENTITY_PROOF", label: "Identity Proof", icon: FileText },
  { key: "ADDRESS_PROOF", label: "Address Proof", icon: FileText },
];

export default function KYCProgressBar({ documents = [] }) {
  const getDocStatus = (docType) => {
    const doc = documents.find((d) => d.documentType === docType);
    if (!doc) return "pending_upload";
    return doc.status.toLowerCase();
  };

  const approvedCount = DOC_TYPES.filter((t) => getDocStatus(t.key) === "approved").length;
  const rejectedCount = DOC_TYPES.filter((t) => getDocStatus(t.key) === "rejected").length;
  const progress = Math.round((approvedCount / DOC_TYPES.length) * 100);

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">KYC Document Progress</h3>
        <span className="text-sm font-medium text-gray-500">
          {approvedCount}/{DOC_TYPES.length} Verified
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            progress === 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-yellow-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Document Status List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DOC_TYPES.map((docType) => {
          const status = getDocStatus(docType.key);
          return (
            <div
              key={docType.key}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                status === "approved"
                  ? "bg-green-50 border-green-200"
                  : status === "rejected"
                  ? "bg-red-50 border-red-200"
                  : status === "pending"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {status === "approved" ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : status === "rejected" ? (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              ) : status === "pending" ? (
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              ) : (
                <Upload className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{docType.label}</p>
                <p className="text-xs">
                  {status === "approved" && <span className="text-green-600">Verified ✓</span>}
                  {status === "rejected" && <span className="text-red-600">Rejected - Re-upload needed</span>}
                  {status === "pending" && <span className="text-yellow-600">Under review...</span>}
                  {status === "pending_upload" && <span className="text-gray-500">Not uploaded yet</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* All Verified Message */}
      {progress === 100 && (
        <div className="mt-4 p-3 bg-green-100 rounded-lg text-center">
          <p className="text-green-700 font-medium">🎉 All documents verified! Your store is now LIVE.</p>
        </div>
      )}
    </div>
  );
}