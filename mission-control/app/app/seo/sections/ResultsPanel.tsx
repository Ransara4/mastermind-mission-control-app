"use client";

import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  Wrench,
  Square,
  CheckSquare,
  Terminal,
} from "lucide-react";
import { useState, useCallback } from "react";
import type { ActionType } from "./ActionModal";

interface Props {
  action: ActionType;
  actionLabel: string;
  domain: string;
  result: any;
  onClose: () => void;
}

// ─── Severity Icon ──────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical":
      return <XCircle size={16} className="text-dark-danger shrink-0" />;
    case "warning":
      return <AlertTriangle size={16} className="text-dark-warn shrink-0" />;
    case "pass":
      return <CheckCircle size={16} className="text-dark-success shrink-0" />;
    default:
      return <Info size={16} className="text-cm-purple shrink-0" />;
  }
}

// ─── Collapsible Section ────────────────────────────────────────

function Section({
  title,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-dark-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-dark-panel2 hover:bg-dark-panel2 transition-colors text-left"
      >
        {open ? <ChevronDown size={16} className="text-dark-muted" /> : <ChevronRight size={16} className="text-dark-muted" />}
        <span className="text-sm font-semibold text-dark-text flex-1">{title}</span>
        {badge}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── Copyable Code ──────────────────────────────────────────────

function Copyable({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="bg-dark-bg text-dark-text rounded-lg p-4 text-xs overflow-x-auto max-h-64">
        {text}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-2 right-2 p-1.5 bg-dark-panel2 hover:bg-dark-panel rounded text-dark-muted"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

// ─── Score Ring ─────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const color =
    score >= 80 ? "text-dark-success" : score >= 60 ? "text-dark-warn" : "text-dark-danger";
  const bgColor =
    score >= 80 ? "bg-dark-success/10" : score >= 60 ? "bg-dark-warn/10" : "bg-dark-danger/10";
  return (
    <div className={`inline-flex flex-col items-center justify-center w-20 h-20 rounded-full ${bgColor}`}>
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
      <span className={`text-xs font-semibold ${color}`}>{grade}</span>
    </div>
  );
}

// ─── Search Result Card ─────────────────────────────────────────

function SearchResult({ title, url, snippet }: { title: string; url: string; snippet?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg border border-dark-border hover:border-cm-purple hover:bg-cm-purple/5 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-cm-purple truncate">{title}</p>
          <p className="text-xs text-dark-success truncate mt-0.5">{url}</p>
          {snippet && <p className="text-xs text-dark-muted mt-1 line-clamp-2">{snippet}</p>}
        </div>
        <ExternalLink size={14} className="text-dark-muted shrink-0 mt-0.5" />
      </div>
    </a>
  );
}

// ─── Renderers ──────────────────────────────────────────────────

// ─── Fix Result Card with smart details ────────────────────────

function FixResultCard({ fr, domain }: { fr: any; domain: string }) {
  const [descInput, setDescInput] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  const handlePushDescription = async () => {
    if (!descInput.trim()) return;
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          directAction: { type: "updateDescription", value: descInput.trim() },
        }),
      });
      const data = await res.json();
      if (data.success && data.results?.[0]?.status === "fixed") {
        setPushResult("Updated successfully!");
      } else {
        setPushResult(`Failed: ${data.results?.[0]?.message || data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setPushResult(`Error: ${err.message}`);
    } finally {
      setPushing(false);
    }
  };

  const isDescriptionIssue = fr.issue?.toLowerCase().includes("meta description");

  return (
    <div
      className={`p-4 rounded-lg border ${
        fr.status === "fixed"
          ? "bg-dark-success/10 border-dark-success/30"
          : fr.status === "failed"
          ? "bg-dark-danger/10 border-dark-danger/30"
          : "bg-cm-purple/10 border-cm-purple/20"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        {fr.status === "fixed" ? (
          <CheckCircle size={16} className="text-dark-success mt-0.5" />
        ) : fr.status === "failed" ? (
          <XCircle size={16} className="text-dark-danger mt-0.5" />
        ) : (
          <Wrench size={16} className="text-cm-purple mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-dark-text">{fr.issue}</p>
          <p className="text-xs text-dark-muted mt-0.5">{fr.message}</p>
        </div>
        {fr.status === "fixed" && (
          <span className="text-xs font-medium text-dark-success bg-dark-success/20 px-2 py-0.5 rounded">
            Auto-fixed
          </span>
        )}
        {fr.status === "manual" && (
          <span className="text-xs font-medium text-cm-purple bg-cm-purple/20 px-2 py-0.5 rounded">
            Manual
          </span>
        )}
      </div>

      {/* Smart details block */}
      {fr.details && (
        <div className="mt-2 p-3 bg-dark-panel2/60 rounded-lg border border-dark-border">
          <pre className="text-xs text-dark-text whitespace-pre-wrap font-sans">{fr.details}</pre>
        </div>
      )}

      {fr.steps && fr.steps.length > 0 && (
        <ol className="ml-6 mt-2 space-y-1">
          {fr.steps.map((step: string, j: number) => (
            <li key={j} className="text-xs text-dark-text list-decimal">
              {step}
            </li>
          ))}
        </ol>
      )}

      {/* Direct API push for meta description */}
      {isDescriptionIssue && fr.status === "manual" && (
        <div className="mt-3 p-3 bg-dark-panel2 rounded-lg border border-cm-purple/20">
          <p className="text-xs font-medium text-cm-purple mb-2">Push via Wix API</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New meta description (150-160 chars)"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-dark-border rounded-lg bg-dark-panel text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
            <button
              onClick={handlePushDescription}
              disabled={pushing || !descInput.trim()}
              className="px-3 py-1.5 bg-cm-purple text-white text-xs font-medium rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 flex items-center gap-1.5"
            >
              {pushing ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
              Push
            </button>
          </div>
          <p className="text-xs text-dark-muted mt-1">{descInput.length}/160 chars</p>
          {pushResult && (
            <p
              className={`text-xs mt-2 font-medium ${
                pushResult.startsWith("Updated") ? "text-dark-success" : "text-dark-danger"
              }`}
            >
              {pushResult}
            </p>
          )}
        </div>
      )}

      {fr.editorUrl && (
        <a
          href={fr.editorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-dark-panel2 border border-dark-border rounded-lg text-xs font-medium text-dark-text hover:border-cm-purple hover:text-cm-purple transition-colors"
        >
          <ExternalLink size={12} />
          Open in Wix
        </a>
      )}
    </div>
  );
}

function AuditResults({ result, domain }: { result: any; domain: string }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fixing, setFixing] = useState(false);
  const [fixResults, setFixResults] = useState<any[] | null>(null);

  const fixableIssues = result.issues
    .map((issue: any, i: number) => ({ ...issue, idx: i }))
    .filter((issue: any) => issue.severity !== "pass")
    .sort((a: any, b: any) => {
      const order = { critical: 0, warning: 1, info: 2, pass: 3 };
      return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
    });

  const passedIssues = result.issues.filter((issue: any) => issue.severity === "pass");

  const toggleIssue = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === fixableIssues.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(fixableIssues.map((i: any) => i.idx)));
    }
  };

  const handleFix = useCallback(async () => {
    if (selected.size === 0) return;
    setFixing(true);
    setFixResults(null);
    try {
      const issuesToFix = result.issues.filter((_: any, i: number) => selected.has(i));
      const res = await fetch("/api/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, issues: issuesToFix, auditData: result }),
      });
      const data = await res.json();
      if (data.success) {
        setFixResults(data.results);
      } else {
        setFixResults([{ issue: "Fix request", status: "failed", message: data.error || "Unknown error" }]);
      }
    } catch (err: any) {
      setFixResults([{ issue: "Fix request", status: "failed", message: err.message }]);
    } finally {
      setFixing(false);
    }
  }, [selected, domain, result]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <ScoreRing score={result.score} grade={result.grade} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div className="flex items-center gap-2">
            <XCircle size={14} className="text-dark-danger" />
            <span className="text-dark-text">{result.summary.critical} critical</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-dark-warn" />
            <span className="text-dark-text">{result.summary.warnings} warnings</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-dark-success" />
            <span className="text-dark-text">{result.summary.passes} passed</span>
          </div>
          <div className="flex items-center gap-2">
            <Info size={14} className="text-cm-purple" />
            <span className="text-dark-text">{result.summary.info} info</span>
          </div>
        </div>
      </div>

      {/* Fix Results */}
      {fixResults && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-dark-text flex items-center gap-2">
            <Wrench size={16} className="text-cm-purple" />
            Fix Results
          </h4>
          {fixResults.map((fr: any, i: number) => (
            <FixResultCard key={i} fr={fr} domain={domain} />
          ))}
        </div>
      )}

      {/* Issues with checkboxes */}
      <Section
        title="Issues"
        badge={
          <div className="flex items-center gap-3">
            <span className="text-xs text-dark-muted">{result.issues.length} checks</span>
            {selected.size > 0 && (
              <button
                onClick={handleFix}
                disabled={fixing}
                className="flex items-center gap-1.5 px-3 py-1 bg-cm-purple text-white text-xs font-medium rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
              >
                {fixing ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                Fix {selected.size} issue{selected.size > 1 ? "s" : ""}
              </button>
            )}
          </div>
        }
      >
        {fixableIssues.length > 0 && (
          <button
            onClick={selectAll}
            className="flex items-center gap-2 mb-3 text-xs text-dark-muted hover:text-dark-text transition-colors"
          >
            {selected.size === fixableIssues.length ? (
              <CheckSquare size={14} className="text-cm-purple" />
            ) : (
              <Square size={14} />
            )}
            {selected.size === fixableIssues.length ? "Deselect all" : "Select all fixable"}
          </button>
        )}
        <div className="space-y-1">
          {fixableIssues.map((issue: any) => (
            <button
              key={issue.idx}
              onClick={() => toggleIssue(issue.idx)}
              className={`w-full flex items-start gap-2 py-2 px-2 rounded-lg text-left transition-colors ${
                selected.has(issue.idx) ? "bg-cm-purple/10" : "hover:bg-dark-panel2"
              }`}
            >
              {selected.has(issue.idx) ? (
                <CheckSquare size={16} className="text-cm-purple mt-0.5 shrink-0" />
              ) : (
                <Square size={16} className="text-dark-muted mt-0.5 shrink-0" />
              )}
              <SeverityIcon severity={issue.severity} />
              <span className="text-sm text-dark-text">{issue.message}</span>
            </button>
          ))}
          {passedIssues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-border">
              <p className="text-xs text-dark-muted mb-2">Passed checks</p>
              {passedIssues.map((issue: any, i: number) => (
                <div key={i} className="flex items-start gap-2 py-1 px-2">
                  <SeverityIcon severity="pass" />
                  <span className="text-sm text-dark-muted">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section title="Page Structure" defaultOpen={false}>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-dark-muted mb-1">Headings</p>
            {result.h1s.map((h: string, i: number) => (
              <p key={i} className="text-dark-text">H1: {h}</p>
            ))}
            {result.h2s.map((h: string, i: number) => (
              <p key={i} className="text-dark-muted ml-3">H2: {h}</p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-dark-muted">Images</p>
              <p className="text-dark-text">{result.images.total} total, {result.images.missingAlt} missing alt</p>
            </div>
            <div>
              <p className="text-xs font-medium text-dark-muted">Links</p>
              <p className="text-dark-text">{result.links.internal} internal, {result.links.external} external</p>
            </div>
            <div>
              <p className="text-xs font-medium text-dark-muted">Resources</p>
              <p className="text-dark-text">{result.resources.scripts} scripts, {result.resources.stylesheets} stylesheets</p>
            </div>
            <div>
              <p className="text-xs font-medium text-dark-muted">Schema Types</p>
              <p className="text-dark-text">{result.schemas.join(", ") || "None"}</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function KeywordResults({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.answer && (
        <div className="bg-cm-purple/10 border border-cm-purple/20 rounded-lg p-4">
          <p className="text-sm text-dark-text">{result.answer}</p>
        </div>
      )}

      <Section title="Search Results" badge={<span className="text-xs text-dark-muted">{result.results.length} results</span>}>
        <div className="space-y-2">
          {result.results.map((r: any, i: number) => (
            <SearchResult key={i} {...r} />
          ))}
        </div>
      </Section>

      {result.relatedInsights?.length > 0 && (
        <Section title="Related Insights" defaultOpen={false}>
          {result.relatedAnswer && (
            <div className="bg-dark-panel2 rounded-lg p-3 mb-3">
              <p className="text-sm text-dark-text">{result.relatedAnswer}</p>
            </div>
          )}
          <div className="space-y-2">
            {result.relatedInsights.map((r: any, i: number) => (
              <SearchResult key={i} {...r} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function ContentBriefResults({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.searchIntent && (
        <div className="bg-dark-success/10 border border-dark-success/30 rounded-lg p-4">
          <p className="text-xs font-medium text-dark-success mb-1">Search Intent</p>
          <p className="text-sm text-dark-text">{result.searchIntent}</p>
        </div>
      )}

      <Section title="Suggested Outline">
        <Copyable text={result.suggestedOutline} />
      </Section>

      <Section title="Top Competitors" defaultOpen={false} badge={<span className="text-xs text-dark-muted">{result.topCompetitors.length}</span>}>
        <div className="space-y-2">
          {result.topCompetitors.map((r: any, i: number) => (
            <SearchResult key={i} {...r} />
          ))}
        </div>
      </Section>

      <Section title="Questions to Answer" defaultOpen={false}>
        <div className="space-y-2">
          {result.questionsToAnswer.map((q: any, i: number) => (
            <div key={i} className="p-2 rounded bg-dark-panel2">
              <p className="text-sm font-medium text-dark-text">{q.title}</p>
              {q.snippet && <p className="text-xs text-dark-muted mt-1">{q.snippet}</p>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function BacklinkResults({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.answer && (
        <div className="bg-cm-purple/10 border border-cm-purple/20 rounded-lg p-4">
          <p className="text-sm text-dark-text">{result.answer}</p>
        </div>
      )}

      <Section title="Sources" badge={<span className="text-xs text-dark-muted">{result.sources.length}</span>}>
        <div className="space-y-2">
          {result.sources.map((r: any, i: number) => (
            <SearchResult key={i} {...r} />
          ))}
        </div>
      </Section>

      {result.note && (
        <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-3">
          <p className="text-xs text-dark-warn">{result.note}</p>
        </div>
      )}
    </div>
  );
}

function SchemaResults({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={result.score} grade={scoreToGrade(result.score)} />
        <div>
          <p className="text-sm font-medium text-dark-text">
            {result.existing.length} schema type{result.existing.length !== 1 ? "s" : ""} found
          </p>
          <p className="text-xs text-dark-muted">
            {result.existing.map((s: any) => s.type).join(", ") || "None"}
          </p>
        </div>
      </div>

      {result.existing.length > 0 && (
        <Section title="Existing Schemas" badge={<span className="text-xs text-dark-muted">{result.existing.length}</span>}>
          <div className="space-y-3">
            {result.existing.map((schema: any, i: number) => (
              <div key={i}>
                <p className="text-xs font-semibold text-dark-text mb-1">{schema.type}</p>
                <Copyable text={schema.raw} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {result.suggestions.length > 0 && (
        <Section title="Suggestions">
          <div className="space-y-2">
            {result.suggestions.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <Info size={14} className="text-cm-purple mt-0.5 shrink-0" />
                <p className="text-sm text-dark-text">{s}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function LocalSeoResults({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.businessPresence && (
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
          <p className="text-xs font-medium text-dark-muted mb-1">Business Presence</p>
          <p className="text-sm text-dark-text">{result.businessPresence}</p>
        </div>
      )}

      {result.businessResults?.length > 0 && (
        <Section title="Business Listings" badge={<span className="text-xs text-dark-muted">{result.businessResults.length}</span>}>
          <div className="space-y-2">
            {result.businessResults.map((r: any, i: number) => (
              <SearchResult key={i} {...r} />
            ))}
          </div>
        </Section>
      )}

      {result.reviewInsights && (
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
          <p className="text-xs font-medium text-dark-text mb-1">Review Insights</p>
          <p className="text-sm text-dark-text">{result.reviewInsights}</p>
        </div>
      )}

      {result.reviewResults?.length > 0 && (
        <Section title="Review Sources" defaultOpen={false}>
          <div className="space-y-2">
            {result.reviewResults.map((r: any, i: number) => (
              <SearchResult key={i} {...r} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function TechnicalResults({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg border ${result.robotsStatus === 200 ? "bg-dark-success/10 border-dark-success/30" : "bg-dark-danger/10 border-dark-danger/30"}`}>
          <p className="text-xs font-medium text-dark-muted">robots.txt</p>
          <p className={`text-lg font-bold ${result.robotsStatus === 200 ? "text-dark-success" : "text-dark-danger"}`}>
            {result.robotsStatus === 200 ? "Found" : `${result.robotsStatus || "Missing"}`}
          </p>
        </div>
        <div className={`p-4 rounded-lg border ${result.sitemapStatus === 200 ? "bg-dark-success/10 border-dark-success/30" : "bg-dark-danger/10 border-dark-danger/30"}`}>
          <p className="text-xs font-medium text-dark-muted">Sitemap</p>
          <p className={`text-lg font-bold ${result.sitemapStatus === 200 ? "text-dark-success" : "text-dark-danger"}`}>
            {result.sitemapStatus === 200 ? `${result.sitemapUrls} URLs` : `${result.sitemapStatus || "Missing"}`}
          </p>
        </div>
      </div>

      {result.serverHeader && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-dark-muted">Server:</span>
          <span className="font-mono text-dark-text">{result.serverHeader}</span>
          {result.poweredBy && <span className="text-dark-muted">({result.poweredBy})</span>}
        </div>
      )}

      <Section title="Issues">
        <div className="space-y-2">
          {result.issues.map((issue: any, i: number) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <SeverityIcon severity={issue.severity} />
              <span className="text-sm text-dark-text">{issue.message}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Security Headers" defaultOpen={false}>
        <div className="space-y-2 text-sm">
          {Object.entries(result.securityHeaders || {}).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-dark-border">
              <span className="text-dark-muted font-mono text-xs">{key}</span>
              <span className={`text-xs font-medium ${val ? "text-dark-success" : "text-dark-muted"}`}>
                {typeof val === "string" ? (val || "Not set") : val ? "Yes" : "No"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {result.robotsTxt && (
        <Section title="robots.txt" defaultOpen={false}>
          <Copyable text={result.robotsTxt} />
        </Section>
      )}

      {result.redirects.length > 0 && (
        <Section title="Redirects" defaultOpen={false}>
          <div className="space-y-1">
            {result.redirects.map((r: string, i: number) => (
              <p key={i} className="text-sm font-mono text-dark-text">{r}</p>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ─── Send to Claude Code Button ─────────────────────────────────

function SendToClaudeCode({ domain, result }: { domain: string; result: any }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const criticalIssues = result.issues?.filter(
    (i: any) => i.severity === "critical" || i.severity === "warning"
  ) ?? [];

  if (criticalIssues.length === 0) return null;

  const criticalCount = criticalIssues.filter((i: any) => i.severity === "critical").length;
  const warningCount = criticalIssues.filter((i: any) => i.severity === "warning").length;

  const handleSend = async () => {
    setSending(true);
    setError(null);
    setSent(false);

    try {
      const command = `Fix all audit issues: ${criticalCount} critical, ${warningCount} warning`;
      const res = await fetch("/api/seo/claude-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          command,
          auditScore: result.score,
          issues: criticalIssues,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create task");
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-dark-border">
      <h4 className="text-sm font-semibold text-dark-text flex items-center gap-2 mb-3">
        <Terminal size={16} className="text-dark-muted" />
        Send Issues to Claude Code
      </h4>
      <p className="text-xs text-dark-muted mb-3">
        Create a task for Claude Code to automatically fix {criticalCount} critical and {warningCount} warning issues.
      </p>

      {sent ? (
        <div className="flex items-center gap-2 p-3 bg-dark-success/10 border border-dark-success/30 rounded-lg">
          <CheckCircle size={16} className="text-dark-success shrink-0" />
          <p className="text-sm text-dark-success">
            Task created -- Claude Code will pick this up
          </p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-3 bg-dark-danger/10 border border-dark-danger/30 rounded-lg">
          <XCircle size={16} className="text-dark-danger shrink-0" />
          <p className="text-sm text-dark-danger">{error}</p>
        </div>
      ) : (
        <button
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cm-purple text-white text-sm font-medium rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Terminal size={16} />
          )}
          Create Claude Code Task for These Issues
        </button>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────

export default function ResultsPanel({ action, actionLabel, domain, result, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-dark-panel w-full max-w-2xl h-full overflow-y-auto shadow-xl shadow-black/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-dark-panel border-b border-dark-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-dark-text">{actionLabel}</h3>
            <p className="text-sm text-dark-muted">{domain}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-dark-muted hover:text-dark-text rounded-lg hover:bg-dark-panel2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {action === "site-audit" && <AuditResults result={result} domain={domain} />}
          {action === "keyword-research" && <KeywordResults result={result} />}
          {action === "content-brief" && <ContentBriefResults result={result} />}
          {action === "backlink-analysis" && <BacklinkResults result={result} />}
          {action === "schema-markup" && <SchemaResults result={result} />}
          {action === "local-seo" && <LocalSeoResults result={result} />}
          {action === "technical-check" && <TechnicalResults result={result} />}

          {/* Send to Claude Code — only for site-audit with issues */}
          {action === "site-audit" && result.issues && (
            <SendToClaudeCode domain={domain} result={result} />
          )}
        </div>
      </div>
    </div>
  );
}
