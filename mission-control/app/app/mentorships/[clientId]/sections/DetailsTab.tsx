"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Instagram,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Client, Session, cleanText, formatDate } from "./types";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  previewText?: string;
}

function CollapsibleSection({ title, children, previewText }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <h3 className="text-sm font-semibold tracking-tight text-dark-text">{title}</h3>
        {expanded ? <ChevronUp size={15} className="text-dark-muted flex-shrink-0" /> : <ChevronDown size={15} className="text-dark-muted flex-shrink-0" />}
      </button>
      {!expanded && previewText && (
        <p className="mt-2 text-sm text-dark-muted line-clamp-1">{previewText}</p>
      )}
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  );
}

interface DetailsTabProps {
  client: Client;
  completedSessions: Session[];
}

export function DetailsTab({ client, completedSessions }: DetailsTabProps) {
  return (
    <div className="space-y-6">

      {/* Bio */}
      {client.bio && (
        <CollapsibleSection title="About her" previewText={cleanText(client.bio).split("\n\n").map((p) => p.replace(/\n/g, " ")).join(" ")}>
          <div className="space-y-3">
            {cleanText(client.bio).split("\n\n").map((para, i) => (
              <p key={i} className="text-sm text-dark-muted leading-relaxed">{para}</p>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Focus Areas */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3">Focus Areas</h3>
        {client.focus_areas.length === 0 ? (
          <p className="text-sm text-dark-muted">No focus areas defined.</p>
        ) : (
          <ul className="space-y-2">
            {client.focus_areas.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-dark-muted">
                <CheckCircle2 size={14} className="text-cm-purple flex-shrink-0 mt-0.5" />
                {area}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contact */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3">Contact</h3>
        <div className="space-y-2.5">
          {client.email && (
            <div className="flex items-center gap-2.5">
              <Mail size={15} className="text-cm-purple flex-shrink-0" />
              <a href={`mailto:${client.email}`} className="text-sm text-cm-purple hover:text-[#5b4fa8] truncate">{client.email}</a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2.5">
              <Phone size={15} className="text-cm-purple flex-shrink-0" />
              <span className="text-sm text-dark-muted">{client.phone}</span>
            </div>
          )}
          {client.whatsapp_jid && (
            <div className="flex items-center gap-2.5">
              <MessageCircle size={15} className="text-dark-success flex-shrink-0" />
              <a href={`https://wa.me/${client.whatsapp_jid.replace("@s.whatsapp.net", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm text-dark-success hover:underline">
                WhatsApp
              </a>
            </div>
          )}
          {client.instagram_url && (
            <div className="flex items-center gap-2.5">
              <Instagram size={15} className="text-cm-purple flex-shrink-0" />
              <a href={client.instagram_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-cm-purple hover:text-[#5b4fa8]">
                {client.instagram_url.replace("https://www.instagram.com/", "@").replace("/", "")}
              </a>
            </div>
          )}
          {client.linkedin_url && (
            <div className="flex items-center gap-2.5">
              <Linkedin size={15} className="text-cm-purple flex-shrink-0" />
              <a href={client.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-cm-purple hover:text-[#5b4fa8] truncate">{client.linkedin_url}</a>
            </div>
          )}
          {client.website && (
            <div className="flex items-center gap-2.5">
              <Globe size={15} className="text-cm-purple flex-shrink-0" />
              <a href={client.website} target="_blank" rel="noopener noreferrer"
                className="text-sm text-cm-purple hover:text-[#5b4fa8] truncate">{client.website}</a>
            </div>
          )}
          {client.website_seven_seeds && (
            <div className="flex items-center gap-2.5">
              <ExternalLink size={15} className="text-dark-warn flex-shrink-0" />
              <a href={client.website_seven_seeds} target="_blank" rel="noopener noreferrer"
                className="text-sm text-dark-warn hover:text-dark-text truncate">
                Seven Seeds — {client.website_seven_seeds.replace("https://", "")}
              </a>
            </div>
          )}
          {!client.email && !client.phone && !client.linkedin_url && !client.website && (
            <p className="text-sm text-dark-muted">No contact info on file.</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {client.tags.length > 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {client.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-dark-panel2 border border-dark-border text-dark-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Profile notes from sessions */}
      {completedSessions.some((s) => s.profile_notes) && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3">Profile Notes (from Sessions)</h3>
          <div className="space-y-4">
            {completedSessions
              .filter((s) => s.profile_notes)
              .map((s) => (
                <div key={s.id} className="border-l-2 border-cm-purple/30 pl-3">
                  <p className="text-xs text-dark-muted font-medium mb-1">
                    Session #{s.session_number} &bull; {formatDate(s.date)}
                  </p>
                  <p className="text-sm text-dark-muted leading-relaxed">{s.profile_notes}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
