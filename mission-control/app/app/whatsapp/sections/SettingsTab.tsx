"use client";

import { Config, Template } from "./types";

interface SettingsTabProps {
  config: Config | null;
  sigDraft: string;
  setSigDraft: (v: string) => void;
  sigEnabled: boolean;
  setSigEnabled: (v: boolean) => void;
  templateDraft: Template;
  setTemplateDraft: (d: Template | ((prev: Template) => Template)) => void;
  configSaving: boolean;
  saveSettings: () => void;
  addTemplate: () => void;
  deleteTemplate: (idx: number) => void;
}

export function SettingsTab({
  config,
  sigDraft,
  setSigDraft,
  sigEnabled,
  setSigEnabled,
  templateDraft,
  setTemplateDraft,
  configSaving,
  saveSettings,
  addTemplate,
  deleteTemplate,
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Signature settings */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Signature</h2>
        <div className="flex items-center gap-3 mb-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={sigEnabled}
              onChange={(e) => setSigEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-dark-panel2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-dark-panel after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-text after:border-dark-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cm-purple"></div>
          </label>
          <span className="text-sm font-medium text-dark-text">
            {sigEnabled ? "Signature enabled" : "Signature disabled"}
          </span>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-dark-muted mb-1">
            Signature Text
          </label>
          <textarea
            value={sigDraft}
            onChange={(e) => setSigDraft(e.target.value)}
            rows={3}
            placeholder="Enter your signature..."
            className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple font-mono font-dm-mono resize-y"
          />
          <p className="text-xs text-dark-muted mt-1">
            This is appended to every outgoing message. Use \n for line breaks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={configSaving}
            className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-medium"
          >
            {configSaving ? "Saving..." : "Save Signature"}
          </button>
          <button
            onClick={() => {
              setSigDraft("\n\n\u2014 Sent from your AI Agent");
            }}
            className="px-4 py-2 bg-dark-panel2 text-dark-muted rounded-lg hover:bg-dark-panel2 text-sm"
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* Message templates */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Message Templates</h2>
        {(config?.templates?.length ?? 0) > 0 && (
          <div className="space-y-2 mb-4">
            {config!.templates.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-dark-panel2 rounded-lg px-4 py-2.5"
              >
                <div>
                  <span className="text-sm font-medium text-dark-text">{t.label}</span>
                  <span className="text-dark-muted mx-2">&mdash;</span>
                  <span className="text-sm text-dark-muted">{t.text}</span>
                </div>
                <button
                  onClick={() => deleteTemplate(i)}
                  className="text-dark-danger hover:opacity-80 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Label (e.g. 'Thanks')"
            value={templateDraft.label}
            onChange={(e) =>
              setTemplateDraft((d) => ({ ...d, label: e.target.value }))
            }
            className="w-36 px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
          <input
            type="text"
            placeholder="Message text..."
            value={templateDraft.text}
            onChange={(e) =>
              setTemplateDraft((d) => ({ ...d, text: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && addTemplate()}
            className="flex-1 px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
          <button
            onClick={addTemplate}
            disabled={!templateDraft.label || !templateDraft.text}
            className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-medium"
          >
            Add Template
          </button>
        </div>
      </div>
    </div>
  );
}
