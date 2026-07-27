"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AIGenerateButton({ type, productName, category, existingDescription, onResult, label, className = "" }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!productName?.trim()) {
      toast.error("Please enter a product name first");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/supplier/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          productName: productName.trim(),
          category: category || "",
          existingDescription: existingDescription || "",
        }),
      });

      const data = await res.json();

      if (res.ok || data.success) {
        const result = data.data || data;
        onResult(result);
        toast.success("AI content generated!");
      } else {
        toast.error(data.error || "AI generation failed");
      }
    } catch {
      toast.error("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
        loading
          ? "bg-purple-100 text-purple-500"
          : "bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200"
      } ${className}`}
      title="Generate with AI"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {label || "AI Generate"}
    </button>
  );
}