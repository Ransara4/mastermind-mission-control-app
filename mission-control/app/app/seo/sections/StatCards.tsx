"use client";

import { Target, FileSearch, FileText, Mail } from "lucide-react";

interface Props {
  stats: {
    trackedKeywords: number;
    totalAudits: number;
    contentDrafts: number;
    outreachItems: number;
  };
}

const cards = [
  { key: "trackedKeywords", label: "Keywords", icon: Target, color: "purple" },
  { key: "totalAudits", label: "Audits", icon: FileSearch, color: "purpleMid" },
  { key: "contentDrafts", label: "Content", icon: FileText, color: "pink" },
  { key: "outreachItems", label: "Outreach", icon: Mail, color: "purple" },
] as const;

const colorMap: Record<string, { bg: string; icon: string }> = {
  purple: { bg: "bg-cm-purple/15", icon: "text-cm-purple" },
  purpleMid: { bg: "bg-cm-purple-mid/15", icon: "text-cm-purple-mid" },
  pink: { bg: "bg-cm-pink/15", icon: "text-cm-pink" },
};

export default function StatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, color }) => {
        const c = colorMap[color];
        return (
          <div key={key} className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <Icon size={20} className={c.icon} />
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-text">
                  {stats[key]}
                </p>
                <p className="text-xs text-dark-muted">{label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
