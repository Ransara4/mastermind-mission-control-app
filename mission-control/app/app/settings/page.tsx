"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronUp,
  KeyRound,
  RefreshCw,
  Info,
  Tag,
} from "lucide-react";
import docs, { ApiKeyDoc, ApiKeyField } from "@/lib/api-key-docs";

// All integrations shown on this page
const INTEGRATIONS: { slug: string; name: string; emoji: string }[] = [
  // Core AI
  { slug: "anthropic",       name: "Anthropic",           emoji: "🤖" },
  { slug: "openai",          name: "OpenAI",              emoji: "🧠" },
  { slug: "nvidia",          name: "NVIDIA NIM",          emoji: "🖥️" },
  { slug: "brave",           name: "Brave Search",        emoji: "🦁" },
  { slug: "gemini",          name: "Gemini",              emoji: "✨" },
  { slug: "tavily",          name: "Tavily",              emoji: "🔍" },
  // Messaging & Comms
  { slug: "telegram",        name: "Telegram",            emoji: "✈️" },
  { slug: "slack",           name: "Slack",               emoji: "#️⃣" },
  // Social & Content
  { slug: "linkedin",        name: "LinkedIn",            emoji: "💼" },
  { slug: "linkedin-images", name: "LinkedIn Images",     emoji: "🖼️" },
  { slug: "youtube",         name: "YouTube",             emoji: "▶️" },
  { slug: "meta-ads",        name: "Meta Ads",            emoji: "📣" },
  { slug: "reddit",          name: "Reddit",              emoji: "🔶" },
  { slug: "x",               name: "X (Twitter)",         emoji: "𝕏" },
  { slug: "ig-video-transcriber", name: "Instagram",      emoji: "📷" },
  { slug: "manychat-giveaways",   name: "ManyChat",       emoji: "💬" },
  // Productivity & Files
  { slug: "notion",          name: "Notion",              emoji: "📝" },
  { slug: "dropbox",         name: "Dropbox",             emoji: "📦" },
  { slug: "google",          name: "Google APIs",         emoji: "🔵" },
  { slug: "airtable",        name: "Airtable",            emoji: "🗄️" },
  { slug: "trello",          name: "Trello",              emoji: "📋" },
  { slug: "zoom",            name: "Zoom",                emoji: "📹" },
  { slug: "tidycal",         name: "TidyCal",             emoji: "📅" },
  // Design & Media
  { slug: "canva",           name: "Canva",               emoji: "🎨" },
  { slug: "descript",        name: "Descript",            emoji: "🎬" },
  { slug: "pexels",          name: "Pexels",              emoji: "📸" },
  { slug: "unsplash",        name: "Unsplash",            emoji: "🌄" },
  // Commerce & Finance
  { slug: "stripe",          name: "Stripe",              emoji: "💳" },
  { slug: "gumroad",         name: "Gumroad",             emoji: "💸" },
  { slug: "zoho-books",      name: "Zoho Books",          emoji: "📚" },
  { slug: "wix",             name: "Wix",                 emoji: "🌐" },
  // Sales & Outreach
  { slug: "apollo",          name: "Apollo.io",           emoji: "🚀" },
  { slug: "hunter",          name: "Hunter.io",           emoji: "🎯" },
  { slug: "instantly",       name: "Instantly",           emoji: "⚡" },
  // Dev & Infra
  { slug: "vercel",          name: "Vercel",              emoji: "▲" },
  { slug: "porkbun",         name: "Porkbun",             emoji: "🐷" },
  // SEO
  { slug: "pagespeed",       name: "PageSpeed / CrUX",   emoji: "⚡" },
  { slug: "bing_webmaster",  name: "Bing Webmaster",      emoji: "🔍" },
  // Data & Research
  { slug: "lunarcrush",      name: "LunarCrush",          emoji: "🌙" },
  { slug: "congress",        name: "Congress.gov",        emoji: "🏛️" },
  // Shopping
  { slug: "tokopedia",       name: "Tokopedia",           emoji: "🛒" },
  // Local agents (no external keys)
  { slug: "littlebird",      name: "Little Bird",         emoji: "🐦" },
  { slug: "mac-cleaner",     name: "MacCleaner",          emoji: "🧹" },
  { slug: "mentorship-watcher", name: "Mentorship Watcher", emoji: "🎓" },
  { slug: "human-task-handler", name: "Human Task Handler", emoji: "👤" },
];

interface EnvStatusMap {
  [envVar: string]: boolean;
}

/** Parse instruction text and turn bare https:// URLs into clickable links */
function InstructionText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s,)]+)/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[1];
    const isLocal = url.startsWith("http://localhost");
    parts.push(
      <a
        key={key++}
        href={url}
        target={isLocal ? "_self" : "_blank"}
        rel="noopener noreferrer"
        className="text-cm-purple underline underline-offset-2 hover:text-purple-400 break-all"
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span>{parts}</span>;
}

// Need React import for JSX types
import React from "react";

function IntegrationCard({
  slug,
  name,
  emoji,
}: {
  slug: string;
  name: string;
  emoji: string;
}) {
  const doc: ApiKeyDoc | undefined = docs[slug];
  const [envStatus, setEnvStatus] = useState<EnvStatusMap>({});
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!doc) { setLoaded(true); return; }
    const keys = doc.fields.map((f) => f.envVar).join(",");
    if (!keys) { setLoaded(true); return; }
    try {
      const res = await fetch(`/api/env/inject?keys=${keys}`);
      const data = await res.json();
      setEnvStatus(data.configured || {});
    } catch { /* ignore */ }
    setLoaded(true);
  };

  useEffect(() => { fetchStatus(); }, [slug]);

  if (!doc) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-4 opacity-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className="font-medium text-dark-text">{name}</p>
            <p className="text-xs text-dark-muted">No setup guide available yet</p>
          </div>
        </div>
      </div>
    );
  }

  const noFields = doc.fields.length === 0;
  const allOk = noFields || (loaded && doc.fields.every((f) => envStatus[f.envVar]));
  const missingCount = noFields ? 0 : doc.fields.filter((f) => !envStatus[f.envVar]).length;

  const handleSave = async () => {
    const toSave: Record<string, string> = {};
    for (const f of doc.fields) {
      if (values[f.envVar]?.trim()) toSave[f.envVar] = values[f.envVar].trim();
    }
    if (!Object.keys(toSave).length) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/env/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vars: toSave }),
      });
      if (!res.ok) throw new Error();
      setSaveMsg("Saved ✓");
      setValues({});
      await fetchStatus();
    } catch {
      setSaveMsg("Error saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`bg-dark-panel border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${
        noFields ? "border-dark-border" :
        allOk ? "border-dark-success/30" : "border-dark-warn/30"
      }`}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-dark-text">{name}</p>
          <p className="text-xs text-dark-muted truncate">{doc.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!loaded ? (
            <Loader2 size={14} className="animate-spin text-dark-muted" />
          ) : noFields ? (
            <span className="flex items-center gap-1 text-xs text-dark-muted bg-dark-panel2 border border-dark-border rounded-full px-2 py-0.5">
              No key needed
            </span>
          ) : allOk ? (
            <span className="flex items-center gap-1 text-xs text-dark-success bg-dark-success/10 border border-dark-success/30 rounded-full px-2 py-0.5">
              <CheckCircle2 size={11} /> Configured
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-dark-warn bg-dark-warn/10 border border-dark-warn/30 rounded-full px-2 py-0.5">
              <AlertTriangle size={11} /> {missingCount} missing
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors"
            title={expanded ? "Collapse" : "View setup guide"}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Pricing + env var badges row */}
      {loaded && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          {doc.pricingNote && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-cm-purple/10 text-cm-purple border border-cm-purple/20">
              <Tag size={9} />
              {doc.pricingNote}
            </span>
          )}
          {doc.fields.map((f) => (
            <span
              key={f.envVar}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-dm-mono ${
                envStatus[f.envVar]
                  ? "bg-dark-success/20 text-dark-success"
                  : "bg-dark-danger/20 text-dark-danger"
              }`}
            >
              <Terminal size={9} />
              {f.envVar}
              {envStatus[f.envVar] ? " ✓" : " ✗"}
            </span>
          ))}
        </div>
      )}

      {/* Expanded setup */}
      {expanded && (
        <div className="border-t border-dark-border px-4 py-4 space-y-4 bg-dark-panel2">
          {/* Instructions */}
          <div className="flex items-start justify-between gap-3">
            <ol className="space-y-2 flex-1">
              {doc.instructions.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-dark-text">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-cm-purple/15 text-cm-purple text-xs flex items-center justify-center font-medium mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">
                    <InstructionText text={step} />
                  </span>
                </li>
              ))}
            </ol>
            {doc.signupUrl && (
              <a
                href={doc.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 transition-colors"
              >
                <ExternalLink size={12} />
                Get key
              </a>
            )}
          </div>

          {/* Gotcha notes */}
          {doc.notes && doc.notes.length > 0 && (
            <div className="space-y-1.5">
              {doc.notes.map((note, i) => (
                <div key={i} className="flex gap-2 text-xs text-dark-muted bg-dark-panel border border-dark-border rounded-lg px-3 py-2">
                  <Info size={12} className="shrink-0 text-cm-purple mt-0.5" />
                  <InstructionText text={note} />
                </div>
              ))}
            </div>
          )}

          {/* Input fields */}
          {doc.fields.length > 0 && (
            <div className="space-y-3">
              {doc.fields.map((f: ApiKeyField) => (
                <div key={f.envVar}>
                  <label className="flex items-center gap-2 text-xs font-medium text-dark-muted mb-1">
                    <span className="font-mono font-dm-mono bg-dark-panel px-1 rounded">{f.envVar}</span>
                    {f.label}
                    {envStatus[f.envVar] && (
                      <span className="text-dark-success ml-auto">✓ set</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={f.type === "password" && !showValues[f.envVar] ? "password" : "text"}
                      value={values[f.envVar] || ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [f.envVar]: e.target.value }))
                      }
                      placeholder={
                        envStatus[f.envVar]
                          ? "Leave blank to keep existing"
                          : f.placeholder || `Enter ${f.label}`
                      }
                      className="w-full px-3 py-2 pr-9 text-sm font-mono font-dm-mono border border-dark-border rounded-lg focus:outline-none focus:border-cm-purple focus:ring-2 focus:ring-cm-purple bg-dark-panel text-dark-text placeholder:text-dark-muted"
                      autoComplete="off"
                    />
                    {f.type === "password" && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowValues((p) => ({ ...p, [f.envVar]: !p[f.envVar] }))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
                      >
                        {showValues[f.envVar] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          {doc.fields.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || doc.fields.every((f) => !values[f.envVar]?.trim())}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? "Saving..." : "Save to .env"}
              </button>
              {saveMsg && (
                <span className={`text-sm ${saveMsg.includes("Error") ? "text-dark-danger" : "text-dark-success"}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<{ total: number; installed: number; missing: number } | null>(null);

  useEffect(() => {
    // Collect all env vars from all integrations that have docs + fields
    const allVars: string[] = [];
    for (const integration of INTEGRATIONS) {
      const doc = docs[integration.slug];
      if (doc && doc.fields.length > 0) {
        for (const f of doc.fields) allVars.push(f.envVar);
      }
    }
    if (!allVars.length) return;
    fetch(`/api/env/inject?keys=${allVars.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const configured: Record<string, boolean> = data.configured || {};
        let installed = 0, missing = 0;
        for (const integration of INTEGRATIONS) {
          const doc = docs[integration.slug];
          if (!doc || doc.fields.length === 0) continue;
          const allSet = doc.fields.every((f) => configured[f.envVar]);
          if (allSet) installed++; else missing++;
        }
        setStats({ total: installed + missing, installed, missing });
      })
      .catch(() => {});
  }, [refreshKey]);

  const filtered = INTEGRATIONS.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
            <KeyRound size={22} className="text-dark-muted" />
            API Keys
          </h2>
          <p className="text-sm text-dark-muted mt-1">
            Configure API keys for all agents. Keys are saved to{" "}
            <code className="bg-dark-panel2 px-1 rounded text-xs">
              ~/.openclaw/workspace/.env
            </code>{" "}
            and picked up automatically by all agents.
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors"
          title="Refresh all statuses"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats banner */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-panel border border-dark-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-dark-text">{stats.total}</p>
            <p className="text-xs text-dark-muted mt-0.5">Total integrations</p>
          </div>
          <div className="bg-dark-panel border border-dark-success/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-dark-success">{stats.installed}</p>
            <p className="text-xs text-dark-muted mt-0.5">Installed</p>
          </div>
          <div className={`bg-dark-panel border rounded-xl p-4 text-center ${stats.missing > 0 ? "border-dark-warn/30" : "border-dark-border"}`}>
            <p className={`text-2xl font-bold ${stats.missing > 0 ? "text-dark-warn" : "text-dark-muted"}`}>{stats.missing}</p>
            <p className="text-xs text-dark-muted mt-0.5">Missing</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search integrations..."
          className="flex-1 px-4 py-2 border border-dark-border bg-dark-panel2 rounded-lg focus:outline-none focus:border-cm-purple focus:ring-2 focus:ring-cm-purple text-sm text-dark-text placeholder:text-dark-muted"
        />
      </div>

      {/* Grid */}
      <div key={refreshKey} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((i) => (
          <IntegrationCard key={i.slug} {...i} />
        ))}
      </div>

      {/* Info box */}
      <div className="bg-cm-purple/15 border border-cm-purple/20 rounded-xl p-4 text-sm">
        <p className="font-medium text-cm-purple mb-1">How this works</p>
        <p className="text-cm-purple/80">
          Saving a key here writes it to{" "}
          <code className="bg-dark-panel/70 px-1 rounded text-xs">~/.openclaw/workspace/.env</code>.
          All agents read from that file at startup.{" "}
          <strong>Restart any running agents</strong> after saving — changes are not hot-reloaded.
        </p>
      </div>
    </div>
  );
}
