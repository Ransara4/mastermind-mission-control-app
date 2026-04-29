"use client";

import { User, Crosshair, Users, Swords, Server, Bot } from "lucide-react";

interface Props {
  profile: Record<string, string>;
  domain: string;
  hosting: string;
  agent: string;
}

const fields = [
  { key: "type", label: "Type", icon: User },
  { key: "target audience", label: "Audience", icon: Users },
  { key: "goals", label: "Goals", icon: Crosshair },
  { key: "competitors", label: "Competitors", icon: Swords },
];

const hostingColors: Record<string, string> = {
  wix: "bg-cm-purple/20 text-cm-purple border-cm-purple/30",
  vercel: "bg-dark-panel2 text-dark-text border-dark-border",
  netlify: "bg-cm-purple/20 text-cm-purple border-cm-purple/30",
  aws: "bg-dark-panel2 text-dark-muted border-dark-border",
  cloudflare: "bg-dark-warn/20 text-dark-warn border-dark-warn/30",
};

export default function SiteProfile({ profile, domain, hosting, agent }: Props) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4">
        {profile.title || domain}
      </h3>

      {/* Hosting & Agent */}
      {(hosting || agent) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {hosting && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${
              hostingColors[hosting.toLowerCase()] || "bg-dark-panel2 text-dark-muted border-dark-border"
            }`}>
              <Server size={12} />
              {hosting.charAt(0).toUpperCase() + hosting.slice(1)}
            </div>
          )}
          {agent && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cm-purple/30 bg-cm-purple/10 text-cm-purple text-xs font-medium">
              <Bot size={12} />
              {agent} agent
            </div>
          )}
        </div>
      )}

      {/* Profile fields */}
      {fields.every((f) => !profile[f.key]) ? (
        <div className="bg-dark-panel2 border border-dashed border-dark-border rounded-xl p-8 text-center">
          <p className="text-sm text-dark-muted italic">
            Profile not filled in yet. Edit ~/seo/{domain}/profile.md
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map(({ key, label, icon: Icon }) => {
            const value = profile[key];
            if (!value) return null;
            return (
              <div key={key} className="flex items-start gap-3">
                <Icon size={16} className="text-dark-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-dark-muted font-medium">{label}</p>
                  <p className="text-sm text-dark-text">{value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
