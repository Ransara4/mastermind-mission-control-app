"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X, ChevronDown, ChevronRight, Loader2, FileCode, Route, Database, Clock } from "lucide-react";
import { getHelpContent } from "@/lib/help-content";

interface InspectFile {
  name: string;
  lines: number | string;
  modified: string;
}

interface InspectResult {
  files: InspectFile[];
  apiRoutes: string[];
  dataSource: string | null;
  lastModified: string | null;
  error?: string;
}

export default function HelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const inspectCache = useRef<Record<string, InspectResult | null>>({});
  const [inspectData, setInspectData] = useState<InspectResult | null>(null);

  // Close panel when navigating to a different page
  useEffect(() => {
    setOpen(false);
    setShowAdvanced(false);
    setInspectData(null);
  }, [pathname]);

  const help = getHelpContent(pathname);

  const handleAdvancedToggle = useCallback(async () => {
    const next = !showAdvanced;
    setShowAdvanced(next);

    if (!next) return;

    // Check cache first
    if (inspectCache.current[pathname] !== undefined) {
      setInspectData(inspectCache.current[pathname]);
      return;
    }

    // Fetch live inspection data
    setInspectLoading(true);
    setInspectData(null);

    // Brief delay so the spinner is visible
    await new Promise((r) => setTimeout(r, 600));

    try {
      const res = await fetch(`/api/help/inspect?path=${encodeURIComponent(pathname)}`);
      if (!res.ok) throw new Error("inspect failed");
      const data: InspectResult = await res.json();
      inspectCache.current[pathname] = data;
      setInspectData(data);
    } catch {
      inspectCache.current[pathname] = null;
      setInspectData(null);
    } finally {
      setInspectLoading(false);
    }
  }, [showAdvanced, pathname]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-cm-purple/20 border border-cm-purple/40 text-cm-purple hover:bg-cm-purple/30 transition-colors"
        aria-label="Help"
      >
        <HelpCircle size={20} />
      </button>

      {/* Backdrop — transparent, just catches clicks to close */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-96 max-w-[90vw] bg-dark-sidebar border-l border-dark-border flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cm-purple/15 flex items-center justify-center">
              <HelpCircle size={16} className="text-cm-purple" />
            </div>
            <h3 className="text-dark-text font-bold text-base">{help.title}</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-dark-muted hover:text-dark-text transition-colors"
            aria-label="Close help panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Description as structured guide */}
          <div
            className="text-dark-text text-sm leading-relaxed space-y-4 [&_p]:leading-relaxed [&_.hl]:text-cm-purple [&_.hl]:font-medium [&_.hl]:bg-cm-purple/10 [&_.hl]:px-1.5 [&_.hl]:py-0.5 [&_.hl]:rounded"
            dangerouslySetInnerHTML={{ __html: help.description }}
          />

          {/* Advanced section */}
          <div className="border-t border-dark-border pt-4">
            <button
              onClick={handleAdvancedToggle}
              className="flex items-center gap-1.5 text-dark-muted text-xs uppercase tracking-wider cursor-pointer hover:text-dark-text transition-colors"
            >
              {showAdvanced ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              Advanced
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showAdvanced ? "max-h-[2000px] opacity-100 mt-3" : "max-h-0 opacity-0"
              }`}
            >
              {/* 1. How to Make Changes — always first */}
              <div className="space-y-4">
                <div>
                  <div className="text-dark-muted text-xs uppercase tracking-wider mb-2">How to Make Changes</div>
                  <div className="text-dark-text text-sm leading-relaxed space-y-3">
                    <p>Every page in Get Sorted is fully customizable. You can add new features, change layouts, or adjust behavior at any time using any AI coding tool (Claude Code, Cursor, Copilot, or others).</p>
                    <p>Just describe what you want in plain English:</p>
                    <div className="bg-dark-panel2 rounded-lg border border-dark-border p-3 space-y-2.5">
                      <p className="text-xs font-mono text-cm-purple">&quot;Add a new column called Waiting On Client to the task board&quot;</p>
                      <p className="text-xs font-mono text-cm-purple">&quot;Change the task board so cards show their due date&quot;</p>
                      <p className="text-xs font-mono text-cm-purple">&quot;Make the AI column run every 5 minutes instead of 15&quot;</p>
                      <p className="text-xs font-mono text-cm-purple">&quot;Add a priority color indicator to each card&quot;</p>
                    </div>
                    <p className="text-dark-muted text-sm">Point your AI tool at the files listed below and describe the change. The AI reads the code, understands the structure, and makes the edit for you. No coding knowledge needed.</p>
                  </div>
                </div>

                {/* 2. How it works */}
                <div className="border-t border-dark-border pt-4">
                  <div className="text-dark-muted text-xs uppercase tracking-wider mb-2">How it Works</div>
                  <div className="text-dark-text text-sm leading-relaxed space-y-2">
                    <p>All your task cards, columns, and projects are stored in a single file called <code className="text-cm-purple bg-dark-panel2 px-1.5 py-0.5 rounded text-xs font-mono">lib/db.json</code>. When you drag a card, add a column, or create a project, that file gets updated automatically.</p>
                    <p>The <span className="text-cm-purple font-medium">AI (Auto Execute)</span> column is monitored by an agent called Paperclip. It checks this column on a schedule, picks up tasks, runs them, and moves them to Done when finished.</p>
                    <p>The board syncs in real time across browser tabs. If you edit a card in one tab, it appears in the other.</p>
                  </div>
                </div>

                {/* 3. Fallback to static advanced text */}
                {help.advanced && help.advanced !== "TASKS_ADVANCED" && (
                  <div className="border-t border-dark-border pt-4">
                    <p className="text-dark-muted text-sm leading-relaxed">
                      {help.advanced}
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Loading spinner for file inspection */}
              {inspectLoading && (
                <div className="flex items-center gap-2 text-dark-muted text-sm py-6">
                  <Loader2 size={16} className="animate-spin text-cm-purple" />
                  <span>Inspecting page files...</span>
                </div>
              )}

              {/* 5. Files, API Routes, Data Source, Last Modified — at the very bottom */}
              {!inspectLoading && inspectData && (inspectData.files.length > 0 || inspectData.apiRoutes.length > 0) && (
                <div className="border-t border-dark-border pt-5 mt-5 space-y-5">
                  {/* Files */}
                  {inspectData.files.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-dark-muted text-xs uppercase tracking-wider mb-2">
                        <FileCode size={12} />
                        Page Files
                      </div>
                      <div className="bg-dark-panel2 rounded-lg border border-dark-border overflow-hidden">
                        {inspectData.files.map((f, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between px-3 py-2 text-xs ${
                              i > 0 ? "border-t border-dark-border" : ""
                            }`}
                          >
                            <a
                              href={`/app/projects?file=${encodeURIComponent(pathname.replace("/app/", "app/app/") + "/" + f.name)}`}
                              className="text-cm-purple font-mono hover:underline cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                            >{f.name}</a>
                            <span className="text-dark-muted">
                              {typeof f.lines === "number" ? `${f.lines} lines` : f.lines}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* API Routes */}
                  {inspectData.apiRoutes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-dark-muted text-xs uppercase tracking-wider mb-2">
                        <Route size={12} />
                        API Routes
                      </div>
                      <div className="bg-dark-panel2 rounded-lg border border-dark-border p-3 space-y-1">
                        {inspectData.apiRoutes.map((r, i) => (
                          <div key={i} className="text-xs font-mono text-cm-purple">{r}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Source */}
                  {inspectData.dataSource && (
                    <div>
                      <div className="flex items-center gap-1.5 text-dark-muted text-xs uppercase tracking-wider mb-2">
                        <Database size={12} />
                        Data Source
                      </div>
                      <div className="bg-dark-panel2 rounded-lg border border-dark-border p-3">
                        <span className="text-xs font-mono text-dark-text">{inspectData.dataSource}</span>
                      </div>
                    </div>
                  )}

                  {/* Last Modified */}
                  {inspectData.lastModified && (
                    <div>
                      <div className="flex items-center gap-1.5 text-dark-muted text-xs uppercase tracking-wider mb-2">
                        <Clock size={12} />
                        Last Modified
                      </div>
                      <div className="text-xs text-dark-text">{formatDate(inspectData.lastModified)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
