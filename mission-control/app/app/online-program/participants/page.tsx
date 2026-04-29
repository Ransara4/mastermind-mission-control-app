"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Users, Search, RefreshCw,
  MapPin, Clock, Globe, ChevronUp, ChevronDown, X, Save, Check,
  Loader2, Tag, StickyNote, ChevronRight, Mail, Instagram, Linkedin,
  Facebook, Briefcase, Monitor, Edit2, Plus, Trash2,
} from "lucide-react";

interface Offer {
  id: number;
  offer_name: string;
  offer_description: string;
  discount: string;
  offer_category_ai: string | null;
}

interface Connection {
  id: number;
  participant_a: { id: number; full_name: string; photo_url: string | null };
  participant_b: { id: number; full_name: string; photo_url: string | null };
  connection_type: 'introduction' | 'collaboration' | 'referral' | 'shared_interest';
  description: string | null;
  status: 'active' | 'pending' | 'completed';
  created_at: string;
}

interface Participant {
  id: number;
  airtable_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  instagram: string;
  linkedin: string;
  facebook: string;
  short_bio: string;
  business_desc: string;
  website: string;
  location: string;
  timezone: string;
  os: string;
  cohort_number: number | null;
  client_summary_ai: string | null;
  social_enrichment_ai: string | null;
  all_offer_names: string;
  notes: string | null;
  tags: string | null;
  photo_url: string | null;
  synced_at: string;
  offers: Offer[];
  attendance_summary?: { sessions_attended: number; sessions_total: number; attendance_rate: number } | null;
}

type SortKey = "full_name" | "location" | "cohort_number";
type SortDir = "asc" | "desc";

/* ── Bali TZ offset ─────────────────────────────────────────────── */

function parseBaliOffset(timezone: string): string {
  if (!timezone?.trim()) return "";
  const tz = timezone.trim();
  // Extract UTC numeric offset (e.g. "UTC+8", "UTC -6", "UTC+7")
  const utcMatch = tz.match(/UTC\s*([+-])\s*(\d+)/i);
  if (utcMatch) {
    const sign = utcMatch[1] === "+" ? 1 : -1;
    const diff = sign * parseInt(utcMatch[2]) - 8; // Bali = UTC+8
    if (diff === 0) return "Same";
    return diff > 0 ? `+${diff} HR` : `${diff} HR`;
  }
  // Named timezone keywords → known UTC offsets
  const named: [string, number][] = [
    ["japan", 9], ["jst", 9],
    ["singapore", 8], ["sgt", 8],
    ["wita", 8], ["bali", 8],
    ["wib", 7],
    ["cdt", -5], ["cst", -6],
    ["edt", -4], ["est", -5],
    ["pdt", -7], ["pst", -8],
    ["gmt", 0], ["utc", 0],
    ["cet", 1], ["cest", 2],
  ];
  const lower = tz.toLowerCase();
  for (const [key, offset] of named) {
    if (lower.includes(key)) {
      const diff = offset - 8;
      if (diff === 0) return "Same";
      return diff > 0 ? `+${diff} HR` : `${diff} HR`;
    }
  }
  return "";
}

/* ── Avatar ─────────────────────────────────────────────────────── */

function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const colors = [
    "bg-violet-500/100/20 text-violet-300", "bg-cm-purple/100/20 text-indigo-300",
    "bg-pink-500/20 text-pink-300", "bg-cm-purple/20 text-cm-purple",
    "bg-dark-warn/20 text-dark-warn", "bg-sky-500/20 text-sky-300",
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const s = `${size}px`;

  if (photoUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: s, height: s }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${colors[colorIdx]}`}
      style={{ width: s, height: s, fontSize: size < 32 ? "10px" : size < 48 ? "14px" : "20px" }}
    >
      {initials || "?"}
    </div>
  );
}

/* ── Tag Badge ──────────────────────────────────────────────────── */

function TagBadge({ text, onRemove }: { text: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cm-purple/10 text-cm-purple rounded-full text-xs font-medium">
      {text}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-dark-danger transition-colors"><X size={10} /></button>
      )}
    </span>
  );
}

/* ── Sort Header ────────────────────────────────────────────────── */

function SortHeader({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${active ? "text-cm-purple" : "text-dark-muted hover:text-dark-muted"}`}>
      {label}
      {active ? (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />}
    </button>
  );
}

/* ── Edit Field ─────────────────────────────────────────────────── */

function EditField({ label, value, onChange, multiline, icon: Icon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  icon?: React.ElementType;
}) {
  const base = "w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-bg focus:bg-dark-panel2 transition-colors";
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
        {Icon && <Icon size={11} />}
        {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`${base} resize-none h-24`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={base} />
      )}
    </div>
  );
}

/* ── Overlay Modal ──────────────────────────────────────────────── */

const PREDEFINED_TAGS: Record<string, string[]> = {
  Stage: ["early-stage", "scaling", "established"],
  Need: ["more-clients", "automation", "branding", "operations", "mindset"],
  Engagement: ["highly-engaged", "needs-attention", "check-in-needed"],
};

const CONNECTION_TYPE_COLORS: Record<Connection["connection_type"], string> = {
  introduction: "bg-violet-500/100/20 text-violet-300",
  collaboration: "bg-cm-purple/20 text-cm-purple",
  referral: "bg-dark-warn/20 text-dark-warn",
  shared_interest: "bg-pink-500/20 text-pink-300",
};

function ParticipantModal({
  participant: init,
  onClose,
  onSave,
}: {
  participant: Participant;
  onClose: () => void;
  onSave: (id: number, fields: Partial<Participant>) => Promise<void>;
}) {
  const [fields, setFields] = useState({ ...init });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Offers state
  const [offers, setOffers] = useState<Offer[]>(init.offers ?? []);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({ offer_name: "", offer_description: "", discount: "", offer_category_ai: "" });
  const [addingOffer, setAddingOffer] = useState(false);

  // Connections state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);

  // Load connections on mount
  useEffect(() => {
    let cancelled = false;
    setConnectionsLoading(true);
    fetch(`/api/online-program/connections?participant_id=${init.id}`)
      .then((res) => res.ok ? res.json() : Promise.reject(res.statusText))
      .then((data) => { if (!cancelled) setConnections(data.connections ?? []); })
      .catch(() => { if (!cancelled) setConnections([]); })
      .finally(() => { if (!cancelled) setConnectionsLoading(false); });
    return () => { cancelled = true; };
  }, [init.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (key: keyof Participant) => (val: string) => setFields((p) => ({ ...p, [key]: val }));

  const tagList = (fields.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  const addTag = (tag?: string) => {
    const t = (tag ?? tagInput).trim();
    if (!t || tagList.includes(t)) { if (!tag) setTagInput(""); return; }
    setFields((p) => ({ ...p, tags: [...tagList, t].join(", ") }));
    if (!tag) setTagInput("");
  };

  const removeTag = (tag: string) => {
    setFields((p) => ({ ...p, tags: tagList.filter((t) => t !== tag).join(", ") }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(fields.id, fields);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOffer = async () => {
    if (!newOffer.offer_name.trim()) return;
    setAddingOffer(true);
    try {
      const res = await fetch("/api/online-program/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_airtable_id: init.airtable_id,
          offer_name: newOffer.offer_name.trim(),
          offer_description: newOffer.offer_description.trim() || undefined,
          discount: newOffer.discount.trim() || undefined,
          offer_category_ai: newOffer.offer_category_ai.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to add offer");
      const data = await res.json();
      setOffers((prev) => [...prev, data.offer]);
      setNewOffer({ offer_name: "", offer_description: "", discount: "", offer_category_ai: "" });
      setShowAddOffer(false);
    } finally {
      setAddingOffer(false);
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    try {
      const res = await fetch(`/api/online-program/offers?id=${offerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete offer");
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch {
      // Silently fail — offer stays in list
    }
  };

  const attendance = fields.attendance_summary;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-[75vw] max-w-[75vw] h-[75vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel">
          <Avatar name={fields.full_name} photoUrl={fields.photo_url} size={72} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-dark-text truncate">{fields.full_name || "No name"}</h2>
            <p className="text-sm text-dark-muted">{fields.email}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {fields.location && (
                <span className="flex items-center gap-1 text-xs text-dark-muted">
                  <MapPin size={11} /> {fields.location}
                </span>
              )}
              {fields.cohort_number && (
                <span className="text-xs px-2 py-0.5 bg-violet-500/100/20 text-violet-300 rounded-full font-medium">
                  Cohort {fields.cohort_number}
                </span>
              )}
              {attendance && attendance.sessions_total > 0 && (
                <span className="text-xs px-2 py-0.5 bg-dark-panel2 text-dark-muted rounded-full font-medium">
                  {attendance.sessions_attended}/{attendance.sessions_total} sessions
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-panel2 transition-colors text-dark-muted hover:text-dark-muted flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left column */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-dark-muted border-b border-dark-border pb-1">Profile</h3>

              <EditField label="First Name" value={fields.first_name ?? ""} onChange={set("first_name")} icon={Edit2} />
              <EditField label="Last Name" value={fields.last_name ?? ""} onChange={set("last_name")} />
              <EditField label="Email" value={fields.email ?? ""} onChange={set("email")} icon={Mail} />
              <EditField label="Location" value={fields.location ?? ""} onChange={set("location")} icon={MapPin} />
              <EditField label="Timezone" value={fields.timezone ?? ""} onChange={set("timezone")} icon={Clock} />
              {parseBaliOffset(fields.timezone ?? "") && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
                    <Clock size={11} /> Time Zone Offset
                  </label>
                  <span className="inline-block px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-sm font-semibold text-dark-text">
                    {parseBaliOffset(fields.timezone ?? "")}
                  </span>
                </div>
              )}
              <EditField label="OS" value={fields.os ?? ""} onChange={set("os")} icon={Monitor} />

              <h3 className="text-xs font-bold uppercase tracking-widest text-dark-muted border-b border-dark-border pb-1 pt-2">Social</h3>
              <EditField label="Instagram" value={fields.instagram ?? ""} onChange={set("instagram")} icon={Instagram} />
              <EditField label="LinkedIn URL" value={fields.linkedin ?? ""} onChange={set("linkedin")} icon={Linkedin} />
              <EditField label="Facebook URL" value={fields.facebook ?? ""} onChange={set("facebook")} icon={Facebook} />
              <EditField label="Website" value={fields.website ?? ""} onChange={set("website")} icon={Globe} />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-dark-muted border-b border-dark-border pb-1">Background</h3>

              <EditField label="Short Bio" value={fields.short_bio ?? ""} onChange={set("short_bio")} multiline icon={Edit2} />
              <EditField label="About Business" value={fields.business_desc ?? ""} onChange={set("business_desc")} multiline icon={Briefcase} />

              <h3 className="text-xs font-bold uppercase tracking-widest text-dark-muted border-b border-dark-border pb-1 pt-2">Your Notes</h3>

              {/* Tags */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1.5"><Tag size={11} /> Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                  {tagList.map((t) => <TagBadge key={t} text={t} onRemove={() => removeTag(t)} />)}
                </div>

                {/* Predefined tags */}
                <div className="space-y-2 mb-3">
                  {Object.entries(PREDEFINED_TAGS).map(([category, tags]) => (
                    <div key={category}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-dark-muted">{category}</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {tags.map((t) => {
                          const active = tagList.includes(t);
                          return (
                            <button
                              key={t}
                              onClick={() => active ? removeTag(t) : addTag(t)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                active
                                  ? "bg-cm-purple/100/20 text-indigo-300 ring-1 ring-cm-purple"
                                  : "bg-dark-panel2 text-dark-muted hover:bg-cm-purple/10 hover:text-cm-purple"
                              }`}
                            >
                              {active && <Check size={10} />}
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Add custom tag..."
                    className="flex-1 border border-dark-border rounded-lg px-3 py-1.5 text-sm bg-dark-bg focus:bg-dark-panel2 focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  />
                  <button onClick={() => addTag()} className="px-3 py-1.5 text-xs bg-cm-purple/100/20 text-indigo-300 rounded-lg hover:bg-cm-purple/30 transition-colors"><Plus size={14} /></button>
                </div>
              </div>

              <EditField label="Notes" value={fields.notes ?? ""} onChange={set("notes")} multiline icon={StickyNote} />

              {/* Connections */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-dark-muted border-b border-dark-border pb-1 pt-2">
                  Connections {!connectionsLoading && `(${connections.length})`}
                </h3>
                {connectionsLoading ? (
                  <div className="flex items-center gap-2 mt-2 text-xs text-dark-muted">
                    <Loader2 size={12} className="animate-spin" /> Loading...
                  </div>
                ) : connections.length === 0 ? (
                  <p className="text-xs text-dark-muted mt-2">No connections yet</p>
                ) : (
                  <div className="space-y-2 mt-3">
                    {connections.map((conn) => {
                      const other = conn.participant_a.id === init.id ? conn.participant_b : conn.participant_a;
                      return (
                        <div key={conn.id} className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-lg px-3 py-2">
                          <Avatar name={other.full_name} photoUrl={other.photo_url} size={20} />
                          <span className="text-xs font-medium text-dark-text truncate flex-1">{other.full_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${CONNECTION_TYPE_COLORS[conn.connection_type]}`}>
                            {conn.connection_type.replace("_", " ")}
                          </span>
                          {conn.description && (
                            <span className="text-[10px] text-dark-muted truncate max-w-[100px] hidden sm:inline" title={conn.description}>
                              {conn.description}
                            </span>
                          )}
                          <span className="text-[10px] text-dark-muted flex-shrink-0">
                            {new Date(conn.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Offers */}
              <div>
                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-dark-muted border-b border-dark-border pb-1 flex-1">Offers ({offers.length})</h3>
                  <button
                    onClick={() => setShowAddOffer(true)}
                    className="flex items-center gap-1 text-xs text-cm-purple hover:text-cm-purple-mid font-medium transition-colors"
                  >
                    <Plus size={12} /> Add Offer
                  </button>
                </div>

                {/* Add offer form */}
                {showAddOffer && (
                  <div className="bg-cm-purple/10/50 border border-cm-purple/30 rounded-lg p-3 mt-2 space-y-2">
                    <input
                      value={newOffer.offer_name}
                      onChange={(e) => setNewOffer((o) => ({ ...o, offer_name: e.target.value }))}
                      placeholder="Offer Name *"
                      className="w-full border border-dark-border rounded-lg px-3 py-1.5 text-sm bg-dark-panel focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                    <input
                      value={newOffer.offer_description}
                      onChange={(e) => setNewOffer((o) => ({ ...o, offer_description: e.target.value }))}
                      placeholder="Description (optional)"
                      className="w-full border border-dark-border rounded-lg px-3 py-1.5 text-sm bg-dark-panel focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                    <input
                      value={newOffer.discount}
                      onChange={(e) => setNewOffer((o) => ({ ...o, discount: e.target.value }))}
                      placeholder="Discount / Incentive (optional)"
                      className="w-full border border-dark-border rounded-lg px-3 py-1.5 text-sm bg-dark-panel focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                    <input
                      value={newOffer.offer_category_ai}
                      onChange={(e) => setNewOffer((o) => ({ ...o, offer_category_ai: e.target.value }))}
                      placeholder="Category (optional)"
                      className="w-full border border-dark-border rounded-lg px-3 py-1.5 text-sm bg-dark-panel focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleAddOffer}
                        disabled={addingOffer || !newOffer.offer_name.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-medium hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
                      >
                        {addingOffer ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        {addingOffer ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => { setShowAddOffer(false); setNewOffer({ offer_name: "", offer_description: "", discount: "", offer_category_ai: "" }); }}
                        className="px-3 py-1.5 text-xs text-dark-muted hover:text-dark-text transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {offers.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {offers.map((offer) => (
                      <div key={offer.id} className="bg-dark-bg border border-dark-border rounded-lg p-3 group/offer">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-dark-text">{offer.offer_name}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {offer.offer_category_ai && (
                              <span className="text-xs px-2 py-0.5 bg-violet-500/100/20 text-violet-300 rounded-full">{offer.offer_category_ai}</span>
                            )}
                            <button
                              onClick={() => handleDeleteOffer(offer.id)}
                              className="opacity-0 group-hover/offer:opacity-100 p-1 text-dark-muted hover:text-dark-danger transition-all"
                              title="Delete offer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {offer.offer_description && <p className="text-xs text-dark-muted">{offer.offer_description}</p>}
                        {offer.discount && <p className="text-xs text-dark-success font-medium mt-1">{offer.discount}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {offers.length === 0 && !showAddOffer && (
                  <p className="text-xs text-dark-muted mt-2">No offers yet</p>
                )}
              </div>

              {/* AI Summary */}
              {fields.client_summary_ai && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-dark-muted border-b border-dark-border pb-1 pt-2">AI Summary</h3>
                  <p className="text-xs text-dark-muted bg-dark-bg rounded-lg p-3 leading-relaxed mt-2">{fields.client_summary_ai}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border bg-dark-bg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {fields.email && (
              <a href={`mailto:${fields.email}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel border border-dark-border rounded-lg text-xs text-dark-muted hover:bg-dark-bg transition-colors">
                <Mail size={13} /> Email
              </a>
            )}
            {fields.instagram && (
              <a href={`https://instagram.com/${fields.instagram.replace("@", "")}`} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel border border-dark-border rounded-lg text-xs text-cm-purple hover:bg-cm-purple/10 transition-colors">
                <Instagram size={13} /> Instagram
              </a>
            )}
            {fields.linkedin && (
              <a href={fields.linkedin} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel border border-dark-border rounded-lg text-xs text-cm-purple hover:bg-cm-purple/10 transition-colors">
                <Linkedin size={13} /> LinkedIn
              </a>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-cm-purple hover:bg-cm-purple/80 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lastSync, setLastSync] = useState<{ synced_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Participant | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/online-program/participants");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setParticipants(data.participants ?? []);
      setLastSync(data.lastSync);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/online-program/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (id: number, fields: Partial<Participant>) => {
    await fetch("/api/online-program/participants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    if (selected?.id === id) setSelected((p) => p ? { ...p, ...fields } : p);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const results = q
      ? participants.filter((p) =>
          [p.full_name, p.email, p.location, p.instagram, p.tags, p.notes, p.all_offer_names]
            .some((f) => f?.toLowerCase().includes(q))
        )
      : participants;

    return [...results].sort((a, b) => {
      let av: string | number = a[sortKey] ?? "";
      let bv: string | number = b[sortKey] ?? "";
      if (sortKey === "cohort_number") { av = a.cohort_number ?? 999; bv = b.cohort_number ?? 999; }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [participants, search, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: participants.length,
    bali: participants.filter((p) => p.location?.toLowerCase().includes("bali")).length,
    withOffers: participants.filter((p) => p.offers.length > 0).length,
    cohort1: participants.filter((p) => p.cohort_number === 1).length,
  }), [participants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mr-3" size={28} />
        <span className="text-dark-muted">Loading participants...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-dark-danger">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-cm-purple text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-dark-text flex items-center gap-2">
            <Users size={20} className="text-cm-purple" />
            Participants
          </h1>
          {lastSync && (
            <p className="text-xs text-dark-muted mt-0.5">
              Last synced {new Date(lastSync.synced_at).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-cm-purple hover:bg-cm-purple/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "bg-cm-purple" },
          { label: "Cohort 1", value: stats.cohort1, color: "bg-violet-500/100" },
          { label: "Based in Bali", value: stats.bali, color: "bg-pink-500" },
          { label: "Have Offers", value: stats.withOffers, color: "bg-cm-purple" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-dark-panel border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-dark-muted">{label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            </div>
            <p className="text-2xl font-bold text-dark-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, location, tags, offers..."
          className="w-full pl-9 pr-4 py-2.5 border border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-muted">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg">
                <th className="text-left px-4 py-3">
                  <SortHeader label="Name" sortKey="full_name" current={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <SortHeader label="Location" sortKey="location" current={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Social</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">TZ Offset</th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Cohort" sortKey="cohort_number" current={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="hover:bg-cm-purple/10/40 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.full_name} photoUrl={p.photo_url} size={38} />
                      <div>
                        <p className="font-semibold text-dark-text group-hover:text-cm-purple transition-colors">{p.full_name}</p>
                        <p className="text-xs text-dark-muted truncate max-w-[180px]">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.location ? (
                      <div className="flex items-center gap-1.5 text-dark-muted">
                        <MapPin size={12} className="text-dark-muted flex-shrink-0" />
                        <span className="text-sm">{p.location}</span>
                      </div>
                    ) : <span className="text-dark-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      {p.instagram && (
                        <a href={`https://instagram.com/${p.instagram.replace("@", "")}`} target="_blank" rel="noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-cm-purple/10 text-dark-muted hover:text-pink-500 transition-colors">
                          <Instagram size={14} />
                        </a>
                      )}
                      {p.linkedin && (
                        <a href={p.linkedin} target="_blank" rel="noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-cm-purple/10 text-dark-muted hover:text-cm-purple transition-colors">
                          <Linkedin size={14} />
                        </a>
                      )}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-dark-panel2 text-dark-muted hover:text-dark-success transition-colors">
                          <Globe size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {parseBaliOffset(p.timezone ?? "") ? (
                      <span className="text-xs font-semibold text-dark-muted">{parseBaliOffset(p.timezone ?? "")}</span>
                    ) : <span className="text-dark-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.cohort_number ? (
                      <span className="text-xs px-2 py-0.5 bg-violet-500/100/20 text-violet-300 rounded-full font-medium">C{p.cohort_number}</span>
                    ) : <span className="text-dark-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={16} className="text-dark-muted group-hover:text-indigo-400 transition-colors" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-dark-muted">
                    {search ? `No participants matching "${search}"` : "No participants found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-dark-border text-xs text-dark-muted">
          {filtered.length} of {participants.length} participants
        </div>
      </div>

      {/* Modal overlay */}
      {selected && (
        <ParticipantModal
          participant={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
