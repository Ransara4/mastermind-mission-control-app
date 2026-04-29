"use client";

import { useState } from "react";
import {
  Mail,
  Calendar,
  HardDrive,
  Users,
  FileSpreadsheet,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Key,
  Shield,
  Layers,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
}

interface DriveFile {
  id: string;
  name: string;
  type: string;
  modified: string;
  size?: string;
  link?: string;
}

interface SearchConsoleRow {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: string;
  position: string;
}

type ResultSection =
  | { kind: "gmail"; items: GmailMessage[] }
  | { kind: "calendar"; items: CalendarEvent[] }
  | { kind: "drive"; items: DriveFile[] }
  | { kind: "searchconsole"; items: SearchConsoleRow[] }
  | { kind: "error"; message: string };

// ── Command buttons ───────────────────────────────────────────────────

const QUICK_COMMANDS = [
  { label: "List Gmail", cmd: "gmail list", icon: Mail },
  { label: "Calendar (7d)", cmd: "calendar list", icon: Calendar },
  { label: "Drive Files", cmd: "drive list", icon: HardDrive },
  { label: "Search Console Sites", cmd: "searchconsole sites", icon: Search },
];

// ── Main Page ─────────────────────────────────────────────────────────

export default function GooglePage() {
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ResultSection | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const runCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    setRunning(true);
    setResult(null);
    setRawOutput(null);

    try {
      const res = await fetch("/api/agent-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "google", command: cmd.trim() }),
      });
      const data = await res.json();
      setLastRun(new Date().toLocaleTimeString());

      if (data.error) {
        setResult({ kind: "error", message: data.error });
        return;
      }

      setRawOutput(data.output ?? JSON.stringify(data, null, 2));

      // Try to parse structured output
      const parsed = tryParse(cmd, data.output ?? "");
      setResult(parsed);
    } catch (err) {
      setResult({ kind: "error", message: String(err) });
    } finally {
      setRunning(false);
    }
  };

  function tryParse(cmd: string, raw: string): ResultSection {
    try {
      const json = JSON.parse(raw);
      if (cmd.startsWith("gmail")) {
        return { kind: "gmail", items: Array.isArray(json) ? json : [] };
      }
      if (cmd.startsWith("calendar")) {
        return { kind: "calendar", items: Array.isArray(json) ? json : [] };
      }
      if (cmd.startsWith("drive")) {
        return { kind: "drive", items: Array.isArray(json) ? json : [] };
      }
      if (cmd.startsWith("searchconsole")) {
        return { kind: "searchconsole", items: Array.isArray(json) ? json : [] };
      }
    } catch {
      // not JSON — fall through to raw
    }
    return { kind: "error", message: "" }; // signal: show raw only
  }

  return (
    <div className="space-y-6">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-cm-purple/15 text-cm-purple text-3xl leading-none select-none">
          🔍
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-dark-text tracking-tight">Google Agent</h1>
          <p className="text-sm text-dark-muted mt-1">
            Full access · 20 scopes · OAuth2 + API key · newyork1@gmail.com
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {["gmail", "drive", "calendar", "sheets", "docs", "slides", "contacts", "search-console", "youtube", "places", "analytics", "cloud-platform"].map(
              (tag) => (
                <span key={tag} className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
                  {tag}
                </span>
              )
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-dark-success font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            idle
          </span>
          {lastRun && (
            <span className="text-xs text-dark-muted flex items-center gap-1">
              <Clock size={11} />
              {lastRun}
            </span>
          )}
        </div>
      </div>

      {/* ── Run Command Panel ─────────────────────────────────────── */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-dark-text">Run Command</h2>

        {/* Quick command buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map(({ label, cmd, icon: Icon }) => (
            <button
              key={cmd}
              onClick={() => {
                setCommand(cmd + " --json");
                runCommand(cmd + " --json");
              }}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-dark-panel2 border border-dark-border text-dark-muted
                hover:text-cm-purple hover:border-cm-purple/40 transition-colors disabled:opacity-50"
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Free-form input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCommand(command)}
            placeholder="e.g.  gmail list --limit 5 --json"
            className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2
              text-sm text-dark-text placeholder:text-dark-muted focus:outline-none
              focus:border-cm-purple/60 transition-colors"
          />
          <button
            onClick={() => runCommand(command)}
            disabled={running || !command.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-cm-purple text-white
              hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {running ? <Loader2 size={15} className="animate-spin" /> : null}
            {running ? "Running…" : "Run"}
          </button>
        </div>

        <p className="text-xs text-dark-muted">
          Commands: <code className="bg-dark-panel2 px-1 rounded">gmail list</code>{" "}
          <code className="bg-dark-panel2 px-1 rounded">calendar list --days 14</code>{" "}
          <code className="bg-dark-panel2 px-1 rounded">drive list</code>{" "}
          <code className="bg-dark-panel2 px-1 rounded">contacts search --query name</code>{" "}
          <code className="bg-dark-panel2 px-1 rounded">searchconsole query --site https://…</code>
        </p>
      </div>

      {/* ── Results ───────────────────────────────────────────────── */}
      {(result || rawOutput) && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-text">Results</h2>
            {rawOutput && (
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="flex items-center gap-1 text-xs text-dark-muted hover:text-cm-purple transition-colors"
              >
                {showRaw ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {showRaw ? "Hide raw" : "Show raw"}
              </button>
            )}
          </div>

          {/* Error */}
          {result?.kind === "error" && result.message && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-dark-panel2 border border-dark-border">
              <AlertCircle size={15} className="text-dark-danger shrink-0 mt-0.5" />
              <p className="text-sm text-dark-danger">{result.message}</p>
            </div>
          )}

          {/* Gmail */}
          {result?.kind === "gmail" && result.items.length > 0 && (
            <div className="space-y-2">
              {result.items.map((m) => (
                <div
                  key={m.id}
                  className="bg-dark-panel2 border border-dark-border rounded-lg p-3 space-y-1"
                >
                  <p className="text-sm font-medium text-dark-text truncate">{m.subject || "(no subject)"}</p>
                  <p className="text-xs text-dark-muted truncate">{m.from}</p>
                  <p className="text-xs text-dark-muted">{m.snippet}</p>
                  <p className="text-xs text-dark-muted opacity-60">{m.date}</p>
                </div>
              ))}
            </div>
          )}

          {/* Calendar */}
          {result?.kind === "calendar" && result.items.length > 0 && (
            <div className="space-y-2">
              {result.items.map((e) => (
                <div
                  key={e.id}
                  className="bg-dark-panel2 border border-dark-border rounded-lg p-3 flex items-start gap-3"
                >
                  <Calendar size={15} className="text-cm-purple shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark-text">{e.title}</p>
                    <p className="text-xs text-dark-muted">
                      {new Date(e.start).toLocaleString()}
                    </p>
                    {e.location && (
                      <p className="text-xs text-dark-muted truncate">{e.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drive */}
          {result?.kind === "drive" && result.items.length > 0 && (
            <div className="space-y-2">
              {result.items.map((f) => (
                <div
                  key={f.id}
                  className="bg-dark-panel2 border border-dark-border rounded-lg p-3 flex items-center gap-3"
                >
                  <HardDrive size={15} className="text-cm-purple shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-text truncate">{f.name}</p>
                    <p className="text-xs text-dark-muted">
                      {f.type.replace("application/vnd.google-apps.", "")} ·{" "}
                      {new Date(f.modified).toLocaleDateString()}
                    </p>
                  </div>
                  {f.link && (
                    <a
                      href={f.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cm-purple hover:underline shrink-0"
                    >
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Search Console */}
          {result?.kind === "searchconsole" && result.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-dark-muted border-b border-dark-border">
                    <th className="text-left pb-2 font-medium">Query / Page</th>
                    <th className="text-right pb-2 font-medium">Clicks</th>
                    <th className="text-right pb-2 font-medium">Impr.</th>
                    <th className="text-right pb-2 font-medium">CTR</th>
                    <th className="text-right pb-2 font-medium">Pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {result.items.map((row, i) => (
                    <tr key={i} className="hover:bg-dark-panel2 transition-colors">
                      <td className="py-1.5 pr-4 text-dark-text truncate max-w-xs">
                        {row.query ?? row.page ?? "—"}
                      </td>
                      <td className="py-1.5 text-right text-dark-text">{row.clicks}</td>
                      <td className="py-1.5 text-right text-dark-muted">{row.impressions}</td>
                      <td className="py-1.5 text-right text-dark-muted">{row.ctr}</td>
                      <td className="py-1.5 text-right text-dark-muted">{row.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty result */}
          {result && result.kind !== "error" && result.items.length === 0 && !rawOutput && (
            <div className="flex items-center gap-2 text-dark-muted text-sm">
              <CheckCircle2 size={15} className="text-dark-success" />
              Command ran successfully — no items returned.
            </div>
          )}

          {/* Raw output toggle */}
          {showRaw && rawOutput && (
            <pre className="bg-dark-panel2 border border-dark-border rounded-lg p-3 text-xs text-dark-muted overflow-x-auto whitespace-pre-wrap max-h-96">
              {rawOutput}
            </pre>
          )}
        </div>
      )}

      {/* ── Capabilities ──────────────────────────────────────────── */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-dark-text mb-4">Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Mail,          label: "Gmail",          desc: "Read, compose, send, delete emails · full label control" },
            { icon: Calendar,      label: "Calendar",       desc: "List, create, and manage events" },
            { icon: HardDrive,     label: "Drive",          desc: "Upload, download, create, delete files and folders" },
            { icon: FileSpreadsheet,label:"Sheets",         desc: "Read and write spreadsheet data" },
            { icon: FileSpreadsheet,label:"Docs",           desc: "Read and write Google Docs" },
            { icon: FileSpreadsheet,label:"Slides",         desc: "Read and write Google Slides" },
            { icon: FileSpreadsheet,label:"Forms",          desc: "Create and edit Google Forms" },
            { icon: Users,         label: "Contacts",       desc: "Search, create, and edit contacts" },
            { icon: Search,        label: "Search Console", desc: "Queries, pages, sitemaps, URL inspection" },
            { icon: MapPin,        label: "Places",         desc: "Business details, ratings, photos, hours · API key" },
            { icon: Search,        label: "YouTube",        desc: "Manage account, upload videos, read analytics" },
            { icon: Search,        label: "Analytics",      desc: "Read and write Google Analytics data" },
            { icon: Search,        label: "Tasks",          desc: "Read and manage Google Tasks" },
            { icon: HardDrive,     label: "Photos",         desc: "Read Google Photos library" },
            { icon: Layers,        label: "Cloud Platform", desc: "BigQuery, Cloud Storage, Cloud SQL, Logging, Monitoring" },
            { icon: Search,        label: "Indexing API",   desc: "Submit URLs directly to Google for crawling" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cm-purple/15 text-cm-purple shrink-0">
                <Icon size={15} />
              </div>
              <div>
                <p className="text-sm font-medium text-dark-text">{label}</p>
                <p className="text-xs text-dark-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Access Configuration ───────────────────────────────────── */}

      {/* API Key */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Key size={14} className="text-cm-purple" />
          <h2 className="text-sm font-semibold text-dark-text">API Key</h2>
        </div>
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 flex items-start gap-3">
          <MapPin size={14} className="text-cm-purple shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-dark-text">
              <code className="text-cm-purple">GOOGLE_PLACES_API_KEY</code>
            </p>
            <p className="text-xs text-dark-muted mt-0.5">
              Places API (New) — business lookup, ratings, photos, reviews, opening hours
            </p>
            <p className="text-xs text-dark-muted opacity-60 mt-1">
              Endpoint: <code>https://places.googleapis.com/v1/</code> · Legacy Places API disabled
            </p>
          </div>
        </div>
      </div>

      {/* OAuth2 Scopes */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-cm-purple" />
          <h2 className="text-sm font-semibold text-dark-text">OAuth2 Scopes</h2>
          <span className="text-xs text-dark-success ml-auto">20 granted</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { scope: "mail.google.com/",        label: "Gmail — full access including delete",       rw: true },
            { scope: "calendar",                label: "Calendar — full read/write",                 rw: true },
            { scope: "drive",                   label: "Drive — full read/write/delete",             rw: true },
            { scope: "spreadsheets",            label: "Sheets — full read/write",                   rw: true },
            { scope: "documents",               label: "Docs — full read/write",                     rw: true },
            { scope: "presentations",           label: "Slides — full read/write",                   rw: true },
            { scope: "forms.body",              label: "Forms — full read/write",                    rw: true },
            { scope: "contacts",                label: "Contacts — full read/write",                 rw: true },
            { scope: "webmasters",              label: "Search Console — full access",               rw: true },
            { scope: "indexing",                label: "Indexing API — submit URLs",                 rw: true },
            { scope: "youtube",                 label: "YouTube — manage account",                   rw: true },
            { scope: "youtube.upload",          label: "YouTube — upload videos",                    rw: true },
            { scope: "analytics",               label: "Analytics — full read/write",                rw: true },
            { scope: "tasks",                   label: "Tasks — full read/write",                    rw: true },
            { scope: "cloud-platform",          label: "Cloud Platform — BigQuery, Storage, SQL",    rw: true },
            { scope: "photoslibrary",           label: "Photos — read library",                      rw: false },
            { scope: "yt-analytics.readonly",   label: "YouTube Analytics — read",                   rw: false },
            { scope: "userinfo.email",          label: "Identity — email address",                   rw: false },
            { scope: "userinfo.profile",        label: "Identity — name and profile",                rw: false },
            { scope: "openid",                  label: "OpenID Connect",                             rw: false },
          ].map(({ scope, label, rw }) => (
            <div key={scope} className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs text-cm-purple truncate">{scope}</code>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${
                    rw ? "border-cm-purple/30 text-cm-purple bg-cm-purple/10" : "border-dark-border text-dark-muted"
                  }`}>
                    {rw ? "r/w" : "read"}
                  </span>
                </div>
                <p className="text-xs text-dark-muted mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enabled Cloud APIs */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cm-purple" />
          <h2 className="text-sm font-semibold text-dark-text">Enabled Google Cloud APIs</h2>
        </div>

        {/* Active — traffic in Cloud Console */}
        <div>
          <p className="text-xs text-dark-muted uppercase tracking-wider mb-2">Active — recent traffic</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: "Gmail API", reqs: "2,982", errors: "0%", note: "v1 · OAuth2" },
              { name: "Google Sheets API", reqs: "16", errors: "6%", note: "v4 · OAuth2", warn: "6% error rate · high latency" },
              { name: "Google Drive API", reqs: "10", errors: "0%", note: "v3 · OAuth2" },
              { name: "Places API (New)", reqs: "2", errors: "0%", note: "API key · REST" },
              { name: "Google Calendar API", reqs: "1", errors: "0%", note: "v3 · OAuth2" },
              { name: "Google Search Console API", reqs: "1", errors: "0%", note: "v3 · OAuth2" },
            ].map(({ name, reqs, warn, note }) => (
              <div key={name} className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-dark-text">{name}</p>
                    <span className="text-xs text-dark-muted shrink-0">{reqs} req</span>
                  </div>
                  <p className="text-xs text-dark-muted">{note}</p>
                  {warn && <p className="text-xs text-dark-warn mt-0.5">{warn}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wired — code exists, no recent console traffic */}
        <div>
          <p className="text-xs text-dark-muted uppercase tracking-wider mb-2">Wired — code exists, no recent traffic</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: "People API", note: "v1 · OAuth2 · Contacts search" },
              { name: "PageSpeed Insights API", note: "v5 · API key · MC SEO route" },
              { name: "YouTube Data API v3", note: "OAuth2 · mastermind upload scripts" },
            ].map(({ name, note }) => (
              <div key={name} className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cm-purple-mid shrink-0 mt-1.5" />
                <div>
                  <p className="text-sm font-medium text-dark-text">{name}</p>
                  <p className="text-xs text-dark-muted">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enabled but not wired up */}
        <div>
          <p className="text-xs text-dark-muted uppercase tracking-wider mb-2">Enabled — not wired up</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "BigQuery API",
              "BigQuery Storage API",
              "BigQuery Connection API",
              "BigQuery Data Policy API",
              "BigQuery Data Transfer API",
              "BigQuery Migration API",
              "BigQuery Reservation API",
              "Analytics Hub API",
              "Google Docs API",
              "Google Slides API",
              "Custom Search API",
              "YouTube Analytics API",
              "YouTube Reporting API",
              "YouTube Embedded Player API",
              "YouTube oEmbed API",
              "Cloud SQL",
              "Cloud Storage",
              "Cloud Logging API",
              "Cloud Monitoring API",
              "Cloud Trace API",
              "Cloud Dataplex API",
              "Cloud Datastore API",
              "Dataform API",
              "Service Management API",
              "Service Usage API",
            ].map((name) => (
              <div key={name} className="bg-dark-panel2 border border-dark-border rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-dark-border shrink-0" />
                <p className="text-xs text-dark-muted truncate">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
