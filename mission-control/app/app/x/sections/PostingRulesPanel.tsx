"use client";

import type { PostingRules } from "@/lib/x-types";
import { Clock, MessageSquare, Hash, Shield, BarChart3 } from "lucide-react";

interface PostingRulesPanelProps {
  rules: PostingRules;
}

export default function PostingRulesPanel({ rules }: PostingRulesPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-dark-muted">
        These rules are enforced when composing posts. Edit them in the agent config.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Voice */}
        <RuleCard
          icon={<MessageSquare size={16} />}
          title="Voice & Tone"
          items={[
            { label: "Tone", value: rules.voice?.tone || "—" },
            { label: "Personality", value: rules.voice?.personality || "—" },
            {
              label: "Avoid",
              value: rules.voice?.avoid?.join(", ") || "—",
              highlight: "red",
            },
          ]}
        />

        {/* Frequency */}
        <RuleCard
          icon={<Clock size={16} />}
          title="Posting Frequency"
          items={[
            { label: "Max per day", value: String(rules.frequency?.maxPerDay || 3) },
            { label: "Min hours between", value: String(rules.frequency?.minHoursBetween || 3) },
            {
              label: "Optimal times",
              value: rules.frequency?.optimalTimes?.join(", ") || "—",
            },
            { label: "Timezone", value: rules.frequency?.timezone || "—" },
          ]}
        />

        {/* Content Mix */}
        <RuleCard
          icon={<BarChart3 size={16} />}
          title="Content Mix"
          items={[
            {
              label: "Value & Insights",
              value: `${(rules.contentMix?.valueInsights || 0.6) * 100}%`,
            },
            {
              label: "Engagement & Replies",
              value: `${(rules.contentMix?.engagementReplies || 0.2) * 100}%`,
            },
            {
              label: "Personal & Builds",
              value: `${(rules.contentMix?.personalBuilds || 0.2) * 100}%`,
            },
          ]}
        />

        {/* Formatting */}
        <RuleCard
          icon={<Hash size={16} />}
          title="Formatting Rules"
          items={[
            { label: "Max hashtags", value: String(rules.formatting?.maxHashtags || 2) },
            { label: "Max thread length", value: `${rules.formatting?.maxThreadLength || 7} tweets` },
            {
              label: "Tweets must stand alone",
              value: rules.formatting?.tweetsMustStandAlone ? "Yes" : "No",
            },
          ]}
        />

        {/* Anti-Patterns */}
        <div className="md:col-span-2">
          <RuleCard
            icon={<Shield size={16} />}
            title="Anti-Patterns (Auto-Detected)"
            items={[
              { label: "Engagement bait", value: "\"like if you agree\", \"retweet if\", \"follow for more\"", highlight: "red" },
              { label: "Empty hot takes", value: "No substance, just controversy", highlight: "red" },
              { label: "Hashtag stuffing", value: `More than ${rules.formatting?.maxHashtags || 2} hashtags`, highlight: "red" },
              { label: "Empty retweets", value: "Always add commentary when sharing", highlight: "amber" },
            ]}
          />
        </div>
      </div>

      <p className="text-xs text-dark-muted">
        Edit rules: <code className="bg-dark-panel2 px-1.5 py-0.5 rounded text-dark-muted">~/.openclaw/workspace/agents/x/config/config.json</code>
      </p>
    </div>
  );
}

function RuleCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: { label: string; value: string; highlight?: string }[];
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-dark-muted">{icon}</span>
        <h4 className="text-sm font-semibold text-dark-text">{title}</h4>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-4">
            <span className="text-xs text-dark-muted flex-shrink-0">{item.label}</span>
            <span
              className={`text-xs text-right ${
                item.highlight === "red"
                  ? "text-dark-danger"
                  : item.highlight === "amber"
                  ? "text-dark-warn"
                  : "text-dark-text font-medium"
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
