"use client";

import { Globe, Download, Image } from "lucide-react";
import type { PlatformStats } from "@/lib/stock-photo-types";

export default function PlatformBreakdown({ platforms }: { platforms: PlatformStats[] }) {
  const maxRevenue = Math.max(...platforms.map((p) => p.revenue), 1);

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={18} className="text-dark-muted" />
        <h3 className="text-lg font-bold  text-dark-text">Platform Distribution</h3>
      </div>
      {platforms.length === 0 ? (
        <div className="text-center py-8 text-dark-muted text-sm">
          No platform data available
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((platform) => {
            const pct = Math.round((platform.revenue / maxRevenue) * 100);
            return (
              <div key={platform.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-sm font-medium text-dark-text">
                      {platform.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-dark-text">
                    ${platform.revenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 bg-dark-panel2 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: platform.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-dark-muted">
                  <span className="flex items-center gap-1">
                    <Image size={10} />
                    {platform.listed} listed
                  </span>
                  <span className="flex items-center gap-1">
                    <Download size={10} />
                    {platform.downloads.toLocaleString()} downloads
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
