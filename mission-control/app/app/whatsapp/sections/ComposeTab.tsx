"use client";

import { useRef } from "react";
import { AutocompleteResult, Config } from "./types";

interface AttachedFile {
  filePath: string;
  fileName: string;
  size: number;
  type: string;
}

interface ComposeTabProps {
  config: Config | null;
  sendTo: string;
  setSendTo: (v: string) => void;
  sendToName: string;
  setSendToName: (v: string) => void;
  sendMessage: string;
  setSendMessage: (v: string) => void;
  sending: boolean;
  sendResult: { ok: boolean; text: string } | null;
  attachedFile: AttachedFile | null;
  setAttachedFile: (f: AttachedFile | null) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  setSendResult: (r: { ok: boolean; text: string } | null) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  acQuery: string;
  setAcQuery: (v: string) => void;
  acResults: AutocompleteResult[];
  acLoading: boolean;
  acOpen: boolean;
  setAcOpen: (v: boolean) => void;
  acHighlight: number;
  setAcHighlight: (v: number | ((h: number) => number)) => void;
  acContainerRef: React.RefObject<HTMLDivElement | null>;
  handleAcInput: (val: string) => void;
  selectAcResult: (r: AutocompleteResult) => void;
  handleSend: () => void;
  handleFileUpload: (file: File) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ComposeTab({
  config,
  sendTo,
  setSendTo,
  sendToName,
  setSendToName,
  sendMessage,
  setSendMessage,
  sending,
  sendResult,
  attachedFile,
  setAttachedFile,
  uploading,
  dragOver,
  setDragOver,
  fileInputRef,
  acQuery,
  setAcQuery,
  acResults,
  acLoading,
  acOpen,
  setAcOpen,
  acHighlight,
  setAcHighlight,
  acContainerRef,
  handleAcInput,
  selectAcResult,
  handleSend,
  handleFileUpload,
}: ComposeTabProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Compose Message
        </h2>

        {/* Recipient — autocomplete by name */}
        <div className="mb-3" ref={acContainerRef}>
          <label className="block text-xs font-medium text-dark-muted mb-1">To</label>
          <div className="relative">
            {/* Selected contact chip */}
            {sendTo && sendToName && !acOpen && (
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-dark-success rounded-full" />
                  {sendToName}
                  <span className="text-cm-purple/70 text-xs font-mono ml-1">
                    {sendTo.replace(/@s\.whatsapp\.net$/, "").replace(/@lid$/, "")}
                  </span>
                  <button
                    onClick={() => {
                      setSendTo("");
                      setSendToName("");
                      setAcQuery("");
                    }}
                    className="ml-1 text-cm-purple hover:text-dark-text"
                  >
                    x
                  </button>
                </span>
              </div>
            )}

            {/* Search input */}
            {(!sendTo || acOpen) && (
              <>
                <input
                  type="text"
                  placeholder="Start typing a name..."
                  value={acQuery}
                  onChange={(e) => handleAcInput(e.target.value)}
                  onFocus={() => {
                    if (acResults.length > 0) setAcOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setAcHighlight((h) => Math.min(h + 1, acResults.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setAcHighlight((h) => Math.max(h - 1, 0));
                    } else if (e.key === "Enter" && acHighlight >= 0 && acResults[acHighlight]) {
                      e.preventDefault();
                      selectAcResult(acResults[acHighlight]);
                    } else if (e.key === "Escape") {
                      setAcOpen(false);
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
                  autoComplete="off"
                />
                {acLoading && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-cm-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            )}

            {/* Dropdown results */}
            {acOpen && acResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-dark-panel2 border border-dark-border rounded-lg shadow-lg shadow-black/30 max-h-64 overflow-y-auto">
                {acResults.map((r, i) => (
                  <button
                    key={`${r.jid}-${i}`}
                    onClick={() => selectAcResult(r)}
                    onMouseEnter={() => setAcHighlight(i)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                      i === acHighlight ? "bg-cm-purple/10" : "hover:bg-dark-panel"
                    } ${i > 0 ? "border-t border-dark-border" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-cm-purple/15 rounded-full flex items-center justify-center text-cm-purple font-semibold text-sm">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-dark-text">{r.name}</div>
                        <div className="text-xs text-dark-muted font-mono">
                          {r.phone.length > 6
                            ? `+${r.phone.replace(/^(\d{1,3})(\d+)(\d{4})$/, "$1 *** $3")}`
                            : r.phone}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        r.source === "whatsapp"
                          ? "bg-dark-success/20 text-dark-success"
                          : "bg-cm-purple/20 text-cm-purple"
                      }`}
                    >
                      {r.source === "whatsapp" ? "WA" : "Google"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {acOpen && acQuery.length >= 2 && acResults.length === 0 && !acLoading && (
              <div className="absolute z-50 w-full mt-1 bg-dark-panel2 border border-dark-border rounded-lg shadow-lg shadow-black/30 p-4 text-center">
                <p className="text-sm text-dark-muted">No contacts found for &ldquo;{acQuery}&rdquo;</p>
                <p className="text-xs text-dark-muted mt-1">You can also enter a phone number directly below</p>
              </div>
            )}
          </div>

          {/* Manual JID/phone fallback */}
          {!sendTo && acQuery.length >= 2 && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Or enter phone/JID manually: +1234567890"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm text-dark-muted bg-dark-panel2 focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-dark-muted mb-1">
            {attachedFile ? "Caption (optional)" : "Message"}
          </label>
          <textarea
            placeholder={attachedFile ? "Add a caption for the file..." : "Type your message..."}
            value={sendMessage}
            onChange={(e) => setSendMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple resize-y"
          />
        </div>

        {/* File attachment area */}
        <div className="mb-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {attachedFile ? (
            <div className="flex items-center gap-3 p-3 bg-cm-purple/10 border border-cm-purple/20 rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 bg-cm-purple/20 rounded-lg flex items-center justify-center">
                {attachedFile.type.startsWith("image/") ? (
                  <span className="text-lg">🖼</span>
                ) : attachedFile.type.startsWith("video/") ? (
                  <span className="text-lg">🎬</span>
                ) : attachedFile.type.startsWith("audio/") ? (
                  <span className="text-lg">🎵</span>
                ) : (
                  <span className="text-lg">📎</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-dark-text truncate">
                  {attachedFile.fileName}
                </div>
                <div className="text-xs text-dark-muted">
                  {formatFileSize(attachedFile.size)} &middot; {attachedFile.type || "unknown type"}
                </div>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="flex-shrink-0 p-1.5 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg transition-colors"
                title="Remove attachment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragOver
                  ? "border-cm-purple bg-cm-purple/10"
                  : "border-dark-border hover:border-dark-muted hover:bg-dark-panel2"
              } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-dark-panel2 rounded-lg flex items-center justify-center">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-cm-purple border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-dark-muted">
                  {uploading ? "Uploading..." : "Attach a file"}
                </div>
                <div className="text-xs text-dark-muted">
                  {uploading ? "Please wait" : "Click to browse or drag & drop"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick templates */}
        {(config?.templates?.length ?? 0) > 0 && !attachedFile && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-dark-muted mb-1">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {config!.templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSendMessage(t.text)}
                  className="px-3 py-1.5 bg-cm-purple/10 text-cm-purple border border-cm-purple/20 rounded-full text-xs font-medium hover:bg-cm-purple/20 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {(sendMessage || attachedFile) && (
          <div className="mb-3 p-3 bg-dark-panel2 rounded-lg border border-dark-border">
            <div className="text-xs font-medium text-dark-muted mb-1">Preview</div>
            {attachedFile && (
              <div className="text-xs text-cm-purple font-medium mb-1">
                📎 {attachedFile.fileName}
              </div>
            )}
            {sendMessage && (
              <div className="text-sm text-dark-text whitespace-pre-wrap">
                {sendMessage}
                {config?.signatureEnabled && (
                  <span className="text-dark-muted">
                    {(config.signature || "").replace(/^\n+/, "\n")}
                  </span>
                )}
              </div>
            )}
            {!sendMessage && config?.signatureEnabled && (
              <div className="text-sm text-dark-muted whitespace-pre-wrap">
                {(config.signature || "").replace(/^\n+/, "").trim()}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || uploading || !sendTo || (!sendMessage && !attachedFile)}
          className="w-full px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium bg-cm-purple hover:bg-cm-purple/80"
        >
          {sending
            ? "Sending..."
            : attachedFile
              ? `Send File${sendMessage ? " with Caption" : ""}`
              : "Send Message"}
        </button>

        {sendResult && (
          <p
            className={`mt-3 text-sm font-medium ${
              sendResult.ok ? "text-dark-success" : "text-dark-danger"
            }`}
          >
            {sendResult.ok ? "✓" : "✗"} {sendResult.text}
          </p>
        )}
      </div>
    </div>
  );
}
