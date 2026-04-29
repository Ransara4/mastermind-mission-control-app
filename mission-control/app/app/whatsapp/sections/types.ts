export interface Chat {
  jid?: string;
  name?: string;
  pushName?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface Message {
  id?: string;
  from?: string;
  text?: string;
  timestamp?: string;
  fromMe?: boolean;
}

export interface Contact {
  jid?: string;
  name?: string;
  pushName?: string;
  phone?: string;
  alias?: string;
}

export interface Template {
  label: string;
  text: string;
}

export interface HistoryEntry {
  to: string;
  contactName: string;
  type: "text" | "file";
  timestamp: string;
}

export interface Stats {
  totalSent: number;
  totalFiles: number;
  byContact: Record<string, number>;
  history: HistoryEntry[];
}

export interface Config {
  signature: string;
  signatureEnabled: boolean;
  templates: Template[];
  stats: Stats;
}

export interface AutocompleteResult {
  jid: string;
  phone: string;
  name: string;
  source: "whatsapp" | "google";
}

export type Tab = "compose" | "chats" | "contacts" | "history" | "settings";
