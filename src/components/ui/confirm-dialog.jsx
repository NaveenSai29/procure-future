"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText, variant = "default" }) {
  if (!open) return null;

  const variantStyles = {
    default: "bg-blue-600 hover:bg-blue-700 text-white",
    destructive: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border z-10">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-100 rounded-full shrink-0">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            className={variantStyles[variant]}
            onClick={onConfirm}
          >
            {confirmText || "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}