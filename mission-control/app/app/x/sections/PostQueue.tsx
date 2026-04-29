"use client";

import type { PostQueue as PostQueueType, PostDraft } from "@/lib/x-types";
import { Trash2, Clock, CheckCircle, AlertCircle, FileText, Send } from "lucide-react";
import { useState } from "react";

interface PostQueueProps {
  queue: PostQueueType;
  onUpdate: () => void;
}

export default function PostQueue({ queue, onUpdate }: PostQueueProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(draftId: string) {
    setDeleting(draftId);
    try {
      const res = await fetch("/api/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-draft", draftId }),
      });
      if (res.ok) onUpdate();
    } finally {
      setDeleting(null);
    }
  }

  const hasDrafts = queue.drafts.length > 0;
  const hasScheduled = queue.scheduled.length > 0;
  const hasPosted = queue.posted.length > 0;
  const isEmpty = !hasDrafts && !hasScheduled && !hasPosted;

  if (isEmpty) {
    return (
      <div className="text-center py-16">
        <FileText className="mx-auto text-dark-muted mb-3" size={48} />
        <h3 className="text-lg font-medium  text-dark-muted mb-1">No posts in queue</h3>
        <p className="text-sm text-dark-muted">
          Compose a post and save it as a draft to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Drafts */}
      {hasDrafts && (
        <Section title="Drafts" icon={<FileText size={16} />} count={queue.drafts.length}>
          {queue.drafts.map((draft) => (
            <PostCard
              key={draft.id}
              post={draft}
              onDelete={() => handleDelete(draft.id)}
              deleting={deleting === draft.id}
            />
          ))}
        </Section>
      )}

      {/* Scheduled */}
      {hasScheduled && (
        <Section title="Scheduled" icon={<Clock size={16} />} count={queue.scheduled.length}>
          {queue.scheduled.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </Section>
      )}

      {/* Posted */}
      {hasPosted && (
        <Section title="Posted" icon={<CheckCircle size={16} />} count={queue.posted.length}>
          {queue.posted.slice(0, 10).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-dark-muted">{icon}</span>
        <h3 className="text-sm font-semibold text-dark-text">{title}</h3>
        <span className="text-xs bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PostCard({
  post,
  onDelete,
  deleting,
}: {
  post: PostDraft;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-dark-panel2 text-dark-muted",
    scheduled: "bg-cm-purple/20 text-cm-purple",
    posted: "bg-dark-success/20 text-dark-success",
    failed: "bg-dark-danger/20 text-dark-danger",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <FileText size={12} />,
    scheduled: <Clock size={12} />,
    posted: <Send size={12} />,
    failed: <AlertCircle size={12} />,
  };

  return (
    <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusColors[post.status]}`}>
              {statusIcons[post.status]}
              {post.status}
            </span>
            <span className="text-xs text-dark-muted">
              {post.type === "thread" ? "Thread" : "Post"}
            </span>
            <span className="text-xs text-dark-muted">·</span>
            <span className="text-xs text-dark-muted">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-dark-text whitespace-pre-wrap line-clamp-3">
            {post.content}
          </p>
          {post.ruleViolations && post.ruleViolations.length > 0 && (
            <div className="mt-2 space-y-1">
              {post.ruleViolations.map((v, i) => (
                <p key={i} className="text-xs text-dark-warn flex items-center gap-1">
                  <AlertCircle size={10} /> {v}
                </p>
              ))}
            </div>
          )}
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
