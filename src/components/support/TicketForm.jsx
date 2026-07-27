"use client";

import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "GENERAL", label: "General Inquiry" },
  { value: "ORDER", label: "Order Issue" },
  { value: "PAYMENT", label: "Payment Related" },
  { value: "PRODUCT", label: "Product Query" },
  { value: "DELIVERY", label: "Delivery Issue" },
  { value: "ACCOUNT", label: "Account Related" },
  { value: "TECHNICAL", label: "Technical Support" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "text-gray-600" },
  { value: "MEDIUM", label: "Medium", color: "text-blue-600" },
  { value: "HIGH", label: "High", color: "text-orange-600" },
  { value: "CRITICAL", label: "Critical", color: "text-red-600" },
];

export default function TicketForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "GENERAL",
    priority: "MEDIUM",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { toast.error("Subject is required"); return; }
    if (!form.description.trim()) { toast.error("Description is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/supplier/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        toast.success("Ticket created successfully!");
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to create ticket");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Create Support Ticket</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Subject *</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief summary of your issue"
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe your issue in detail..."
            rows={4}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              <><Send className="h-4 w-4" /> Submit Ticket</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}