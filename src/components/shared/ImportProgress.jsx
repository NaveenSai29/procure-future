'use client';

import { CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';

export default function ImportProgress({ total, valid, errors, warnings }) {
  const validPercent = total > 0 ? (valid / total * 100) : 0;
  const errorPercent = total > 0 ? (errors / total * 100) : 0;
  const warningPercent = total > 0 ? (warnings / total * 100) : 0;

  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Validation Summary</h3>
      
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Total Rows</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{valid}</p>
          <p className="text-xs text-gray-500">Valid</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{errors}</p>
          <p className="text-xs text-gray-500">Errors</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{warnings}</p>
          <p className="text-xs text-gray-500">Warnings</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
        {validPercent > 0 && (
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${validPercent}%` }}
          ></div>
        )}
        {warningPercent > 0 && (
          <div
            className="h-full bg-yellow-500 transition-all"
            style={{ width: `${warningPercent}%` }}
          ></div>
        )}
        {errorPercent > 0 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${errorPercent}%` }}
          ></div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span> Valid
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Warnings
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span> Errors
        </span>
      </div>
    </div>
  );
}