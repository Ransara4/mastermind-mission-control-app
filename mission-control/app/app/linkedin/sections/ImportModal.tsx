"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

export function ImportModal({
  onImport,
  onClose,
}: {
  onImport: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const lineCount = text
    .split("\n")
    .filter((l) => l.trim().length > 0).length;

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(text);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-bold  text-dark-text">Import Ideas</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-panel2"
          >
            <X size={20} className="text-dark-muted" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-dark-muted mb-3">
            Paste your content ideas, one per line. Each line becomes an idea
            card in your pipeline.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm font-mono font-dm-mono resize-y"
            placeholder={`Why every engineer should write on LinkedIn\nThe #1 mistake founders make with their LinkedIn presence\n5 AI trends that will change how we work in 2026\nHow I went from 0 to 10K followers in 6 months`}
          />
          <p className="text-xs text-dark-muted mt-2">
            {lineCount} idea{lineCount !== 1 ? "s" : ""} detected
          </p>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || lineCount === 0}
            className="px-6 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 flex items-center gap-2"
          >
            {importing && <Loader2 size={14} className="animate-spin" />}
            Import {lineCount} Idea{lineCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
