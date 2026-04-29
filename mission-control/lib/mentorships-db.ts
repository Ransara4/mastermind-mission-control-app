import fs from "fs/promises";
import path from "path";

import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
export const DB_PATH = path.join(WS, "projects/mentorships/mentorships-db.json");
export const PDFS_DIR = path.join(WS, "projects/mentorships/pdfs");
export const MENTORSHIPS_BASE = path.join(WS, "projects/mentorships");

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  linkedin_url: string;
  website: string;
  linkedin_data: any | null;
  bio: string;
  focus_areas: string[];
  zoom_meeting_id: string;
  stripe_customer_id: string | null;
  stripe_payment_ids: string[];
  hourly_rate: number;
  hours_purchased: number;
  hours_used: number;
  hours_remaining: number;
  total_paid: number;
  status: "active" | "inactive" | "completed";
  start_date: string;
  notes: string;
  tags: string[];
  links?: Array<{ label: string; url: string; icon_hint?: string }>;
  todo_items?: Array<{ id: string; text: string; done: boolean; source?: string; created_at: string }>;
  whatsapp_jid?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  client_id: string;
  session_number: number;
  date: string;
  type: "zoom" | "whatsapp" | "in-person" | "phone" | "prep" | "async" | "admin";
  duration_minutes: number;
  hours_logged: number;
  zoom_recording_url: string | null;
  transcript_file: string | null;
  transcript_raw: string | null;
  ai_summary: string | null;
  key_points: string[];
  follow_ups: string[];
  joe_follow_ups: string[];
  client_follow_ups: string[];
  joe_follow_ups_done: string[];
  client_follow_ups_done: string[];
  follow_up_items: string[];
  profile_notes: string;
  pdf_path: string | null;
  pdf_sent: boolean;
  whatsapp_sent: boolean;
  status: "scheduled" | "completed" | "cancelled";
  next_session_notes: string;
  pipeline_status: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  currency: string;
  hours_purchased: number;
  stripe_charge_id: string | null;
  stripe_payment_intent_id: string | null;
  method: "stripe" | "manual" | "zelle" | "cash";
  date: string;
  notes: string;
  created_at: string;
}

export interface Settings {
  default_hourly_rate: number;
  [key: string]: any;
}

export interface MentorshipsDB {
  clients: Client[];
  sessions: Session[];
  payments: Payment[];
  settings: Settings;
}

const EMPTY_DB: MentorshipsDB = {
  clients: [],
  sessions: [],
  payments: [],
  settings: { default_hourly_rate: 150 },
};

export async function readDB(): Promise<MentorshipsDB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { ...EMPTY_DB };
  }
}

export async function writeDB(db: MentorshipsDB): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function computeClientStats(
  client: Client,
  sessions: Session[],
  payments: Payment[]
): Client {
  const clientSessions = sessions.filter(
    (s) => s.client_id === client.id && s.status === "completed"
  );
  const clientPayments = payments.filter((p) => p.client_id === client.id);

  const hoursUsed = clientSessions.reduce((sum, s) => sum + s.hours_logged, 0);
  const hoursPurchased = clientPayments.reduce(
    (sum, p) => sum + p.hours_purchased,
    0
  );
  const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    ...client,
    hours_used: hoursUsed,
    hours_purchased: hoursPurchased,
    hours_remaining: hoursPurchased - hoursUsed,
    total_paid: totalPaid,
  };
}
