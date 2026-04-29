"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { type ICP, type HookTemplate } from "@/hooks/useColdOutreachData";

export function CreateIcpModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Partial<ICP> & { hook_template?: Partial<HookTemplate> }) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const slugify = (s: string) =>
    "icp_" +
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30);

  const id = slugify(name || "new");
  const [icpTag, setIcpTag] = useState("");
  const [tagManuallyEdited, setTagManuallyEdited] = useState(false);
  const effectiveTag = tagManuallyEdited ? icpTag : id;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setCreateError(null);
    try {
      await onCreate({
        id,
        name: name.trim(),
        description: description.trim(),
        icp_tag: effectiveTag,
        target_profile: {},
        niche_categories: [],
        qualification_rules: { must_have: [], disqualify_if: [] },
        track_definitions: {},
        hook_template_id: `${id}_hook`,
        status: "active",
        hook_template: {
          template_id: `${id}_hook`,
          template_name: `${name.trim()} Hook Template`,
          credibility_block: "",
          format_rules: {},
          banned_words: [],
          subject_line_formula: {},
          track_hooks: {},
          prompt_template: "",
          output_schema: {},
        },
      });
      onClose();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create ICP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-dark-panel rounded-xl border border-dark-border shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight text-dark-text">Create New ICP</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-dark-panel2">
            <X size={18} className="text-dark-muted" />
          </button>
        </div>

        {createError && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
            <AlertCircle size={14} className="flex-shrink-0" />
            {createError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="e.g. Coaching Business Owners"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              ICP ID <span className="text-dark-muted font-normal">(auto-generated)</span>
            </label>
            <input
              value={id}
              readOnly
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm bg-dark-bg text-dark-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              ICP Tag <span className="text-dark-muted font-normal">(for Google Sheet tagging)</span>
            </label>
            <input
              value={effectiveTag}
              onChange={(e) => { setIcpTag(e.target.value); setTagManuallyEdited(true); }}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="e.g. icp_coaching_owners"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-20 resize-y focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="Describe this ICP..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted rounded-lg hover:bg-dark-panel2"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "Creating..." : "Create ICP"}
          </button>
        </div>
      </div>
    </div>
  );
}
