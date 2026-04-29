"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Clock,
  Shield,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useGuardDogData } from "@/hooks/useGuardDogData";

interface GuardDogConfig {
  decisionThresholds: {
    maliciousVotes: number;
    suspiciousVotes: number;
    minDownloads: number;
    minStars: number;
    maxAge: number;
  };
  patterns: { enabled: boolean };
  telegram: { enabled: boolean; chatId: string };
}

interface TrustedProviders {
  trustedProviders: string[];
  trustedNamespaces: string[];
  trustedScopes: Record<string, string[]>;
}

export default function SettingsPage() {
  const { data, refresh } = useGuardDogData();
  const [config, setConfig] = useState<GuardDogConfig | null>(null);
  const [trusted, setTrusted] = useState<TrustedProviders | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [manualScanRunning, setManualScanRunning] = useState(false);
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const [cfgRes, tpRes] = await Promise.all([
        fetch("/api/guard-dog/config"),
        fetch("/api/guard-dog/config?type=trusted"),
      ]);
      if (cfgRes.ok) setConfig(await cfgRes.json());
      if (tpRes.ok) setTrusted(await tpRes.json());
    } catch {
      // Silent fail
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const runManualScan = async () => {
    setManualScanRunning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/guard-dog/manual-scan", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        setScanResult({ ok: true, message: `Scan complete: ${result.totalScanned} packages, ${result.dangerous} dangerous, ${result.suspicious} suspicious` });
        refresh();
      } else {
        setScanResult({ ok: false, message: result.error || "Scan failed" });
      }
    } catch {
      setScanResult({ ok: false, message: "Failed to start scan" });
    } finally {
      setManualScanRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-xl font-semibold tracking-tight text-dark-text">
        Guard Dog Settings
      </h2>

      {/* Manual Scan */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Play size={18} className="text-cm-purple" />
            <h3 className="text-sm font-semibold text-dark-text">Manual Scan</h3>
          </div>
          <button
            onClick={runManualScan}
            disabled={manualScanRunning}
            className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {manualScanRunning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play size={14} />
                Run Full Scan Now
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-dark-muted">
          Triggers a full dependency scan across all 65+ workspace projects. Same as the nightly cron job.
        </p>
        {scanResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
            scanResult.ok ? "bg-dark-success/10 text-dark-success" : "bg-dark-danger/10 text-dark-danger"
          }`}>
            {scanResult.ok ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
            {scanResult.message}
          </div>
        )}
      </div>

      {/* Scan Schedule */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-cm-purple" />
          <h3 className="text-sm font-semibold text-dark-text">Scan Schedule</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-dark-panel2 rounded-lg">
            <div>
              <p className="text-sm text-dark-text">Nightly Dependency Scan</p>
              <p className="text-xs text-dark-muted">Scans all package.json files across workspace</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-cm-purple">2:30 AM</p>
              <p className="text-xs text-dark-muted">daily</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-dark-panel2 rounded-lg">
            <div>
              <p className="text-sm text-dark-text">Threat Intel Feed</p>
              <p className="text-xs text-dark-muted">Pulls from NVD, CISA KEV, GitHub Advisory, OSV</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-cm-purple">6:00 AM</p>
              <p className="text-xs text-dark-muted">daily</p>
            </div>
          </div>
          {data?.protectionStatus && (
            <div className="flex items-center gap-4 text-xs pt-1">
              <span className={`flex items-center gap-1 ${data.protectionStatus.cronNightly ? "text-dark-success" : "text-dark-danger"}`}>
                {data.protectionStatus.cronNightly ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                Nightly cron: {data.protectionStatus.cronNightly ? "Active" : "Not scheduled"}
              </span>
              <span className={`flex items-center gap-1 ${data.protectionStatus.preInstallHook ? "text-dark-success" : "text-dark-muted"}`}>
                {data.protectionStatus.preInstallHook ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                Pre-install hook: {data.protectionStatus.preInstallHook ? "Active" : "Inactive"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Detection Thresholds */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-cm-purple" />
            <h3 className="text-sm font-semibold text-dark-text">Detection Thresholds</h3>
          </div>
          <button
            onClick={fetchConfig}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors"
            title="Reload config"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {loadingConfig ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-dark-muted" /></div>
        ) : config ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted mb-1">Malicious Vote Threshold</p>
              <p className="text-sm font-mono text-dark-text">{config.decisionThresholds.maliciousVotes} votes</p>
              <p className="text-xs text-dark-muted mt-0.5">VirusTotal votes to flag as dangerous</p>
            </div>
            <div className="p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted mb-1">Suspicious Vote Threshold</p>
              <p className="text-sm font-mono text-dark-text">{config.decisionThresholds.suspiciousVotes} votes</p>
              <p className="text-xs text-dark-muted mt-0.5">VirusTotal votes to flag as suspicious</p>
            </div>
            <div className="p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted mb-1">Min Weekly Downloads</p>
              <p className="text-sm font-mono text-dark-text">{config.decisionThresholds.minDownloads.toLocaleString()}</p>
              <p className="text-xs text-dark-muted mt-0.5">Below this = reputation warning</p>
            </div>
            <div className="p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted mb-1">Max Package Age (days)</p>
              <p className="text-sm font-mono text-dark-text">{config.decisionThresholds.maxAge}</p>
              <p className="text-xs text-dark-muted mt-0.5">Recently published packages flagged</p>
            </div>
            <div className="p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted mb-1">Pattern Analysis</p>
              <p className="text-sm text-dark-text">{config.patterns.enabled ? "Enabled" : "Disabled"}</p>
              <p className="text-xs text-dark-muted mt-0.5">Scans for 30+ malicious code patterns</p>
            </div>
            <div className="p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted mb-1">Telegram Alerts</p>
              <p className="text-sm text-dark-text">{config.telegram.enabled ? "Enabled" : "Disabled"}</p>
              <p className="text-xs text-dark-muted mt-0.5">Sends BARK alerts to Telegram</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-dark-muted text-center py-4">Could not load config</p>
        )}
      </div>

      {/* Trusted Providers */}
      {trusted && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-dark-success" />
            <h3 className="text-sm font-semibold text-dark-text">Trusted Providers</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-dark-muted mb-2">Trusted Packages ({trusted.trustedProviders.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {trusted.trustedProviders.map((p) => (
                  <span key={p} className="text-xs bg-dark-panel2 text-dark-text px-2 py-1 rounded border border-dark-border">{p}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-dark-muted mb-2">Trusted Namespaces ({trusted.trustedNamespaces.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {trusted.trustedNamespaces.map((ns) => (
                  <span key={ns} className="text-xs bg-dark-panel2 text-dark-text px-2 py-1 rounded border border-dark-border">{ns}</span>
                ))}
              </div>
            </div>
            {Object.entries(trusted.trustedScopes).map(([ecosystem, scopes]) => (
              <div key={ecosystem}>
                <p className="text-xs font-medium text-dark-muted mb-2">{ecosystem} Trusted Scopes ({scopes.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {scopes.map((s) => (
                    <span key={s} className="text-xs bg-dark-panel2 text-dark-text px-2 py-1 rounded border border-dark-border">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config location */}
      <div className="p-4 bg-cm-purple/10 border border-cm-purple/20 rounded-lg">
        <p className="text-sm text-cm-purple">
          <strong>Config files:</strong>{" "}
          <code className="bg-cm-purple/20 px-1 rounded text-xs">~/.openclaw/workspace/agents/guard-dog/config/</code>
        </p>
        <p className="text-xs text-cm-purple/80 mt-1">
          To edit thresholds or trusted providers, modify config.json and trusted-providers.json directly.
        </p>
      </div>
    </div>
  );
}
