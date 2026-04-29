"use client";

import React from "react";
import Link from "next/link";
import {
  Plus,
  Video,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Trash2,
  ListTodo,
} from "lucide-react";
import { Client, Session, TodoItem, ClientLink, hoursRemainingColor, formatDate, typeColor } from "./types";

function linkIcon(hint?: string) {
  switch (hint) {
    case "sheet": return <FileSpreadsheet size={14} className="text-dark-success flex-shrink-0" />;
    case "notion": return <FileText size={14} className="text-cm-purple flex-shrink-0" />;
    case "video": return <Video size={14} className="text-dark-warn flex-shrink-0" />;
    default: return <ExternalLink size={14} className="text-dark-muted flex-shrink-0" />;
  }
}

interface OverviewTabProps {
  client: Client;
  clientId: string;
  lastSession: Session | null;
  clientLinks: ClientLink[];
  addingLink: boolean;
  newLinkLabel: string;
  newLinkUrl: string;
  newLinkHint: string;
  todoItems: TodoItem[];
  newTodoText: string;
  notesValue: string;
  savingNotes: boolean;
  progressPct: number;
  onSetAddingLink: (v: boolean) => void;
  onSetNewLinkLabel: (v: string) => void;
  onSetNewLinkUrl: (v: string) => void;
  onSetNewLinkHint: (v: string) => void;
  onAddLink: () => void;
  onRemoveLink: (idx: number) => void;
  onSetNewTodoText: (v: string) => void;
  onAddTodo: () => void;
  onToggleTodo: (id: string) => void;
  onRemoveTodo: (id: string) => void;
  onSetNotesValue: (v: string) => void;
  onSaveNotes: () => void;
}

export function OverviewTab({
  client,
  clientId,
  lastSession,
  clientLinks,
  addingLink,
  newLinkLabel,
  newLinkUrl,
  newLinkHint,
  todoItems,
  newTodoText,
  notesValue,
  savingNotes,
  progressPct,
  onSetAddingLink,
  onSetNewLinkLabel,
  onSetNewLinkUrl,
  onSetNewLinkHint,
  onAddLink,
  onRemoveLink,
  onSetNewTodoText,
  onAddTodo,
  onToggleTodo,
  onRemoveTodo,
  onSetNotesValue,
  onSaveNotes,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">

      {/* Hours Remaining — prominent */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6 flex items-center gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">Hours Remaining</p>
          <p className={`text-5xl font-bold ${hoursRemainingColor(client.hours_remaining)}`}>
            {client.hours_remaining.toFixed(2)}
          </p>
          <p className="text-xs text-dark-muted mt-1">{client.hours_purchased} purchased &bull; {client.hours_used.toFixed(1)} used</p>
        </div>
        <div className="flex-1">
          <div className="w-full h-4 bg-cm-purple/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct >= 90 ? "bg-dark-danger" : progressPct >= 70 ? "bg-dark-warn" : "bg-cm-purple"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-dark-muted mt-2">{progressPct}% of purchased hours used</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text">Quick Links</h3>
          <button
            onClick={() => onSetAddingLink(true)}
            className="flex items-center gap-1 text-xs text-cm-purple hover:text-[#5b4fa8] font-medium transition-colors"
          >
            <Plus size={12} />Add Link
          </button>
        </div>
        {clientLinks.length === 0 && !addingLink && (
          <p className="text-sm text-dark-muted">No links yet. Add important resources for this client.</p>
        )}
        <div className="space-y-2">
          {clientLinks.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              {linkIcon(link.icon_hint)}
              <a href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-sm text-cm-purple hover:text-[#5b4fa8] hover:underline truncate">
                {link.label}
              </a>
              <button
                onClick={() => onRemoveLink(idx)}
                className="opacity-0 group-hover:opacity-100 text-dark-muted hover:text-dark-danger transition-all p-1 rounded"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {addingLink && (
          <div className="mt-3 pt-3 border-t border-dark-border space-y-2">
            <input
              value={newLinkLabel}
              onChange={(e) => onSetNewLinkLabel(e.target.value)}
              placeholder="Label (e.g. Final Financial Model)"
              className="w-full border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text bg-dark-panel2 focus:outline-none focus:ring-1 focus:ring-cm-purple"
            />
            <input
              value={newLinkUrl}
              onChange={(e) => onSetNewLinkUrl(e.target.value)}
              placeholder="URL"
              className="w-full border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text bg-dark-panel2 focus:outline-none focus:ring-1 focus:ring-cm-purple"
            />
            <select
              value={newLinkHint}
              onChange={(e) => onSetNewLinkHint(e.target.value)}
              className="w-full border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text bg-dark-panel2 focus:outline-none focus:ring-1 focus:ring-cm-purple"
            >
              <option value="notion">Notion</option>
              <option value="sheet">Google Sheet</option>
              <option value="doc">Google Doc</option>
              <option value="video">Video</option>
              <option value="external">Other</option>
            </select>
            <div className="flex gap-2">
              <button onClick={onAddLink}
                className="px-3 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-semibold hover:bg-[#5b4fa8] transition-colors">
                Add
              </button>
              <button onClick={() => { onSetAddingLink(false); onSetNewLinkLabel(""); onSetNewLinkUrl(""); }}
                className="px-3 py-1.5 text-dark-muted hover:text-dark-text text-xs transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* To-Do / Next Steps */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListTodo size={15} className="text-cm-purple" />
          <h3 className="text-sm font-semibold tracking-tight text-dark-text">Next Steps</h3>
        </div>

        {/* Session-derived follow-ups from last session */}
        {lastSession && lastSession.joe_follow_ups && lastSession.joe_follow_ups.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-dark-muted mb-2 uppercase tracking-wide font-medium">
              From Session #{lastSession.session_number} &bull; {formatDate(lastSession.date)}
            </p>
            <div className="space-y-1.5">
              {lastSession.joe_follow_ups.map((item, i) => {
                const done = lastSession.joe_follow_ups_done?.includes(item);
                return (
                  <div key={i} className="flex items-start gap-2">
                    {done
                      ? <CheckCircle2 size={15} className="text-dark-success flex-shrink-0 mt-0.5" />
                      : <Circle size={15} className="text-dark-muted flex-shrink-0 mt-0.5" />
                    }
                    <span className={`text-sm ${done ? "line-through text-dark-muted" : "text-dark-text"}`}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual todos */}
        {todoItems.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {todoItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2 group">
                <button onClick={() => onToggleTodo(item.id)} className="flex-shrink-0 mt-0.5">
                  {item.done
                    ? <CheckCircle2 size={15} className="text-dark-success" />
                    : <Circle size={15} className="text-dark-muted hover:text-cm-purple transition-colors" />
                  }
                </button>
                <span className={`flex-1 text-sm ${item.done ? "line-through text-dark-muted" : "text-dark-text"}`}>
                  {item.text}
                </span>
                <button onClick={() => onRemoveTodo(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-dark-muted hover:text-dark-danger transition-all p-0.5">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {todoItems.length === 0 && (!lastSession || !lastSession.joe_follow_ups?.length) && (
          <p className="text-sm text-dark-muted mb-3">No open items. Add a to-do below.</p>
        )}

        {/* Add new manual todo */}
        <div className="flex gap-2 mt-2">
          <input
            value={newTodoText}
            onChange={(e) => onSetNewTodoText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAddTodo(); }}
            placeholder="Add a to-do..."
            className="flex-1 border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text bg-dark-panel2 focus:outline-none focus:ring-1 focus:ring-cm-purple"
          />
          <button onClick={onAddTodo}
            className="px-3 py-1.5 bg-cm-purple text-white rounded-lg text-xs font-semibold hover:bg-[#5b4fa8] transition-colors">
            Add
          </button>
        </div>
      </div>

      {/* Recent Session Summary */}
      {lastSession && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3">Most Recent Session</h3>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cm-purple/15 text-cm-purple text-sm font-bold">
              #{lastSession.session_number}
            </span>
            <span className="text-sm font-medium text-dark-text">{formatDate(lastSession.date)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(lastSession.type)}`}>
              {lastSession.type}
            </span>
            <span className="text-xs text-dark-muted">{lastSession.hours_logged.toFixed(1)} hrs</span>
            {lastSession.zoom_recording_url && (
              <a href={lastSession.zoom_recording_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-cm-purple hover:text-[#5b4fa8] flex items-center gap-1">
                <Video size={12} />Recording
              </a>
            )}
          </div>
          {lastSession.ai_summary && (
            <p className="text-sm text-dark-muted leading-relaxed">{lastSession.ai_summary}</p>
          )}
          {lastSession.key_points && lastSession.key_points.length > 0 && (
            <ul className="mt-3 space-y-1">
              {lastSession.key_points.map((kp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-dark-muted">
                  <span className="text-cm-purple flex-shrink-0 mt-1">&#x2022;</span>
                  {kp}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-dark-border">
            <Link href={`/app/mentorships/${clientId}/sessions/${lastSession.id}/wrap-up`}
              className="text-xs text-cm-purple hover:text-[#5b4fa8] font-medium">
              Open full session &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-2">Notes</h3>
        <textarea
          value={notesValue}
          onChange={(e) => onSetNotesValue(e.target.value)}
          onBlur={onSaveNotes}
          rows={6}
          placeholder="Add notes about this client..."
          className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text bg-dark-panel2 focus:outline-none focus:ring-2 focus:ring-cm-purple resize-y"
        />
        {savingNotes && <p className="text-xs text-cm-purple mt-1">Saving...</p>}
      </div>
    </div>
  );
}
