'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, XCircle } from 'lucide-react';

export default function ImportErrors({ errors, title = 'Errors', type = 'error' }) {
  const [expanded, setExpanded] = useState(false);
  const displayErrors = expanded ? errors : errors.slice(0, 5);

  const isError = type === 'error';
  const bgColor = isError ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  const textColor = isError ? 'text-red-700' : 'text-yellow-700';
  const iconColor = isError ? 'text-red-500' : 'text-yellow-500';
  const Icon = isError ? XCircle : AlertTriangle;

  if (!errors || errors.length === 0) return null;

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h4 className={`font-semibold ${textColor}`}>
          {title} ({errors.length})
        </h4>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {displayErrors.map((error, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <span className="font-medium text-gray-500 min-w-[60px]">
              Row {error.rowNumber}:
            </span>
            <span className={textColor}>
              {error.message || (Array.isArray(error.errors) ? error.errors.join('; ') : String(error))}
            </span>
          </div>
        ))}
      </div>

      {errors.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 mt-2 text-sm ${textColor} hover:underline`}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show All {errors.length} Issues
            </>
          )}
        </button>
      )}
    </div>
  );
}