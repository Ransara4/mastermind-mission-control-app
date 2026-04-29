"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, FileText } from "lucide-react";

interface BusinessSection {
  heading: string;
  lines: string[];
}

function parseBusinessSections(md: string): BusinessSection[] {
  const sections: BusinessSection[] = [];
  let current: BusinessSection | null = null;
  for (const line of md.split("\n")) {
    if (line.startsWith("# ")) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^# /, "").trim(), lines: [] };
    } else if (current) {
      const trimmed = line.trim();
      if (trimmed.startsWith(">") || trimmed === "---" || trimmed === "***" || trimmed === "___") continue;
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.lines.some((l) => l.trim().length > 0));
}

function renderBusinessLine(line: string, key: number) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const text = trimmed.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/^[-*]\s+/, "• ");
  return <p key={key} className="text-sm text-dark-muted leading-relaxed">{text}</p>;
}

interface BusinessTabProps {
  clientId: string;
  clientName: string;
}

export function BusinessTab({ clientId, clientName }: BusinessTabProps) {
  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/mentorships/${clientId}/business`)
      .then((r) => r.json())
      .then((d) => { setContent(d.content ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${clientId}/business`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setContent(editContent);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-cm-purple" />
      </div>
    );
  }

  const sections = parseBusinessSections(content);
  const firstName = clientName.split(" ")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-dark-muted uppercase tracking-wide">About {firstName}&apos;s Business</h2>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-dark-success">Saved</span>}
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-dark-muted hover:text-dark-text transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-semibold hover:bg-cm-purple-mid disabled:opacity-50 transition-colors">
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button onClick={() => { setEditContent(content); setEditing(true); }}
              className="px-4 py-1.5 text-xs font-semibold text-cm-purple bg-cm-purple/10 border border-cm-purple/30 rounded-lg hover:bg-cm-purple/20 transition-colors">
              Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-4 py-3">
          <AlertCircle size={15} />{error}
        </div>
      )}

      {editing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[70vh] bg-dark-panel border border-dark-border rounded-xl px-5 py-4 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple resize-y font-mono leading-relaxed"
        />
      ) : (
        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="bg-dark-panel rounded-xl border border-dark-border p-12 flex flex-col items-center gap-3 text-dark-muted">
              <FileText size={36} />
              <p className="text-sm">No business information yet. Click Edit to get started.</p>
            </div>
          ) : (
            sections.map((s, i) => (
              <div key={i} className="bg-dark-panel rounded-xl border border-dark-border p-5">
                <h3 className="text-sm font-semibold text-dark-text mb-2">{s.heading}</h3>
                <div className="space-y-1">
                  {s.lines.map((line, j) => renderBusinessLine(line, j))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
