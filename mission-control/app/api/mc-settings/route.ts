import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { MCSettings, DEFAULT_SETTINGS } from "@/lib/mc-settings-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SETTINGS_PATH = path.join(WS, "data/mc-settings.json");

function loadSettings(): MCSettings {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return { ...DEFAULT_SETTINGS };
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: MCSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

export async function GET() {
  return NextResponse.json(loadSettings());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = loadSettings();
    const updated: MCSettings = {
      theme: ['dark', 'light'].includes(body.theme) ? body.theme : current.theme,
      appName: typeof body.appName === 'string' ? body.appName : current.appName,
      logoPath: typeof body.logoPath === 'string' ? body.logoPath : current.logoPath,
      displayDensity: ['compact', 'comfortable'].includes(body.displayDensity) ? body.displayDensity : current.displayDensity,
      agentExecutionMode: ['active', 'paused', 'dry-run'].includes(body.agentExecutionMode) ? body.agentExecutionMode : current.agentExecutionMode,
      llmCostTier: ['conservative', 'balanced', 'aggressive'].includes(body.llmCostTier) ? body.llmCostTier : current.llmCostTier,
      dailyBudgetCap: typeof body.dailyBudgetCap === 'number' ? body.dailyBudgetCap : current.dailyBudgetCap,
      startupPage: typeof body.startupPage === 'string' ? body.startupPage : current.startupPage,
      timezone: typeof body.timezone === 'string' && body.timezone.length > 0 ? body.timezone : current.timezone,
      agentBrowserPort: [9222, 9223, 9224].includes(body.agentBrowserPort) ? body.agentBrowserPort : current.agentBrowserPort,
      quietHoursEnabled: typeof body.quietHoursEnabled === 'boolean' ? body.quietHoursEnabled : current.quietHoursEnabled,
      quietHoursStart: typeof body.quietHoursStart === 'string' ? body.quietHoursStart : current.quietHoursStart,
      quietHoursEnd: typeof body.quietHoursEnd === 'string' ? body.quietHoursEnd : current.quietHoursEnd,
      autoArchiveDays: typeof body.autoArchiveDays === 'number' ? body.autoArchiveDays : current.autoArchiveDays,
      screenshotRetentionEnabled: typeof body.screenshotRetentionEnabled === 'boolean' ? body.screenshotRetentionEnabled : current.screenshotRetentionEnabled,
      screenshotRetentionDays: typeof body.screenshotRetentionDays === 'number' ? body.screenshotRetentionDays : current.screenshotRetentionDays,
      dateFormat: ['MMM DD, YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(body.dateFormat) ? body.dateFormat : current.dateFormat,
      timeFormat: ['12h', '24h'].includes(body.timeFormat) ? body.timeFormat : current.timeFormat,
      currencyPrimary: typeof body.currencyPrimary === 'string' ? body.currencyPrimary : current.currencyPrimary,
      currencySecondary: typeof body.currencySecondary === 'string' ? body.currencySecondary : current.currencySecondary,
      currencyExchangeRate: typeof body.currencyExchangeRate === 'number' ? body.currencyExchangeRate : current.currencyExchangeRate,
      rowsPerPage: typeof body.rowsPerPage === 'number' ? body.rowsPerPage : current.rowsPerPage,
      refreshInterval: typeof body.refreshInterval === 'number' ? body.refreshInterval : current.refreshInterval,
      whatsappSignature: typeof body.whatsappSignature === 'string' ? body.whatsappSignature : current.whatsappSignature,
      confirmDestructive: typeof body.confirmDestructive === 'boolean' ? body.confirmDestructive : current.confirmDestructive,
      defaultBoardColumn: typeof body.defaultBoardColumn === 'string' ? body.defaultBoardColumn : current.defaultBoardColumn,
      keyboardShortcutsEnabled: typeof body.keyboardShortcutsEnabled === 'boolean' ? body.keyboardShortcutsEnabled : current.keyboardShortcutsEnabled,
      nodeMemoryCap: typeof body.nodeMemoryCap === 'number' && body.nodeMemoryCap >= 0 ? body.nodeMemoryCap : current.nodeMemoryCap,
    };
    saveSettings(updated);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
