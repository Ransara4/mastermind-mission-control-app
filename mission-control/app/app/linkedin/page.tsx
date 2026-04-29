"use client";

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Linkedin,
  Plus,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar,
  ArrowRight,
  Upload,
  BookOpen,
  Target,
} from "lucide-react";
import {
  useLinkedInData,
  ContentItem,
  PipelineStats,
} from "@/hooks/useLinkedInData";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { PIPELINE_COLUMNS } from "./sections/shared";
import { PipelineBoard } from "./sections/PipelineBoard";
import { CalendarView } from "./sections/CalendarView";
import { AnalyticsView } from "./sections/AnalyticsView";
import { WritersView } from "./sections/WritersView";
import { ProjectView } from "./sections/ProjectView";
import { ContentModal } from "./sections/ContentModal";
import { ImportModal } from "./sections/ImportModal";

// --- Main Page ---

export default function LinkedInPage() {
  const {
    data,
    loading,
    error,
    refresh,
    createContent,
    updateContent,
    deleteContent,
    moveContent,
    importIdeas,
    saveWriter,
  } = useLinkedInData();

  const [view, setView] = useState<
    "pipeline" | "calendar" | "analytics" | "project" | "writers"
  >("pipeline");
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [createInStatus, setCreateInStatus] =
    useState<ContentItem["status"]>("idea");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-cm-purple" size={32} />
        <span className="ml-3 text-dark-muted">Loading LinkedIn data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="text-dark-danger flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-medium text-red-800">Error loading data</p>
          <p className="text-sm text-dark-danger mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-3 text-sm text-dark-danger hover:text-red-900 flex items-center gap-1"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const auth = data?.auth;
  const items = data?.items || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="linkedin" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cm-purple rounded-xl flex items-center justify-center">
            <Linkedin className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold  text-dark-text">
              LinkedIn Content Studio
            </h1>
            <p className="text-sm text-dark-muted">
              Manage your content pipeline from idea to published
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 text-sm rounded-lg border border-dark-border hover:bg-dark-bg flex items-center gap-2 text-dark-muted"
          >
            <Upload size={14} /> Import Ideas
          </button>
          <button
            onClick={() => {
              setCreateInStatus("idea");
              setShowCreateModal(true);
            }}
            className="px-3 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 flex items-center gap-2"
          >
            <Plus size={14} /> New Content
          </button>
          <button
            onClick={refresh}
            className="p-2 rounded-lg hover:bg-dark-panel2 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-dark-muted" />
          </button>
        </div>
      </div>

      {/* Auth Status (compact) */}
      <div
        className={`rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm ${
          auth?.valid
            ? "bg-dark-success/10 border border-dark-success/30 text-dark-success"
            : "bg-dark-warn/10 border border-dark-warn/30 text-dark-warn"
        }`}
      >
        {auth?.valid ? (
          <CheckCircle2 size={16} />
        ) : (
          <XCircle size={16} />
        )}
        {auth?.valid
          ? `LinkedIn connected \u2022 Token expires ${new Date(
              (auth.expiresAt || 0) * 1000
            ).toLocaleDateString()}`
          : "LinkedIn not connected \u2022 Run linkedin-mcp-auth oauth to connect"}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PIPELINE_COLUMNS.map((col) => {
          const Icon = col.icon;
          const count =
            stats?.pipeline?.[col.key as keyof PipelineStats] || 0;
          return (
            <div
              key={col.key}
              className={`rounded-xl border p-4 ${col.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={col.color} />
                <span className={`text-xs font-medium ${col.color}`}>
                  {col.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-dark-text">{count}</p>
            </div>
          );
        })}
        <div className="rounded-xl border bg-dark-bg border-dark-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-dark-muted" />
            <span className="text-xs font-medium text-dark-muted">
              Total Posts
            </span>
          </div>
          <p className="text-2xl font-bold text-dark-text">
            {stats?.total || 0}
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 bg-dark-panel rounded-lg border border-dark-border p-1 w-fit">
        {[
          { key: "pipeline", label: "Pipeline", icon: ArrowRight },
          { key: "calendar", label: "Calendar", icon: Calendar },
          { key: "analytics", label: "Analytics", icon: BarChart3 },
          { key: "writers", label: "Writers", icon: BookOpen },
          { key: "project", label: "Project", icon: Target },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as any)}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors ${
                view === tab.key
                  ? "bg-cm-purple text-white"
                  : "text-dark-muted hover:bg-dark-panel2"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Pipeline Board */}
      {view === "pipeline" && (
        <PipelineBoard
          items={items}
          onEdit={setEditingItem}
          onMove={moveContent}
          onDelete={deleteContent}
          onCreateIn={(status) => {
            setCreateInStatus(status);
            setShowCreateModal(true);
          }}
        />
      )}

      {/* Calendar View */}
      {view === "calendar" && <CalendarView items={items} onEdit={setEditingItem} />}

      {/* Analytics View */}
      {view === "analytics" && (
        <AnalyticsView
          stats={stats}
          items={items}
        />
      )}

      {/* Writers View */}
      {view === "writers" && (
        <WritersView
          writers={data?.writers || {}}
          onSave={saveWriter}
        />
      )}

      {/* Project View */}
      {view === "project" && (
        <ProjectView project={data?.project || null} />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ContentModal
          initialStatus={createInStatus}
          hashtagSets={data?.hashtagSets || {}}
          pillars={data?.project?.pillars?.map((p) => p.name) || []}
          onSave={async (item) => {
            await createContent(item);
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <ContentModal
          item={editingItem}
          hashtagSets={data?.hashtagSets || {}}
          pillars={data?.project?.pillars?.map((p) => p.name) || []}
          onSave={async (updates) => {
            await updateContent(editingItem.id, updates);
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onImport={async (text) => {
            await importIdeas(text);
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
