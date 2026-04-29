"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  RotateCcw,
  Trash2,
  ExternalLink,
  X,
  ChevronDown,
  ImageOff,
  Sparkles,
  Save,
  TrendingUp,
  BarChart2,
  FileText,
  Tag,
  Clock,
  Globe,
  Plus,
  Pencil,
  Check,
  Settings2,
  Image,
} from "lucide-react";
import { useCelebration } from "../../../../components/CelebrationBurst";
import { useCohortData, BlogPost } from "@/hooks/useCohortData";
import WebsiteSwitcher from "@/components/WebsiteSwitcher";
import { useWebsites } from "@/hooks/useWebsites";

const STATUS_OPTIONS = ["all", "needs_review", "queued", "published", "rejected"];
const STATUS_LABELS: Record<string, string> = {
  needs_review: "Needs Review",
  queued: "Queued",
  published: "Published",
  rejected: "Rejected",
};
const PILLAR_OPTIONS = ["all", "Lead Generation", "Systems & Operations", "Automation & AI", "Mindset & Growth"];


function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    needs_review: "bg-[#FCF4EB] text-[#7C69C7] border border-[#7C69C7]/30",
    queued: "bg-cm-purple/20 text-cm-purple",
    published: "bg-dark-success/20 text-dark-success",
    rejected: "bg-dark-danger/20 text-dark-danger",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || "bg-dark-panel2 text-dark-muted"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function QualityBadge({ score }: { score: number | null }) {
  if (!score) return null;
  const color = "bg-[#7C69C7]/15 text-[#7C69C7]";
  return <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>{score}/10</span>;
}


function PreviewModal({ post: initialPost, onClose, onRefresh, onQueue, onReject, onPublish, onAdvance }: {
  post: BlogPost;
  onClose: () => void;
  onRefresh: () => Promise<BlogPost | null>;
  onQueue: (id: number) => Promise<void>;
  onReject: (id: number, reason: string) => Promise<void>;
  onPublish: (id: number) => Promise<void>;
  onAdvance?: () => void;
}) {
  const [post, setPost] = useState(() => {
    // Pre-load stored cover image options so they show without manual search
    let storedPhotos: any[] | undefined;
    try {
      const raw = (initialPost as any).cover_image_options;
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) storedPhotos = parsed;
      }
    } catch { /* ignore parse errors */ }
    return storedPhotos ? { ...initialPost, _previewPhotos: storedPhotos } : initialPost;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [justQueued, setJustQueued] = useState(false);
  useEffect(() => { setJustQueued(false); }, [initialPost.id]);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [triggerCelebration, CelebrationLayer] = useCelebration();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [draft, setDraft] = useState({ title: "", content_markdown: "", seo_title: "", seo_description: "", seo_keywords: "", image_keywords: "" });
  const [imageKeywords, setImageKeywords] = useState(initialPost.image_keywords || "");
  const [imageSearching, setImageSearching] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(500);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(500);

  const startEdit = () => {
    setDraft({
      title: post.title || "",
      content_markdown: post.content_markdown || "",
      seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
      seo_keywords: post.seo_keywords || "",
      image_keywords: post.image_keywords || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const wordCount = draft.content_markdown.split(/\s+/).filter(Boolean).length;
      await fetch("/api/cohorts/blog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, ...draft, word_count: wordCount }),
      });
      setPost((p) => ({ ...p, ...draft, word_count: wordCount }));
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };


  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updated = await onRefresh();
      if (updated) setPost(updated);
    } finally {
      setRefreshing(false);
    }
  };

  const handleQueue = async (e: React.MouseEvent) => {
    setActionLoading(true);
    try {
      await onQueue(post.id);
      triggerCelebration(e);
      setJustQueued(true);
      // Brief pause so the button label change is visible before advancing
      await new Promise(res => setTimeout(res, 900));
      if (onAdvance) {
        onAdvance();
      } else {
        const updated = await onRefresh();
        if (updated) setPost(updated);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await onReject(post.id, rejectReason);
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      await onPublish(post.id);
      const updated = await onRefresh();
      if (updated) setPost(updated);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <CelebrationLayer />
      <div className="bg-dark-panel rounded-xl w-[95vw] max-w-[1600px] max-h-[94vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {editing ? (
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="text-lg font-bold text-dark-text border border-cm-purple rounded-lg px-2 py-0.5 flex-1 focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            ) : (
              <h3 className="text-lg font-semibold tracking-tight text-dark-text truncate">{post.title}</h3>
            )}
            <StatusBadge status={post.status} />
            {savedFlash && <span className="text-xs text-dark-success flex items-center gap-1"><Check size={12} /> Saved</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {editing ? (
              <>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
                <button onClick={cancelEdit} className="px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:border-cm-purple/30">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:border-cm-purple hover:text-cm-purple transition-all"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-dark-panel2 rounded-lg text-dark-muted hover:text-dark-muted disabled:opacity-50"
                  title="Refresh content"
                >
                  <RotateCcw size={16} className={refreshing ? "animate-spin" : ""} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1 hover:bg-dark-panel2 rounded-lg"><X size={20} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="flex h-full">
            {/* Content area */}
            <div className="flex-1 p-6">
              {editing ? (
                <textarea
                  value={draft.content_markdown}
                  onChange={(e) => setDraft((d) => ({ ...d, content_markdown: e.target.value }))}
                  className="w-full h-full min-h-[400px] text-sm text-dark-text bg-dark-panel2 font-mono border border-dark-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cm-purple resize-none"
                  spellCheck={false}
                />
              ) : (
                <div className="prose prose-sm prose-invert max-w-none prose-headings:text-dark-text prose-p:text-dark-muted prose-strong:text-dark-text prose-code:text-cm-purple prose-code:bg-cm-purple/10 prose-a:text-cm-purple prose-blockquote:border-l-cm-purple prose-blockquote:text-dark-muted prose-hr:border-dark-border">
                  {post.content_markdown ? (
                    <pre className="whitespace-pre-wrap text-sm text-dark-text font-sans">{post.content_markdown}</pre>
                  ) : (
                    <p className="text-dark-muted italic">No content available</p>
                  )}
                </div>
              )}
            </div>

            {/* Drag-to-resize handle */}
            <div
              className="w-1 cursor-col-resize bg-dark-panel2 hover:bg-violet-400 active:bg-violet-500/100 transition-colors shrink-0"
              onMouseDown={(e) => {
                isDragging.current = true;
                dragStartX.current = e.clientX;
                dragStartWidth.current = rightPanelWidth;
                const onMove = (ev: MouseEvent) => {
                  if (!isDragging.current) return;
                  const delta = dragStartX.current - ev.clientX;
                  setRightPanelWidth(Math.min(900, Math.max(320, dragStartWidth.current + delta)));
                };
                const onUp = () => {
                  isDragging.current = false;
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            />

            {/* Right panel — metadata + image picker */}
            <div className="border-l-0 border-dark-border flex flex-col bg-dark-bg min-h-0 shrink-0" style={{ width: rightPanelWidth }}>

              {/* ── Image section (scrollable, takes most of the space) ── */}
              <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">

                {/* Current cover */}
                <div>
                  <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Image size={11} /> Cover Image
                  </p>
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt="Cover" className="w-full rounded-lg border border-dark-border object-cover" style={{ maxHeight: 280 }} />
                  ) : (
                    <div className="w-full rounded-lg border-2 border-dashed border-dark-border flex items-center justify-center text-dark-muted text-xs" style={{ height: 160 }}>No cover selected</div>
                  )}
                </div>

                {/* Keywords + search */}
                <div>
                  <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">Image Keywords</p>
                  <input
                    value={imageKeywords}
                    onChange={(e) => setImageKeywords(e.target.value)}
                    placeholder="e.g. entrepreneur laptop morning light"
                    className="w-full border border-dark-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cm-purple mb-2 bg-dark-panel"
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      if (!val || val === (post.image_keywords || "")) return;
                      await fetch("/api/cohorts/blog", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: post.id, image_keywords: val }),
                      });
                      setPost((p) => ({ ...p, image_keywords: val }));
                      if (editing) setDraft((d) => ({ ...d, image_keywords: val }));
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                  <button
                    disabled={imageSearching || !imageKeywords.trim()}
                    onClick={async () => {
                      const kw = imageKeywords.trim();
                      if (!kw) return;
                      // Save keywords if changed
                      if (kw !== (post.image_keywords || "")) {
                        await fetch("/api/cohorts/blog", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: post.id, image_keywords: kw }),
                        });
                        setPost((p) => ({ ...p, image_keywords: kw }));
                      }
                      setImageSearching(true);
                      setLastQuery(null);
                      try {
                        const res = await fetch("/api/cohorts/blog/regenerate-image", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: post.id, keywords: kw }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setLastQuery(data.query || kw);
                          setPost((p) => ({ ...p, _previewPhotos: data.photos?.length > 0 ? data.photos : (p as any)._previewPhotos }));
                        }
                      } finally {
                        setImageSearching(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {imageSearching ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    {imageSearching ? "Searching…" : "Find Cover Images"}
                  </button>
                  {lastQuery && (
                    <p className="text-[10px] text-dark-muted mt-1 truncate" title={lastQuery}>Searched: {lastQuery}</p>
                  )}
                </div>

                {/* Image grid — scrollable */}
                {(post as any)._previewPhotos && (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-2">
                      {(post as any)._previewPhotos.length} Results — click to select
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {(post as any)._previewPhotos.map((photo: any, i: number) => {
                        const sourceBadge: Record<string, string> = {
                          Pexels: "bg-dark-success/20 text-dark-success",
                          Unsplash: "bg-sky-500/20 text-sky-300",
                          Web: "bg-dark-warn/20 text-dark-warn",
                        };
                        const badgeClass = sourceBadge[photo.source] || "bg-dark-panel2 text-dark-muted";
                        return (
                          <div key={i} className="group rounded-lg overflow-hidden border border-dark-border bg-dark-panel hover:border-cm-purple hover:shadow-sm transition-all cursor-pointer"
                            onClick={async () => {
                              const res = await fetch("/api/cohorts/blog/set-cover", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  id: post.id,
                                  imageUrl: photo.url,
                                  source: photo.source,
                                  photographer: photo.photographer,
                                  sourceUrl: photo.sourceUrl,
                                  downloadLocation: photo.downloadLocation,
                                }),
                              });
                              if (res.ok) {
                                setPost((p) => ({ ...p, cover_image_url: photo.url }));
                                const updated = await onRefresh();
                                if (updated) setPost((p) => ({ ...p, ...updated, _previewPhotos: (p as any)._previewPhotos }));
                              }
                            }}
                          >
                            <img src={photo.url} alt={photo.photographer} className="w-full h-28 object-cover" />
                            <div className="px-2 py-1.5 space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeClass}`}>{photo.source || "Pexels"}</span>
                                {photo.sourceUrl && (
                                  <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-dark-muted hover:text-dark-muted">
                                    <ExternalLink size={9} />
                                  </a>
                                )}
                              </div>
                              {photo.source === "Unsplash" ? (
                                <p className="text-[9px] text-dark-muted leading-tight">
                                  <a href={photo.photographerUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="underline">{photo.photographer}</a>
                                  {" on "}
                                  <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="underline">Unsplash</a>
                                </p>
                              ) : (
                                <p className="text-[9px] text-dark-muted truncate">{photo.photographer}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Metadata section (compact, always at bottom, scrollable) ── */}
              <div className="border-t border-dark-border p-4 overflow-y-auto max-h-64 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1">SEO Title</p>
                  {editing ? (
                    <input value={draft.seo_title} onChange={(e) => setDraft((d) => ({ ...d, seo_title: e.target.value }))} className="w-full border border-dark-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel" />
                  ) : (
                    <p className="text-dark-muted text-xs">{post.seo_title || "Not set"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1">Meta Description</p>
                  {editing ? (
                    <textarea value={draft.seo_description} onChange={(e) => setDraft((d) => ({ ...d, seo_description: e.target.value }))} rows={2} className="w-full border border-dark-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-cm-purple resize-none bg-dark-panel" />
                  ) : (
                    <p className="text-dark-muted text-xs">{post.seo_description || "Not set"}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1">Pillar</p>
                    <p className="text-dark-muted text-xs">{post.content_pillar || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1">Words</p>
                    <p className="text-dark-muted text-xs">
                      {editing ? draft.content_markdown.split(/\s+/).filter(Boolean).length + " (live)" : post.word_count || "—"}
                    </p>
                  </div>
                </div>
                {post.quality_notes && (
                  <div>
                    <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1">Quality Notes</p>
                    <p className="text-dark-muted text-xs">{post.quality_notes}</p>
                  </div>
                )}
                {post.internal_links && post.internal_links !== "[]" && (
                  <div>
                    <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1">Internal Links</p>
                    {JSON.parse(post.internal_links).map((link: { slug: string; title: string }, i: number) => (
                      <p key={i} className="text-cm-purple text-xs">{link.title}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Action bar at bottom of preview */}
        <div className="px-6 py-3 border-t border-dark-border bg-dark-bg flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-dark-muted">
            {post.generated_at && <span>Created {new Date(post.generated_at).toLocaleDateString()}</span>}
            {post.published_at && <span className="text-dark-success">Published {new Date(post.published_at).toLocaleDateString()}</span>}
          </div>
          <div className="flex items-center gap-2">
            {showReject ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReject()}
                  placeholder="Reason for rejection (optional)..."
                  className="border border-dark-border rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  autoFocus
                />
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50"
                >
                  Reject
                </button>
                <button onClick={() => { setShowReject(false); setRejectReason(""); }} className="px-3 py-1.5 text-xs text-dark-muted hover:bg-dark-panel2 rounded-lg">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {post.status === "needs_review" && (
                  <>
                    <button
                      onClick={handleQueue}
                      disabled={actionLoading}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${justQueued ? "bg-cm-purple" : "bg-cm-purple hover:bg-cm-purple/80"}`}
                    >
                      <CheckCircle2 size={14} />
                      {justQueued ? "Queued" : "Send to Queue"}
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-dark-danger hover:bg-dark-danger/10 rounded-lg"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </>
                )}
                {post.status === "queued" && (
                  <>
                    <button
                      onClick={handlePublish}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-cm-purple hover:bg-cm-purple/80 rounded-lg disabled:opacity-50"
                    >
                      <Send size={14} />
                      Publish Now
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-dark-danger hover:bg-dark-danger/10 rounded-lg"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </>
                )}
                {post.status === "published" && post.slug && (
                  <a
                    href={`https://www.mastermindshq.business/post/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-cm-purple hover:bg-cm-purple/10 rounded-lg"
                  >
                    <ExternalLink size={14} />
                    View on Site
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-dark-panel rounded-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Reject Post</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)..."
          className="w-full border border-dark-border rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-cm-purple"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dark-muted hover:bg-dark-panel2 rounded-lg">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8]"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmQueueModal({ post, onConfirm, onClose }: { post: BlogPost; onConfirm: (e: React.MouseEvent) => void; onClose: () => void }) {
  const missingSeo = !post.seo_title || !post.seo_description || !post.seo_keywords;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-dark-panel rounded-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-2">Queue for Publishing</h3>
        <p className="text-sm text-dark-muted mb-4">
          This will add the post to the publishing queue. The publisher agent picks up queued posts at 9am and 3pm SGT.
        </p>
        <p className="text-sm font-medium text-dark-text mb-4 p-3 bg-dark-bg rounded-lg">
          {post.title}
        </p>
        {missingSeo && (
          <div className="mb-4 p-3 bg-dark-warn/10 border border-dark-warn/30 rounded-lg text-sm text-dark-warn">
            <p className="font-semibold mb-1">Missing SEO fields:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {!post.seo_title && <li>SEO Title</li>}
              {!post.seo_description && <li>Meta Description</li>}
              {!post.seo_keywords && <li>Keywords</li>}
              {!post.og_title && <li>OG Title</li>}
              {!post.og_description && <li>OG Description</li>}
            </ul>
            <p className="mt-2 text-xs">Add SEO data before queuing for best search performance.</p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dark-muted hover:bg-dark-panel2 rounded-lg">Cancel</button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            Queue for Publishing
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Blog Settings Components ─────────────────────────────────────────────

function SettingsSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl">
      <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
        <Icon size={16} className="text-cm-purple" />
        <h3 className="font-semibold tracking-tight text-dark-text">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-dark-text mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-dark-border rounded-lg p-2.5 text-sm min-h-[96px] resize-y focus:outline-none focus:ring-2 focus:ring-cm-purple" />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-dark-text mb-1">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={min} max={max} className="w-32 border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple" />
    </div>
  );
}

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) { onChange([...tags, trimmed]); setInput(""); }
  };
  return (
    <div>
      <label className="block text-sm font-medium text-dark-text mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-cm-purple/10 text-cm-purple rounded-full text-xs">
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-dark-danger">&times;</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Add item..." className="flex-1 border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple" />
        <button onClick={add} className="px-3 py-1.5 text-xs bg-cm-purple/100/20 text-indigo-300 rounded-lg hover:bg-cm-purple/30">Add</button>
      </div>
    </div>
  );
}

function RulesTable({ rules, onChange }: { rules: string[]; onChange: (rules: string[]) => void }) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newRule, setNewRule] = useState("");
  const startEdit = (index: number) => { setEditingIndex(index); setEditValue(rules[index]); };
  const saveEdit = () => {
    if (editingIndex === null || !editValue.trim()) return;
    const updated = [...rules]; updated[editingIndex] = editValue.trim(); onChange(updated); setEditingIndex(null); setEditValue("");
  };
  const cancelEdit = () => { setEditingIndex(null); setEditValue(""); };
  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed || rules.includes(trimmed)) return;
    onChange([...rules, trimmed]); setNewRule("");
  };
  const deleteRule = (index: number) => { onChange(rules.filter((_, i) => i !== index)); if (editingIndex === index) cancelEdit(); };
  return (
    <div>
      <div className="border border-dark-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-bg border-b border-dark-border">
              <th className="text-left px-4 py-2 font-medium text-dark-muted w-10">#</th>
              <th className="text-left px-4 py-2 font-medium text-dark-muted">Rule</th>
              <th className="px-4 py-2 font-medium text-dark-muted w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {rules.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-dark-muted">No rules yet. Add one below.</td></tr>}
            {rules.map((rule, i) => (
              <tr key={i} className="hover:bg-dark-bg">
                <td className="px-4 py-2 text-dark-muted">{i + 1}</td>
                <td className="px-4 py-2">
                  {editingIndex === i ? (
                    <input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }} autoFocus className="w-full border border-cm-purple rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple" />
                  ) : <span className="text-dark-text">{rule}</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  {editingIndex === i ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={saveEdit} className="p-1 text-dark-success hover:bg-dark-panel2 rounded"><Check size={14} /></button>
                      <button onClick={cancelEdit} className="p-1 text-dark-muted hover:bg-dark-panel2 rounded"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(i)} className="p-1 text-dark-muted hover:text-cm-purple hover:bg-cm-purple/10 rounded"><Pencil size={14} /></button>
                      <button onClick={() => deleteRule(i)} className="p-1 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3">
        <input value={newRule} onChange={(e) => setNewRule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRule())} placeholder="Add a new rule..." className="flex-1 border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple" />
        <button onClick={addRule} disabled={!newRule.trim()} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"><Plus size={14} />Add Rule</button>
      </div>
    </div>
  );
}

function BlogSettingsPanel({ siteDomain }: { siteDomain: string }) {
  const { settings, loading, updateSettings } = useCohortData(siteDomain);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (Object.keys(settings).length > 0) setLocal({ ...settings }); }, [settings]);
  const set = (key: string, value: string) => setLocal((prev) => ({ ...prev, [key]: value }));
  const parseJson = (key: string, fallback: string[] = []) => { try { return JSON.parse(local[key] || "[]"); } catch { return fallback; } };
  const setJson = (key: string, value: unknown) => set(key, JSON.stringify(value));
  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try { await updateSettings(local); setSaved(true); setTimeout(() => setSaved(false), 3000); } finally { setSaving(false); }
  };
  if (loading && Object.keys(local).length === 0) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-cm-purple" size={24} /></div>;
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save All Settings"}
        </button>
      </div>
      <SettingsSection title="Tone & Voice" icon={FileText}>
        <TextAreaField label="Tone & Voice" value={local.tone || ""} onChange={(v) => set("tone", v)} />
      </SettingsSection>
      <SettingsSection title="Blog Content Rules" icon={FileText}>
        <RulesTable rules={parseJson("content_rules")} onChange={(v) => setJson("content_rules", v)} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Primary CTA URL</label>
            <input value={local.cta_primary || ""} onChange={(e) => set("cta_primary", e.target.value)} className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Secondary CTA URL</label>
            <input value={local.cta_secondary || ""} onChange={(e) => set("cta_secondary", e.target.value)} className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple" />
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title="Keyword Focus" icon={Tag}>
        <TagInput label="Priority Keywords" tags={parseJson("keyword_focus")} onChange={(v) => setJson("keyword_focus", v)} />
      </SettingsSection>
      <SettingsSection title="Cover Image Settings" icon={Image}>
        <TextAreaField
          label="Image Search Instructions (used in blog generation prompt)"
          value={local.image_instructions || ""}
          onChange={(v) => set("image_instructions", v)}
        />
        <TagInput
          label="Banned Words (filtered from image search queries)"
          tags={parseJson("image_ban_words")}
          onChange={(v) => setJson("image_ban_words", v)}
        />
        <TagInput
          label="Style Anchors (appended to search queries)"
          tags={parseJson("image_style_anchors")}
          onChange={(v) => setJson("image_style_anchors", v)}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Orientation</label>
            <select
              value={local.image_orientation || "landscape"}
              onChange={(e) => set("image_orientation", e.target.value)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
            >
              <option value="landscape">Landscape (1200x628)</option>
              <option value="portrait">Portrait</option>
              <option value="square">Square</option>
            </select>
          </div>
          <NumberField
            label="Preview count"
            value={Number(local.image_count) || 5}
            onChange={(v) => set("image_count", String(v))}
            min={1}
            max={10}
          />
        </div>
      </SettingsSection>
      <SettingsSection title="Blog Publishing Settings" icon={Clock}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberField label="Generate per day" value={Number(local.posts_per_day_generate) || 5} onChange={(v) => set("posts_per_day_generate", String(v))} min={1} max={10} />
          <NumberField label="Publish per day" value={Number(local.posts_per_day_publish) || 2} onChange={(v) => set("posts_per_day_publish", String(v))} min={1} max={5} />
          <NumberField label="Max per day" value={Number(local.max_posts_per_day) || 5} onChange={(v) => set("max_posts_per_day", String(v))} min={1} max={10} />
          <NumberField label="Spacing (hours)" value={Math.round((Number(local.publish_spacing_minutes) || 360) / 60)} onChange={(v) => set("publish_spacing_minutes", String(v * 60))} min={1} max={24} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Min word count" value={Number(local.min_word_count) || 1200} onChange={(v) => set("min_word_count", String(v))} min={500} max={5000} />
          <NumberField label="Max word count" value={Number(local.max_word_count) || 1500} onChange={(v) => set("max_word_count", String(v))} min={500} max={5000} />
        </div>
        <p className="text-xs text-dark-muted">Word count range applies to new blog posts generated by the AI.</p>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={local.auto_publish === "true"} onChange={(e) => set("auto_publish", String(e.target.checked))} className="sr-only peer" />
            <div className="w-11 h-6 bg-dark-panel2 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cm-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-panel after:border-dark-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cm-purple"></div>
          </label>
          <span className="text-sm text-dark-text">Auto-publish approved posts</span>
        </div>
        <p className="text-xs text-dark-muted">When enabled, approved posts will automatically publish on the cron schedule without manual intervention.</p>
      </SettingsSection>
      <SettingsSection title="Wix Connection" icon={Globe}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-dark-text">Site ID</p>
            <p className="text-dark-muted font-mono text-xs mt-1">70e88030-8efa-455f-9213-751d686a9448</p>
          </div>
          <div>
            <p className="font-medium text-dark-text">API Token</p>
            <p className="text-dark-muted text-xs mt-1">Set in ~/.openclaw/workspace/.env</p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── Blog Writer Page ─────────────────────────────────────────────────────

export default function BlogWriterPage() {
  const { websites } = useWebsites();
  const [selectedDomain, setSelectedDomain] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("blog-selected-domain") || "mastermindshq.business";
    return "mastermindshq.business";
  });

  const {
    posts, total, stats, loading, fetchPosts,
    queuePost, rejectPost, publishPost, deletePost, restorePost, triggerGeneration, refresh,
  } = useCohortData(selectedDomain);

  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => { localStorage.setItem("blog-selected-domain", selectedDomain); }, [selectedDomain]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  // Advance to the next needs_review post after queuing
  const advanceToNextPost = () => {
    if (!previewPost) return;
    const reviewable = posts.filter(p => p.status === "needs_review" && p.id !== previewPost.id);
    if (reviewable.length > 0) {
      setPreviewPost(reviewable[0]);
    } else {
      setPreviewPost(null);
    }
  };
  const [rejectingPost, setRejectingPost] = useState<BlogPost | null>(null);
  const [confirmPublishPost, setConfirmPublishPost] = useState<BlogPost | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [triggerCelebration, CelebrationLayer] = useCelebration();
  const pendingCelebrationEvent = useRef<{ clientX: number; clientY: number } | null>(null);

  // Re-fetch posts whenever domain changes (fetchPosts is memoized on siteDomain)
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = useCallback(() => {
    fetchPosts({
      status: statusFilter === "all" ? undefined : statusFilter,
      pillar: pillarFilter === "all" ? undefined : pillarFilter,
      search: searchQuery || undefined,
      site_domain: selectedDomain,
    });
  }, [fetchPosts, statusFilter, pillarFilter, searchQuery, selectedDomain]);

  const handleQueue = async (id: number, e?: React.MouseEvent) => {
    setActionLoading(id);
    setConfirmPublishPost(null);
    if (e) pendingCelebrationEvent.current = { clientX: e.clientX, clientY: e.clientY };
    try {
      await queuePost(id);
      if (pendingCelebrationEvent.current) {
        triggerCelebration(pendingCelebrationEvent.current);
        pendingCelebrationEvent.current = null;
      }
      setStatusFilter("queued");
      fetchPosts({ status: "queued", site_domain: selectedDomain });
    } catch (err) {
      console.error("Failed to queue post:", err);
      pendingCelebrationEvent.current = null;
    } finally {
      setActionLoading(null);
    }
  };

  const currentFilters = useCallback(() => ({
    status: statusFilter === "all" ? undefined : statusFilter,
    pillar: pillarFilter === "all" ? undefined : pillarFilter,
    search: searchQuery || undefined,
    site_domain: selectedDomain,
  }), [statusFilter, pillarFilter, searchQuery, selectedDomain]);

  const handleReject = async (id: number, reason: string) => {
    setActionLoading(id);
    setRejectingPost(null);
    try {
      await rejectPost(id, reason);
      await refresh(currentFilters());
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: number) => {
    setActionLoading(id);
    try {
      await publishPost(id);
      setTimeout(() => refresh(currentFilters()), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      await deletePost(id);
      await refresh(currentFilters());
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (id: number) => {
    setActionLoading(id);
    try {
      await restorePost(id);
      await refresh(currentFilters());
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await triggerGeneration();
      // Script runs ~2-3 min in background — keep spinner, then refresh and clear
      setTimeout(() => {
        refresh(currentFilters()).finally(() => setGenerating(false));
      }, 120000);
    } catch {
      setGenerating(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
  };

  const filteredPosts = posts;

  return (
    <div className="space-y-4">
      <CelebrationLayer />

      {/* Stats + Generate button */}
      <div className="flex items-start justify-between gap-4 -mt-2 mb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div className="bg-dark-panel border border-dark-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={14} className="text-dark-success" />
              <span className="text-xs text-dark-muted font-medium">Published</span>
            </div>
            <p className="text-2xl font-bold text-dark-text">{stats?.publishedTotal ?? "—"}</p>
            {stats && (
              <p className="text-xs text-dark-muted mt-0.5">+{stats.publishedToday} today · +{stats.publishedWeek} this week</p>
            )}
          </div>
          <div className="bg-dark-panel border border-dark-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-cm-purple" />
              <span className="text-xs text-dark-muted font-medium">In Queue</span>
            </div>
            <p className="text-2xl font-bold text-dark-text">{stats?.queued ?? "—"}</p>
            <p className="text-xs text-dark-muted mt-0.5">Ready to publish</p>
          </div>
          <div className="bg-dark-panel border border-dark-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-amber-500" />
              <span className="text-xs text-dark-muted font-medium">Needs Review</span>
            </div>
            <p className="text-2xl font-bold text-dark-text">{stats?.pending ?? "—"}</p>
            <p className="text-xs text-dark-muted mt-0.5">Awaiting approval</p>
          </div>
          <div className="bg-dark-panel border border-dark-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={14} className="text-cm-purple" />
              <span className="text-xs text-dark-muted font-medium">Avg Quality</span>
            </div>
            <p className="text-2xl font-bold text-dark-text">
              {stats?.avgQuality != null ? stats.avgQuality.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-dark-muted mt-0.5">Out of 10</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-cm-purple text-white rounded-xl hover:bg-cm-purple/80 disabled:opacity-50 transition-all font-medium shrink-0 mt-0"
        >
          {generating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          {generating ? "Generating..." : "Generate Blogs"}
        </button>
      </div>

      {/* Website Switcher + Settings Toggle */}
      <div className="flex items-center justify-between mb-4">
        <WebsiteSwitcher websites={websites} selectedDomain={selectedDomain} onSelect={setSelectedDomain} label="Publishing to" />
        <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-dark-panel2 border border-dark-border rounded-lg text-dark-muted hover:text-dark-text">
          <Settings2 size={14} /> Blog Settings <ChevronDown size={14} className={`transition-transform ${showSettings ? "rotate-180" : ""}`} />
        </button>
      </div>
      {showSettings && <BlogSettingsPanel siteDomain={selectedDomain} />}

      <>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              const newStatus = e.target.value;
              setStatusFilter(newStatus);
              fetchPosts({
                status: newStatus === "all" ? undefined : newStatus,
                pillar: pillarFilter === "all" ? undefined : pillarFilter,
                search: searchQuery || undefined,
                site_domain: selectedDomain,
              });
            }}
            className="appearance-none bg-dark-panel border border-dark-border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All Statuses" : STATUS_LABELS[s] || s}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-3 text-dark-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={pillarFilter}
            onChange={(e) => {
              const newPillar = e.target.value;
              setPillarFilter(newPillar);
              fetchPosts({
                status: statusFilter === "all" ? undefined : statusFilter,
                pillar: newPillar === "all" ? undefined : newPillar,
                search: searchQuery || undefined,
                site_domain: selectedDomain,
              });
            }}
            className="appearance-none bg-dark-panel border border-dark-border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
          >
            {PILLAR_OPTIONS.map((p) => (
              <option key={p} value={p}>{p === "all" ? "All Pillars" : p}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-3 text-dark-muted pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-dark-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search by title..."
            className="w-full bg-dark-panel border border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
        </div>
        <button
          onClick={applyFilters}
          className="px-4 py-2 bg-cm-purple text-white text-sm rounded-lg hover:bg-cm-purple/80"
        >
          Filter
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-cm-purple/10 rounded-lg">
          <span className="text-sm font-medium text-cm-purple">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1 text-xs text-dark-muted hover:bg-dark-panel2 rounded-lg">
            Clear
          </button>
        </div>
      )}

      {/* Post count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-muted">{total} post{total !== 1 ? "s" : ""}</p>
        <label className="flex items-center gap-2 text-sm text-dark-muted">
          <input type="checkbox" checked={selectedIds.size === posts.length && posts.length > 0} onChange={toggleSelectAll} className="rounded" />
          Select all
        </label>
      </div>

      {/* Post List */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-cm-purple" size={24} />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-dark-muted">
          No posts match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onDoubleClick={() => setPreviewPost(post)}
              className={`bg-dark-panel border rounded-xl p-4 transition-all cursor-pointer ${
                selectedIds.has(post.id) ? "border-cm-purple bg-cm-purple/10/30" : "border-dark-border hover:border-cm-purple/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(post.id)}
                  onChange={() => toggleSelect(post.id)}
                  className="rounded mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-cm-purple bg-cm-purple/10 px-1.5 py-0.5 rounded shrink-0">B{post.id}</span>
                    <h4
                      className="font-semibold text-dark-text truncate hover:text-cm-purple cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setPreviewPost(post); }}
                    >{post.title}</h4>
                    <StatusBadge status={post.status} />
                    <QualityBadge score={post.quality_score} />
                    {post.validation_status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        post.validation_status === "passed" ? "bg-dark-success/20 text-dark-success" :
                        post.validation_status === "partial" ? "bg-dark-warn/20 text-dark-warn" :
                        "bg-dark-danger/20 text-dark-danger"
                      }`}>
                        {post.validation_status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark-muted line-clamp-1 mb-2">{post.excerpt || post.slug}</p>
                  <div className="flex items-center gap-3 text-xs text-dark-muted">
                    {post.content_pillar && <span className="px-1.5 py-0.5 bg-dark-panel2 rounded">{post.content_pillar}</span>}
                    {post.target_segment && <span className="px-1.5 py-0.5 bg-dark-panel2 rounded">{post.target_segment}</span>}
                    {post.word_count && <span>{post.word_count} words</span>}
                    {post.generated_at && <span>Created {new Date(post.generated_at).toLocaleDateString()}</span>}
                    {post.published_at && <span className="text-dark-success">Published {new Date(post.published_at).toLocaleDateString()}</span>}
                    {post.status === "published" && !post.cover_image_url && (
                      <span className="flex items-center gap-1 text-amber-500"><ImageOff size={12} />Add cover image in Wix Editor</span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                  {actionLoading === post.id ? (
                    <Loader2 size={16} className="animate-spin text-cm-purple" />
                  ) : (
                    <>
                      <button onClick={() => setPreviewPost(post)} className="p-1.5 text-dark-muted hover:text-dark-muted hover:bg-dark-panel2 rounded-lg" title="Preview">
                        <Eye size={16} />
                      </button>

                      {post.status === "needs_review" && (
                        <>
                          <button
                            onClick={(e) => { pendingCelebrationEvent.current = { clientX: e.clientX, clientY: e.clientY }; setConfirmPublishPost(post); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-cm-purple hover:bg-cm-purple/80 rounded-lg"
                            title="Queue for Publishing"
                          >
                            <CheckCircle2 size={14} />
                            Send to Queue
                          </button>
                          <button onClick={() => setRejectingPost(post)} className="p-1.5 text-red-400 hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg" title="Reject">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}

                      {post.status === "queued" && (
                        <>
                          <button onClick={() => handlePublish(post.id)} className="p-1.5 text-dark-success hover:text-dark-success hover:bg-dark-panel2 rounded-lg" title="Publish Now">
                            <Send size={16} />
                          </button>
                          <button onClick={() => setRejectingPost(post)} className="p-1.5 text-red-400 hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg" title="Reject">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}

                      {post.status === "published" && post.slug && (
                        <a
                          href={`https://www.mastermindshq.business/post/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-cm-purple hover:text-cm-purple hover:bg-cm-purple/10 rounded-lg"
                          title="View on Site"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}

                      {post.status === "rejected" && (
                        <>
                          <button onClick={() => handleRestore(post.id)} className="p-1.5 text-dark-muted hover:text-cm-purple hover:bg-cm-purple/10 rounded-lg" title="Restore">
                            <RotateCcw size={16} />
                          </button>
                          <button onClick={() => handleDelete(post.id)} className="p-1.5 text-red-400 hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              {post.status === "rejected" && post.rejection_reason && (
                <div className="mt-2 ml-8 p-2 bg-dark-danger/10 rounded-lg text-xs text-dark-danger">
                  Rejection reason: {post.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </>

      {/* Modals */}
      {previewPost && (
        <PreviewModal
          post={previewPost}
          onClose={() => { setPreviewPost(null); applyFilters(); }}
          onRefresh={async () => {
            try {
              const res = await fetch(`/api/cohorts/blog?id=${previewPost.id}`);
              if (!res.ok) return null;
              const data = await res.json();
              const updated = data.post || data.posts?.[0] || null;
              if (updated) setPreviewPost(updated);
              return updated;
            } catch { return null; }
          }}
          onQueue={async (id) => { await queuePost(id); applyFilters(); }}
          onReject={async (id, reason) => { await rejectPost(id, reason); applyFilters(); }}
          onPublish={async (id) => { await publishPost(id); applyFilters(); }}
          onAdvance={advanceToNextPost}
        />
      )}
      {rejectingPost && (
        <RejectModal
          onConfirm={(reason) => handleReject(rejectingPost.id, reason)}
          onClose={() => setRejectingPost(null)}
        />
      )}
      {confirmPublishPost && (
        <ConfirmQueueModal
          post={confirmPublishPost}
          onConfirm={(e) => handleQueue(confirmPublishPost.id, e)}
          onClose={() => setConfirmPublishPost(null)}
        />
      )}
    </div>
  );
}
