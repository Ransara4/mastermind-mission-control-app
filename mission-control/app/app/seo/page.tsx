"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw, Search, Plus, Server, Bot, ExternalLink, Building2, Users, Crosshair, Swords, FileText, Globe, ChevronDown, ChevronRight } from "lucide-react";
import { useSeoData } from "@/hooks/useSeoData";
import type { AutopilotResult, FixQueueItem } from "@/lib/seo-types";
import SiteSwitcher from "./sections/SiteSwitcher";
import AddSiteModal from "./sections/AddSiteModal";
import dynamic from "next/dynamic";
// overview tab — static (shown on first load)
import AutopilotPanel from "./sections/AutopilotPanel";
import FixAllBanner from "./sections/FixAllBanner";
import QuickWins from "./sections/QuickWins";
import FixQueue from "./sections/FixQueue";
import FixesMade from "./sections/FixesMade";
import CoreWebVitals from "./sections/CoreWebVitals";
import BrokenLinksPanel from "./sections/BrokenLinksPanel";
import SeoTaskQueue from "./sections/SeoTaskQueue";
const GscDashboard = dynamic(() => import("./sections/GscDashboard"), { ssr: false });
// AuditHistory uses recharts — always dynamic regardless of tab
const AuditHistory = dynamic(() => import("./sections/AuditHistory"), { ssr: false });
// keywords tab — lazy
const KeywordTracker = dynamic(() => import("./sections/KeywordTracker"), { ssr: false });
const BlogBriefGenerator = dynamic(() => import("./sections/BlogBriefGenerator"), { ssr: false });
const ContentDrafts = dynamic(() => import("./sections/ContentDrafts"), { ssr: false });
// tools tab — lazy
const SerpPreviewPanel = dynamic(() => import("./sections/SerpPreviewPanel"), { ssr: false });
const BingStatsPanel = dynamic(() => import("./sections/BingStatsPanel"), { ssr: false });
const NlwebPanel = dynamic(() => import("./sections/NlwebPanel"), { ssr: false });
const SchemaPanel = dynamic(() => import("./sections/SchemaPanel"), { ssr: false });
const InternalLinksPanel = dynamic(() => import("./sections/InternalLinksPanel"), { ssr: false });
const DuplicatesPanel = dynamic(() => import("./sections/DuplicatesPanel"), { ssr: false });
// competitor tab — lazy
const CompetitorComparison = dynamic(() => import("./sections/CompetitorComparison"), { ssr: false });
// info tab — lazy
const InfoTab = dynamic(() => import("./sections/InfoTab"), { ssr: false });

type Tab = "overview" | "keywords" | "tools" | "competitor" | "info";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",    label: "Overview" },
  { key: "keywords",   label: "Keyword Rankings" },
  { key: "tools",      label: "Tools" },
  { key: "competitor", label: "Competitors" },
  { key: "info",       label: "ℹ Information" },
];

const hostingColors: Record<string, string> = {
  wix:       "bg-cm-purple/20 text-cm-purple border-cm-purple/30",
  vercel:    "bg-dark-panel2 text-dark-text border-dark-border",
  netlify:   "bg-cm-purple/20 text-cm-purple border-cm-purple/30",
  wordpress: "bg-dark-warn/20 text-dark-warn border-dark-warn/30",
};

const PROFILE_FIELDS = [
  { key: "type",            label: "Business Type",    icon: Building2 },
  { key: "target audience", label: "Target Audience",  icon: Users },
  { key: "goals",           label: "Goals",            icon: Crosshair },
  { key: "competitors",     label: "Competitors",      icon: Swords },
  { key: "core idea",       label: "Core Idea",        icon: FileText },
  { key: "description",     label: "Description",      icon: FileText },
  { key: "industry",        label: "Industry",         icon: Globe },
  { key: "location",        label: "Location",         icon: Globe },
];

export default function SeoPage() {
  const { data, loading, error, selectedDomain, selectSite, refresh } = useSeoData();

  const [autopilotResult, setAutopilotResult] = useState<AutopilotResult | null>(null);
  const [fixQueue, setFixQueue] = useState<FixQueueItem[]>([]);
  const [showAddSite, setShowAddSite] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [ranThisSession, setRanThisSession] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  // Reset all site-specific state when domain changes
  useEffect(() => {
    setAutopilotResult(null);
    setFixQueue([]);
    setRanThisSession(false);
  }, [selectedDomain]);

  // Populate from server-side cache after reset settles
  useEffect(() => {
    if (data?.selectedSite) {
      setAutopilotResult(data.selectedSite.autopilotResult ?? null);
      setFixQueue(data.selectedSite.fixQueue ?? []);
    }
  }, [data]);

  const handleAutopilotComplete = (result: AutopilotResult) => {
    setAutopilotResult(result);
    setFixQueue(result.fixQueue);
    setRanThisSession(true);
    refresh();
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading SEO dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-2">Failed to load data</h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const site = data.selectedSite;
  const pendingFixes = fixQueue.filter((i) => i.status === "pending");
  const doneFixes    = fixQueue.filter((i) => i.status === "fixed" || i.status === "dismissed");

  // Find full site entry for notes
  const siteEntry = data.sites.find((s) => s.domain === site?.domain) as any;
  const hasProfile = site && PROFILE_FIELDS.some((f) => site.profile[f.key]);

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-cm-purple/15 rounded-lg">
              <Search size={22} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-dark-text">SEO Command Center</h1>
              <p className="text-sm text-dark-muted mt-0.5">Autopilot analysis, fix queue, keywords, content</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SiteSwitcher sites={data.sites} selectedDomain={selectedDomain} onSelect={selectSite} />
            <button
              onClick={() => setShowAddSite(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium shrink-0"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Website</span>
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50 bg-dark-panel2 border border-dark-border rounded-lg"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {!site && data.sites.length === 0 && (
        <div className="bg-dark-panel2 border border-dashed border-dark-border rounded-xl p-8 text-center">
          <Search size={28} className="text-dark-muted mx-auto mb-3" />
          <p className="text-sm text-dark-muted mb-3">No sites configured yet.</p>
          <button
            onClick={() => setShowAddSite(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 transition-colors"
          >
            <Plus size={14} /> Add your first website
          </button>
        </div>
      )}

      {showAddSite && (
        <AddSiteModal onClose={() => setShowAddSite(false)} onSaved={() => { setShowAddSite(false); refresh(); }} />
      )}

      {site && (
        <>
          {/* 2. Tabs flush against site card — no gap between them */}
          <div>
            <div className="flex items-end gap-0">
              {TABS.map((t, i) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-t border-l border-r rounded-t-lg transition-colors ${
                    tab === t.key
                      ? "bg-dark-panel border-dark-border text-dark-text"
                      : "bg-dark-panel2/50 border-dark-border/60 text-dark-muted hover:text-dark-text hover:bg-dark-panel2"
                  } ${i > 0 ? "-ml-px" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

          {/* 3. Site card — name, website link, badges, inline profile */}
          <div className="bg-dark-panel border border-dark-border rounded-xl rounded-tl-none p-5">
            {/* Top row */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-base font-bold text-dark-text">{site.profile?.title || site.name || site.domain}</p>
                <a
                  href={`https://${site.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-cm-purple hover:text-cm-purple/80 transition-colors mt-0.5"
                >
                  {site.domain}
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {site.hosting && (
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${hostingColors[site.hosting.toLowerCase()] || "bg-dark-panel2 text-dark-muted border-dark-border"}`}>
                    <Server size={11} />
                    {site.hosting.charAt(0).toUpperCase() + site.hosting.slice(1)}
                  </span>
                )}
                {site.agent && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border border-cm-purple/30 bg-cm-purple/10 text-cm-purple">
                    <Bot size={11} />
                    {site.agent} agent
                  </span>
                )}
              </div>
            </div>

            {/* Business profile — collapsible */}
            <button
              onClick={() => setProfileExpanded((v) => !v)}
              className="w-full mt-4 pt-4 border-t border-dark-border flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
            >
              {profileExpanded
                ? <ChevronDown size={13} className="text-dark-muted shrink-0" />
                : <ChevronRight size={13} className="text-dark-muted shrink-0" />}
              <span className="text-xs text-dark-muted font-medium">Business Profile</span>
              {hasProfile && !profileExpanded && (
                <span className="text-xs text-dark-muted truncate ml-1">
                  — {site.profile["type"] || site.profile["description"] || site.profile["core idea"] || ""}
                </span>
              )}
            </button>

            {profileExpanded && (
              <div className="mt-3">
                {hasProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                    {PROFILE_FIELDS.map(({ key, label, icon: Icon }) => {
                      const value = site.profile[key];
                      if (!value) return null;
                      return (
                        <div key={key} className="flex items-start gap-2">
                          <Icon size={13} className="text-dark-muted mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-dark-muted font-medium uppercase tracking-wide">{label}</p>
                            <p className="text-sm text-dark-text">{value}</p>
                          </div>
                        </div>
                      );
                    })}
                    {siteEntry?.notes && (
                      <div className="flex items-start gap-2 sm:col-span-2 lg:col-span-3">
                        <FileText size={13} className="text-dark-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-dark-muted font-medium uppercase tracking-wide">Notes</p>
                          <p className="text-sm text-dark-text">{siteEntry.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-dark-muted">
                    No business profile yet. Run the SEO Autopilot to generate one, or edit{" "}
                    <code className="bg-dark-panel2 px-1 py-0.5 rounded text-[11px]">~/seo/{site.domain}/profile.md</code> manually.
                  </p>
                )}
              </div>
            )}
          </div>
          </div>{/* end tabs+card wrapper */}

          {/* KEYWORDS TAB */}
          {tab === "keywords" && (
            <div className="space-y-5">
              <KeywordTracker keywords={site.keywords} />
              <BlogBriefGenerator
                domain={selectedDomain || ""}
                existingKeywords={site.keywords?.map((k) => k.keyword)}
              />
              {site.contentDrafts.length > 0 && (
                <ContentDrafts drafts={site.contentDrafts} />
              )}
            </div>
          )}

          {/* TOOLS TAB */}
          {tab === "tools" && (
            <div className="space-y-6">
              <SerpPreviewPanel
                domain={selectedDomain || ""}
                autopilotResult={autopilotResult}
              />
              <BingStatsPanel domain={selectedDomain || ""} />
              <NlwebPanel domain={selectedDomain || ""} />
              <SchemaPanel domain={selectedDomain || ""} />
              <InternalLinksPanel domain={selectedDomain || ""} />
              <DuplicatesPanel domain={selectedDomain || ""} />
            </div>
          )}

          {/* INFORMATION TAB */}
          {tab === "info" && <InfoTab />}

          {/* COMPETITOR TAB */}
          {tab === "competitor" && (
            <CompetitorComparison siteDomain={site.domain} />
          )}

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div key={selectedDomain} className="space-y-5">
              {/* Autopilot */}
              <AutopilotPanel
                domain={selectedDomain || ""}
                lastResult={autopilotResult}
                onComplete={handleAutopilotComplete}
              />

              {/* Fix All Banner — only after this session's run */}
              {ranThisSession && (
                <FixAllBanner
                  domain={selectedDomain || ""}
                  items={fixQueue}
                  onRefresh={refresh}
                />
              )}

              {/* Quick Wins — only after this session's run */}
              {ranThisSession && pendingFixes.length > 0 && (
                <QuickWins items={fixQueue} domain={selectedDomain || ""} onFixed={refresh} />
              )}

              {/* Fix Queue — only after this session's autopilot run */}
              {ranThisSession && (
                <FixQueue
                  domain={selectedDomain || ""}
                  items={fixQueue}
                  hosting={site.hosting}
                  onRefresh={refresh}
                />
              )}

              {/* Fixes Made */}
              {doneFixes.length > 0 && <FixesMade items={fixQueue} />}

              {/* Core Web Vitals */}
              <CoreWebVitals domain={selectedDomain || ""} />

              {/* Audit History — full width */}
              {site.audits.length > 0 && <AuditHistory audits={site.audits} />}

              {/* Broken Links */}
              <BrokenLinksPanel domain={selectedDomain || ""} />

              {/* Claude Code task queue — only if tasks exist */}
              <SeoTaskQueue domain={selectedDomain || undefined} />

              {/* GSC — bottom of page */}
              <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
                <GscDashboard domain={selectedDomain || ""} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
