"use client";

import { useState } from "react";
import { Loader2, Zap, Check } from "lucide-react";
import type { FixQueueItem } from "@/lib/seo-types";

interface Props {
  domain: string;
  items: FixQueueItem[];
  onRefresh: () => void;
}

function impactScore(item: FixQueueItem): number {
  const sev = item.severity === "critical" ? 3 : item.severity === "warning" ? 2 : 1;
  const fix = item.fixType === "auto" ? 3 : item.fixType === "claude" ? 2 : 1;
  return sev * 2 + fix;
}

export default function FixAllBanner({ domain, items, onRefresh }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ t1: number; t1Total: number; t2: number; t2Total: number; t3: number; t3Total: number; t4: number } | null>(null);
  const [done, setDone] = useState(false);
  const [fixLog, setFixLog] = useState<{ message: string; detail?: string }[]>([]);

  const pending = items.filter((i) => i.status === "pending");

  const autoCount   = pending.filter((i) => i.fixType === "auto").length;
  const claudeCount = pending.filter((i) => i.fixType === "claude").length;
  const manualCount = pending.filter((i) => i.fixType === "manual").length;

  const quickFixes = [...pending]
    .sort((a, b) => impactScore(b) - impactScore(a))
    .slice(0, 5);

  const updateStatus = async (id: string, status: "fixed" | "dismissed") => {
    await fetch("/api/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-fix-item", domain, id, status }),
    });
  };

  const fixOne = async (item: FixQueueItem): Promise<boolean> => {
    if (!item.fixAction) return false;
    const value = item.fixParams?.value || "__ai_generate__";
    try {
      const res = await fetch("/api/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, directAction: { type: item.fixAction, value } }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (res.ok && r?.status === "fixed") {
        await updateStatus(item.id, "fixed");
        setFixLog((prev) => [...prev, { message: r.message, detail: r.details }]);
        return true;
      }
    } catch {}
    return false;
  };

  const sendToClaude = async (claudeItems: FixQueueItem[]) => {
    if (!claudeItems.length) return;
    const commandLines = claudeItems
      .map((i) => `- [${i.severity}] ${i.message} — ${i.page}`)
      .join("\n");
    const command = `Fix the following SEO issues for ${domain}. Use the Wix API for meta/title updates.\n\n${commandLines}`;
    await fetch("/api/seo/claude-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, command, issues: claudeItems.map((i) => ({ severity: i.severity, message: i.message })) }),
    });
    for (const item of claudeItems) {
      await updateStatus(item.id, "fixed");
    }
  };

  const fixAll = async () => {
    setRunning(true);
    setDone(false);
    setFixLog([]);

    const todo = [...pending];
    const tier1 = todo.filter((i) => i.fixType === "auto");
    const tier2Candidates = todo.filter((i) => i.fixType === "claude");
    setProgress({ t1: 0, t1Total: tier1.length, t2: 0, t2Total: tier2Candidates.length, t3: 0, t3Total: 0, t4: 0 });

    // Tier 1 — Wix REST API (site-level description, display name)
    const t1Failed: FixQueueItem[] = [];
    for (const item of tier1) {
      const ok = await fixOne(item);
      if (!ok) t1Failed.push(item);
      setProgress((p) => p ? { ...p, t1: p.t1 + 1 } : null);
    }

    // Tier 2 — Wix Custom Code injection (schema, H1)
    const tier2 = [...t1Failed, ...tier2Candidates];
    setProgress((p) => p ? { ...p, t2Total: tier2.length } : null);
    const t2Failed: FixQueueItem[] = [];
    for (const item of tier2) {
      try {
        const res = await fetch("/api/seo/browser-fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, issue: { severity: item.severity, message: item.message } }),
        });
        const data = await res.json();
        if (data.status === "fixed") {
          await updateStatus(item.id, "fixed");
          if (data.message) setFixLog((prev) => [...prev, { message: data.message, detail: data.details }]);
        } else {
          t2Failed.push(item);
        }
      } catch { t2Failed.push(item); }
      setProgress((p) => p ? { ...p, t2: p.t2 + 1 } : null);
    }

    // Tier 3 — Playwright CDP (per-page descriptions/titles via Wix Dashboard)
    const tier3 = [...t2Failed];
    setProgress((p) => p ? { ...p, t3Total: tier3.length } : null);
    const t3Failed: FixQueueItem[] = [];
    for (const item of tier3) {
      try {
        const res = await fetch("/api/seo/wix-dashboard-fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, issue: { severity: item.severity, message: item.message } }),
        });
        const data = await res.json();
        if (data.status === "fixed") {
          await updateStatus(item.id, "fixed");
          if (data.message) setFixLog((prev) => [...prev, { message: data.message, detail: data.details }]);
        } else {
          t3Failed.push(item);
        }
      } catch { t3Failed.push(item); }
      setProgress((p) => p ? { ...p, t3: p.t3 + 1 } : null);
    }

    // Tier 4 — Claude Code task card (manual steps + reasoning)
    const tier4 = [...t3Failed, ...todo.filter((i) => i.fixType === "manual")];
    if (tier4.length > 0) {
      await sendToClaude(tier4);
      setProgress((p) => p ? { ...p, t4: tier4.length } : null);
    }

    setProgress(null);
    setRunning(false);
    setDone(true);
    onRefresh();
  };

  if (pending.length === 0) return null;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
      {/* Big Fix All row */}
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-dark-text">
            {pending.length} {pending.length === 1 ? "issue" : "issues"} ready to fix
          </h2>
          <p className="text-sm text-dark-muted mt-0.5">
            {autoCount > 0 && <span className="text-dark-success font-medium">{autoCount} auto (API)</span>}
            {autoCount > 0 && (claudeCount > 0 || manualCount > 0) && <span className="mx-1 text-dark-muted">·</span>}
            {claudeCount > 0 && <span className="text-cm-purple font-medium">{claudeCount} browser/Playwright</span>}
            {claudeCount > 0 && manualCount > 0 && <span className="mx-1 text-dark-muted">·</span>}
            {manualCount > 0 && <span className="text-dark-muted">{manualCount} manual</span>}
          </p>
        </div>

        <button
          onClick={fixAll}
          disabled={running}
          className="flex items-center gap-2.5 px-6 py-3 bg-cm-purple text-white rounded-xl text-base font-bold hover:bg-cm-purple/80 transition-colors disabled:opacity-60 shrink-0 shadow-lg shadow-cm-purple/20"
        >
          {running
            ? <><Loader2 size={18} className="animate-spin" /> Fixing...</>
            : done
            ? <><Check size={18} /> Done</>
            : <><Zap size={18} /> Fix All</>
          }
        </button>
      </div>

      {/* Progress bar during run */}
      {running && progress && (
        <div className="px-5 pb-4 space-y-1.5">
          <TierRow label="Tier 1 — REST API" done={progress.t1} total={progress.t1Total} color="bg-dark-success" />
          <TierRow label="Tier 2 — Custom Code" done={progress.t2} total={progress.t2Total} color="bg-cm-purple" />
          <TierRow label="Tier 3 — Playwright" done={progress.t3} total={progress.t3Total} color="bg-dark-warn" />
          {progress.t4 > 0 && (
            <p className="text-xs text-dark-muted pt-1">Tier 4 — {progress.t4} sent to Claude Code ↗</p>
          )}
        </div>
      )}

      {/* Fix log — what was actually applied */}
      {!running && done && fixLog.length > 0 && (
        <div className="border-t border-dark-border px-5 py-4">
          <p className="text-xs font-semibold text-dark-success uppercase tracking-wide mb-2">Applied fixes</p>
          <div className="space-y-2">
            {fixLog.map((entry, i) => (
              <div key={i} className="text-xs text-dark-muted">
                <span className="text-dark-success font-medium">✓</span> {entry.message}
                {entry.detail && (
                  <p className="ml-3 mt-0.5 text-dark-muted/70 italic truncate max-w-xl">{entry.detail.split("\n")[0]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Fix — top 5 by impact */}
      {!running && quickFixes.length > 0 && (
        <div className="border-t border-dark-border px-5 py-4">
          <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-3">Quick Fix — top priority</p>
          <div className="space-y-2">
            {quickFixes.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5">
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                  item.severity === "critical" ? "bg-dark-danger/20 text-dark-danger"
                  : item.severity === "warning"  ? "bg-dark-warn/20 text-dark-warn"
                  : "bg-cm-purple/20 text-cm-purple"
                }`}>
                  {item.severity}
                </span>
                <span className="flex-1 text-sm text-dark-text truncate">{item.message}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                  item.fixType === "auto"   ? "bg-dark-success/20 text-dark-success"
                  : item.fixType === "claude" ? "bg-cm-purple/20 text-cm-purple"
                  : "bg-dark-panel2 text-dark-muted"
                }`}>
                  {item.fixType === "auto" ? "API" : item.fixType === "claude" ? "Claude" : "Manual"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TierRow({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  if (total === 0) return null;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dark-muted w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-dark-panel2 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-dark-muted shrink-0 w-12 text-right">{done}/{total}</span>
    </div>
  );
}
