"use client";

import MediaCard from "./MediaCard";

export default function MediaGrid({ media, onDelete, onPreview }) {
  if (!media || media.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-16 text-center">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="text-lg font-semibold text-gray-500">No files found</h3>
        <p className="text-sm text-gray-400 mt-1">Upload files to see them here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {media.map((item) => (
        <MediaCard
          key={item.id}
          media={item}
          onDelete={onDelete}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}