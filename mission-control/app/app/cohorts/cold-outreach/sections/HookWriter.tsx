"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Save, X, Zap } from "lucide-react";
import { type ICP } from "@/hooks/useColdOutreachData";

export function HookWriter({
  selectedIcp,
  onSave,
  saving,
  saved,
  saveError,
  editCredibility,
  setEditCredibility,
  editBannedWords,
  setEditBannedWords,
  bannedWordInput,
  setBannedWordInput,
  editPromptTemplate,
  setEditPromptTemplate,
  editFormatRules,
  setEditFormatRules,
  newFormatKey,
  setNewFormatKey,
  newFormatValue,
  setNewFormatValue,
  editSubjectFormula,
  setEditSubjectFormula,
}: {
  selectedIcp: ICP;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
  editCredibility: string;
  setEditCredibility: (v: string) => void;
  editBannedWords: string[];
  setEditBannedWords: (v: string[]) => void;
  bannedWordInput: string;
  setBannedWordInput: (v: string) => void;
  editPromptTemplate: string;
  setEditPromptTemplate: (v: string) => void;
  editFormatRules: Record<string, string>;
  setEditFormatRules: (v: Record<string, string>) => void;
  newFormatKey: string;
  setNewFormatKey: (v: string) => void;
  newFormatValue: string;
  setNewFormatValue: (v: string) => void;
  editSubjectFormula: Record<string, unknown>;
  setEditSubjectFormula: (v: Record<string, unknown>) => void;
}) {
  const [promptExpanded, setPromptExpanded] = useState(false);

  const addBannedWord = () => {
    const w = bannedWordInput.trim();
    if (w && !editBannedWords.includes(w)) {
      setEditBannedWords([...editBannedWords, w]);
    }
    setBannedWordInput("");
  };

  const removeBannedWord = (word: string) => {
    setEditBannedWords(editBannedWords.filter((w) => w !== word));
  };

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold tracking-tight text-dark-text flex items-center gap-2">
          <Zap size={18} className="text-cm-purple" />
          Hook Writer
        </h3>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={14} />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>

      {saveError && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
          <AlertCircle size={14} className="flex-shrink-0" />
          {saveError}
        </div>
      )}

      <div className="space-y-4">
        {/* Track Context Panel */}
        {selectedIcp.hookTemplate?.track_hooks && Object.keys(selectedIcp.hookTemplate.track_hooks).length > 0 && (
          <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
            <h4 className="text-sm font-bold text-dark-text mb-2">Track Context</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(selectedIcp.hookTemplate.track_hooks).map(([key, track]) => (
                <div key={key} className="bg-dark-panel/80 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-cm-purple/20 text-cm-purple">
                      {key}
                    </span>
                    <span className="text-sm font-medium text-dark-text">{track.name}</span>
                  </div>
                  <p className="text-xs text-dark-muted">{track.angle}</p>
                  {track.key_framing && (
                    <p className="text-xs text-dark-muted mt-1">Framing: {track.key_framing}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credibility Block */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">Credibility Block</label>
          <textarea
            value={editCredibility}
            onChange={(e) => setEditCredibility(e.target.value)}
            className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-24 resize-y focus:outline-none focus:ring-2 focus:ring-cm-purple"
            placeholder="Your credibility statement..."
          />
        </div>

        {/* Format Rules */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">Format Rules</label>
          <div className="space-y-2">
            {Object.entries(editFormatRules).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark-muted min-w-[140px] bg-dark-bg px-2 py-1.5 rounded-l-lg border border-dark-border truncate">{key}</span>
                <input
                  value={val}
                  onChange={(e) => setEditFormatRules({ ...editFormatRules, [key]: e.target.value })}
                  className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
                <button
                  onClick={() => {
                    const next = { ...editFormatRules };
                    delete next[key];
                    setEditFormatRules(next);
                  }}
                  className="p-1 text-dark-danger/70 hover:text-dark-danger"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {Object.keys(editFormatRules).length === 0 && (
              <p className="text-xs text-dark-muted italic">No format rules</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newFormatKey}
                onChange={(e) => setNewFormatKey(e.target.value)}
                placeholder="Rule name..."
                className="w-36 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <input
                value={newFormatValue}
                onChange={(e) => setNewFormatValue(e.target.value)}
                placeholder="Rule value..."
                className="flex-1 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <button
                onClick={() => {
                  if (newFormatKey.trim()) {
                    setEditFormatRules({ ...editFormatRules, [newFormatKey.trim()]: newFormatValue.trim() });
                    setNewFormatKey("");
                    setNewFormatValue("");
                  }
                }}
                className="px-3 py-1.5 text-xs bg-cm-purple/20 text-cm-purple rounded-lg hover:bg-cm-purple/20"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Banned Words */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">Banned Words</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {editBannedWords.map((word) => (
              <span
                key={word}
                className="flex items-center gap-1 px-2 py-0.5 bg-dark-danger/10 text-dark-danger rounded-full text-xs"
              >
                {word}
                <button onClick={() => removeBannedWord(word)} className="hover:text-dark-danger">
                  <X size={10} />
                </button>
              </span>
            ))}
            {editBannedWords.length === 0 && (
              <span className="text-xs text-dark-muted italic">No banned words</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={bannedWordInput}
              onChange={(e) => setBannedWordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBannedWord();
                }
              }}
              placeholder="Add banned word..."
              className="flex-1 border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
            <button
              onClick={addBannedWord}
              className="px-3 py-1.5 text-xs bg-dark-danger/20 text-dark-danger rounded-lg hover:bg-dark-danger/20"
            >
              Add
            </button>
          </div>
        </div>

        {/* Subject Line Formula */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">Subject Line Formula</label>
          <div className="space-y-2">
            {Object.entries(editSubjectFormula).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark-muted min-w-[140px] bg-dark-bg px-2 py-1.5 rounded-l-lg border border-dark-border">{key}</span>
                {typeof val === "boolean" ? (
                  <label className="flex items-center gap-2 flex-1 px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.checked })}
                      className="rounded border-dark-border"
                    />
                    <span className="text-sm text-dark-muted">{val ? "Yes" : "No"}</span>
                  </label>
                ) : typeof val === "number" ? (
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: Number(e.target.value) })}
                    className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  />
                ) : Array.isArray(val) ? (
                  <input
                    value={val.join(", ")}
                    onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                    className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    placeholder="Comma-separated values"
                  />
                ) : (
                  <input
                    value={String(val)}
                    onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.value })}
                    className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  />
                )}
              </div>
            ))}
            {Object.keys(editSubjectFormula).length === 0 && (
              <p className="text-xs text-dark-muted italic">No subject line formula</p>
            )}
          </div>
        </div>

        {/* Prompt Template */}
        <div>
          <button
            onClick={() => setPromptExpanded(!promptExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-dark-text mb-1 hover:text-dark-text"
          >
            Prompt Template
            {promptExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {promptExpanded && (
            <textarea
              value={editPromptTemplate}
              onChange={(e) => setEditPromptTemplate(e.target.value)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-48 resize-y font-mono focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="Prompt template for hook generation..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
