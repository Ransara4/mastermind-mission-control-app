"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, Users, Crosshair, Swords, FileText, Globe } from "lucide-react";

interface Props {
  profile: Record<string, string>;
  domain: string;
  notes?: string;
}

const PROFILE_FIELDS = [
  { key: "type", label: "Business Type", icon: Building2 },
  { key: "target audience", label: "Target Audience", icon: Users },
  { key: "goals", label: "Goals", icon: Crosshair },
  { key: "competitors", label: "Competitors", icon: Swords },
  { key: "core idea", label: "Core Idea", icon: FileText },
  { key: "description", label: "Description", icon: FileText },
  { key: "industry", label: "Industry", icon: Globe },
  { key: "location", label: "Location", icon: Globe },
];

export default function SiteProfileExpand({ profile, domain, notes }: Props) {
  const [open, setOpen] = useState(false);

  // Check if there's any profile content worth showing
  const hasContent = PROFILE_FIELDS.some((f) => profile[f.key]) || notes;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-5 py-3 hover:bg-dark-panel2/50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown size={14} className="text-dark-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-dark-muted shrink-0" />
        )}
        <Building2 size={14} className="text-cm-purple shrink-0" />
        <span className="text-sm font-semibold text-dark-text">Business Profile</span>
        {!hasContent && (
          <span className="text-xs text-dark-muted ml-1">— run audit to populate</span>
        )}
        {hasContent && (
          <span className="text-xs text-dark-muted ml-1">
            {profile["type"] || profile["core idea"] || profile["description"] || domain}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-dark-border px-5 py-4">
          {!hasContent ? (
            <div className="text-center py-4">
              <p className="text-sm text-dark-muted mb-1">No business profile yet.</p>
              <p className="text-xs text-dark-muted">
                Run the SEO Autopilot — it will crawl your site and generate business context automatically.
              </p>
              <p className="text-xs text-dark-muted mt-2">
                Or edit manually: <code className="bg-dark-panel2 px-1.5 py-0.5 rounded text-[11px]">~/seo/{domain}/profile.md</code>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROFILE_FIELDS.map(({ key, label, icon: Icon }) => {
                const value = profile[key];
                if (!value) return null;
                return (
                  <div key={key} className="flex items-start gap-2.5">
                    <Icon size={14} className="text-dark-muted mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-dark-muted font-medium uppercase tracking-wide">{label}</p>
                      <p className="text-sm text-dark-text mt-0.5">{value}</p>
                    </div>
                  </div>
                );
              })}
              {notes && (
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <FileText size={14} className="text-dark-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-dark-muted font-medium uppercase tracking-wide">Notes</p>
                    <p className="text-sm text-dark-text mt-0.5 whitespace-pre-line">{notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
