"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

const ACTION_BADGE: Record<string, { bg: string; text: string; emoji: string }> = {
  BARK: { bg: "bg-dark-danger/20", text: "text-dark-danger", emoji: "🚨" },
  WHINE: { bg: "bg-dark-warn/20", text: "text-dark-warn", emoji: "🐕" },
  SILENT: { bg: "bg-dark-success/20", text: "text-dark-success", emoji: "😴" },
};

interface ScanResult {
  name: string;
  ecosystem: string;
  action: string;
  threat: string;
  confidence: number;
  reasons: string[];
}

export default function QuickScan({ onScanComplete }: { onScanComplete?: () => void }) {
  const [packageName, setPackageName] = useState("");
  const [ecosystem, setEcosystem] = useState("npm");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    if (!packageName.trim()) return;

    setScanning(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/guard-dog/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: packageName.trim(), ecosystem }),
      });
      const data = await res.json();

      if (data.success && data.result) {
        setResult(data.result);
        onScanComplete?.();
      } else {
        setError(data.error || "Scan returned no result");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">🔍 Quick Sniff</h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !scanning && handleScan()}
          placeholder="Package name (e.g. lodash)"
          className="flex-1 px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
        />
        <select
          value={ecosystem}
          onChange={(e) => setEcosystem(e.target.value)}
          className="px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
        >
          <option value="npm">npm</option>
          <option value="pypi">pypi</option>
        </select>
        <button
          onClick={handleScan}
          disabled={scanning || !packageName.trim()}
          className="px-4 py-2 bg-cm-purple text-white text-sm rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {scanning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Scan
        </button>
      </div>

      {scanning && (
        <div className="mt-4 flex items-center gap-2 text-sm text-dark-muted">
          <Loader2 size={14} className="animate-spin" />
          🐾 Sniffing {packageName}...
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-dark-panel2 border border-dark-border rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-dark-text">
              {result.name}
            </span>
            <span className="text-xs text-dark-muted">{result.ecosystem}</span>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                (ACTION_BADGE[result.action] || ACTION_BADGE.SILENT).bg
              } ${(ACTION_BADGE[result.action] || ACTION_BADGE.SILENT).text}`}
            >
              {(ACTION_BADGE[result.action] || ACTION_BADGE.SILENT).emoji} {result.action}
            </span>
            <span className="text-xs text-dark-muted">
              {result.confidence}% confidence
            </span>
          </div>
          {result.reasons.length > 0 && (
            <ul className="space-y-0.5">
              {result.reasons.map((r, i) => (
                <li key={i} className="text-xs text-dark-muted">
                  &bull; {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
