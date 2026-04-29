"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  HelpCircle, Plus, X, Save, Loader2, Trash2, Edit2, Search, Check, Wand2,
} from "lucide-react";

interface Participant {
  id: number;
  full_name: string;
}

interface Question {
  id: number;
  question: string;
  answer: string | null;
  asked_by: number | null;
  participant_name: string | null;
  participant_photo_url: string | null;
  answered: boolean;
  sent_to_participant: boolean;
  created_at: string;
  updated_at: string;
}

/* -- QuestionDetailModal ------------------------------------------- */

function QuestionDetailModal({
  question: init,
  onClose,
  onSave,
}: {
  question: Question;
  onClose: () => void;
  onSave: (data: {
    id: number;
    question: string;
    answer: string;
    answered: boolean;
    sent_to_participant: boolean;
  }) => Promise<void>;
}) {
  const [questionText, setQuestionText] = useState(init.question);
  const [answer, setAnswer] = useState(init.answer ?? "");
  const [answered, setAnswered] = useState(init.answered);
  const [sentToParticipant, setSentToParticipant] = useState(init.sent_to_participant);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleRegenerate = async () => {
    if (!init?.id) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/online-program/questions/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: init.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnswer(data.question.answer ?? "");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = async () => {
    if (!questionText.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: init.id,
        question: questionText.trim(),
        answer: answer.trim(),
        answered,
        sent_to_participant: sentToParticipant,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const initials = init.participant_name
    ? init.participant_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-[92vw] max-w-[92vw] h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel shrink-0">
          <div className="flex items-center gap-3">
            {init.participant_photo_url ? (
              <img
                src={init.participant_photo_url}
                alt={init.participant_name ?? ""}
                className="w-10 h-10 rounded-full object-cover border border-dark-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-cm-purple/100/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
            )}
            <div>
              <p className="font-semibold text-dark-text text-sm">
                {init.participant_name ?? "Unknown Participant"}
              </p>
              <p className="text-xs text-dark-muted">
                {new Date(init.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-panel2 transition-colors text-dark-muted hover:text-dark-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-2 block">
              Question
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full border border-dark-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-bg focus:bg-dark-panel2 transition-colors resize-vertical"
              style={{ minHeight: "200px" }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-2 block">
              Answer
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the answer..."
              className="w-full border border-dark-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-bg focus:bg-dark-panel2 transition-colors resize-vertical"
              style={{ minHeight: "300px" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border bg-dark-bg flex items-center gap-4 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setAnswered((v) => !v)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                answered
                  ? "bg-cm-purple border-cm-purple text-white"
                  : "border-dark-border hover:border-cm-purple"
              }`}
            >
              {answered && <Check size={12} />}
            </button>
            <span className="text-sm font-medium text-dark-muted">Answered</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setSentToParticipant((v) => !v)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                sentToParticipant
                  ? "bg-violet-500/100 border-violet-500 text-white"
                  : "border-dark-border hover:border-cm-purple"
              }`}
            >
              {sentToParticipant && <Check size={12} />}
            </button>
            <span className="text-sm font-medium text-dark-muted">Sent to Participant</span>
          </label>

          <button
            onClick={handleRegenerate}
            disabled={regenerating || saving}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple hover:bg-cm-purple/80 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors mr-auto"
          >
            {regenerating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {regenerating ? "Generating..." : "Generate Answer"}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !questionText.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-cm-purple hover:bg-cm-purple/80 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -- QuestionModal (Add/Edit small form) --------------------------- */

function QuestionModal({
  question: init,
  participants,
  onClose,
  onSave,
}: {
  question: Question | null;
  participants: Participant[];
  onClose: () => void;
  onSave: (data: {
    id?: number;
    question: string;
    answer: string;
    asked_by: number | null;
    answered: boolean;
    sent_to_participant: boolean;
  }) => Promise<void>;
}) {
  const [questionText, setQuestionText] = useState(init?.question ?? "");
  const [answer, setAnswer] = useState(init?.answer ?? "");
  const [askedBy, setAskedBy] = useState<number | null>(init?.asked_by ?? null);
  const [answered, setAnswered] = useState(init?.answered ?? false);
  const [sentToParticipant, setSentToParticipant] = useState(init?.sent_to_participant ?? false);
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!questionText.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: init?.id,
        question: questionText.trim(),
        answer: answer.trim(),
        asked_by: askedBy,
        answered,
        sent_to_participant: sentToParticipant,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel">
          <h2 className="text-lg font-bold tracking-tight text-dark-text">
            {init ? "Edit Question" : "Add Question"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-panel2 transition-colors text-dark-muted hover:text-dark-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1 block">
              Question *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the question..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-bg focus:bg-dark-panel2 transition-colors resize-none h-24"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1 block">
              Answer
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the answer (optional)..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-bg focus:bg-dark-panel2 transition-colors resize-none h-24"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1 block">
              Asked By
            </label>
            <select
              value={askedBy ?? ""}
              onChange={(e) => setAskedBy(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-bg focus:bg-dark-panel2 transition-colors"
            >
              <option value="">-- None --</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setAnswered((v) => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  answered
                    ? "bg-cm-purple border-cm-purple text-white"
                    : "border-dark-border hover:border-cm-purple"
                }`}
              >
                {answered && <Check size={12} />}
              </button>
              <span className="text-sm text-dark-muted">Answered</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setSentToParticipant((v) => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  sentToParticipant
                    ? "bg-violet-500/100 border-violet-500 text-white"
                    : "border-dark-border hover:border-cm-purple"
                }`}
              >
                {sentToParticipant && <Check size={12} />}
              </button>
              <span className="text-sm text-dark-muted">Sent to Participant</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border bg-dark-bg flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !questionText.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-cm-purple hover:bg-cm-purple/80 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -- SortableHeader ----------------------------------------------- */

function SortableHeader({ label, col, sortCol, sortDir, onSort }: {
  label: string; col: string; sortCol: string | null; sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
}) {
  const active = sortCol === col;
  return (
    <button onClick={() => onSort(col)} className="flex items-center gap-1 group/sort">
      {label}
      <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}>
        {active && sortDir === 'asc' ? '↑' : active && sortDir === 'desc' ? '↓' : '↕'}
      </span>
    </button>
  );
}

/* -- Main Page ---------------------------------------------------- */

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateToast, setGenerateToast] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const [qRes, pRes] = await Promise.all([
        fetch("/api/online-program/questions"),
        fetch("/api/online-program/participants"),
      ]);
      if (!qRes.ok) throw new Error(await qRes.text());
      if (!pRes.ok) throw new Error(await pRes.text());
      const qData = await qRes.json();
      const pData = await pRes.json();
      setQuestions(
        (qData.questions ?? []).map((q: Record<string, unknown>) => ({
          ...q,
          answered: q.answered === 1,
          sent_to_participant: q.sent_to_participant === 1,
        }))
      );
      setParticipants(
        (pData.participants ?? []).map((p: Record<string, unknown>) => ({
          id: p.id,
          full_name: p.full_name,
        }))
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: {
    id?: number;
    question: string;
    answer: string;
    asked_by?: number | null;
    answered: boolean;
    sent_to_participant: boolean;
  }) => {
    const method = data.id ? "PUT" : "POST";
    const res = await fetch("/api/online-program/questions", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    await load();
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/online-program/questions?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const toggleField = async (
    id: number,
    field: "answered" | "sent_to_participant",
    value: boolean
  ) => {
    await fetch("/api/online-program/questions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleGenerateAnswers = async () => {
    setGenerating(true);
    setGenerateToast(null);
    try {
      const res = await fetch("/api/online-program/questions/generate-answers", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      await load();
      setGenerateToast(
        data.processed === 0
          ? "No unanswered questions found."
          : `Generated answers for ${data.processed} question${data.processed === 1 ? "" : "s"}.`
      );
      setTimeout(() => setGenerateToast(null), 5000);
    } catch (e) {
      setGenerateToast(`Error: ${String(e)}`);
      setTimeout(() => setGenerateToast(null), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const filtered = search
    ? questions.filter((q) =>
        [q.question, q.answer, q.participant_name]
          .some((f) => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : questions;

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        let av: string | number | null = null;
        let bv: string | number | null = null;
        if (sortCol === 'question') { av = a.question; bv = b.question; }
        else if (sortCol === 'asked_by') { av = a.participant_name; bv = b.participant_name; }
        else if (sortCol === 'answered') { av = a.answered ? 1 : 0; bv = b.answered ? 1 : 0; }
        else if (sortCol === 'sent') { av = a.sent_to_participant ? 1 : 0; bv = b.sent_to_participant ? 1 : 0; }
        else if (sortCol === 'date') { av = a.created_at; bv = b.created_at; }

        if (av === null || av === undefined) return sortDir === 'asc' ? 1 : -1;
        if (bv === null || bv === undefined) return sortDir === 'asc' ? -1 : 1;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mr-3" size={28} />
        <span className="text-dark-muted">Loading questions...</span>
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
        <h1 className="text-xl font-bold tracking-tight text-dark-text flex items-center gap-2">
          <HelpCircle size={20} className="text-cm-purple" />
          Unanswered Questions
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAnswers}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple hover:bg-cm-purple/80 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {generating
              ? <Loader2 size={14} className="animate-spin" />
              : <Wand2 size={14} />}
            {generating ? "Generating..." : "Generate Answers"}
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple hover:bg-cm-purple/80 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Add Question
          </button>
        </div>
      </div>

      {/* Generate toast */}
      {generateToast && (
        <div className="px-4 py-3 bg-violet-500/10 border border-violet-200 rounded-xl text-sm text-violet-700 flex items-center justify-between">
          <span>{generateToast}</span>
          <button onClick={() => setGenerateToast(null)} className="text-violet-400 hover:text-violet-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions, answers, participants..."
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
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted">
                  <SortableHeader label="Question" col="question" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted hidden md:table-cell">Answer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted hidden lg:table-cell">
                  <SortableHeader label="Asked By" col="asked_by" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted text-center">
                  <SortableHeader label="Answered" col="answered" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted text-center hidden md:table-cell">
                  <SortableHeader label="Sent" col="sent" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dark-muted hidden lg:table-cell">
                  <SortableHeader label="Date" col="date" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {sorted.map((q) => (
                <tr
                  key={q.id}
                  className="hover:bg-cm-purple/10/40 transition-colors group cursor-pointer"
                >
                  <td
                    className="px-4 py-3"
                    onClick={() => setDetailQuestion(q)}
                  >
                    <p className="text-dark-text font-medium line-clamp-2">{q.question}</p>
                  </td>
                  <td
                    className="px-4 py-3 hidden md:table-cell"
                    onClick={() => setDetailQuestion(q)}
                  >
                    {q.answer ? (
                      <p className="text-dark-muted line-clamp-2 text-xs">{q.answer}</p>
                    ) : (
                      <span className="text-dark-muted">--</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 hidden lg:table-cell"
                    onClick={() => setDetailQuestion(q)}
                  >
                    {q.participant_name ? (
                      <span className="text-xs px-2 py-0.5 bg-violet-500/100/20 text-violet-300 rounded-full font-medium">
                        {q.participant_name}
                      </span>
                    ) : (
                      <span className="text-dark-muted">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleField(q.id, "answered", !q.answered);
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          q.answered
                            ? "bg-cm-purple border-cm-purple text-white"
                            : "border-dark-border hover:border-cm-purple"
                        }`}
                      >
                        {q.answered && <Check size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleField(q.id, "sent_to_participant", !q.sent_to_participant);
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          q.sent_to_participant
                            ? "bg-violet-500/100 border-violet-500 text-white"
                            : "border-dark-border hover:border-cm-purple"
                        }`}
                      >
                        {q.sent_to_participant && <Check size={12} />}
                      </button>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 hidden lg:table-cell"
                    onClick={() => setDetailQuestion(q)}
                  >
                    <span className="text-xs text-dark-muted">
                      {new Date(q.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(q);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-cm-purple/20 text-dark-muted hover:text-cm-purple transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(q.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-dark-danger/20 text-dark-muted hover:text-dark-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-dark-muted">
                    {search
                      ? `No questions matching "${search}"`
                      : "No questions yet. Click Add Question to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-dark-border text-xs text-dark-muted">
          {sorted.length} of {questions.length} questions
        </div>
      </div>

      {/* Detail Modal (row click) */}
      {detailQuestion && (
        <QuestionDetailModal
          question={detailQuestion}
          onClose={() => setDetailQuestion(null)}
          onSave={async (data) => {
            await handleSave({
              id: data.id,
              question: data.question,
              answer: data.answer,
              answered: data.answered,
              sent_to_participant: data.sent_to_participant,
            });
            setDetailQuestion(null);
          }}
        />
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <QuestionModal
          question={editing}
          participants={participants}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
