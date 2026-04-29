"use client";

import { useState } from "react";
import {
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Star,
  Package,
  ExternalLink,
  Plus,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  FileText,
  CheckCircle,
  Clock,
  Eye,
  Edit3,
  Download,
  Save,
  X,
} from "lucide-react";
import { usePromptPacks } from "@/hooks/usePromptPacks";

const STATUS_COLORS: Record<string, string> = {
  ready: "bg-dark-success/20 text-dark-success",
  draft: "bg-dark-warn/20 text-dark-warn",
  listed: "bg-cm-purple/20 text-cm-purple",
  archived: "bg-dark-panel2 text-dark-muted",
};

export default function PromptPacksPage() {
  const { packs, bundles, feedback, newPackIdeas, stats, isLoading, error, refresh, addIdea } = usePromptPacks();
  const [newIdea, setNewIdea] = useState("");
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [modalPack, setModalPack] = useState<{ id: string; name: string } | null>(null);
  const [modalContent, setModalContent] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalEditing, setModalEditing] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-dark-muted" size={24} />
        <span className="ml-2 text-dark-muted">Loading prompt packs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-4">
        <p className="text-dark-danger">Error: {error}</p>
        <button onClick={refresh} className="mt-2 text-sm text-dark-danger underline">Retry</button>
      </div>
    );
  }

  const handleAddIdea = async () => {
    if (!newIdea.trim()) return;
    await addIdea(newIdea.trim());
    setNewIdea("");
  };

  const openModal = async (packId: string, packName: string, edit: boolean) => {
    setModalPack({ id: packId, name: packName });
    setModalEditing(edit);
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/prompt-packs/${packId}`);
      if (!res.ok) throw new Error("Failed to load pack content");
      const data = await res.json();
      setModalContent(data.content);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalPack(null);
    setModalContent("");
    setModalEditing(false);
    setModalError(null);
  };

  const saveContent = async () => {
    if (!modalPack) return;
    setModalSaving(true);
    try {
      const res = await fetch(`/api/prompt-packs/${modalPack.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: modalContent }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setModalEditing(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Modal */}
      {modalPack && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-panel rounded-xl shadow-2xl shadow-black/40 w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-cm-purple" />
                <h2 className="font-semibold  text-lg text-dark-text">{modalPack.name}</h2>
                {modalEditing && (
                  <span className="text-xs bg-dark-warn/20 text-dark-warn px-2 py-0.5 rounded-full">Editing</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!modalEditing && !modalLoading && (
                  <button
                    onClick={() => setModalEditing(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-cm-purple/10 text-cm-purple rounded-lg hover:bg-cm-purple/20"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                {modalEditing && (
                  <button
                    onClick={saveContent}
                    disabled={modalSaving}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
                  >
                    <Save size={14} /> {modalSaving ? "Saving..." : "Save"}
                  </button>
                )}
                <a
                  href={`/api/prompt-packs/${modalPack.id}/pdf`}
                  download
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-border"
                >
                  <Download size={14} /> PDF
                </a>
                <button onClick={closeModal} className="p-1.5 hover:bg-dark-panel2 rounded-lg">
                  <X size={18} className="text-dark-muted" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="animate-spin text-dark-muted" size={20} />
                  <span className="ml-2 text-dark-muted">Loading content...</span>
                </div>
              ) : modalError ? (
                <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-4 text-dark-danger">{modalError}</div>
              ) : modalEditing ? (
                <textarea
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  className="w-full h-[60vh] font-mono font-dm-mono text-sm p-4 border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple resize-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono font-dm-mono text-sm text-dark-text leading-relaxed">
                  {modalContent}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-dark-border text-xs text-dark-muted flex justify-between">
              <span>Source: ~/.attache/workspace/prompt-packs/{modalPack.id}/prompts.txt</span>
              <span>{modalContent.split("\n").length} lines</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text">Prompt Packs</h1>
          <p className="text-dark-muted text-sm mt-1">AI prompt packs for professionals - $9 each, $39 bundle of 5, $69 all-access</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 bg-dark-panel border border-dark-border rounded-lg hover:bg-dark-panel2 text-sm text-dark-text">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-dark-muted text-sm mb-1">
            <DollarSign size={16} /> Total Revenue
          </div>
          <p className="text-2xl font-bold text-dark-text">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-dark-muted text-sm mb-1">
            <ShoppingCart size={16} /> Total Sales
          </div>
          <p className="text-2xl font-bold text-dark-text">{stats.totalSales}</p>
        </div>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-dark-muted text-sm mb-1">
            <Star size={16} /> Avg Rating
          </div>
          <p className="text-2xl font-bold text-dark-text">{stats.avgRating ? stats.avgRating.toFixed(1) : "N/A"}</p>
        </div>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 text-dark-muted text-sm mb-1">
            <Package size={16} /> Packs Ready
          </div>
          <p className="text-2xl font-bold text-dark-text">{packs.filter(p => p.status === "ready" || p.status === "listed").length} / {packs.length}</p>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-lg border border-cm-purple/20 p-4">
        <h3 className="font-semibold  text-cm-purple mb-2 flex items-center gap-2"><TrendingUp size={16} /> Pricing Strategy</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-dark-panel rounded-lg p-3 border border-dark-border">
            <p className="font-bold text-lg text-cm-purple">$9</p>
            <p className="text-dark-muted">Single Pack</p>
            <p className="text-xs text-dark-muted">75-80 prompts</p>
          </div>
          <div className="bg-dark-panel rounded-lg p-3 border border-dark-border">
            <p className="font-bold text-lg text-cm-purple">$39</p>
            <p className="text-dark-muted">Pick Any 5</p>
            <p className="text-xs text-dark-muted">Save $6 (13% off)</p>
          </div>
          <div className="bg-dark-panel rounded-lg p-3 border border-dark-border">
            <p className="font-bold text-lg text-cm-purple">$69</p>
            <p className="text-dark-muted">All 10 Packs</p>
            <p className="text-xs text-dark-muted">Save $21 (23% off)</p>
          </div>
        </div>
      </div>

      {/* Pack Grid */}
      <div>
        <h3 className="font-semibold  text-dark-text mb-3 flex items-center gap-2"><FileText size={16} /> All Packs ({packs.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packs.map((pack) => (
            <div key={pack.id} className="bg-dark-panel rounded-lg border border-dark-border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-dark-text">{pack.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[pack.status] || STATUS_COLORS.draft}`}>
                      {pack.status}
                    </span>
                  </div>
                  <p className="text-sm text-dark-muted">{pack.promptCount} prompts across {pack.sections.length} categories</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-dark-text">${pack.price}</p>
                  <p className="text-xs text-dark-muted">{pack.sales} sales</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => openModal(pack.id, pack.name, false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-border"
                >
                  <Eye size={12} /> View
                </button>
                <button
                  onClick={() => openModal(pack.id, pack.name, true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-cm-purple/10 text-cm-purple rounded-lg hover:bg-cm-purple/20"
                >
                  <Edit3 size={12} /> Edit
                </button>
                <a
                  href={`/api/prompt-packs/${pack.id}/pdf`}
                  download
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-dark-success/10 text-dark-success rounded-lg hover:bg-dark-success/20"
                >
                  <Download size={12} /> PDF
                </a>
              </div>

              {/* Expand/collapse sections */}
              <button
                onClick={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)}
                className="text-xs text-cm-purple hover:underline mt-2"
              >
                {expandedPack === pack.id ? "Hide sections" : "Show sections"}
              </button>

              {expandedPack === pack.id && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {pack.sections.map((s) => (
                    <span key={s} className="text-xs bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dark-border text-xs text-dark-muted">
                <span className="flex items-center gap-1">
                  <DollarSign size={12} /> ${pack.revenue.toFixed(2)} revenue
                </span>
                {pack.gumroadUrl ? (
                  <a href={pack.gumroadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cm-purple hover:underline">
                    <ExternalLink size={12} /> Gumroad
                  </a>
                ) : (
                  <span className="flex items-center gap-1 text-dark-warn">
                    <Clock size={12} /> Not listed yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bundles */}
      <div>
        <h3 className="font-semibold  text-dark-text mb-3 flex items-center gap-2"><Package size={16} /> Bundles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles.map((bundle) => (
            <div key={bundle.id} className="bg-dark-panel rounded-lg border border-dark-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-dark-text">{bundle.name}</h4>
                  <p className="text-sm text-dark-muted">{bundle.sales} sales | ${bundle.revenue.toFixed(2)} revenue</p>
                </div>
                <p className="font-bold text-xl text-dark-text">${bundle.price}</p>
              </div>
              {bundle.gumroadUrl ? (
                <a href={bundle.gumroadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cm-purple hover:underline flex items-center gap-1 mt-2">
                  <ExternalLink size={12} /> View on Gumroad
                </a>
              ) : (
                <p className="text-xs text-dark-warn flex items-center gap-1 mt-2"><Clock size={12} /> Not listed yet</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Customer Feedback */}
      <div>
        <h3 className="font-semibold  text-dark-text mb-3 flex items-center gap-2"><MessageSquare size={16} /> Customer Feedback ({feedback.length})</h3>
        {feedback.length === 0 ? (
          <div className="bg-dark-panel rounded-lg border border-dark-border p-6 text-center text-dark-muted">
            No customer feedback yet. Feedback will appear here once packs are listed and sold.
          </div>
        ) : (
          <div className="space-y-2">
            {feedback.map((f) => (
              <div key={f.id} className="bg-dark-panel rounded-lg border border-dark-border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">{"*".repeat(f.rating)}</span>
                  <span className="text-xs text-dark-muted">{packs.find(p => p.id === f.packId)?.name}</span>
                </div>
                <p className="text-sm text-dark-text mt-1">{f.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Pack Ideas */}
      <div>
        <h3 className="font-semibold  text-dark-text mb-3 flex items-center gap-2"><Lightbulb size={16} /> New Pack Ideas</h3>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {newPackIdeas.map((idea, i) => (
              <span key={i} className="text-sm bg-dark-warn/10 text-dark-warn border border-dark-warn/30 px-3 py-1 rounded-full">
                {idea}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddIdea()}
              placeholder="Add a new pack idea..."
              className="flex-1 px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
            <button onClick={handleAddIdea} className="px-3 py-2 bg-cm-purple text-white rounded-lg text-sm hover:bg-cm-purple/80 flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Next Steps Checklist */}
      <div>
        <h3 className="font-semibold  text-dark-text mb-3 flex items-center gap-2"><CheckCircle size={16} /> Launch Checklist</h3>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4 space-y-2">
          {[
            { done: true, text: "Create 10 profession-specific prompt packs (75-80 prompts each)" },
            { done: true, text: "Write Gumroad listing descriptions for each pack" },
            { done: true, text: "Set up pricing tiers ($9 / $39 / $69)" },
            { done: true, text: "Build Mission Control dashboard" },
            { done: true, text: "Generate PDF versions of each pack" },
            { done: false, text: "Create preview images for Gumroad listings" },
            { done: false, text: "Upload packs to Gumroad" },
            { done: false, text: "Share in relevant communities (Reddit, Facebook groups, LinkedIn)" },
            { done: false, text: "Set up affiliate program on Gumroad" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${item.done ? "bg-dark-success border-dark-success" : "border-dark-muted"}`}>
                {item.done && <CheckCircle size={10} className="text-dark-bg" />}
              </div>
              <span className={item.done ? "text-dark-muted line-through" : "text-dark-text"}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
