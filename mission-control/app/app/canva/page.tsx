"use client";

import { useState } from "react";
import {
  Palette,
  RefreshCw,
  Loader2,
  AlertCircle,
  Image,
  LayoutTemplate,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileImage,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { useCanvaData } from "@/hooks/useCanvaData";
import type { CanvaDesign, CanvaTemplate } from "@/hooks/useCanvaData";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

function StatusDot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 size={16} className="text-dark-success" />
  ) : (
    <XCircle size={16} className="text-dark-danger" />
  );
}

// ── Auth Setup Card ────────────────────────────────────────────────

function AuthSetupCard({
  auth,
}: {
  auth: { hasClientId: boolean; hasClientSecret: boolean; hasTokens: boolean };
}) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-dark-warn/10">
          <Palette size={20} className="text-dark-warn" />
        </div>
        <h2 className="text-lg font-semibold  text-dark-text">
          Canva Setup Required
        </h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <StatusDot ok={auth.hasClientId} />
          <span className="text-sm text-dark-text">
            CANVA_CLIENT_ID in .env
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={auth.hasClientSecret} />
          <span className="text-sm text-dark-text">
            CANVA_CLIENT_SECRET in .env
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={auth.hasTokens} />
          <span className="text-sm text-dark-text">
            OAuth tokens (~/.canva/tokens.json)
          </span>
        </div>
      </div>

      <div className="bg-dark-panel2 rounded-lg p-4 text-sm text-dark-muted space-y-2">
        <p className="font-medium text-dark-text">To connect Canva:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Create an integration at{" "}
            <span className="font-mono font-dm-mono text-xs bg-dark-panel2 px-1 rounded">
              canva.com/developers
            </span>
          </li>
          <li>
            Add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET to{" "}
            <span className="font-mono font-dm-mono text-xs bg-dark-panel2 px-1 rounded">
              ~/.openclaw/workspace/.env
            </span>
          </li>
          <li>
            Run{" "}
            <span className="font-mono font-dm-mono text-xs bg-dark-panel2 px-1 rounded">
              ~/.openclaw/workspace/skills/canva/scripts/canva-auth.sh
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

// ── Design Card ────────────────────────────────────────────────────

function DesignCard({ design }: { design: CanvaDesign }) {
  const editUrl = design.urls?.edit_url;
  const thumbUrl = design.thumbnail?.url;

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden hover:border-cm-purple hover:shadow-sm transition-all group">
      {/* Thumbnail */}
      <div className="aspect-video bg-dark-panel2 relative overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={design.title || "Design"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileImage size={32} className="text-dark-muted" />
          </div>
        )}
        {/* Hover overlay with actions */}
        {editUrl && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-dark-panel rounded-lg text-sm font-medium text-dark-text hover:bg-dark-panel2 flex items-center gap-1.5"
            >
              <ExternalLink size={14} />
              Edit
            </a>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <h3
          className="font-medium text-dark-text text-sm truncate"
          title={design.title}
        >
          {design.title || "Untitled"}
        </h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-dark-muted">
          <Clock size={12} />
          <span>{formatDate(design.updated_at || design.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────

function TemplateCard({ template }: { template: CanvaTemplate }) {
  const thumbUrl = template.thumbnail?.url;

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden hover:border-cm-purple hover:shadow-sm transition-all">
      <div className="aspect-video bg-dark-panel2 relative overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={template.title || "Template"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <LayoutTemplate size={32} className="text-dark-muted" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3
          className="font-medium text-dark-text text-sm truncate"
          title={template.title}
        >
          {template.title || "Untitled Template"}
        </h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-dark-muted">
          <Clock size={12} />
          <span>{formatDate(template.updated_at || template.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function CanvaPage() {
  const { data, loading, error, refresh } = useCanvaData();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"designs" | "templates">(
    "designs"
  );

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Canva data...</p>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold  text-dark-text mb-2">
          Failed to load Canva data
        </h3>
        <p className="text-dark-muted mb-4 text-sm">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { auth } = data;

  // Filter designs/templates by search
  const filteredDesigns = data.designs.filter((d) =>
    (d.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTemplates = data.templates.filter((t) =>
    (t.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="canva" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cm-purple/10">
            <Palette size={22} className="text-cm-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Canva</h1>
            <p className="text-sm text-dark-muted">
              {auth.connected
                ? data.user?.display_name
                  ? `Connected as ${data.user.display_name}`
                  : "Connected"
                : "Not connected"}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-lg hover:bg-dark-panel2 text-dark-muted hover:text-dark-text transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Auth setup if not connected */}
      {!auth.connected && <AuthSetupCard auth={auth} />}

      {/* Stats bar */}
      {auth.connected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Image size={16} className="text-cm-purple" />
              <span className="text-xs font-medium text-dark-muted uppercase tracking-wide">
                Designs
              </span>
            </div>
            <p className="text-2xl font-bold text-dark-text">
              {data.stats?.totalDesigns ?? data.designs.length}
            </p>
          </div>
          <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <LayoutTemplate size={16} className="text-cm-purple" />
              <span className="text-xs font-medium text-dark-muted uppercase tracking-wide">
                Templates
              </span>
            </div>
            <p className="text-2xl font-bold text-dark-text">
              {data.stats?.totalTemplates ?? data.templates.length}
            </p>
          </div>
          <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-dark-success" />
              <span className="text-xs font-medium text-dark-muted uppercase tracking-wide">
                Account
              </span>
            </div>
            <p className="text-sm font-semibold text-dark-text truncate">
              {data.user?.display_name || "--"}
            </p>
          </div>
          <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-dark-success" />
              <span className="text-xs font-medium text-dark-muted uppercase tracking-wide">
                Status
              </span>
            </div>
            <p className="text-sm font-semibold text-dark-success">Connected</p>
          </div>
        </div>
      )}

      {/* API error notice */}
      {data.error && (
        <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-dark-warn mt-0.5 shrink-0" />
          <p className="text-sm text-dark-warn">{data.error}</p>
        </div>
      )}

      {/* Search + Tabs */}
      {auth.connected && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
              />
              <input
                type="text"
                placeholder="Search designs and templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-dark-panel2 border border-dark-border rounded-lg text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent"
              />
            </div>
            {/* Tabs */}
            <div className="flex bg-dark-panel2 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("designs")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "designs"
                    ? "bg-dark-panel text-dark-text shadow-sm"
                    : "text-dark-muted hover:text-dark-text"
                }`}
              >
                Designs ({filteredDesigns.length})
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "templates"
                    ? "bg-dark-panel text-dark-text shadow-sm"
                    : "text-dark-muted hover:text-dark-text"
                }`}
              >
                Templates ({filteredTemplates.length})
              </button>
            </div>
          </div>

          {/* Content Grid */}
          {activeTab === "designs" && (
            <div>
              {filteredDesigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-dark-muted">
                  <Image size={40} className="mb-3 text-dark-muted" />
                  <p className="text-sm">
                    {searchQuery
                      ? "No designs match your search"
                      : "No designs found"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredDesigns.map((design) => (
                    <DesignCard key={design.id} design={design} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "templates" && (
            <div>
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-dark-muted">
                  <LayoutTemplate size={40} className="mb-3 text-dark-muted" />
                  <p className="text-sm">
                    {searchQuery
                      ? "No templates match your search"
                      : "No brand templates found"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CLI reference */}
      <div className="bg-dark-panel2 rounded-xl border border-dark-border p-4">
        <h3 className="text-sm font-semibold  text-dark-text mb-2">
          CLI Quick Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="font-mono font-dm-mono text-dark-muted bg-dark-panel px-3 py-2 rounded-lg border border-dark-border">
            canva.sh designs
            <span className="text-dark-muted ml-2">— list all</span>
          </div>
          <div className="font-mono font-dm-mono text-dark-muted bg-dark-panel px-3 py-2 rounded-lg border border-dark-border">
            canva.sh templates
            <span className="text-dark-muted ml-2">— brand templates</span>
          </div>
          <div className="font-mono font-dm-mono text-dark-muted bg-dark-panel px-3 py-2 rounded-lg border border-dark-border">
            canva.sh export &lt;id&gt; png
            <span className="text-dark-muted ml-2">— export design</span>
          </div>
          <div className="font-mono font-dm-mono text-dark-muted bg-dark-panel px-3 py-2 rounded-lg border border-dark-border opacity-50">
            canva.sh autofill &lt;tpl&gt; &apos;...&apos;
            <span className="text-dark-muted ml-2">— Enterprise only</span>
          </div>
        </div>

        {/* Enterprise restriction notice */}
        <div className="mt-3 bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-dark-warn mt-0.5 shrink-0" />
          <p className="text-xs text-dark-warn">
            <span className="font-semibold">Programmatic text insertion requires Canva Enterprise.</span>{" "}
            The Autofill API — which lets you fill text fields in designs programmatically — is locked to Enterprise plans only. Free, Pro, and Team plans cannot insert or update text in designs via API. Reading designs and exporting works on all plans. If you need this, Canva offers a developer exemption for approved integrations, but end-users must still be on Enterprise.
          </p>
        </div>
      </div>
    </div>
  );
}
