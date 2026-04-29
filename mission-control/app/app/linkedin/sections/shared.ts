import { Lightbulb, PenLine, Clock, Send } from "lucide-react";
import { ContentItem } from "@/hooks/useLinkedInData";

// --- Pipeline Column Config ---

export const PIPELINE_COLUMNS: {
  key: ContentItem["status"];
  label: string;
  color: string;
  bgColor: string;
  icon: any;
}[] = [
  {
    key: "idea",
    label: "Ideas",
    color: "text-dark-warn",
    bgColor: "bg-dark-warn/10 border-dark-warn/30",
    icon: Lightbulb,
  },
  {
    key: "draft",
    label: "Drafts",
    color: "text-cm-purple",
    bgColor: "bg-cm-purple/10 border-cm-purple/30",
    icon: PenLine,
  },
  {
    key: "scheduled",
    label: "Scheduled",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    icon: Clock,
  },
  {
    key: "published",
    label: "Published",
    color: "text-dark-success",
    bgColor: "bg-dark-success/10 border-dark-success/30",
    icon: Send,
  },
];

export const CONTENT_TYPES = [
  "text",
  "image",
  "carousel",
  "video",
  "poll",
  "document",
] as const;

// --- Utilities ---

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
