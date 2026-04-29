"use client";

import { useState, useEffect, useCallback } from "react";
import { Film, Video, Image, Mic, RefreshCw, Loader2, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";

interface KlingStatus {
  agent: string;
  operation: string;
  result: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export default function KlingPage() {
  const [status, setStatus] = useState<KlingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kling");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-dark-muted" size={32} />
        <span className="ml-3 text-dark-muted">Loading Kling status...</span>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-6 text-center">
        <AlertCircle className="mx-auto text-dark-danger mb-2" size={32} />
        <p className="text-dark-danger font-medium">Failed to load data</p>
        <p className="text-dark-danger text-sm mt-1">{error}</p>
        <button onClick={refresh} className="mt-3 px-4 py-2 bg-dark-danger/20 text-dark-danger rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  const statusIcon = status?.result === "completed" || status?.result === "success"
    ? <CheckCircle2 className="text-dark-success" size={18} />
    : status?.result === "failed" || status?.result === "error"
    ? <XCircle className="text-dark-danger" size={18} />
    : <Clock className="text-dark-warn" size={18} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-cm-purple/15 rounded-lg p-3">
              <Film className="text-cm-purple" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-text tracking-tight">Kling AI</h1>
              <p className="text-dark-muted text-sm">AI video generation — text-to-video, image-to-video, lip-sync</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Capabilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Text to Video", desc: "Generate video from a text prompt", icon: Video, color: "text-cm-purple" },
          { label: "Image to Video", desc: "Animate a still image", icon: Image, color: "text-cm-purple" },
          { label: "Lip Sync", desc: "Sync faces to audio", icon: Mic, color: "text-cm-purple" },
          { label: "V3 Omni", desc: "Audio + video in one pass", icon: Film, color: "text-cm-purple" },
        ].map((cap) => {
          const Icon = cap.icon;
          return (
            <div key={cap.label} className="bg-dark-panel border border-dark-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Icon size={18} className={cap.color} />
                <span className="text-dark-text font-medium text-sm">{cap.label}</span>
              </div>
              <p className="text-dark-muted text-xs">{cap.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Last Activity */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-dark-text font-bold mb-4">Last Activity</h2>
        {status ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {statusIcon}
              <span className="text-dark-text font-medium capitalize">{status.operation}</span>
              <span className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
                {status.result}
              </span>
            </div>
            {status.details && Object.keys(status.details).length > 0 && (
              <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3">
                <pre className="text-dark-muted text-xs font-dm-mono whitespace-pre-wrap">
                  {JSON.stringify(status.details, null, 2)}
                </pre>
              </div>
            )}
            <p className="text-dark-muted text-xs">
              {status.timestamp ? new Date(status.timestamp).toLocaleString() : "—"}
            </p>
          </div>
        ) : (
          <p className="text-dark-muted text-sm">No activity yet. Generate a video to see status here.</p>
        )}
      </div>

      {/* Quick Reference */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-dark-text font-bold mb-4">CLI Quick Reference</h2>
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
          <pre className="text-dark-muted text-xs font-dm-mono whitespace-pre-wrap">{`# Text to video
node ~/.openclaw/workspace/agents/kling/src/index.js text2video "A cat playing piano" --wait --json

# Image to video
node ~/.openclaw/workspace/agents/kling/src/index.js image2video /tmp/photo.jpg --prompt="slow zoom" --wait --json

# Check status
node ~/.openclaw/workspace/agents/kling/src/index.js status <taskId>

# List models
node ~/.openclaw/workspace/agents/kling/src/index.js models`}</pre>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-dark-text font-bold mb-4">Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { model: "V3 / V3 Omni", price: "$0.08–$0.17" },
            { model: "V2 Master", price: "$0.21–$1.68" },
            { model: "V1.6 / V1", price: "$0.14–$1.40" },
          ].map((tier) => (
            <div key={tier.model} className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-center">
              <p className="text-dark-text font-medium text-sm">{tier.model}</p>
              <p className="text-cm-purple font-bold mt-1">{tier.price}</p>
              <p className="text-dark-muted text-xs">per generation</p>
            </div>
          ))}
        </div>
        <p className="text-dark-muted text-xs mt-3">New accounts get $1 free credit. Images: $0.004–$0.014 each. Lip-sync: $0.07/5s.</p>
      </div>
    </div>
  );
}
