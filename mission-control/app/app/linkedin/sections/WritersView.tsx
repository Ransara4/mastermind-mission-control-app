"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Save } from "lucide-react";

export function WritersView({
  writers,
  onSave,
}: {
  writers: Record<string, string>;
  onSave: (file: string, content: string) => Promise<any>;
}) {
  const [activeFile, setActiveFile] = useState<string>(
    Object.keys(writers)[0] || ""
  );
  const [content, setContent] = useState(writers[activeFile] || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fileLabels: Record<string, string> = {
    "hook-writer": "Hook Writer",
    "search-writer": "Search & Research Writer",
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(activeFile, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold  text-dark-text">
              Content Writer Guides
            </h3>
            <p className="text-sm text-dark-muted mt-1">
              Edit these files to control how content gets written. They guide
              the AI when creating hooks and drafting posts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-dark-success flex items-center gap-1">
                <CheckCircle2 size={12} /> Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save
            </button>
          </div>
        </div>

        {/* File tabs */}
        <div className="flex gap-2 mb-4">
          {Object.keys(writers).map((file) => (
            <button
              key={file}
              onClick={() => {
                setActiveFile(file);
                setContent(writers[file]);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeFile === file
                  ? "bg-cm-purple/20 text-cm-purple font-medium"
                  : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
              }`}
            >
              {fileLabels[file] || file}
            </button>
          ))}
        </div>

        {/* Editor */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm font-mono font-dm-mono leading-relaxed resize-y"
          rows={30}
          spellCheck={false}
        />
        <p className="text-xs text-dark-muted mt-2">
          {activeFile}.md &bull;{" "}
          {content.split("\n").length} lines &bull;{" "}
          {content.length} chars
        </p>
      </div>
    </div>
  );
}
