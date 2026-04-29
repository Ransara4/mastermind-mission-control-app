"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { ContentItem } from "@/hooks/useLinkedInData";
import { PIPELINE_COLUMNS, CONTENT_TYPES } from "./shared";

export function ContentModal({
  item,
  initialStatus,
  hashtagSets,
  pillars,
  onSave,
  onClose,
}: {
  item?: ContentItem;
  initialStatus?: ContentItem["status"];
  hashtagSets: Record<string, string[]>;
  pillars?: string[];
  onSave: (data: Partial<ContentItem>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item?.title || "");
  const [body, setBody] = useState(item?.body || "");
  const [hook, setHook] = useState(item?.hook || "");
  const [cta, setCta] = useState(item?.cta || "");
  const [contentType, setContentType] = useState(
    item?.contentType || "text"
  );
  const [status, setStatus] = useState(
    item?.status || initialStatus || "idea"
  );
  const [pillar, setPillar] = useState(item?.pillar || "");
  const [hashtags, setHashtags] = useState<string[]>(item?.hashtags || []);
  const [hashtagInput, setHashtagInput] = useState("");
  const [targetAudience, setTargetAudience] = useState(
    item?.targetAudience || ""
  );
  const [notes, setNotes] = useState(item?.notes || "");
  const [scheduledFor, setScheduledFor] = useState(item?.scheduledFor || "");
  const [saving, setSaving] = useState(false);

  const charCount = body.length;
  const isLong = charCount > 3000;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title,
        body,
        hook,
        cta,
        contentType: contentType as ContentItem["contentType"],
        status: status as ContentItem["status"],
        pillar: pillar || undefined,
        hashtags,
        targetAudience,
        notes,
        scheduledFor: scheduledFor || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const addHashtag = (tag: string) => {
    const cleaned = tag.startsWith("#") ? tag : `#${tag}`;
    if (!hashtags.includes(cleaned)) {
      setHashtags([...hashtags, cleaned]);
    }
  };

  const addHashtagSet = (setName: string) => {
    const tags = hashtagSets[setName] || [];
    const newTags = tags.filter((t) => !hashtags.includes(t));
    setHashtags([...hashtags, ...newTags]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-bold  text-dark-text">
            {item ? "Edit Content" : "New Content"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-panel2"
          >
            <X size={20} className="text-dark-muted" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-dark-text mb-1 block">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              placeholder="Post title or topic"
            />
          </div>

          {/* Type + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-text mb-1 block">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentItem["contentType"])}
                className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-text mb-1 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentItem["status"])}
                className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              >
                {PIPELINE_COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Pillar */}
          {pillars && pillars.length > 0 && (
            <div>
              <label className="text-sm font-medium text-dark-text mb-1 block">
                Content Pillar
              </label>
              <select
                value={pillar}
                onChange={(e) => setPillar(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              >
                <option value="">No pillar</option>
                {pillars.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hook */}
          <div>
            <label className="text-sm font-medium text-dark-text mb-1 block">
              Hook / Opening Line
            </label>
            <input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              placeholder="The attention-grabbing first line"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium text-dark-text mb-1 flex items-center justify-between">
              <span>Post Body</span>
              <span
                className={`text-xs ${
                  isLong ? "text-dark-danger" : "text-dark-muted"
                }`}
              >
                {charCount} chars {isLong && "(long!)"}
              </span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm font-mono font-dm-mono resize-y"
              placeholder="Write your post content here..."
            />
          </div>

          {/* CTA */}
          <div>
            <label className="text-sm font-medium text-dark-text mb-1 block">
              Call to Action
            </label>
            <input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              placeholder="What should readers do? (comment, share, visit link...)"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-sm font-medium text-dark-text mb-1 block">
              Hashtags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-cm-purple/20 text-cm-purple px-2 py-1 rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() =>
                      setHashtags(hashtags.filter((_, j) => j !== i))
                    }
                    className="hover:text-dark-danger"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hashtagInput.trim()) {
                    e.preventDefault();
                    addHashtag(hashtagInput.trim());
                    setHashtagInput("");
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
                placeholder="Add hashtag (Enter to add)"
              />
            </div>
            {/* Quick-add sets */}
            {Object.keys(hashtagSets).length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-dark-muted">Quick add:</span>
                {Object.keys(hashtagSets).map((name) => (
                  <button
                    key={name}
                    onClick={() => addHashtagSet(name)}
                    className="text-xs text-cm-purple hover:text-cm-purple-mid hover:underline"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target Audience */}
          <div>
            <label className="text-sm font-medium text-dark-text mb-1 block">
              Target Audience
            </label>
            <input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              placeholder="Who is this for? (e.g., CTOs, developers, founders)"
            />
          </div>

          {/* Schedule */}
          {(status === "scheduled" || scheduledFor) && (
            <div>
              <label className="text-sm font-medium text-dark-text mb-1 block">
                Scheduled For
              </label>
              <input
                type="datetime-local"
                value={scheduledFor ? scheduledFor.slice(0, 16) : ""}
                onChange={(e) =>
                  setScheduledFor(
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : ""
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-dark-text mb-1 block">
              Internal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-dark-border focus:outline-none focus:ring-2 focus:ring-cm-purple text-sm resize-y"
              placeholder="Notes for yourself (not posted)"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-6 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {item ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
