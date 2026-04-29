"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Linkedin,
  Globe,
  Mail,
  Instagram,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  Client,
  Session,
  Payment,
  ClientLink,
  TodoItem,
  TabId,
  getInitials,
  statusColor,
  hoursRemainingColor,
  cleanText,
} from "./sections/types";
import { LogSessionModal } from "./sections/LogSessionModal";
import { AddPaymentModal } from "./sections/AddPaymentModal";
import { OverviewTab } from "./sections/OverviewTab";
import { DetailsTab } from "./sections/DetailsTab";
import { SessionsTab } from "./sections/SessionsTab";
import { BusinessTab } from "./sections/BusinessTab";
import { ResearchTab } from "./sections/ResearchTab";

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Tab
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Modals
  const [showLogSession, setShowLogSession] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);

  // Notes
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Links
  const [clientLinks, setClientLinks] = useState<ClientLink[]>([]);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkHint, setNewLinkHint] = useState("notion");

  // Todos
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState("");

  // Hero card
  const [heroExpanded, setHeroExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${clientId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setClient(data.client);
      setSessions(data.sessions || []);
      setPayments(data.payments || []);
      setNotesValue(data.client.notes || "");
      setClientLinks(data.client.links || []);
      setTodoItems(data.client.todo_items || []);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function patchClient(patch: object) {
    await fetch(`/api/mentorships/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function saveNotes() {
    if (!client) return;
    setSavingNotes(true);
    try { await patchClient({ notes: notesValue }); } finally { setSavingNotes(false); }
  }

  async function addLink() {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    const updated = [...clientLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim(), icon_hint: newLinkHint }];
    setClientLinks(updated);
    setAddingLink(false);
    setNewLinkLabel("");
    setNewLinkUrl("");
    setNewLinkHint("notion");
    await patchClient({ links: updated });
  }

  async function removeLink(idx: number) {
    const updated = clientLinks.filter((_, i) => i !== idx);
    setClientLinks(updated);
    await patchClient({ links: updated });
  }

  async function addTodo() {
    if (!newTodoText.trim()) return;
    const item: TodoItem = { id: `todo-${Date.now()}`, text: newTodoText.trim(), done: false, source: "manual", created_at: new Date().toISOString() };
    const updated = [...todoItems, item];
    setTodoItems(updated);
    setNewTodoText("");
    await patchClient({ todo_items: updated });
  }

  async function toggleTodo(id: string) {
    const updated = todoItems.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    setTodoItems(updated);
    await patchClient({ todo_items: updated });
  }

  async function removeTodo(id: string) {
    const updated = todoItems.filter((t) => t.id !== id);
    setTodoItems(updated);
    await patchClient({ todo_items: updated });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-cm-purple" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={40} className="text-dark-danger" />
        <p className="text-dark-danger">{error || "Client not found"}</p>
        <Link href="/app/mentorships" className="text-cm-purple hover:text-[#5b4fa8] text-sm">Back to Mentorships</Link>
      </div>
    );
  }

  const progressPct = client.hours_purchased > 0
    ? Math.min(100, Math.round((client.hours_used / client.hours_purchased) * 100))
    : 0;

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalHoursPaid = payments.reduce((sum, p) => sum + p.hours_purchased, 0);

  const completedSessions = [...sessions]
    .filter((s) => s.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastSession = completedSessions[0] ?? null;

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "project", label: "Sessions" },
    { id: "details", label: "Detailed Information" },
    { id: "business", label: "About Business" },
    { id: "research", label: "Research" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <div className="bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-2xl p-5 md:p-6">
        <Link href="/app/mentorships"
          className="inline-flex items-center gap-1.5 text-cm-purple hover:text-[#5b4fa8] text-sm mb-3">
          <ArrowLeft size={16} />Back to all Mentorships
        </Link>
        <div className="flex items-start gap-4">
          {client.photo_url ? (
            <img src={client.photo_url} alt={client.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-cm-purple/30 shadow-sm shadow-black/20 flex-shrink-0 mt-0.5" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-cm-purple text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-black/20 flex-shrink-0 mt-0.5">
              {getInitials(client.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-dark-text">{client.name}</h1>
              <div className="flex items-center gap-3">
                {client.email && (
                  <a href={`mailto:${client.email}`}
                    className="text-cm-purple hover:text-[#5b4fa8]" title={client.email}>
                    <Mail size={16} />
                  </a>
                )}
                {client.linkedin_url && (
                  <a href={client.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-cm-purple hover:text-[#5b4fa8]" title="LinkedIn">
                    <Linkedin size={16} />
                  </a>
                )}
                {client.instagram_url && (
                  <a href={client.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="text-cm-purple hover:text-[#5b4fa8]" title="Instagram">
                    <Instagram size={16} />
                  </a>
                )}
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer"
                    className="text-cm-purple hover:text-[#5b4fa8]" title={client.website}>
                    <Globe size={16} />
                  </a>
                )}
                {client.website_seven_seeds && (
                  <a href={client.website_seven_seeds} target="_blank" rel="noopener noreferrer"
                    className="text-cm-purple hover:text-[#5b4fa8]" title={client.website_seven_seeds}>
                    <Globe size={16} />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => setHeroExpanded(!heroExpanded)}
              className="mt-1 flex items-center gap-1 text-xs text-dark-muted hover:text-dark-text transition-colors"
            >
              {heroExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {heroExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${statusColor(client.status)}`}>
            {client.status}
          </span>
        </div>
        {heroExpanded && (
          <div className="mt-4 pt-4 border-t border-dark-border/50 space-y-2">
            {client.bio && cleanText(client.bio).split("\n\n").map((para, i) => (
              <p key={i} className="text-sm text-dark-muted leading-relaxed">{para.replace(/\n/g, " ")}</p>
            ))}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Hours Purchased", value: client.hours_purchased },
          { label: "Hours Used", value: client.hours_used.toFixed(1) },
          {
            label: "Hours Remaining",
            value: client.hours_remaining.toFixed(1),
            valueClass: hoursRemainingColor(client.hours_remaining),
          },
          { label: "Total Paid", value: `$${client.total_paid.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
              <Clock size={14} className="text-cm-purple" />
              {s.label}
            </div>
            <p className={`text-2xl font-bold ${s.valueClass ?? "text-dark-text"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-dark-border pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-colors border ${
              activeTab === tab.id
                ? "bg-cm-purple text-white border-cm-purple"
                : "bg-dark-panel2 border-dark-border text-dark-muted hover:text-dark-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB 1: OVERVIEW ===== */}
      {activeTab === "overview" && (
        <OverviewTab
          client={client}
          clientId={clientId}
          lastSession={lastSession}
          clientLinks={clientLinks}
          addingLink={addingLink}
          newLinkLabel={newLinkLabel}
          newLinkUrl={newLinkUrl}
          newLinkHint={newLinkHint}
          todoItems={todoItems}
          newTodoText={newTodoText}
          notesValue={notesValue}
          savingNotes={savingNotes}
          progressPct={progressPct}
          onSetAddingLink={setAddingLink}
          onSetNewLinkLabel={setNewLinkLabel}
          onSetNewLinkUrl={setNewLinkUrl}
          onSetNewLinkHint={setNewLinkHint}
          onAddLink={addLink}
          onRemoveLink={removeLink}
          onSetNewTodoText={setNewTodoText}
          onAddTodo={addTodo}
          onToggleTodo={toggleTodo}
          onRemoveTodo={removeTodo}
          onSetNotesValue={setNotesValue}
          onSaveNotes={saveNotes}
        />
      )}

      {/* ===== TAB 2: DETAILED INFORMATION ===== */}
      {activeTab === "details" && (
        <DetailsTab client={client} completedSessions={completedSessions} />
      )}

      {/* ===== TAB 3: SESSIONS ===== */}
      {activeTab === "project" && (
        <SessionsTab
          sessions={sessions}
          payments={payments}
          clientId={clientId}
          totalPayments={totalPayments}
          totalHoursPaid={totalHoursPaid}
          onLogSession={() => setShowLogSession(true)}
          onAddPayment={() => setShowAddPayment(true)}
          onUpdated={fetchData}
        />
      )}

      {/* ===== TAB 4: ABOUT HER BUSINESS ===== */}
      {activeTab === "business" && (
        <BusinessTab clientId={clientId} clientName={client.name} />
      )}

      {/* ===== TAB 5: RESEARCH ===== */}
      {activeTab === "research" && (
        <ResearchTab
          clientId={clientId}
          clientName={client.name}
          clientEmail={client.email || undefined}
          whatsappJid={client.whatsapp_jid}
          telegramChatId={client.telegram_chat_id}
        />
      )}

      {/* Modals */}
      {showLogSession && (
        <LogSessionModal
          clientId={clientId}
          onClose={() => setShowLogSession(false)}
          onCreated={() => { setShowLogSession(false); fetchData(); }}
        />
      )}
      {showAddPayment && (
        <AddPaymentModal
          clientId={clientId}
          onClose={() => setShowAddPayment(false)}
          onCreated={() => { setShowAddPayment(false); fetchData(); }}
        />
      )}
    </div>
  );
}
