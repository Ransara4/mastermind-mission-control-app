import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const CACHE_PATH = path.join(WS, "data/exchange-rates.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SOURCE_URL = "https://open.er-api.com/v6/latest/USD";

interface RateCache {
  fetchedAt: number; // unix ms
  base: string; // "USD"
  rates: Record<string, number>;
}

function loadCache(): RateCache | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const data: RateCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    return data;
  } catch {
    return null;
  }
}

function saveCache(cache: RateCache): void {
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function isFresh(cache: RateCache): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

function getRate(
  rates: Record<string, number>,
  from: string,
  to: string
): number {
  // All rates are relative to USD base
  if (from === "USD") return rates[to] ?? 0;
  if (to === "USD") return 1 / (rates[from] ?? 1);
  // Cross rate: from -> USD -> to
  return (1 / (rates[from] ?? 1)) * (rates[to] ?? 0);
}

// GET /api/exchange-rate?base=USD&to=IDR
// Returns { rate, base, to, fetchedAt, cached, rates (all) }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const base = (searchParams.get("base") || "USD").toUpperCase();
  const to = (searchParams.get("to") || "IDR").toUpperCase();
  const forceRefresh = searchParams.get("refresh") === "1";

  let cache = loadCache();

  if (!cache || !isFresh(cache) || forceRefresh) {
    try {
      const res = await fetch(SOURCE_URL, { next: { revalidate: 0 } });
      if (!res.ok) throw new Error(`Source returned ${res.status}`);
      const data = await res.json();
      if (data.result !== "success") throw new Error("Source error");
      cache = {
        fetchedAt: Date.now(),
        base: "USD",
        rates: data.rates,
      };
      saveCache(cache);
    } catch {
      // If fetch fails, return stale cache if available
      if (cache) {
        return NextResponse.json({
          rate: getRate(cache.rates, base, to),
          base,
          to,
          fetchedAt: cache.fetchedAt,
          cached: true,
          stale: true,
          rates: cache.rates,
        });
      }
      return NextResponse.json(
        { error: "Failed to fetch rates and no cache available" },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    rate: getRate(cache.rates, base, to),
    base,
    to,
    fetchedAt: cache.fetchedAt,
    cached: true,
    stale: false,
    rates: cache.rates,
  });
}
