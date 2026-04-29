"use client";

import { useState, useMemo } from "react";
import {
  Globe, Plus, X, ChevronDown, ChevronUp, Eye, EyeOff,
  Loader2, Trash2, Search, Circle, ExternalLink, ArrowUpDown,
  Settings2, Pencil,
} from "lucide-react";
import { useWebsites, Website } from "@/hooks/useWebsites";

/* ── Registrar URL map and link ───────────────────────────────── */

const REGISTRAR_URLS: Record<string, string> = {
  porkbun: "https://porkbun.com/account/domainsSpe498",
  godaddy: "https://dcc.godaddy.com/control/portfolio",
  namecheap: "https://ap.www.namecheap.com/Domains/DomainControlPanel",
  cloudflare: "https://dash.cloudflare.com",
  google: "https://domains.google.com/registrar",
};

function RegistrarLink({ registrar }: { registrar: string }) {
  if (!registrar) return <span className="text-dark-muted text-sm">&mdash;</span>;
  const url = REGISTRAR_URLS[registrar.toLowerCase()];
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="text-sm text-cm-purple hover:underline flex items-center gap-1">
        {registrar} <ExternalLink size={12} />
      </a>
    );
  }
  return <span className="text-sm text-dark-text">{registrar}</span>;
}

/* ── Dashboard URL helper ────────────────────────────────────── */

function getDashboardUrl(site: Website): string | null {
  const creds = site.hosting_credentials || {};
  switch (site.hosting?.toLowerCase()) {
    case "wix": return creds.site_id ? `https://manage.wix.com/dashboard/${creds.site_id}` : null;
    case "wordpress": return site.base_url ? `${site.base_url}/wp-admin/` : null;
    case "vercel": return "https://vercel.com/dashboard";
    case "shopify": {
      const store = (creds.store_url || site.domain) as string;
      return `https://${store}/admin`;
    }
    case "netlify": return "https://app.netlify.com";
    default: return null;
  }
}

/* ── Hosting badge ────────────────────────────────────────────── */

const hostingColors: Record<string, string> = {
  wix: "bg-cm-purple/20 text-cm-purple",
  wordpress: "bg-dark-success/20 text-dark-success",
  vercel: "bg-dark-panel2 text-dark-text",
  shopify: "bg-dark-success/15 text-dark-success",
};

function HostingBadge({ hosting }: { hosting: string }) {
  if (!hosting) return null;
  const color = hostingColors[hosting.toLowerCase()] || "bg-dark-panel2 text-dark-muted";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color} uppercase`}>
      {hosting}
    </span>
  );
}

/* ── Status dot ───────────────────────────────────────────────── */

function StatusDot({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className="flex items-center gap-1.5">
      <Circle
        size={8}
        className={isActive ? "text-dark-success fill-dark-success" : "text-dark-muted fill-dark-muted"}
      />
      <span className={`text-xs capitalize ${isActive ? "text-dark-success" : "text-dark-muted"}`}>
        {status || "unknown"}
      </span>
    </span>
  );
}

/* ── Toggle dot (Blog / SEO) ──────────────────────────────────── */

function ToggleDot({ enabled }: { enabled?: number }) {
  const on = enabled === 1;
  return (
    <span className="flex items-center gap-1.5">
      <Circle
        size={7}
        className={on ? "text-dark-success fill-dark-success" : "text-dark-muted fill-dark-muted"}
      />
      <span className={`text-xs ${on ? "text-dark-success" : "text-dark-muted"}`}>
        {on ? "On" : "Off"}
      </span>
    </span>
  );
}

/* ── Credential row (masked) ──────────────────────────────────── */

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-dark-muted w-32 shrink-0">{label}</span>
      <span className="font-mono text-dark-text flex-1 truncate">
        {visible ? value : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
      </span>
      <button onClick={() => setVisible(!visible)} className="p-1 text-dark-muted hover:text-dark-text">
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

/* ── Detail field (key-value) ─────────────────────────────────── */

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-dark-muted w-36 shrink-0">{label}</span>
      <span className="text-dark-text flex-1">{value}</span>
    </div>
  );
}

/* ── Detail section wrapper ───────────────────────────────────── */

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">{title}</h4>
      <div className="bg-dark-panel2 rounded-lg border border-dark-border p-4">
        {children}
      </div>
    </div>
  );
}

/* ── Website Detail Modal ─────────────────────────────────────── */

function WebsiteDetailModal({
  site,
  onClose,
  onDelete,
  onUpdateNotes,
}: {
  site: Website;
  onClose: () => void;
  onDelete: (domain: string) => void;
  onUpdateNotes: (domain: string, notes: string) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(site.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const dashboardUrl = getDashboardUrl(site);

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await onUpdateNotes(site.domain, notesValue);
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const credentials = site.hosting_credentials || {};
  const hasCredentials = Object.keys(credentials).length > 0;

  const integrations: { label: string; data: Record<string, unknown> }[] = [
    site.search_console && Object.keys(site.search_console).length > 0
      ? { label: "Search Console", data: site.search_console }
      : null,
    site.bing_webmaster && Object.keys(site.bing_webmaster).length > 0
      ? { label: "Bing Webmaster", data: site.bing_webmaster }
      : null,
    site.analytics && Object.keys(site.analytics).length > 0
      ? { label: "Analytics", data: site.analytics }
      : null,
    site.cdn && Object.keys(site.cdn).length > 0
      ? { label: "CDN", data: site.cdn }
      : null,
    site.dns && Object.keys(site.dns).length > 0
      ? { label: "DNS", data: site.dns }
      : null,
  ].filter(Boolean) as { label: string; data: Record<string, unknown> }[];

  const authTokens = site.auth_tokens && typeof site.auth_tokens === "object" && Object.keys(site.auth_tokens).length > 0
    ? site.auth_tokens
    : null;

  const hasGeneral = site.base_url || site.registrar || site.entity || site.tech_stack;
  const hasFeatures = site.blog_enabled !== undefined || site.seo_enabled !== undefined || site.monthly_visitors || site.last_published;
  const hasDates = site.domain_expiry || site.ssl_expiry || site.added_at || site.updated_at;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      onDelete(site.domain);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-dark-panel border border-dark-border rounded-xl w-full max-w-2xl shadow-lg shadow-black/30 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-dark-text">{site.name}</h3>
            <HostingBadge hosting={site.hosting} />
            <StatusDot status={site.status} />
          </div>
          <button onClick={onClose} className="p-1 text-dark-muted hover:text-dark-text">
            <X size={20} />
          </button>
        </div>

        {/* Domain link + action buttons */}
        <div className="px-6 pt-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={site.base_url || `https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cm-purple hover:text-cm-purple/80 flex items-center gap-1"
            >
              {site.domain}
              <ExternalLink size={12} />
            </a>
            <a
              href={site.base_url || `https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cm-purple/15 border border-cm-purple/30 rounded-lg text-cm-purple hover:bg-cm-purple/25"
            >
              <ExternalLink size={12} /> Visit Site
            </a>
            {dashboardUrl && (
              <a href={dashboardUrl} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-panel2 border border-dark-border rounded-lg text-dark-muted hover:text-dark-text">
                <Settings2 size={12} /> Open Dashboard
              </a>
            )}
          </div>
          {site.entity && (
            <p className="text-xs text-dark-muted mt-1">{site.entity}</p>
          )}
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* General */}
          {hasGeneral && (
            <DetailSection title="General">
              <div className="space-y-2">
                {site.base_url && <DetailField label="Base URL" value={
                  <a href={site.base_url} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:text-cm-purple/80">{site.base_url}</a>
                } />}
                {site.registrar && <DetailField label="Registrar" value={<RegistrarLink registrar={site.registrar} />} />}
                {site.entity && <DetailField label="Entity" value={site.entity} />}
                {site.tech_stack && <DetailField label="Tech Stack" value={site.tech_stack} />}
              </div>
            </DetailSection>
          )}

          {/* Notes */}
          <DetailSection title="Notes">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea value={notesValue} onChange={e => setNotesValue(e.target.value)}
                  className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text resize-y min-h-[80px]" />
                <div className="flex gap-2">
                  <button onClick={saveNotes} disabled={savingNotes}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-cm-purple text-white rounded-lg disabled:opacity-50">
                    {savingNotes && <Loader2 size={12} className="animate-spin" />}
                    Save
                  </button>
                  <button onClick={() => { setEditingNotes(false); setNotesValue(site.notes || ""); }}
                    className="px-3 py-1 text-xs text-dark-muted border border-dark-border rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <p className="text-sm text-dark-text">{site.notes || "No notes"}</p>
                <button onClick={() => setEditingNotes(true)} className="p-1 text-dark-muted hover:text-dark-text shrink-0">
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </DetailSection>

          {/* Features */}
          {hasFeatures && (
            <DetailSection title="Features">
              <div className="space-y-2">
                {site.blog_enabled !== undefined && (
                  <DetailField label="Blog Enabled" value={
                    <ToggleDot enabled={site.blog_enabled} />
                  } />
                )}
                {site.seo_enabled !== undefined && (
                  <DetailField label="SEO Enabled" value={
                    <ToggleDot enabled={site.seo_enabled} />
                  } />
                )}
                {site.monthly_visitors != null && <DetailField label="Monthly Visitors" value={site.monthly_visitors.toLocaleString()} />}
                {site.last_published && <DetailField label="Last Published" value={new Date(site.last_published).toLocaleDateString()} />}
              </div>
            </DetailSection>
          )}

          {/* Hosting Credentials */}
          {hasCredentials && (
            <DetailSection title="Hosting Credentials">
              <div className="space-y-1.5">
                {Object.entries(credentials).map(([k, v]) => (
                  <CredentialRow key={k} label={k} value={String(v)} />
                ))}
              </div>
            </DetailSection>
          )}

          {/* Integrations */}
          {integrations.length > 0 && (
            <DetailSection title="Integrations">
              <div className="space-y-3">
                {integrations.map(({ label, data }) => (
                  <div key={label}>
                    <p className="text-sm font-medium text-dark-text mb-1">{label}</p>
                    <div className="space-y-1 pl-2">
                      {Object.entries(data).map(([k, v]) => (
                        <DetailField key={k} label={k} value={String(v)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Auth Tokens */}
          {authTokens && (
            <DetailSection title="Auth Tokens">
              <div className="space-y-1.5">
                {Object.entries(authTokens).map(([k, v]) => (
                  <CredentialRow key={k} label={k} value={String(v)} />
                ))}
              </div>
            </DetailSection>
          )}

          {/* Contact */}
          {site.primary_contact_email && (
            <DetailSection title="Contact">
              <DetailField label="Primary Email" value={
                <a href={`mailto:${site.primary_contact_email}`} className="text-cm-purple hover:text-cm-purple/80">{site.primary_contact_email}</a>
              } />
            </DetailSection>
          )}

          {/* Dates */}
          {hasDates && (
            <DetailSection title="Dates">
              <div className="space-y-2">
                {site.domain_expiry && <DetailField label="Domain Expiry" value={site.domain_expiry} />}
                {site.ssl_expiry && <DetailField label="SSL Expiry" value={site.ssl_expiry} />}
                {site.added_at && <DetailField label="Added" value={new Date(site.added_at).toLocaleDateString()} />}
                {site.updated_at && <DetailField label="Last Updated" value={new Date(site.updated_at).toLocaleDateString()} />}
              </div>
            </DetailSection>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-dark-border shrink-0">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-danger">Are you sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-dark-danger text-white rounded-lg hover:bg-dark-danger/80 disabled:opacity-50"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-sm text-dark-muted border border-dark-border rounded-lg hover:text-dark-text"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-dark-danger border border-dark-danger/30 rounded-lg hover:bg-dark-danger/10"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted border border-dark-border rounded-lg hover:text-dark-text"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sortable column header ───────────────────────────────────── */

function SortHeader({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
}: {
  label: string;
  col: string;
  sortCol: string;
  sortDir: "asc" | "desc";
  onSort: (col: string) => void;
}) {
  const active = sortCol === col;
  return (
    <th
      className="text-left px-4 py-3 font-medium text-dark-muted cursor-pointer select-none hover:text-dark-text transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={12} className="opacity-30" />
        )}
      </span>
    </th>
  );
}

/* ── Table row (simple, no expand) ────────────────────────────── */

function WebsiteRow({
  site,
  onClick,
  onDelete,
  deleting,
}: {
  site: Website;
  onClick: () => void;
  onDelete: (domain: string) => void;
  deleting: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-dark-panel2/50 cursor-pointer transition-colors border-b border-dark-border"
    >
      <td className="px-4 py-3">
        <span className="font-medium text-dark-text">{site.name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-dark-muted">{site.domain}</span>
      </td>
      <td className="px-4 py-3">
        <HostingBadge hosting={site.hosting} />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-dark-muted">{site.entity || "-"}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-dark-muted">{site.tech_stack || "-"}</span>
      </td>
      <td className="px-4 py-3">
        <StatusDot status={site.status} />
      </td>
      <td className="px-4 py-3">
        <ToggleDot enabled={site.blog_enabled} />
      </td>
      <td className="px-4 py-3">
        <ToggleDot enabled={site.seo_enabled} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {site.base_url && (
            <a
              href={site.base_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-dark-muted hover:text-cm-purple"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(site.domain); }}
            disabled={deleting}
            className="p-1 text-dark-muted hover:text-dark-danger"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Add Website Modal ────────────────────────────────────────── */

function AddWebsiteModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (w: Partial<Website> & { domain: string; name: string }) => Promise<void>;
}) {
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [hosting, setHosting] = useState("wix");
  const [baseUrl, setBaseUrl] = useState("");
  const [credentials, setCredentials] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const addCredential = () => setCredentials((c) => [...c, { key: "", value: "" }]);
  const removeCredential = (i: number) => setCredentials((c) => c.filter((_, idx) => idx !== i));
  const updateCredential = (i: number, field: "key" | "value", val: string) =>
    setCredentials((c) => c.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)));

  const handleSubmit = async () => {
    if (!domain.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const credObj: Record<string, string> = {};
      credentials.forEach((c) => { if (c.key.trim()) credObj[c.key.trim()] = c.value; });
      await onAdd({
        domain: domain.trim(),
        name: name.trim(),
        hosting,
        base_url: baseUrl.trim() || `https://${domain.trim()}`,
        status: "active",
        hosting_credentials: credObj,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-dark-panel border border-dark-border rounded-xl w-full max-w-lg shadow-lg shadow-black/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text">Add Website</h3>
          <button onClick={onClose} className="p-1 text-dark-muted hover:text-dark-text">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Domain *</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Website"
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Hosting</label>
            <div className="relative">
              <select
                value={hosting}
                onChange={(e) => setHosting(e.target.value)}
                className="w-full appearance-none bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 pr-8 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              >
                <option value="wix">Wix</option>
                <option value="wordpress">WordPress</option>
                <option value="vercel">Vercel</option>
                <option value="shopify">Shopify</option>
                <option value="netlify">Netlify</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-3 text-dark-muted pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Base URL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-dark-text">Credentials</label>
              <button
                onClick={addCredential}
                className="flex items-center gap-1 text-xs text-cm-purple hover:text-cm-purple/80"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {credentials.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  value={c.key}
                  onChange={(e) => updateCredential(i, "key", e.target.value)}
                  placeholder="Key"
                  className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
                <input
                  value={c.value}
                  onChange={(e) => updateCredential(i, "value", e.target.value)}
                  placeholder="Value"
                  className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
                <button onClick={() => removeCredential(i)} className="p-1 text-dark-muted hover:text-dark-danger">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted border border-dark-border rounded-lg hover:text-dark-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !domain.trim() || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Add Website
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function WebsitesPage() {
  const { websites, loading, error, createWebsite, updateWebsite, deleteWebsite } = useWebsites();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Website | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hostingFilter, setHostingFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleDelete = async (domain: string) => {
    setDeletingDomain(domain);
    try {
      await deleteWebsite(domain);
    } finally {
      setDeletingDomain(null);
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // Unique filter values
  const uniqueHosting = useMemo(() => [...new Set(websites.map((w) => w.hosting).filter(Boolean))].sort(), [websites]);
  const uniqueEntities = useMemo(() => [...new Set(websites.map((w) => w.entity).filter(Boolean))].sort(), [websites]);
  const uniqueStatuses = useMemo(() => [...new Set(websites.map((w) => w.status).filter(Boolean))].sort(), [websites]);

  // Filter
  const filtered = useMemo(() => {
    return websites.filter((w) => {
      if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase()) && !w.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (hostingFilter !== "all" && w.hosting !== hostingFilter) return false;
      if (entityFilter !== "all" && w.entity !== entityFilter) return false;
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      return true;
    });
  }, [websites, searchQuery, hostingFilter, entityFilter, statusFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string, vb: string;
      switch (sortCol) {
        case "name": va = a.name; vb = b.name; break;
        case "domain": va = a.domain; vb = b.domain; break;
        case "hosting": va = a.hosting; vb = b.hosting; break;
        case "entity": va = a.entity || ""; vb = b.entity || ""; break;
        case "status": va = a.status; vb = b.status; break;
        default: va = a.name; vb = b.name;
      }
      const cmp = String(va || "").localeCompare(String(vb || ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const activeCount = websites.filter((w) => w.status === "active").length;
  const hostingCounts: Record<string, number> = {};
  websites.forEach((w) => {
    const h = w.hosting || "other";
    hostingCounts[h] = (hostingCounts[h] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cm-purple/15 rounded-lg">
            <Globe size={24} className="text-cm-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-text tracking-tight">Websites</h1>
            <p className="text-dark-muted">Manage all your websites and connections</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-xs text-dark-muted font-medium mb-1">Total</p>
          <p className="text-2xl font-bold text-dark-text">{websites.length}</p>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-xs text-dark-muted font-medium mb-1">Active</p>
          <p className="text-2xl font-bold text-dark-success">{activeCount}</p>
        </div>
        {Object.entries(hostingCounts).slice(0, 2).map(([host, count]) => (
          <div key={host} className="bg-dark-panel border border-dark-border rounded-xl p-4">
            <p className="text-xs text-dark-muted font-medium mb-1 capitalize">{host}</p>
            <p className="text-2xl font-bold text-dark-text">{count}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-dark-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search websites..."
            className="w-full bg-dark-panel border border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
        </div>
        <select
          value={hostingFilter}
          onChange={(e) => setHostingFilter(e.target.value)}
          className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text"
        >
          <option value="all">All Hosting</option>
          {uniqueHosting.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text"
        >
          <option value="all">All Entities</option>
          {uniqueEntities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text"
        >
          <option value="all">All Status</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 font-medium shrink-0"
        >
          <Plus size={16} />
          Add Website
        </button>
      </div>

      {/* Table */}
      {loading && websites.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-cm-purple" size={24} />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-dark-danger">{error}</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-dark-muted">
          {searchQuery || hostingFilter !== "all" || entityFilter !== "all" || statusFilter !== "all"
            ? "No websites match your filters."
            : "No websites added yet. Click \"Add Website\" to get started."}
        </div>
      ) : (
        <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-panel2/50">
                <SortHeader label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Domain" col="domain" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Hosting" col="hosting" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Entity" col="entity" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3 font-medium text-dark-muted">Tech Stack</th>
                <SortHeader label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3 font-medium text-dark-muted">Blog</th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted">SEO</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((site) => (
                <WebsiteRow
                  key={site.domain}
                  site={site}
                  onClick={() => setSelectedSite(site)}
                  onDelete={handleDelete}
                  deleting={deletingDomain === site.domain}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSite && (
        <WebsiteDetailModal
          site={selectedSite}
          onClose={() => setSelectedSite(null)}
          onDelete={handleDelete}
          onUpdateNotes={async (domain, notes) => {
            await updateWebsite(domain, { notes });
            setSelectedSite((prev) => prev ? { ...prev, notes } : null);
          }}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddWebsiteModal
          onClose={() => setShowAdd(false)}
          onAdd={createWebsite}
        />
      )}
    </div>
  );
}
