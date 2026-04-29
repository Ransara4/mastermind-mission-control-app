"use client";

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Film,
  CheckCircle2,
  Clock,
  HardDrive,
  Layers,
  PlayCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Settings,
  Video,
  Clapperboard,
  Send,
} from "lucide-react";
import { useRemotionData, RemotionJob } from "@/hooks/useRemotionData";

// ── Stat card ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-cm-purple/10 text-cm-purple",
    green: "bg-dark-success/10 text-dark-success",
    amber: "bg-dark-warn/10 text-dark-warn",
    purple: "bg-cm-purple/10 text-cm-purple",
    red: "bg-dark-danger/10 text-dark-danger",
    slate: "bg-dark-panel2 text-dark-muted",
  };
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.slate}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-dark-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-dark-text">{value}</p>
      {sub && <p className="text-xs text-dark-muted mt-1">{sub}</p>}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    idle: { bg: "bg-dark-success/10", text: "text-dark-success", dot: "bg-dark-success" },
    rendering: { bg: "bg-cm-purple/10", text: "text-cm-purple", dot: "bg-cm-purple" },
    error: { bg: "bg-dark-danger/10", text: "text-dark-danger", dot: "bg-dark-danger" },
    unknown: { bg: "bg-dark-panel2", text: "text-dark-muted", dot: "bg-dark-muted" },
  };
  const s = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Time ago ─────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Job status icon ──────────────────────────────────────────────────

function JobStatus({ status }: { status: string }) {
  switch (status) {
    case "ready":
    case "completed":
      return <CheckCircle2 size={14} className="text-dark-success" />;
    case "rendering":
    case "queued":
      return <PlayCircle size={14} className="text-cm-purple" />;
    case "error":
      return <XCircle size={14} className="text-dark-danger" />;
    default:
      return <Clock size={14} className="text-dark-muted" />;
  }
}

// ── Template descriptions ────────────────────────────────────────────

const TEMPLATE_INFO: Record<string, { name: string; desc: string; size: string }> = {
  "cohort-welcome": { name: "⭐ Cohort Welcome", desc: "Celebratory welcome video for new Mastermind members — fireworks, portrait. Replace memberName with the new member's first name.", size: "1080x1920" },
  "personalized-invite": { name: "Personalized Invite", desc: "Custom cohort invitations", size: "1920x1080" },
  "testimonial-video": { name: "Testimonial Video", desc: "Animated member testimonials", size: "1080x1080" },
  "results-showcase": { name: "Results Showcase", desc: "Before/after metrics", size: "1920x1080" },
  "marketing-promo": { name: "Marketing Promo", desc: "Social media promos", size: "1080x1920" },
  "data-visualization": { name: "Data Viz", desc: "Animated charts & metrics", size: "1920x1080" },
  "event-highlight": { name: "Event Highlight", desc: "Session highlight reels", size: "1920x1080" },
};

// ── Default props per template ───────────────────────────────────────

const TEMPLATE_DEFAULTS: Record<string, Record<string, any>> = {
  "cohort-welcome": { memberName: "[MEMBER NAME]", programName: "Business Automation Mastermind" },
  "personalized-invite": { memberName: "John Doe", cohortName: "AI Founders Mastermind", startDate: "April 2026", hostName: "Joe Che", brandColor: "#2563eb" },
  "testimonial-video": { memberName: "Jane Smith", quote: "This mastermind changed my business trajectory completely.", role: "Founder, TechCo", rating: 5, brandColor: "#2563eb" },
  "results-showcase": { memberName: "Alex Johnson", metricName: "Monthly Revenue", beforeValue: "$5,000", afterValue: "$25,000", timeframe: "6 months", brandColor: "#2563eb" },
  "marketing-promo": { headline: "Join the AI Founders Mastermind", subtext: "Weekly sessions. Real results.", ctaText: "Apply Now", ctaUrl: "mastermindshq.business", brandColor: "#2563eb" },
  "data-visualization": { title: "Mastermind Growth Metrics", dataPoints: [{ label: "Q1", value: 12 }, { label: "Q2", value: 28 }, { label: "Q3", value: 45 }, { label: "Q4", value: 67 }], brandColor: "#2563eb" },
  "event-highlight": { eventName: "March 2026 Mastermind Session", highlights: ["Revenue growth strategies", "AI automation deep-dive", "Networking breakout sessions"], attendeeCount: 24, brandColor: "#2563eb" },
};

// ── Render panel ─────────────────────────────────────────────────────

function RenderPanel({ onRenderComplete }: { onRenderComplete: () => void }) {
  const templateIds = Object.keys(TEMPLATE_INFO);
  const [selectedTemplate, setSelectedTemplate] = useState(templateIds[0]);
  const [propsJson, setPropsJson] = useState(
    JSON.stringify(TEMPLATE_DEFAULTS[templateIds[0]] || {}, null, 2)
  );
  const [propsError, setPropsError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleTemplateChange(t: string) {
    setSelectedTemplate(t);
    setPropsJson(JSON.stringify(TEMPLATE_DEFAULTS[t] || {}, null, 2));
    setPropsError(null);
    setResult(null);
  }

  async function handleRender() {
    setPropsError(null);
    setResult(null);
    let props: any;
    try {
      props = JSON.parse(propsJson);
    } catch {
      setPropsError("Invalid JSON in props");
      return;
    }
    setRendering(true);
    try {
      const res = await fetch("/api/remotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: selectedTemplate, props }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setResult({ ok: false, message: json.error || "Render failed" });
      } else {
        setResult({ ok: true, message: `Job created: ${json.job?.id || "ok"}` });
        onRenderComplete();
      }
    } catch (e: any) {
      setResult({ ok: false, message: e.message });
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6 space-y-4">
      <h2 className="text-sm font-semibold  text-dark-text flex items-center gap-2">
        <Send size={16} className="text-cm-purple" />
        Render a Video
      </h2>

      {/* Template selector */}
      <div>
        <label className="block text-xs font-medium text-dark-muted mb-1">Template</label>
        <select
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full text-sm border border-dark-border rounded-lg px-3 py-2 bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
        >
          {templateIds.map((id) => (
            <option key={id} value={id}>
              {TEMPLATE_INFO[id]?.name || id} — {TEMPLATE_INFO[id]?.size}
            </option>
          ))}
        </select>
      </div>

      {/* Props editor */}
      <div>
        <label className="block text-xs font-medium text-dark-muted mb-1">Props (JSON)</label>
        <textarea
          rows={8}
          value={propsJson}
          onChange={(e) => { setPropsJson(e.target.value); setPropsError(null); }}
          className="w-full text-xs font-mono font-dm-mono border border-dark-border rounded-lg px-3 py-2 bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple resize-y"
          spellCheck={false}
        />
        {propsError && <p className="text-xs text-dark-danger mt-1">{propsError}</p>}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRender}
          disabled={rendering}
          className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white text-sm font-medium rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
        >
          {rendering ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {rendering ? "Rendering…" : "Render"}
        </button>
        {result && (
          <p className={`text-xs font-medium ${result.ok ? "text-dark-success" : "text-dark-danger"}`}>
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Video player ─────────────────────────────────────────────────────

function VideoPlayer({ job }: { job: RemotionJob }) {
  const filename = job.outputFile ? job.outputFile.split("/").pop() : null;
  if (!filename) return null;
  const src = `/api/remotion/video/${filename}`;
  return (
    <div className="bg-black rounded-xl overflow-hidden border border-dark-border">
      <video
        key={src}
        controls
        className="w-full max-h-[480px] object-contain"
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
        Your browser does not support video playback.
      </video>
      <div className="px-4 py-2 bg-dark-bg flex items-center justify-between">
        <span className="text-xs text-dark-muted font-mono font-dm-mono truncate">{filename}</span>
        <span className="text-xs text-dark-muted">{job.width}x{job.height} · {job.durationSeconds?.toFixed(1)}s</span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function RemotionPage() {
  const { data, loading, error, refresh } = useRemotionData();
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Remotion data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold  text-dark-text mb-2">Failed to load data</h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { status, jobs, stats, templates, remotionInstalled } = data;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
            <Film size={26} className="text-cm-purple" />
            Remotion Agent
          </h1>
          <p className="text-sm text-dark-muted mt-1">
            Programmatic video creation for Masterminds HQ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status.status} />
          {remotionInstalled ? (
            <span className="text-xs text-dark-success bg-dark-success/10 px-2 py-1 rounded-full font-medium">
              Remotion Installed
            </span>
          ) : (
            <span className="text-xs text-dark-warn bg-dark-warn/10 px-2 py-1 rounded-full font-medium">
              Not Installed
            </span>
          )}
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

      {/* ── Render panel ──────────────────────────────────────────── */}
      <RenderPanel onRenderComplete={refresh} />

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Renders"
          value={stats.totalJobs}
          icon={Clapperboard}
          color="purple"
          sub="All time render jobs"
        />
        <StatCard
          label="Completed"
          value={stats.completedJobs}
          icon={CheckCircle2}
          color="green"
          sub="Successfully rendered"
        />
        <StatCard
          label="Templates"
          value={templates.length}
          icon={Layers}
          color="blue"
          sub="Available compositions"
        />
        <StatCard
          label="Storage"
          value={stats.totalSizeMB > 0 ? `${stats.totalSizeMB} MB` : "--"}
          icon={HardDrive}
          color="amber"
          sub={`${stats.outputFiles} output files`}
        />
      </div>

      {/* ── Templates ─────────────────────────────────────────────── */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Layers size={18} className="text-cm-purple" />
            <span className="text-sm font-semibold  text-dark-text">
              Video Templates ({templates.length})
            </span>
          </div>
          {templatesOpen ? (
            <ChevronDown size={18} className="text-dark-muted" />
          ) : (
            <ChevronRight size={18} className="text-dark-muted" />
          )}
        </button>
        {templatesOpen && (
          <div className="px-5 pb-5 border-t border-dark-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((tId: string) => {
                const info = TEMPLATE_INFO[tId] || { name: tId, desc: "", size: "" };
                return (
                  <div key={tId} className="p-4 border border-dark-border rounded-lg hover:border-cm-purple transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Video size={16} className="text-cm-purple" />
                      <span className="text-sm font-medium text-dark-text">{info.name}</span>
                    </div>
                    <p className="text-xs text-dark-muted mb-2">{info.desc}</p>
                    {info.size && (
                      <span className="text-[11px] bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded font-mono font-dm-mono">
                        {info.size}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-dark-panel2 rounded-lg">
              <p className="text-xs text-dark-muted">
                Render a template:{" "}
                <code className="bg-dark-bg px-1.5 py-0.5 rounded text-[11px]">
                  node ~/.openclaw/workspace/agents/remotion/src/index.js render personalized-invite --props &apos;{`{"memberName":"Sarah"}`}&apos;
                </code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Recent jobs table ─────────────────────────────────────── */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <div className="p-6 pb-4">
          <h2 className="text-sm font-semibold  text-dark-text flex items-center gap-2">
            <Clapperboard size={16} className="text-dark-muted" />
            Recent Render Jobs
            {stats.totalJobs > 0 && (
              <span className="text-xs font-normal text-dark-muted ml-1">
                ({stats.totalJobs} total)
              </span>
            )}
          </h2>
        </div>
        {jobs.length === 0 ? (
          <div className="text-center py-10 px-6">
            <Film size={32} className="text-dark-muted mx-auto mb-3" />
            <p className="text-sm text-dark-muted font-medium">No render jobs yet</p>
            <p className="text-xs text-dark-muted mt-1">
              Jobs will appear here when you render a template via the CLI
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-dark-border">
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">Template</th>
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">Size</th>
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">Duration</th>
                  <th className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {jobs.map((job: RemotionJob) => {
                  const isSelected = selectedJobId === job.id;
                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJobId(isSelected ? null : job.id)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-cm-purple/10 hover:bg-cm-purple/10" : "hover:bg-dark-panel2"}`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5">
                          <JobStatus status={job.status} />
                          <span className="text-xs font-medium capitalize">{job.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-medium text-dark-text">
                        {TEMPLATE_INFO[job.template]?.name || job.template}
                      </td>
                      <td className="px-6 py-3 text-dark-muted font-mono font-dm-mono text-xs">
                        {job.width}x{job.height}
                      </td>
                      <td className="px-6 py-3 text-dark-muted text-xs">
                        {job.durationSeconds?.toFixed(1)}s
                      </td>
                      <td className="px-6 py-3 text-dark-muted text-xs">
                        {timeAgo(job.createdAt)}
                      </td>
                      <td className="px-6 py-3">
                        <PlayCircle size={14} className={isSelected ? "text-cm-purple" : "text-dark-muted"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Video player ──────────────────────────────────────────── */}
      {selectedJobId && (() => {
        const job = jobs.find((j: RemotionJob) => j.id === selectedJobId);
        return job ? <VideoPlayer job={job} /> : null;
      })()}

      {/* ── Use Cases for Masterminds HQ ──────────────────────────── */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-sm font-semibold  text-dark-text mb-4 flex items-center gap-2">
          <Settings size={16} className="text-dark-muted" />
          Masterminds HQ Use Cases
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
            <h3 className="text-sm font-semibold  text-cm-purple mb-1">Personalized Invites</h3>
            <p className="text-xs text-dark-muted">Custom video invitations for each cohort member with their name, cohort details, and start date.</p>
          </div>
          <div className="p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
            <h3 className="text-sm font-semibold  text-cm-purple mb-1">Results Showcases</h3>
            <p className="text-xs text-dark-muted">Animated before/after metrics videos showing member transformations and ROI.</p>
          </div>
          <div className="p-4 bg-dark-success/10 rounded-lg border border-dark-success/30">
            <h3 className="text-sm font-semibold  text-dark-success mb-1">Testimonial Videos</h3>
            <p className="text-xs text-dark-muted">Animated testimonial cards with member quotes, ratings, and professional branding.</p>
          </div>
          <div className="p-4 bg-dark-warn/10 rounded-lg border border-dark-warn/30">
            <h3 className="text-sm font-semibold  text-dark-warn mb-1">Social Media Marketing</h3>
            <p className="text-xs text-dark-muted">Vertical and horizontal promotional videos for LinkedIn, Instagram, and landing pages.</p>
          </div>
        </div>
      </div>

      {/* ── Last error ────────────────────────────────────────────── */}
      {status.lastError && (
        <div className="bg-dark-danger/10 rounded-xl border border-dark-danger/30 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-dark-danger mt-0.5" />
            <div>
              <p className="text-sm font-medium text-dark-danger">Last Error</p>
              <p className="text-xs text-dark-danger mt-1">{status.lastError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
