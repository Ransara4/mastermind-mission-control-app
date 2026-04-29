"use client";

import { Video, Layers, Download, FileText, CheckCircle, ArrowRight } from "lucide-react";
import type { DescriptDashboard } from "@/lib/descript-types";

interface PipelineStage {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  count: number;
  description: string;
}

export default function PipelineViz({
  stats,
  queueDepth,
}: {
  stats: DescriptDashboard["stats"];
  queueDepth: number;
}) {
  const stages: PipelineStage[] = [
    {
      label: "Zoom Recording",
      icon: Video,
      color: "text-cm-purple",
      bgColor: "bg-cm-purple/10",
      borderColor: "border-cm-purple/30",
      count: 0,
      description: "Source recordings",
    },
    {
      label: "Queued",
      icon: Layers,
      color: "text-dark-warn",
      bgColor: "bg-dark-warn/10",
      borderColor: "border-dark-warn/30",
      count: queueDepth,
      description: "Awaiting import",
    },
    {
      label: "Importing",
      icon: Download,
      color: "text-violet-300",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-200",
      count: 0,
      description: "Opening in Descript",
    },
    {
      label: "Transcribing",
      icon: FileText,
      color: "text-cm-purple",
      bgColor: "bg-cm-purple/10",
      borderColor: "border-indigo-200",
      count: 0,
      description: "Auto-transcription",
    },
    {
      label: "Complete",
      icon: CheckCircle,
      color: "text-dark-success",
      bgColor: "bg-dark-success/10",
      borderColor: "border-dark-success/30",
      count: stats.totalImports,
      description: "Ready for editing",
    },
  ];

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-bold  text-dark-text mb-6">
        Pipeline Flow
      </h3>
      <div className="flex items-center justify-between gap-1">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <div key={stage.label} className="flex items-center flex-1">
              <div
                className={`flex-1 ${stage.bgColor} ${stage.borderColor} border rounded-lg p-3 text-center`}
              >
                <div
                  className={`w-8 h-8 rounded-full ${stage.bgColor} flex items-center justify-center mx-auto mb-2`}
                >
                  <Icon size={16} className={stage.color} />
                </div>
                <p className={`text-xs font-semibold ${stage.color}`}>
                  {stage.label}
                </p>
                <p className="text-lg font-bold text-dark-text mt-1">
                  {stage.count}
                </p>
                <p className="text-[10px] text-dark-muted mt-0.5">
                  {stage.description}
                </p>
              </div>
              {i < stages.length - 1 && (
                <ArrowRight
                  size={14}
                  className="text-dark-muted mx-1 flex-shrink-0"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
