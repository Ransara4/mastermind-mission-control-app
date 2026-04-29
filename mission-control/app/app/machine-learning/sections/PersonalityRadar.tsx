"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PersonalityState } from "@/lib/ml-types";

const LABELS: Record<string, string> = {
  rigor: "Rigor",
  creativity: "Creativity",
  verbosity: "Verbosity",
  risk_tolerance: "Risk Tolerance",
  obedience: "Obedience",
};

const TRAIT_DESCRIPTIONS: Record<string, string> = {
  rigor: "How thoroughly changes are validated before applying",
  creativity: "Willingness to try novel or unconventional approaches",
  verbosity: "Level of detail in commit messages and explanations",
  risk_tolerance: "Comfort with larger blast-radius mutations",
  obedience: "How closely the agent follows existing patterns vs improvising",
};

export default function PersonalityRadar({
  personality,
}: {
  personality: PersonalityState | null;
}) {
  if (!personality) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Personality Profile
        </h3>
        <div className="flex items-center justify-center py-12 text-dark-muted">
          No personality data available
        </div>
      </div>
    );
  }

  const p = personality as unknown as Record<string, number>;
  const data = Object.entries(LABELS).map(([key, label]) => ({
    trait: `${label} (${(p[key] ?? 0).toFixed(2)})`,
    key,
    value: p[key] ?? 0,
    fullMark: 1,
  }));

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
        Personality Profile
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="rgba(124,105,199,0.15)" />
            <PolarAngleAxis
              dataKey="trait"
              tick={{ fontSize: 12, fill: "var(--color-caption)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1]}
              tick={{ fontSize: 10, fill: "var(--color-caption)" }}
              tickCount={6}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-panel)",
                border: "1px solid rgba(124,105,199,0.15)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "var(--color-text)",
              }}
              formatter={((value: number) => [`${value.toFixed(2)}`, "Score"]) as never}
            />
            <Radar
              name="Personality"
              dataKey="value"
              stroke="#7C69C7"
              fill="#7C69C7"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Trait descriptions */}
      <div className="mt-4 border-t border-dark-border pt-3 space-y-1.5">
        {Object.entries(LABELS).map(([key, label]) => (
          <div key={key} className="flex items-baseline gap-2 text-xs">
            <span className="text-dark-text font-medium whitespace-nowrap">
              {label}
            </span>
            <span className="text-dark-muted">
              {TRAIT_DESCRIPTIONS[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
