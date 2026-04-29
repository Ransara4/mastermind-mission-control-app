"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Terminal,
  X,
} from "lucide-react";
import { getApiKeyDoc, ApiKeyField } from "@/lib/api-key-docs";

interface ApiKeyBannerProps {
  /** Skill slug matching lib/api-key-docs.ts keys */
  slug: string;
  /** Optional: override display name */
  agentName?: string;
}

interface EnvStatus {
  [envVar: string]: boolean;
}

export default function ApiKeyBanner({ slug, agentName }: ApiKeyBannerProps) {
  const doc = getApiKeyDoc(slug);
  const [envStatus, setEnvStatus] = useState<EnvStatus>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"ok" | "error" | null>(null);

  const label = agentName || slug;

  const fetchStatus = async () => {
    if (!doc) return;
    const keys = doc.fields.map((f) => f.envVar).join(",");
    if (!keys) return;
    try {
      const res = await fetch(`/api/env/inject?keys=${keys}`);
      const data = await res.json();
      setEnvStatus(data.configured || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!doc) return null;
  if (loading) return null;

  const allConfigured = doc.fields.every((f) => envStatus[f.envVar]);
  const missingFields = doc.fields.filter((f) => !envStatus[f.envVar]);

  // If everything is configured and not expanded — show a compact badge
  if (allConfigured && !expanded) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-dark-success bg-dark-success/10 border border-dark-success/30 rounded-lg px-3 py-1.5 w-fit">
        <CheckCircle2 size={13} />
        API keys configured
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-dark-warn/30 bg-dark-warn/10 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <AlertTriangle size={16} className="text-dark-warn shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-dark-warn">
            {missingFields.length === doc.fields.length
              ? `${label} needs API keys to work`
              : `${label} is missing some API keys`}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {doc.fields.map((f) => (
              <span
                key={f.envVar}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono ${
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
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-dark-warn bg-dark-warn/20 hover:bg-dark-warn/30 rounded-lg transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp size={13} /> Hide
              </>
            ) : (
              <>
                <ChevronDown size={13} /> Set up
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-dark-warn hover:text-dark-warn rounded-lg hover:bg-dark-warn/20 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded setup panel */}
      {expanded && (
        <div className="border-t border-dark-warn/30 bg-dark-panel px-4 py-4 space-y-4">
          {/* Description + link */}
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-dark-muted">{doc.description}</p>
            <a
              href={doc.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 transition-colors"
            >
              <ExternalLink size={12} />
              Get API key
            </a>
          </div>

          {/* Instructions */}
          <ol className="space-y-1.5">
            {doc.instructions.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-dark-text">
                <span className="shrink-0 w-5 h-5 rounded-full bg-cm-purple/15 text-cm-purple text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {/* Input fields for missing keys */}
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide">
              Inject into .env
            </p>
            {doc.fields.map((f: ApiKeyField) => (
              <div key={f.envVar}>
                <label className="flex items-center gap-2 text-xs font-medium text-dark-text mb-1">
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                      envStatus[f.envVar]
                        ? "bg-dark-success/20 text-dark-success"
                        : "bg-dark-panel2 text-dark-muted"
                    }`}
                  >
                    {f.envVar}
                  </span>
                  {f.label}
                  {envStatus[f.envVar] && (
                    <span className="text-dark-success text-xs">✓ already set</span>
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
                        ? "Leave blank to keep existing value"
                        : f.placeholder || `Enter ${f.label}`
                    }
                    className="w-full px-3 py-2 pr-9 text-sm font-mono border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple focus:ring-2 focus:ring-cm-purple/30"
                    autoComplete="off"
                  />
                  {f.type === "password" && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowValues((prev) => ({
                          ...prev,
                          [f.envVar]: !prev[f.envVar],
                        }))
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
                    >
                      {showValues[f.envVar] ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={async () => {
                const toSave: Record<string, string> = {};
                for (const f of doc.fields) {
                  if (values[f.envVar]?.trim()) {
                    toSave[f.envVar] = values[f.envVar].trim();
                  }
                }
                if (Object.keys(toSave).length === 0) return;
                setSaving(true);
                setSaveResult(null);
                try {
                  const res = await fetch("/api/env/inject", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ vars: toSave }),
                  });
                  if (!res.ok) throw new Error();
                  setSaveResult("ok");
                  setValues({});
                  await fetchStatus();
                } catch {
                  setSaveResult("error");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={
                saving ||
                doc.fields.every((f) => !values[f.envVar]?.trim())
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {saving ? "Saving..." : "Save to .env"}
            </button>

            {saveResult === "ok" && (
              <span className="text-sm text-dark-success flex items-center gap-1">
                <CheckCircle2 size={14} /> Saved to ~/.openclaw/workspace/.env
              </span>
            )}
            {saveResult === "error" && (
              <span className="text-sm text-dark-danger">Failed to save. Check permissions.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
