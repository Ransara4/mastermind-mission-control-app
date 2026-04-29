"use client";

import { AlertCircle, CheckCircle, Loader2, Save, Tag, Users, X, XCircle } from "lucide-react";

export type TrackDef = { name: string; criteria: string; angle: string };

export function IcpTargetingProfile({
  // Save
  onSave,
  saving,
  saved,
  saveError,
  // Basic fields
  editName,
  setEditName,
  editIcpTag,
  setEditIcpTag,
  editDescription,
  setEditDescription,
  // Target profile
  editTargetProfile,
  setEditTargetProfile,
  newProfileKey,
  setNewProfileKey,
  newProfileValue,
  setNewProfileValue,
  // Niche categories
  editNicheCategories,
  setEditNicheCategories,
  nicheCategoryInput,
  setNicheCategoryInput,
  // Qualification rules
  editMustHave,
  setEditMustHave,
  mustHaveInput,
  setMustHaveInput,
  editDisqualifyIf,
  setEditDisqualifyIf,
  disqualifyIfInput,
  setDisqualifyIfInput,
  // Track definitions
  editTrackDefs,
  setEditTrackDefs,
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
  editName: string;
  setEditName: (v: string) => void;
  editIcpTag: string;
  setEditIcpTag: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editTargetProfile: Record<string, string>;
  setEditTargetProfile: (v: Record<string, string>) => void;
  newProfileKey: string;
  setNewProfileKey: (v: string) => void;
  newProfileValue: string;
  setNewProfileValue: (v: string) => void;
  editNicheCategories: string[];
  setEditNicheCategories: (v: string[]) => void;
  nicheCategoryInput: string;
  setNicheCategoryInput: (v: string) => void;
  editMustHave: string[];
  setEditMustHave: (v: string[]) => void;
  mustHaveInput: string;
  setMustHaveInput: (v: string) => void;
  editDisqualifyIf: string[];
  setEditDisqualifyIf: (v: string[]) => void;
  disqualifyIfInput: string;
  setDisqualifyIfInput: (v: string) => void;
  editTrackDefs: Record<string, TrackDef>;
  setEditTrackDefs: (v: Record<string, TrackDef>) => void;
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold tracking-tight text-dark-text flex items-center gap-2">
          <Users size={18} className="text-cm-purple" />
          ICP Targeting Profile
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
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">Name</label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
        </div>

        {/* ICP Tag */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            ICP Tag <span className="text-dark-muted font-normal">(underscore format, e.g. Coaches_Consultants)</span>
          </label>
          <input
            value={editIcpTag}
            onChange={(e) => setEditIcpTag(e.target.value.replace(/\s+/g, "_"))}
            className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cm-purple"
            placeholder="e.g. Coaches_Consultants"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">Description</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-20 resize-y focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
        </div>

        {/* Target Profile (editable key-value) */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">Target Profile</label>
          <div className="space-y-2">
            {Object.entries(editTargetProfile).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark-muted min-w-[140px] bg-dark-bg px-2 py-1.5 rounded-l-lg border border-dark-border">{key}</span>
                <input
                  value={val}
                  onChange={(e) => setEditTargetProfile({ ...editTargetProfile, [key]: e.target.value })}
                  className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
                <button
                  onClick={() => {
                    const next = { ...editTargetProfile };
                    delete next[key];
                    setEditTargetProfile(next);
                  }}
                  className="p-1 text-dark-danger/70 hover:text-dark-danger"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newProfileKey}
                onChange={(e) => setNewProfileKey(e.target.value)}
                placeholder="New key..."
                className="w-36 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <input
                value={newProfileValue}
                onChange={(e) => setNewProfileValue(e.target.value)}
                placeholder="Value..."
                className="flex-1 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <button
                onClick={() => {
                  if (newProfileKey.trim()) {
                    setEditTargetProfile({ ...editTargetProfile, [newProfileKey.trim()]: newProfileValue.trim() });
                    setNewProfileKey("");
                    setNewProfileValue("");
                  }
                }}
                className="px-3 py-1.5 text-xs bg-cm-purple/20 text-cm-purple rounded-lg hover:bg-cm-purple/20"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Niche Categories */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-1">
            Niche Categories <span className="text-dark-muted font-normal">({editNicheCategories.length})</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {editNicheCategories.map((cat, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 px-2.5 py-1 bg-cm-purple/10 text-cm-purple rounded-full text-xs font-medium"
              >
                <Tag size={10} />
                {cat}
                <button
                  onClick={() => setEditNicheCategories(editNicheCategories.filter((_, i) => i !== idx))}
                  className="hover:text-dark-danger ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {editNicheCategories.length === 0 && (
              <span className="text-xs text-dark-muted italic">No niches defined</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={nicheCategoryInput}
              onChange={(e) => setNicheCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = nicheCategoryInput.trim();
                  if (val && !editNicheCategories.includes(val)) {
                    setEditNicheCategories([...editNicheCategories, val]);
                  }
                  setNicheCategoryInput("");
                }
              }}
              placeholder="Add niche category..."
              className="flex-1 border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
            <button
              onClick={() => {
                const val = nicheCategoryInput.trim();
                if (val && !editNicheCategories.includes(val)) {
                  setEditNicheCategories([...editNicheCategories, val]);
                }
                setNicheCategoryInput("");
              }}
              className="px-3 py-1.5 text-xs bg-cm-purple/20 text-cm-purple rounded-lg hover:bg-cm-purple/20"
            >
              Add
            </button>
          </div>
        </div>

        {/* Qualification Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Must Have */}
          <div>
            <label className="block text-sm font-medium text-dark-success mb-1">Must Have</label>
            <ul className="space-y-1 mb-2">
              {editMustHave.map((rule, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-dark-muted group">
                  <CheckCircle size={14} className="text-dark-success mt-0.5 flex-shrink-0" />
                  <input
                    value={rule}
                    onChange={(e) => {
                      const next = [...editMustHave];
                      next[i] = e.target.value;
                      setEditMustHave(next);
                    }}
                    className="flex-1 bg-transparent border-b border-transparent hover:border-cm-purple/30 focus:border-cm-purple focus:outline-none py-0.5 text-sm"
                  />
                  <button
                    onClick={() => setEditMustHave(editMustHave.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-dark-danger/70 hover:text-dark-danger"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
              {editMustHave.length === 0 && (
                <li className="text-xs text-dark-muted italic">None defined</li>
              )}
            </ul>
            <div className="flex gap-2">
              <input
                value={mustHaveInput}
                onChange={(e) => setMustHaveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (mustHaveInput.trim()) {
                      setEditMustHave([...editMustHave, mustHaveInput.trim()]);
                      setMustHaveInput("");
                    }
                  }
                }}
                placeholder="Add rule..."
                className="flex-1 border border-dark-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <button
                onClick={() => {
                  if (mustHaveInput.trim()) {
                    setEditMustHave([...editMustHave, mustHaveInput.trim()]);
                    setMustHaveInput("");
                  }
                }}
                className="px-2 py-1 text-xs bg-dark-success/20 text-dark-success rounded-lg hover:bg-dark-success/20"
              >
                Add
              </button>
            </div>
          </div>

          {/* Disqualify If */}
          <div>
            <label className="block text-sm font-medium text-dark-danger mb-1">Disqualify If</label>
            <ul className="space-y-1 mb-2">
              {editDisqualifyIf.map((rule, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-dark-muted group">
                  <XCircle size={14} className="text-dark-danger mt-0.5 flex-shrink-0" />
                  <input
                    value={rule}
                    onChange={(e) => {
                      const next = [...editDisqualifyIf];
                      next[i] = e.target.value;
                      setEditDisqualifyIf(next);
                    }}
                    className="flex-1 bg-transparent border-b border-transparent hover:border-cm-purple/30 focus:border-cm-purple focus:outline-none py-0.5 text-sm"
                  />
                  <button
                    onClick={() => setEditDisqualifyIf(editDisqualifyIf.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-dark-danger/70 hover:text-dark-danger"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
              {editDisqualifyIf.length === 0 && (
                <li className="text-xs text-dark-muted italic">None defined</li>
              )}
            </ul>
            <div className="flex gap-2">
              <input
                value={disqualifyIfInput}
                onChange={(e) => setDisqualifyIfInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (disqualifyIfInput.trim()) {
                      setEditDisqualifyIf([...editDisqualifyIf, disqualifyIfInput.trim()]);
                      setDisqualifyIfInput("");
                    }
                  }
                }}
                placeholder="Add rule..."
                className="flex-1 border border-dark-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <button
                onClick={() => {
                  if (disqualifyIfInput.trim()) {
                    setEditDisqualifyIf([...editDisqualifyIf, disqualifyIfInput.trim()]);
                    setDisqualifyIfInput("");
                  }
                }}
                className="px-2 py-1 text-xs bg-dark-danger/20 text-dark-danger rounded-lg hover:bg-dark-danger/20"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Track Definitions */}
        <div>
          <label className="block text-sm font-medium text-dark-text mb-2">Track Definitions</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(editTrackDefs).map(([trackKey, track]) => (
              <div key={trackKey} className="bg-dark-bg rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-cm-purple/20 text-cm-purple">
                    {trackKey}
                  </span>
                  <input
                    value={track.name}
                    onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, name: e.target.value } })}
                    className="flex-1 text-sm font-semibold bg-transparent border-b border-transparent hover:border-cm-purple/30 focus:border-cm-purple focus:outline-none"
                    placeholder="Track name"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-muted">Criteria</label>
                  <input
                    value={track.criteria}
                    onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, criteria: e.target.value } })}
                    className="w-full text-xs bg-dark-panel border border-dark-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-muted">Angle</label>
                  <input
                    value={track.angle}
                    onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, angle: e.target.value } })}
                    className="w-full text-xs bg-dark-panel border border-dark-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                  />
                </div>
              </div>
            ))}
          </div>
          {Object.keys(editTrackDefs).length === 0 && (
            <p className="text-xs text-dark-muted italic">No tracks defined</p>
          )}
        </div>
      </div>
    </div>
  );
}
