"use client";

import { BookOpen, CheckCircle } from "lucide-react";

const modules = [
  { name: "On-Page", file: "on-page.md", desc: "Title tags, meta, headers, keywords" },
  { name: "Technical", file: "technical.md", desc: "Core Web Vitals, crawl, mobile" },
  { name: "Content", file: "content.md", desc: "Search intent, E-E-A-T, writing" },
  { name: "Keywords", file: "keywords.md", desc: "Research & competitive analysis" },
  { name: "Links", file: "links.md", desc: "Internal links, anchors, backlinks" },
  { name: "Local", file: "local.md", desc: "Google Business, NAP, local keywords" },
  { name: "Schema", file: "schema.md", desc: "JSON-LD structured data" },
];

interface Props {
  version: string;
  references: string[];
}

export default function SkillInfo({ version, references }: Props) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-dark-text flex items-center gap-2">
          <BookOpen size={16} className="text-cm-purple" />
          Skill Modules
        </h3>
        <span className="text-xs text-dark-muted font-mono">v{version}</span>
      </div>
      <div className="space-y-2">
        {modules.map((mod) => {
          const installed = references.includes(mod.file.replace(".md", ""));
          return (
            <div
              key={mod.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-panel2 transition-colors"
            >
              <CheckCircle
                size={16}
                className={installed ? "text-dark-success" : "text-dark-muted"}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-text">{mod.name}</p>
                <p className="text-xs text-dark-muted truncate">{mod.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
