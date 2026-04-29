"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  Download,
  FolderOpen,
  BookOpen,
  Code,
  Package,
  X,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Shield,
  Calendar,
  FileText,
  Terminal,
} from "lucide-react";

interface AuthField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required?: boolean;
  placeholder?: string;
}

interface SkillData {
  name: string;
  slug: string;
  description: string;
  source: "workspace" | "claude" | "clawhub";
  version: string | null;
  installedAt: string | null;
  enabled: boolean;
  hasMeta: boolean;
  hasSkillMd: boolean;
  skillMdContent: string | null;
  authFields: AuthField[];
  authConfigured: boolean;
}

interface SkillsResponse {
  total: number;
  workspace: number;
  claude: number;
  clawhub: number;
  skills: SkillData[];
}

export default function InstalledSkillsPage() {
  const [skillsData, setSkillsData] = useState<SkillsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSource, setSelectedSource] = useState<
    "all" | "workspace" | "claude" | "clawhub"
  >("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(null);

  const fetchSkills = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/skills");
      if (!response.ok) throw new Error("Failed to fetch skills");
      const data = await response.json();
      setSkillsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSkills();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block p-3 rounded-lg bg-cm-purple/20 mb-3">
            <Loader2 className="animate-spin text-cm-purple" size={24} />
          </div>
          <p className="text-dark-muted">Scanning for installed skills...</p>
        </div>
      </div>
    );
  }

  if (!skillsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto text-dark-danger mb-3" />
          <p className="text-dark-text font-medium">
            {error || "No skills data available"}
          </p>
        </div>
      </div>
    );
  }

  const filteredSkills = skillsData.skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource =
      selectedSource === "all" || skill.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  const sortedSkills = [...filteredSkills].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const sourceColors: Record<string, { bg: string; text: string; dot: string }> = {
    workspace: { bg: "bg-cm-purple/10", text: "text-cm-purple", dot: "bg-cm-purple" },
    claude: { bg: "bg-dark-panel2", text: "text-dark-muted", dot: "bg-cm-purple" },
    clawhub: { bg: "bg-dark-panel2", text: "text-dark-muted", dot: "bg-cm-purple/60" },
  };

  const sourceIcons: Record<string, React.ReactNode> = {
    workspace: <FolderOpen size={13} />,
    claude: <BookOpen size={13} />,
    clawhub: <Download size={13} />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">
            Installed Skills
          </h2>
          <p className="text-sm text-dark-muted mt-0.5">
            {skillsData.total} skills across{" "}
            {[
              skillsData.workspace > 0 && "workspace",
              skillsData.claude > 0 && "claude",
              skillsData.clawhub > 0 && "clawhub",
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-muted hover:text-cm-purple hover:bg-cm-purple/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-dark-panel2 rounded-lg border border-dark-border">
          <p className="text-xs text-dark-muted font-medium mb-1">Total</p>
          <p className="text-2xl font-bold text-dark-text">
            {skillsData.total}
          </p>
        </div>
        <div className="p-3 bg-dark-panel border border-dark-border">
          <p className="text-xs text-dark-muted font-medium mb-1">Workspace</p>
          <p className="text-2xl font-bold text-dark-text">
            {skillsData.workspace}
          </p>
        </div>
        <div className="p-3 bg-dark-panel border border-dark-border">
          <p className="text-xs text-dark-muted font-medium mb-1">Claude</p>
          <p className="text-2xl font-bold text-dark-text">
            {skillsData.claude}
          </p>
        </div>
        <div className="p-3 bg-dark-panel border border-dark-border">
          <p className="text-xs text-dark-muted font-medium mb-1">ClawHub</p>
          <p className="text-2xl font-bold text-dark-text">
            {skillsData.clawhub}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
          />
          <input
            type="text"
            placeholder="Search by name, description, or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-dark-border bg-dark-panel2 placeholder:text-dark-muted focus:outline-none focus:border-cm-purple focus:ring-2 focus:ring-cm-purple text-sm text-dark-text"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-dark-muted" />
          <select
            value={selectedSource}
            onChange={(e) =>
              setSelectedSource(
                e.target.value as "all" | "workspace" | "claude" | "clawhub"
              )
            }
            className="px-3 py-2 rounded-lg border border-dark-border bg-dark-panel2 focus:outline-none focus:border-cm-purple focus:ring-2 focus:ring-cm-purple text-sm text-dark-text"
          >
            <option value="all">All Sources</option>
            <option value="workspace">Workspace</option>
            <option value="claude">Claude</option>
            <option value="clawhub">ClawHub</option>
          </select>
        </div>
      </div>

      {/* Skills Table */}
      {sortedSkills.length === 0 ? (
        <div className="flex items-center justify-center p-8 bg-dark-panel2 rounded-lg border border-dark-border">
          <div className="text-center">
            <AlertCircle size={32} className="mx-auto text-dark-muted mb-3" />
            <p className="text-dark-muted font-medium">No skills found</p>
            <p className="text-xs text-dark-muted mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-dark-border rounded-lg overflow-hidden bg-dark-panel">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_120px_90px_80px_90px_32px] gap-3 px-4 py-2.5 bg-dark-panel2 border-b border-dark-border text-xs font-medium text-dark-muted uppercase tracking-wider">
            <div>Name</div>
            <div>Source</div>
            <div>Version</div>
            <div>Status</div>
            <div>Auth</div>
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-dark-border">
            {sortedSkills.map((skill) => {
              const colors = sourceColors[skill.source];
              return (
                <div
                  key={skill.slug}
                  onClick={() => setSelectedSkill(skill)}
                  className="grid grid-cols-[1fr_120px_90px_80px_90px_32px] gap-3 px-4 py-3 items-center hover:bg-dark-panel2 cursor-pointer transition-colors group"
                >
                  {/* Name + Description */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark-text truncate">
                      {skill.name}
                    </p>
                    <p className="text-xs text-dark-muted truncate mt-0.5">
                      {skill.description || "No description"}
                    </p>
                  </div>

                  {/* Source */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${colors.bg} ${colors.text}`}
                    >
                      {sourceIcons[skill.source]}
                      <span className="capitalize">{skill.source}</span>
                    </span>
                  </div>

                  {/* Version */}
                  <div>
                    {skill.version ? (
                      <span className="text-xs text-dark-muted font-mono font-dm-mono">
                        v{skill.version}
                      </span>
                    ) : (
                      <span className="text-xs text-dark-muted">-</span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    {skill.enabled ? (
                      <span className="inline-flex items-center gap-1 text-xs text-dark-success font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-dark-success"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-dark-muted font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-dark-muted"></span>
                        Disabled
                      </span>
                    )}
                  </div>

                  {/* Auth */}
                  <div>
                    {skill.authFields.length > 0 ? (
                      skill.authConfigured ? (
                        <span className="inline-flex items-center gap-1 text-xs text-dark-success">
                          <CheckCircle2 size={13} />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-dark-warn">
                          <XCircle size={13} />
                          Needed
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-dark-muted">-</span>
                    )}
                  </div>

                  {/* Arrow */}
                  <div>
                    <ChevronRight
                      size={16}
                      className="text-dark-muted group-hover:text-dark-text transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-dark-muted text-center">
        <p>
          Showing {sortedSkills.length} of {skillsData.total} skills
        </p>
      </div>

      {/* Skill Detail Overlay */}
      {selectedSkill && (
        <SkillOverlay
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  );
}

function SkillOverlay({
  skill,
  onClose,
}: {
  skill: SkillData;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const sourceColors: Record<string, { bg: string; text: string }> = {
    workspace: { bg: "bg-cm-purple/10", text: "text-cm-purple" },
    claude: { bg: "bg-dark-panel2", text: "text-dark-muted" },
    clawhub: { bg: "bg-dark-panel2", text: "text-dark-muted" },
  };
  const colors = sourceColors[skill.source];

  const installDate = skill.installedAt
    ? new Date(skill.installedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-end z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-dark-panel shadow-2xl shadow-black/40 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-dark-panel border-b border-dark-border px-6 py-4 flex items-start justify-between z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold tracking-tight text-dark-text truncate">
                {skill.name}
              </h2>
              <span
                className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}
              >
                {skill.source}
              </span>
            </div>
            <p className="text-sm text-dark-muted font-mono font-dm-mono">{skill.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors flex-shrink-0 ml-3"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* Description */}
          {skill.description && (
            <div>
              <p className="text-sm text-dark-text leading-relaxed">
                {skill.description}
              </p>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={<Terminal size={15} />}
              label="Status"
              value={
                skill.enabled ? (
                  <span className="text-dark-success font-medium">Active</span>
                ) : (
                  <span className="text-dark-muted font-medium">Disabled</span>
                )
              }
            />
            <InfoCard
              icon={<Code size={15} />}
              label="Version"
              value={
                <span className="font-mono font-dm-mono">
                  {skill.version ? `v${skill.version}` : "N/A"}
                </span>
              }
            />
            {installDate && (
              <InfoCard
                icon={<Calendar size={15} />}
                label="Installed"
                value={installDate}
              />
            )}
            <InfoCard
              icon={<Shield size={15} />}
              label="Auth"
              value={
                skill.authFields.length > 0 ? (
                  skill.authConfigured ? (
                    <span className="text-dark-success flex items-center gap-1">
                      <CheckCircle2 size={13} /> Configured
                    </span>
                  ) : (
                    <span className="text-dark-warn flex items-center gap-1">
                      <XCircle size={13} /> Required
                    </span>
                  )
                ) : (
                  <span className="text-dark-muted">Not required</span>
                )
              }
            />
          </div>

          {/* Auth Fields */}
          {skill.authFields.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">
                Authentication Fields
              </h3>
              <div className="space-y-2">
                {skill.authFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between p-2.5 bg-dark-panel2 rounded-lg border border-dark-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-dark-text">
                        {field.label}
                      </p>
                      <p className="text-xs text-dark-muted">
                        {field.type} {field.required ? "(required)" : "(optional)"}
                      </p>
                    </div>
                    <span className="text-xs text-dark-muted font-mono font-dm-mono">
                      {field.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Badges */}
          <div>
            <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">
              Files
            </h3>
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                  skill.hasMeta
                    ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                    : "bg-dark-panel2 border-dark-border text-dark-muted"
                }`}
              >
                <Package size={13} />
                _meta.json
                {skill.hasMeta ? (
                  <CheckCircle2 size={11} />
                ) : (
                  <XCircle size={11} />
                )}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                  skill.hasSkillMd
                    ? "bg-cm-purple/10 border-cm-purple/20 text-cm-purple"
                    : "bg-dark-panel2 border-dark-border text-dark-muted"
                }`}
              >
                <FileText size={13} />
                SKILL.md
                {skill.hasSkillMd ? (
                  <CheckCircle2 size={11} />
                ) : (
                  <XCircle size={11} />
                )}
              </span>
            </div>
          </div>

          {/* SKILL.md Content */}
          {skill.skillMdContent && (
            <div>
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">
                Documentation
              </h3>
              <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-xs text-dark-text whitespace-pre-wrap font-mono font-dm-mono leading-relaxed">
                  {skill.skillMdContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-dark-panel2 rounded-lg border border-dark-border">
      <div className="flex items-center gap-1.5 text-dark-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-sm text-dark-text">{value}</div>
    </div>
  );
}
