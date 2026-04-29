import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const CACHE_DIR = path.join(WS, "data");
const CACHE_PATH = path.join(CACHE_DIR, "exchange-rates.json");
const SETTINGS_PATH = path.join(CACHE_DIR, "mc-settings.json");
const SOURCE_URL = "https://open.er-api.com/v6/latest/USD";

function getRate(
  rates: Record<string, number>,
  from: string,
  to: string
): number {
  if (from === "USD") return rates[to] ?? 1;
  if (to === "USD") return 1 / (rates[from] ?? 1);
  return (1 / (rates[from] ?? 1)) * (rates[to] ?? 0);
}

// POST /api/exchange-rate/sync
// Forces a refresh and updates mc-settings.json with the current rate
export async function POST() {
  try {
    const res = await fetch(SOURCE_URL, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Source ${res.status}`);
    const data = await res.json();
    if (data.result !== "success") throw new Error("Bad response");

    const rates: Record<string, number> = data.rates;
    const cache = {
      fetchedAt: Date.now(),
      base: "USD",
      rates,
    };

    // Save exchange rate cache
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

    // Update mc-settings.json with fresh rate for primary/secondary pair
    let mcSettings: Record<string, unknown> = {};
    if (fs.existsSync(SETTINGS_PATH)) {
      try {
        mcSettings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      } catch {
        mcSettings = {};
      }
    }
    const primary = (mcSettings.currencyPrimary as string) || "USD";
    const secondary = (mcSettings.currencySecondary as string) || "IDR";

    const newRate = getRate(rates, primary, secondary);
    mcSettings.currencyExchangeRate = Math.round(newRate * 100) / 100;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(mcSettings, null, 2));

    return NextResponse.json({
      success: true,
      rate: newRate,
      primary,
      secondary,
      fetchedAt: cache.fetchedAt,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
