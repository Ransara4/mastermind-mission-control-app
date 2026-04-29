"use client";

import { useState } from "react";
import type { PostingRules } from "@/lib/x-types";
import { Send, Save, AlertCircle, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";

interface PostComposerProps {
  rules: PostingRules;
  onSave: () => void;
}

export default function PostComposer({ rules, onSave }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"tweet" | "thread">("tweet");
  const [threadParts, setThreadParts] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const charCount = postType === "tweet" ? content.length : 0;
  const charLimit = 280;
  const hashtags = (content || "").match(/#\w+/g) || [];
  const violations = getViolations(
    postType === "tweet" ? content : threadParts.join("\n"),
    rules
  );

  async function handleSaveDraft() {
    setSaving(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = {
        action: "save-draft",
        content: postType === "tweet" ? content : threadParts.join("\n---\n"),
        type: postType,
      };
      if (postType === "thread") body.threadParts = threadParts;

      const res = await fetch("/api/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save draft");

      setFeedback({ type: "success", message: "Draft saved!" });
      setContent("");
      setThreadParts([""]);
      onSave();
    } catch {
      setFeedback({ type: "error", message: "Failed to save draft" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Post Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setPostType("tweet")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            postType === "tweet"
              ? "bg-cm-purple text-white"
              : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
          }`}
        >
          Single Post
        </button>
        <button
          onClick={() => setPostType("thread")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            postType === "thread"
              ? "bg-cm-purple text-white"
              : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
          }`}
        >
          Thread
        </button>
      </div>

      {/* Composer */}
      <div className="bg-dark-panel border border-dark-border rounded-lg overflow-hidden">
        {postType === "tweet" ? (
          <div className="p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full h-32 resize-none text-sm text-dark-text placeholder:text-dark-muted focus:outline-none"
            />
            <div className="flex items-center justify-between pt-3 border-t border-dark-border">
              <div className="flex items-center gap-3 text-xs">
                <span className={charCount > charLimit ? "text-dark-danger font-medium" : "text-dark-muted"}>
                  {charCount}/{charLimit}
                </span>
                {hashtags.length > 0 && (
                  <span className={hashtags.length > (rules.formatting?.maxHashtags || 2) ? "text-dark-warn" : "text-dark-muted"}>
                    {hashtags.length} hashtag{hashtags.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {threadParts.map((part, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="flex flex-col items-center pt-3">
                  <span className="w-6 h-6 bg-cm-purple text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {idx + 1}
                  </span>
                  {idx < threadParts.length - 1 && (
                    <div className="w-0.5 flex-1 bg-dark-panel2 mt-1" />
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={part}
                    onChange={(e) => {
                      const updated = [...threadParts];
                      updated[idx] = e.target.value;
                      setThreadParts(updated);
                    }}
                    placeholder={idx === 0 ? "Start your thread..." : "Continue..."}
                    className="w-full h-20 resize-none text-sm text-dark-text placeholder:text-dark-muted focus:outline-none border border-dark-border rounded-lg p-3"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs ${part.length > charLimit ? "text-dark-danger" : "text-dark-muted"}`}>
                      {part.length}/{charLimit}
                    </span>
                    {threadParts.length > 1 && (
                      <button
                        onClick={() => setThreadParts(threadParts.filter((_, i) => i !== idx))}
                        className="text-xs text-dark-muted hover:text-dark-danger flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {threadParts.length < (rules.formatting?.maxThreadLength || 7) && (
              <button
                onClick={() => setThreadParts([...threadParts, ""])}
                className="flex items-center gap-1.5 text-sm text-cm-purple hover:text-cm-purple ml-8"
              >
                <Plus size={14} /> Add tweet to thread
              </button>
            )}
            <p className="text-xs text-dark-muted ml-8">
              Max {rules.formatting?.maxThreadLength || 7} tweets per thread
            </p>
          </div>
        )}
      </div>

      {/* Rule Violations */}
      {violations.length > 0 && (
        <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-3 space-y-1">
          {violations.map((v, i) => (
            <p key={i} className="text-xs text-dark-warn flex items-center gap-1.5">
              <AlertCircle size={12} /> {v}
            </p>
          ))}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          feedback.type === "success" ? "bg-dark-success/10 text-dark-success" : "bg-dark-danger/10 text-dark-danger"
        }`}>
          {feedback.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {feedback.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveDraft}
          disabled={saving || (!content.trim() && !threadParts.some(p => p.trim()))}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-dark-panel2 hover:bg-dark-panel2 text-dark-text rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          Save Draft
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cm-purple text-white rounded-lg opacity-50 cursor-not-allowed"
          title="Connect X account to post"
        >
          <Send size={14} />
          Post Now
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-dark-panel2 text-dark-muted rounded-lg cursor-not-allowed"
          title="Connect X account to schedule"
        >
          <Clock size={14} />
          Schedule
        </button>
        <span className="text-xs text-dark-muted ml-auto">
          Post & Schedule require X authentication
        </span>
      </div>

      {/* Voice Guidelines */}
      <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-dark-text mb-2">Voice Guidelines</h4>
        <p className="text-xs text-dark-muted mb-2">{rules.voice?.personality}</p>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-dark-muted">Tone: <span className="font-medium text-dark-text">{rules.voice?.tone}</span></span>
          <span className="text-dark-muted">|</span>
          <span className="text-xs text-dark-muted">Avoid: {rules.voice?.avoid?.map((a, i) => (
            <span key={i} className="inline-block bg-dark-danger/10 text-dark-danger px-1.5 py-0.5 rounded text-xs ml-1">{a}</span>
          ))}</span>
        </div>
      </div>
    </div>
  );
}

function getViolations(content: string, rules: PostingRules): string[] {
  const violations: string[] = [];
  if (!content.trim()) return violations;

  if (content.length > 280) {
    violations.push(`Exceeds 280 character limit (${content.length} chars)`);
  }

  const hashtags = content.match(/#\w+/g) || [];
  if (hashtags.length > (rules.formatting?.maxHashtags || 2)) {
    violations.push(`Too many hashtags: ${hashtags.length}/${rules.formatting?.maxHashtags || 2}`);
  }

  const bait = ["like if you agree", "retweet if", "follow for more", "drop a", "comment below"];
  const lower = content.toLowerCase();
  for (const phrase of bait) {
    if (lower.includes(phrase)) {
      violations.push(`Engagement bait: "${phrase}"`);
    }
  }

  return violations;
}
