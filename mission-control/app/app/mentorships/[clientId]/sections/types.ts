// -- Shared Types --

export interface ClientLink {
  label: string;
  url: string;
  icon_hint?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  source?: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  linkedin_url: string;
  instagram_url?: string;
  website: string;
  website_seven_seeds?: string;
  bio: string;
  focus_areas: string[];
  status: "active" | "inactive" | "completed";
  start_date: string;
  notes: string;
  tags: string[];
  links?: ClientLink[];
  todo_items?: TodoItem[];
  hours_purchased: number;
  hours_used: number;
  hours_remaining: number;
  total_paid: number;
  hourly_rate: number;
  whatsapp_jid?: string;
  telegram_chat_id?: string;
}

export interface Session {
  id: string;
  client_id: string;
  session_number: number;
  date: string;
  type: "zoom" | "whatsapp" | "in-person" | "phone" | "async" | "prep" | "admin";
  duration_minutes: number;
  hours_logged: number;
  ai_summary: string | null;
  status: "scheduled" | "completed" | "cancelled";
  zoom_recording_url: string | null;
  internal_video_url: string | null;
  pdf_path: string | null;
  session_goals: string;
  key_points: string[];
  joe_follow_ups: string[];
  joe_follow_ups_done: string[];
  client_follow_ups: string[];
  client_follow_ups_done: string[];
  profile_notes: string;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  currency: string;
  hours_purchased: number;
  method: "stripe" | "manual" | "zelle" | "cash";
  date: string;
  notes: string;
}

export type TabId = "overview" | "project" | "details" | "business" | "research";

// -- Shared Helpers --

export function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

export function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function statusColor(s: string): string {
  switch (s) {
    case "active":
    case "completed":
      return "bg-dark-success/20 text-dark-success";
    case "inactive":
      return "bg-dark-panel2 text-dark-muted";
    case "scheduled":
      return "bg-dark-warn/20 text-dark-warn";
    case "cancelled":
      return "bg-dark-danger/20 text-dark-danger";
    default:
      return "bg-dark-panel2 text-dark-muted";
  }
}

export function typeColor(t: string): string {
  switch (t) {
    case "zoom": return "bg-cm-purple/15 text-cm-purple";
    case "whatsapp": return "bg-dark-success/20 text-dark-success";
    case "in-person": return "bg-dark-panel2 border border-dark-border text-dark-muted";
    case "phone": return "bg-dark-panel2 text-dark-muted";
    case "async":
    case "prep":
    case "admin": return "bg-cm-pink/15 text-[#9b5b5e]";
    default: return "bg-dark-panel2 text-dark-muted";
  }
}

export function hoursRemainingColor(hours: number): string {
  if (hours > 5) return "text-dark-success";
  if (hours >= 1) return "text-dark-warn";
  return "text-dark-danger";
}

export function methodLabel(m: string): string {
  switch (m) {
    case "stripe": return "Stripe";
    case "manual": return "Manual";
    case "zelle": return "Zelle";
    case "cash": return "Cash";
    default: return m;
  }
}

export function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
