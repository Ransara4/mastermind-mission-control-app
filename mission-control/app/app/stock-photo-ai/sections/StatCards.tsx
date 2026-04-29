"use client";

import { Image, DollarSign, Star, Globe } from "lucide-react";
import type { StockPhotoStats } from "@/lib/stock-photo-types";

export default function StatCards({ stats }: { stats: StockPhotoStats }) {
  const cards = [
    {
      label: "Total Generated",
      value: stats.totalImages.toLocaleString(),
      subtitle: `${stats.todayImages} today`,
      icon: Image,
      gradient: "from-violet-500 to-purple-600",
      lightText: "text-violet-100",
    },
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle: `${stats.totalDownloads.toLocaleString()} downloads`,
      icon: DollarSign,
      gradient: "from-cm-purple to-cm-purple/60",
      lightText: "text-dark-success",
    },
    {
      label: "Avg Rating",
      value: stats.avgRating.toFixed(1),
      subtitle: "Across all platforms",
      icon: Star,
      gradient: "from-amber-500 to-orange-600",
      lightText: "text-amber-100",
    },
    {
      label: "Platforms",
      value: stats.platformsListed.toString(),
      subtitle: "Active marketplaces",
      icon: Globe,
      gradient: "from-cm-purple to-cm-purple/60",
      lightText: "text-cm-purple",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.gradient} text-white rounded-lg p-6`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className={`${card.lightText} text-sm`}>{card.label}</p>
              <Icon size={20} className={card.lightText} />
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className={`text-xs ${card.lightText} mt-1`}>{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
