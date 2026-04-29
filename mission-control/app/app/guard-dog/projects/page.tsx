"use client";

import {
  AlertTriangle,
  FolderSearch,
  Wrench,
} from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-xl font-semibold tracking-tight text-dark-text">
        Scanned Projects
      </h2>

      {/* Coming Soon Notice */}
      <div className="p-8 text-center border border-dashed border-dark-border rounded-lg bg-dark-panel2">
        <FolderSearch size={48} className="mx-auto text-dark-muted mb-4" />
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-2">
          Coming Soon
        </h3>
        <p className="text-sm text-dark-muted max-w-md mx-auto mb-4">
          Real-time project scanning data integration is pending. This page will
          show per-project vulnerability breakdowns, dependency trees, and risk
          scores once project-level scanning is wired up.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-dark-muted">
          <Wrench size={14} />
          <span>Real data integration pending</span>
        </div>
      </div>

      {/* Planned Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-cm-purple/10 border border-cm-purple/20 rounded-lg">
          <p className="text-sm font-semibold text-cm-purple mb-1">Project Risk Scores</p>
          <p className="text-xs text-cm-purple/80">
            Per-project risk assessment based on dependency health, vulnerability counts, and outdated packages.
          </p>
        </div>
        <div className="p-4 bg-cm-purple/10 border border-cm-purple/20 rounded-lg">
          <p className="text-sm font-semibold text-cm-purple mb-1">Dependency Trees</p>
          <p className="text-xs text-cm-purple/80">
            Visual dependency mapping showing which packages are outdated or vulnerable in each project.
          </p>
        </div>
        <div className="p-4 bg-dark-warn/10 border border-dark-warn/30 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle size={14} className="text-dark-warn" />
            <p className="text-sm font-semibold text-dark-warn">Health Status</p>
          </div>
          <p className="text-xs text-dark-warn/80">
            At-a-glance project health indicators: healthy, warning, or critical based on scan results.
          </p>
        </div>
      </div>
    </div>
  );
}
