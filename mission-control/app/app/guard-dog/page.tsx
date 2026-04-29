"use client";

import { Loader2, AlertCircle, RefreshCw, Shield, Clock, AlertTriangle } from "lucide-react";
import { useGuardDogData } from "@/hooks/useGuardDogData";
import StatCards from "./sections/StatCards";
import ThreatFeed from "./sections/ThreatFeed";
import QuickScan from "./sections/QuickScan";
import dynamic from "next/dynamic";
const ScanTimeline = dynamic(() => import("./sections/ScanTimeline"), { ssr: false });
import VulnerabilityPanel from "./sections/VulnerabilityPanel";
import TrustedProviders from "./sections/TrustedProviders";
import AutomationStatus from "./sections/AutomationStatus";
import SkillButton from "@/components/SkillButton";

export default function GuardDogPage() {
  const { data, loading, error, refresh } = useGuardDogData();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">🐾 Sniffing for data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold text-dark-text mb-2">
          Failed to load data
        </h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cm-purple/10 rounded-xl">
              <Shield size={24} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-dark-text">Guard Dog</h1>
              <p className="text-sm text-dark-muted">
                Automated security scanner &amp; threat monitor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkillButton
              skillName="audit-env-variables"
              label="Security Audit"
              size="sm"
            />
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2 text-sm">
            <Clock size={14} className="text-cm-purple mt-0.5 flex-shrink-0" />
            <span className="text-dark-muted">Scans all 65+ projects <strong className="text-dark-text">every night at 2:30 AM</strong></span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle size={14} className="text-cm-purple mt-0.5 flex-shrink-0" />
            <span className="text-dark-muted">Checks for <strong className="text-dark-text">zero-day CVEs</strong> via NVD, CISA KEV, GitHub Advisory, OSV</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Shield size={14} className="text-cm-purple mt-0.5 flex-shrink-0" />
            <span className="text-dark-muted">Detects <strong className="text-dark-text">injection patterns</strong>, malicious code, and supply chain attacks</span>
          </div>
        </div>
      </div>

      <StatCards stats={data.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickScan onScanComplete={refresh} />
        </div>
        <div>
          <VulnerabilityPanel signalBreakdown={data.signalBreakdown} />
        </div>
      </div>

      <ThreatFeed scans={data.recentScans} />
      <ScanTimeline dailyTrend={data.dailyTrend} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrustedProviders trustedProviders={data.trustedProviders} />
        <AutomationStatus protectionStatus={data.protectionStatus} />
      </div>
    </div>
  );
}
