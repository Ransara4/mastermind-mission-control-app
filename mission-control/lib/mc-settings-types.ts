export interface MCSettings {
  // Appearance
  theme: 'dark' | 'light';
  appName: string;
  logoPath: string;
  displayDensity: 'compact' | 'comfortable';

  // System Controls
  agentExecutionMode: 'active' | 'paused' | 'dry-run';
  llmCostTier: 'conservative' | 'balanced' | 'aggressive';
  dailyBudgetCap: number;          // USD; 0 = no limit
  startupPage: string;             // e.g. '/app/tasks'
  timezone: string;                // IANA timezone e.g. 'America/New_York'
  agentBrowserPort: 9222 | 9223 | 9224;

  // Notifications & Schedule
  quietHoursEnabled: boolean;
  quietHoursStart: string;         // "22:00"
  quietHoursEnd: string;           // "08:00"

  // Data Management
  autoArchiveDays: number;         // 0 = never
  screenshotRetentionEnabled: boolean;
  screenshotRetentionDays: number; // 0 = disabled

  // Display Preferences
  dateFormat: 'MMM DD, YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  currencyPrimary: string;         // 'USD'
  currencySecondary: string;       // 'IDR'
  currencyExchangeRate: number;    // e.g. 16000
  rowsPerPage: number;             // 10 | 25 | 50 | 100
  refreshInterval: number;         // seconds; 0 = off

  // Behavior & Safety
  whatsappSignature: string;
  confirmDestructive: boolean;
  defaultBoardColumn: string;
  keyboardShortcutsEnabled: boolean;

  // Performance
  nodeMemoryCap: number; // MB passed as --max-old-space-size; 0 = no cap

  // Email & Daily Briefing
  emailProvider: 'gmail' | 'mandrill' | 'resend' | 'sendgrid' | 'ses' | 'postmark';
  emailRecipient: string;
  emailFromName: string;
  dailyBriefingEnabled: boolean;
  dailyBriefingTime: string; // "06:45"
}

export const DEFAULT_SETTINGS: MCSettings = {
  theme: 'dark',
  appName: 'Mission Control',
  logoPath: '/icon.png',
  displayDensity: 'comfortable',
  agentExecutionMode: 'active',
  llmCostTier: 'balanced',
  dailyBudgetCap: 0,
  startupPage: '/app/tasks',
  timezone: 'America/New_York',
  agentBrowserPort: 9223,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  autoArchiveDays: 0,
  screenshotRetentionEnabled: false,
  screenshotRetentionDays: 7,
  dateFormat: 'MMM DD, YYYY',
  timeFormat: '12h',
  currencyPrimary: 'USD',
  currencySecondary: 'IDR',
  currencyExchangeRate: 16000,
  rowsPerPage: 25,
  refreshInterval: 30,
  whatsappSignature: "-- Sent from Joe's Agent Uni",
  confirmDestructive: true,
  defaultBoardColumn: 'Claude Code',
  keyboardShortcutsEnabled: true,
  nodeMemoryCap: 450,
  emailProvider: 'gmail',
  emailRecipient: '',
  emailFromName: 'Mission Control',
  dailyBriefingEnabled: false,
  dailyBriefingTime: '06:45',
};
