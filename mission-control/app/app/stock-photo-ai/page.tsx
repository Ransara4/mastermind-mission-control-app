"use client";

import { Camera, Image, TrendingUp, DollarSign, RefreshCw, Loader2, AlertCircle, ExternalLink, BarChart3 } from "lucide-react";
import { useStockPhotoData } from "@/hooks/useStockPhotoData";

export default function StockPhotoAIPage() {
  const { data, loading, error, refresh } = useStockPhotoData();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-dark-muted" size={32} />
        <span className="ml-3 text-dark-muted">Loading Stock Photo AI data...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto text-dark-danger mb-2" size={32} />
        <p className="text-dark-danger font-medium">Failed to load data</p>
        <p className="text-dark-danger text-sm mt-1">{error}</p>
        <button onClick={refresh} className="mt-3 px-4 py-2 bg-dark-danger/20 text-dark-danger rounded-lg hover:bg-dark-danger/20 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold  text-dark-text">Stock Photo AI</h1>
          <p className="text-sm text-dark-muted">AI-powered stock photo description service</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3007"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-medium"
          >
            <ExternalLink size={16} />
            Open App
          </a>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-dark-muted hover:text-dark-muted hover:bg-dark-panel2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Images Processed", value: data?.totalImages?.toLocaleString() || "0", icon: Image, gradient: "from-violet-500 to-purple-600", light: "text-violet-100" },
          { label: "Today", value: data?.todayImages?.toLocaleString() || "0", icon: Camera, gradient: "from-cm-purple to-cm-purple/60", light: "text-cm-purple" },
          { label: "Downloads", value: data?.totalDownloads?.toLocaleString() || "0", icon: TrendingUp, gradient: "from-cm-purple to-cm-purple/60", light: "text-dark-success" },
          { label: "Revenue", value: `$${(data?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, gradient: "from-amber-500 to-orange-600", light: "text-amber-100" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-gradient-to-br ${card.gradient} text-white rounded-lg p-5`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`${card.light} text-sm`}>{card.label}</p>
                <Icon size={18} className={card.light} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Top Categories */}
      <div className="bg-dark-panel border border-dark-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-dark-muted" />
          <h2 className="text-lg font-bold  text-dark-text">Top Photo Categories</h2>
        </div>
        {data?.topCategories && data.topCategories.length > 0 ? (
          <div className="space-y-3">
            {data.topCategories.slice(0, 10).map((cat, i) => {
              const maxCount = data.topCategories[0]?.count || 1;
              const pct = Math.round((cat.count / maxCount) * 100);
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-sm text-dark-muted w-6 text-right">{i + 1}.</span>
                  <span className="text-sm font-medium text-dark-text w-32 truncate">{cat.name}</span>
                  <div className="flex-1 bg-dark-panel2 rounded-full h-2.5">
                    <div className="bg-cm-purple h-2.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-dark-muted w-12 text-right">{cat.count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-dark-muted text-sm">No categories tracked yet. Process some images to see data here.</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-dark-panel border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-bold  text-dark-text mb-4">Recent Processing Activity</h2>
        {data?.dailyGenerations && data.dailyGenerations.length > 0 ? (
          <div className="grid grid-cols-7 gap-2">
            {data.dailyGenerations.slice(-14).map((day) => (
              <div key={day.date} className="text-center">
                <div
                  className={`mx-auto w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                    day.count > 0 ? "bg-cm-purple/20 text-cm-purple-mid" : "bg-dark-bg text-dark-muted"
                  }`}
                >
                  {day.count}
                </div>
                <p className="text-xs text-dark-muted mt-1">{new Date(day.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-muted text-sm">No recent activity.</p>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-dark-bg border border-dark-border rounded-lg p-6">
        <h2 className="text-lg font-bold  text-dark-text mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <a href="http://localhost:3007" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-dark-panel border border-dark-border rounded-lg text-sm text-dark-text hover:bg-dark-panel2">
            Upload Photos
          </a>
          <a href="http://localhost:3007/#pricing" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-dark-panel border border-dark-border rounded-lg text-sm text-dark-text hover:bg-dark-panel2">
            Pricing
          </a>
        </div>
      </div>
    </div>
  );
}
