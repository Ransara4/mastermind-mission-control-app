"use client";

import { useState } from "react";
import { Terminal, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface Issue {
  severity: string;
  message: string;
}

interface Props {
  domain: string;
  lastAuditScore?: number;
  lastAuditIssues?: Issue[];
}

const SUGGESTION_CHIPS = [
  "Fix all critical issues on this site",
  "Update all missing alt text",
  "Generate schema markup and inject it",
  "Audit the site and fix everything under grade B",
  "Check and fix robots.txt and sitemap",
];

export default function ClaudeCommandPanel({
  domain,
  lastAuditScore,
  lastAuditIssues,
}: Props) {
  const [command, setCommand] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!command.trim() || !domain || sending) return;

    setSending(true);
    setError(null);
    setSent(false);
    setTaskId(null);

    try {
      const filteredIssues = lastAuditIssues?.filter(
        (i) => i.severity === "critical" || i.severity === "warning"
      );

      const res = await fetch("/api/seo/claude-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          command: command.trim(),
          auditScore: lastAuditScore,
          issues: filteredIssues,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create task");
      }

      setSent(true);
      setTaskId(data.card._id);
      setCommand("");
    } catch (err: any) {
      setError(err.message || "Failed to send command");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-cm-purple/15 rounded-lg">
          <Terminal size={18} className="text-cm-purple" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-dark-text">
          Claude Code Commands
        </h3>
      </div>
      <p className="text-sm text-dark-muted mb-4">
        Dispatch tasks to Claude Code -- it will run audits, fix issues, and
        push changes
      </p>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setCommand(chip)}
            className="px-3 py-1.5 text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted rounded-full hover:bg-cm-purple/10 hover:text-cm-purple hover:border-cm-purple/30 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        rows={3}
        value={command}
        onChange={(e) => {
          setCommand(e.target.value);
          if (sent) setSent(false);
          if (error) setError(null);
        }}
        placeholder={`Describe what Claude Code should do for ${domain || "your site"}...`}
        className="w-full px-4 py-3 border border-dark-border rounded-lg text-sm text-dark-text bg-dark-panel2 placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-none"
      />

      {/* Submit button */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!command.trim() || sending || !domain}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cm-purple text-white text-sm font-medium rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Terminal size={16} />
          )}
          Send to Claude Code
        </button>
      </div>

      {/* Success message */}
      {sent && taskId && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-dark-success/10 border border-dark-success/30 rounded-lg">
          <CheckCircle size={16} className="text-dark-success shrink-0" />
          <p className="text-sm text-dark-success">
            Task created -- Claude Code will pick this up
          </p>
          <span className="text-xs text-dark-success font-mono ml-auto">
            {taskId}
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-dark-danger/10 border border-dark-danger/30 rounded-lg">
          <AlertCircle size={16} className="text-dark-danger shrink-0" />
          <p className="text-sm text-dark-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
