"use client";

import AIGenerateButton from "./AIGenerateButton";

export default function SEOSection({
  metaTitle,
  setMetaTitle,
  metaDescription,
  setMetaDescription,
  productName,
  category,
  description,
}) {
  const handleMetaResult = (result) => {
    if (result.metaTitle) setMetaTitle(result.metaTitle);
    if (result.metaDescription) setMetaDescription(result.metaDescription);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">SEO Settings</h4>
        <AIGenerateButton
          type="meta"
          productName={productName}
          category={category}
          existingDescription={description}
          onResult={handleMetaResult}
          label="Generate SEO"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500">
          Meta Title ({metaTitle.length}/60)
        </label>
        <input
          type="text"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          maxLength={60}
          placeholder="Product Name - Best Price | PROCURE"
          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500">
          Meta Description ({metaDescription.length}/160)
        </label>
        <textarea
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          maxLength={160}
          rows={2}
          placeholder="Buy Product Name at best price on PROCURE. ✓ Best Quality ✓ Fast Delivery."
          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}