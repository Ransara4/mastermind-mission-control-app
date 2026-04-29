"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, FileText, X } from "lucide-react";

interface ResearchFile {
  filename: string;
  title: string;
  created_at: string;
  modified_at: string;
  preview: string;
}

type SendChannel = "email" | "whatsapp" | "telegram";

function formatFileDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface ResearchTabProps {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  whatsappJid?: string;
  telegramChatId?: string;
}

export function ResearchTab({
  clientId,
  clientName,
  clientEmail,
  whatsappJid,
  telegramChatId,
}: ResearchTabProps) {
  const [files, setFiles] = useState<ResearchFile[]>([]);
  const [loadingResearch, setLoadingResearch] = useState(true);
  const [researchError, setResearchError] = useState<string | null>(null);

  // Modal: view/edit
  const [openFile, setOpenFile] = useState<{ filename: string; content: string } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Send
  const [sendChannel, setSendChannel] = useState<SendChannel>("email");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadFiles = useCallback(async () => {
    setLoadingResearch(true);
    setResearchError(null);
    try {
      const res = await fetch(`/api/mentorships/${clientId}/research`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setResearchError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoadingResearch(false);
    }
  }, [clientId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  async function openRow(filename: string) {
    setLoadingFile(true);
    setOpenFile(null);
    setEditMode(false);
    setCopied(false);
    setSendResult(null);
    try {
      const res = await fetch(`/api/mentorships/${clientId}/research?file=${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOpenFile({ filename: data.filename, content: data.content });
      setEditContent(data.content);
    } catch (err) {
      setResearchError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoadingFile(false);
    }
  }

  function closeModal() {
    setOpenFile(null);
    setEditMode(false);
    setSendResult(null);
  }

  async function saveEdit() {
    if (!openFile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mentorships/${clientId}/research`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: openFile.filename, content: editContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpenFile({ ...openFile, content: editContent });
      setEditMode(false);
      loadFiles();
    } catch (err) {
      setResearchError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  function copyContent(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  async function sendToClient(createPdf: boolean) {
    if (!openFile) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/mentorships/${clientId}/research/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: openFile.filename, channel: sendChannel, create_pdf: createPdf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const dest = data.sent_to ? ` to ${data.sent_to}` : "";
      setSendResult({ ok: true, message: `Sent via ${sendChannel}${dest}` });
    } catch (err) {
      setSendResult({ ok: false, message: String(err instanceof Error ? err.message : err) });
    } finally {
      setSending(false);
    }
  }

  const channelAvailable: Record<SendChannel, boolean> = {
    email: !!clientEmail,
    whatsapp: !!whatsappJid,
    telegram: !!telegramChatId,
  };

  if (loadingResearch) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-cm-purple" />
      </div>
    );
  }

  if (researchError) {
    return (
      <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-4 py-3">
        <AlertCircle size={16} />{researchError}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-12 flex flex-col items-center gap-3 text-dark-muted">
          <FileText size={40} />
          <p className="text-sm">No research files yet. Research saved to this client&apos;s folder will appear here.</p>
        </div>
      ) : (
        <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-panel2">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-dark-muted uppercase tracking-wide">File</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-dark-muted uppercase tracking-wide w-32">Modified</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr
                  key={f.filename}
                  className={`border-b border-dark-border/50 hover:bg-cm-purple/5 transition-colors ${i === files.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-cm-purple flex-shrink-0" />
                      <span className="font-medium text-dark-text">{f.title}</span>
                    </div>
                    {f.preview && (
                      <p className="mt-0.5 ml-5 text-xs text-dark-muted line-clamp-1">{f.preview}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-dark-muted whitespace-nowrap">{formatFileDate(f.modified_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openRow(f.filename)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-semibold hover:bg-cm-purple-mid transition-colors"
                    >
                      <FileText size={11} />Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File View/Edit Modal */}
      {(openFile || loadingFile) && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => { if (!editMode) closeModal(); }}
        >
          <div
            className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/50 w-full max-w-5xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-cm-purple flex-shrink-0" />
                <h2 className="text-base font-semibold tracking-tight text-dark-text truncate">
                  {openFile ? openFile.filename.replace(/\.md$/, "") : "Loading..."}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {openFile && !editMode && (
                  <>
                    <button
                      onClick={() => copyContent(openFile.content)}
                      className="px-3 py-1.5 text-xs font-semibold text-dark-muted bg-dark-panel2 border border-dark-border rounded-lg hover:text-dark-text transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => { setEditMode(true); setEditContent(openFile.content); }}
                      className="px-3 py-1.5 text-xs font-semibold text-cm-purple bg-cm-purple/10 border border-cm-purple/30 rounded-lg hover:bg-cm-purple/20 transition-colors"
                    >
                      Edit
                    </button>
                  </>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-dark-muted hover:text-dark-text transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-semibold hover:bg-cm-purple-mid disabled:opacity-50 transition-colors"
                    >
                      {saving && <Loader2 size={12} className="animate-spin" />}
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
                <button onClick={closeModal} className="text-dark-muted hover:text-dark-text ml-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loadingFile && !openFile ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-cm-purple" />
                </div>
              ) : editMode ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[300px] border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text bg-dark-panel2 focus:outline-none focus:ring-2 focus:ring-cm-purple resize-y font-mono"
                />
              ) : (
                openFile && (
                  <pre className="text-sm text-dark-muted leading-relaxed whitespace-pre-wrap font-sans">{openFile.content}</pre>
                )
              )}
            </div>

            {/* Send Footer */}
            {openFile && !editMode && (
              <div className="flex-shrink-0 border-t border-dark-border px-6 py-4 bg-dark-panel2 rounded-b-2xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-dark-muted uppercase tracking-wide">Send to {clientName.split(" ")[0]}</span>
                  <select
                    value={sendChannel}
                    onChange={(e) => { setSendChannel(e.target.value as SendChannel); setSendResult(null); }}
                    className="px-3 py-1.5 bg-dark-panel border border-dark-border rounded-lg text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple"
                  >
                    <option value="email" disabled={!channelAvailable.email}>Email{!channelAvailable.email ? " (not set)" : ""}</option>
                    <option value="whatsapp" disabled={!channelAvailable.whatsapp}>WhatsApp{!channelAvailable.whatsapp ? " (not set)" : ""}</option>
                    <option value="telegram" disabled={!channelAvailable.telegram}>Telegram{!channelAvailable.telegram ? " (not set)" : ""}</option>
                  </select>
                  <button
                    onClick={() => sendToClient(false)}
                    disabled={sending || !channelAvailable[sendChannel]}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-semibold hover:bg-cm-purple-mid disabled:opacity-50 transition-colors"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : null}
                    {sending ? "Sending..." : "Send"}
                  </button>
                  <button
                    onClick={() => sendToClient(true)}
                    disabled={sending || !channelAvailable[sendChannel]}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-dark-panel border border-dark-border text-dark-muted rounded-lg text-xs font-semibold hover:text-dark-text disabled:opacity-50 transition-colors"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : null}
                    {sending ? "Generating PDF..." : "Create PDF & Send"}
                  </button>
                  {sendResult && (
                    <span className={`text-xs font-medium ${sendResult.ok ? "text-dark-success" : "text-dark-danger"}`}>
                      {sendResult.ok ? "✓ " : "✗ "}{sendResult.message}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
