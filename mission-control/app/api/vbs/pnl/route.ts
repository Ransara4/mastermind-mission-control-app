import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

// ── Config ─────────────────────────────────────────────────────────
const SPREADSHEET_ID = "1VlHm9lthV14tBEFV3WJbAHU-qFGCH0iO1t99jusxKoM";
const CLIENT_ID = "141906476123-ktda7d6kcajk9kafelouf9lfgrmj5igj.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const TOKENS_PATH = path.join(WS, "agents/google/tokens.json");
const CACHE_PATH = path.join(WS, "mission-control/data/vbs-pnl.json");

// ── Helpers ────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const tokens = JSON.parse(await fs.readFile(TOKENS_PATH, "utf8"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google token refresh failed");
  return data.access_token;
}

async function readSheet(token: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

function parseUSD(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[$,\s]/g, ""));
  return isNaN(n) || n < 0 ? 0 : n;
}

// Parse "M/D/YYYY" → { year, month } or null
function parseDate(s: string | undefined): { year: number; month: number } | null {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[2]);
  const month = parseInt(parts[0]);
  if (isNaN(year) || isNaN(month) || year < 2018 || year > 2040) return null;
  return { year, month };
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── GET — return cached data ───────────────────────────────────────

export async function GET() {
  try {
    const cached = await fs.readFile(CACHE_PATH, "utf8");
    return NextResponse.json(JSON.parse(cached));
  } catch {
    return NextResponse.json({ data: [], lastCalculated: null });
  }
}

// ── POST — recalculate from Sheets ────────────────────────────────

export async function POST() {
  try {
    const token = await getAccessToken();

    // Income: header at sheet row 13, data starts at row 14
    // Columns: A=DateValue, B=Date, C=AmountIDR, D=PersonReceiving, E=Source, F=Description, G=USD
    const incomeRows = await readSheet(token, "Income with new split formula!A14:G600");

    // Expenses: header at sheet row 15, data starts at row 16
    // Columns: A=DateValue, B=Date, C=AmountIDR, D=PersonPaying, E=Description, F=Category, G=USD
    const expenseRows = await readSheet(token, "Expenses with new split formula!A16:G2000");

    const monthly: Record<string, { income: number; expenses: number }> = {};

    function add(key: string, field: "income" | "expenses", amount: number) {
      if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
      monthly[key][field] += amount;
    }

    for (const row of incomeRows) {
      const d = parseDate(row[1]);
      const usd = parseUSD(row[6]);
      if (!d || usd <= 0) continue;
      const key = `${d.year}-${String(d.month).padStart(2, "0")}`;
      add(key, "income", usd);
    }

    for (const row of expenseRows) {
      const d = parseDate(row[1]);
      const usd = parseUSD(row[6]);
      if (!d || usd <= 0) continue;
      const key = `${d.year}-${String(d.month).padStart(2, "0")}`;
      add(key, "expenses", usd);
    }

    const data = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [yearStr, monthStr] = key.split("-");
        const mIdx = parseInt(monthStr) - 1;
        const shortYear = yearStr.slice(2);
        return {
          key,
          month: `${MONTH_LABELS[mIdx]} '${shortYear}`,
          income: Math.round(v.income),
          expenses: Math.round(v.expenses),
          profit: Math.round(v.income - v.expenses),
        };
      });

    const result = { data, lastCalculated: new Date().toISOString() };
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
