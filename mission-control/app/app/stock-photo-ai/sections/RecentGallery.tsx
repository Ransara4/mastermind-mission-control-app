"use client";

import { Download, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { GeneratedImage } from "@/lib/stock-photo-types";

function StatusBadge({ status }: { status: GeneratedImage["status"] }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-success/10 text-dark-success text-xs rounded-full">
          <CheckCircle2 size={10} />
          Live
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cm-purple/10 text-cm-purple text-xs rounded-full">
          <Loader2 size={10} className="animate-spin" />
          Processing
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-danger/10 text-dark-danger text-xs rounded-full">
          <AlertCircle size={10} />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-bg text-dark-muted text-xs rounded-full">
          <Clock size={10} />
          Queued
        </span>
      );
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function RecentGallery({ images }: { images: GeneratedImage[] }) {
  if (images.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-bold  text-dark-text mb-4">Recent Generations</h3>
        <div className="text-center py-12 text-dark-muted">No images generated yet</div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold  text-dark-text">Recent Generations</h3>
        <span className="text-xs text-dark-muted">{images.length} images</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.slice(0, 9).map((img) => (
          <div
            key={img.id}
            className="group border border-dark-border rounded-lg overflow-hidden hover:shadow-md hover:shadow-black/20 transition-shadow"
          >
            {/* Placeholder thumbnail */}
            <div
              className={`h-32 bg-gradient-to-br ${img.thumbnailColor} flex items-center justify-center`}
            >
              <span className="text-white/60 text-xs font-medium px-3 text-center leading-tight">
                {img.resolution}
              </span>
            </div>
            <div className="p-3">
              <p className="text-sm text-dark-text font-medium line-clamp-2 mb-2">
                {img.prompt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={img.status} />
                  <span className="text-xs text-dark-muted">{img.style}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-border">
                <div className="flex items-center gap-1 text-xs text-dark-muted">
                  <Download size={11} />
                  <span>{img.downloads}</span>
                </div>
                <span className="text-xs font-medium text-dark-success">
                  ${img.revenue.toFixed(2)}
                </span>
                <span className="text-xs text-dark-muted">
                  {timeAgo(img.createdAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
