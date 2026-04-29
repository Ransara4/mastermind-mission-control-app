"use client";

import { useState, useEffect, useCallback } from "react";
import { Film, Loader2, AlertCircle, RefreshCw, Clock, CheckCircle2, XCircle, Scissors } from "lucide-react";

interface Job {
  id: string;
  inputFile: string;
  outputFile: string;
  platform: string;
  trimStart: string | null;
  trimEnd: string | null;
  captionsEnabled: boolean;
  status: "queued" | "processing" | "done" | "failed";
  error?: string;
  createdAt: string;
  completedAt?: string;
}

const PLATFORMS = [
  { value: "instagram-reel", label: "Instagram Reel" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "square", label: "Square" },
];

function StatusBadge({ status }: { status: Job["status"] }) {
  const styles: Record<string, string> = {
    queued: "bg-dark-panel2 text-dark-muted",
    processing: "bg-cm-purple/20 text-cm-purple animate-pulse",
    done: "bg-emerald-500/15 text-emerald-400",
    failed: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
      {platform}
    </span>
  );
}

export default function VideoProcessorPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [inputFile, setInputFile] = useState("");
  const [platform, setPlatform] = useState("instagram-reel");
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [captionsEnabled, setCaptionsEnabled] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/video-processor");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleSubmit = async () => {
    if (!inputFile.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/video-processor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputFile: inputFile.trim(),
          platform,
          trimStart: trimStart || undefined,
          trimEnd: trimEnd || undefined,
          captionsEnabled,
        }),
      });
      if (res.ok) {
        setInputFile("");
        setTrimStart("");
        setTrimEnd("");
        setCaptionsEnabled(false);
        fetchJobs();
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/video-processor?id=${id}`, { method: "DELETE" });
    fetchJobs();
  };

  const stats = {
    total: jobs.length,
    processing: jobs.filter((j) => j.status === "processing").length,
    done: jobs.filter((j) => j.status === "done").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading video jobs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cm-purple/15 rounded-lg">
              <Film size={24} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-dark-text">Video Processor</h1>
              <p className="text-sm text-dark-muted">Trim, resize & caption videos for social platforms</p>
            </div>
          </div>
          <button onClick={fetchJobs} className="p-1.5 text-dark-muted hover:text-dark-text transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs", value: stats.total, icon: Film },
          { label: "Processing", value: stats.processing, icon: Loader2 },
          { label: "Completed", value: stats.done, icon: CheckCircle2 },
          { label: "Failed", value: stats.failed, icon: XCircle },
        ].map((s) => (
          <div key={s.label} className="bg-dark-panel border border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={14} className="text-cm-purple" />
              <span className="text-xs text-dark-muted">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-dark-text">{s.value}</p>
          </div>
        ))}
      </div>

      {/* New Job Form */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-dark-text mb-4">New Job</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-muted mb-1 block">Input File Path</label>
            <input
              type="text"
              value={inputFile}
              onChange={(e) => setInputFile(e.target.value)}
              placeholder="/path/to/video.mp4"
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
            />
          </div>

          <div>
            <label className="text-sm text-dark-muted mb-2 block">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    platform === p.value
                      ? "bg-cm-purple text-white"
                      : "bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-dark-muted mb-1 block">Trim Start</label>
              <input
                type="text"
                value={trimStart}
                onChange={(e) => setTrimStart(e.target.value)}
                placeholder="00:00:00"
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
              />
            </div>
            <div>
              <label className="text-sm text-dark-muted mb-1 block">Trim End</label>
              <input
                type="text"
                value={trimEnd}
                onChange={(e) => setTrimEnd(e.target.value)}
                placeholder="00:01:00"
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="captions"
              checked={captionsEnabled}
              onChange={(e) => setCaptionsEnabled(e.target.checked)}
              className="accent-cm-purple"
            />
            <label htmlFor="captions" className="text-sm text-dark-muted">
              Auto-generate captions (Whisper)
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !inputFile.trim()}
            className="bg-cm-purple text-white rounded-lg px-6 py-2 hover:bg-cm-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Scissors size={16} />}
            Process Video
          </button>
        </div>
      </div>

      {/* Job Queue */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-dark-text">Processing Queue</h2>
        {jobs.length === 0 ? (
          <div className="bg-dark-panel border border-dark-border rounded-xl p-8 text-center text-dark-muted">
            No jobs yet. Submit a video above to get started.
          </div>
        ) : (
          [...jobs].reverse().map((job) => (
            <div key={job.id} className="bg-dark-panel border border-dark-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-dark-text font-medium truncate">
                      {job.inputFile.split("/").pop()}
                    </span>
                    <PlatformBadge platform={job.platform} />
                    <StatusBadge status={job.status} />
                    {job.captionsEnabled && (
                      <span className="bg-cm-purple/15 text-cm-purple rounded-full px-2 py-0.5 text-xs">CC</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-dark-muted mt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                    {(job.trimStart || job.trimEnd) && (
                      <span className="flex items-center gap-1">
                        <Scissors size={12} />
                        {job.trimStart || "0:00"} &rarr; {job.trimEnd || "end"}
                      </span>
                    )}
                  </div>
                  {job.status === "done" && (
                    <p className="text-xs text-dark-muted mt-1 truncate">
                      Output: <span className="text-dark-text">{job.outputFile}</span>
                    </p>
                  )}
                  {job.status === "failed" && job.error && (
                    <p className="text-xs text-red-400 mt-1">{job.error}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="text-dark-muted hover:text-red-400 transition-colors text-xs shrink-0"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
