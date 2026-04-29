"use client";

import { Target, ExternalLink } from "lucide-react";
import { ProjectContext } from "@/hooks/useLinkedInData";

export function ProjectView({ project }: { project: ProjectContext | null }) {
  if (!project) {
    return (
      <div className="bg-dark-panel rounded-xl border border-dark-border p-12 text-center">
        <Target size={32} className="mx-auto mb-3 text-dark-muted" />
        <p className="text-dark-muted">No project context configured</p>
        <p className="text-sm text-dark-muted mt-1">
          Add a project section to content.json to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mission */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold  text-dark-text flex items-center gap-2">
            <Target size={18} className="text-cm-purple" />
            {project.name}
          </h3>
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cm-purple hover:text-cm-purple-mid flex items-center gap-1"
            >
              <ExternalLink size={12} /> Website
            </a>
          )}
        </div>
        <p className="text-sm text-dark-muted">{project.mission}</p>
        <p className="text-sm text-dark-muted mt-2">
          <span className="font-medium text-dark-text">Target:</span>{" "}
          {project.targetAudience}
        </p>
      </div>

      {/* Content Pillars */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h3 className="font-semibold  text-dark-text mb-4">Content Pillars</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {project.pillars.map((pillar, i) => {
            const colors = [
              "border-cm-purple/30 bg-cm-purple/10",
              "border-purple-500/30 bg-purple-500/10",
              "border-dark-success/30 bg-dark-success/10",
            ];
            const textColors = [
              "text-cm-purple",
              "text-purple-700",
              "text-dark-success",
            ];
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 ${colors[i % colors.length]}`}
              >
                <h4
                  className={`font-semibold text-sm mb-2 ${
                    textColors[i % textColors.length]
                  }`}
                >
                  {pillar.name}
                </h4>
                <ul className="space-y-1">
                  {pillar.themes.map((theme, j) => (
                    <li key={j} className="text-xs text-dark-muted">
                      &bull; {theme}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice */}
      {project.voice && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h3 className="font-semibold  text-dark-text mb-4">Brand Voice</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-dark-text mb-2">Tone</h4>
              <div className="flex flex-wrap gap-1.5">
                {project.voice.tone.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-dark-success/20 text-dark-success px-2 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-dark-text mb-2">
                Avoid
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {project.voice.avoid.map((a) => (
                  <span
                    key={a}
                    className="text-xs bg-dark-danger/20 text-dark-danger px-2 py-0.5 rounded-full"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-dark-text mb-2">
                Engaging Hooks
              </h4>
              <ul className="space-y-1">
                {project.voice.engagingHooks.map((h, i) => (
                  <li key={i} className="text-xs text-dark-muted italic">
                    &ldquo;{h}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ICP */}
      {project.icp && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h3 className="font-semibold  text-dark-text mb-4">
            Ideal Customer Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-dark-muted">
                    Revenue
                  </span>
                  <p className="text-sm text-dark-text">{project.icp.revenue}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-dark-muted">
                    Team Size
                  </span>
                  <p className="text-sm text-dark-text">
                    {project.icp.employees}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-dark-muted">
                    Industries
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.icp.industries.map((ind) => (
                      <span
                        key={ind}
                        className="text-xs bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded-full"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-dark-muted">
                    Pain Points
                  </span>
                  <ul className="space-y-1 mt-1">
                    {project.icp.painPoints.map((p, i) => (
                      <li key={i} className="text-xs text-dark-muted">
                        &bull; {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-xs font-medium text-dark-muted">
                    Buying Signals
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.icp.buyingSignals.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-dark-warn/20 text-dark-warn px-2 py-0.5 rounded-full"
                      >
                        &ldquo;{s}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
