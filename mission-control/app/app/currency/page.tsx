"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Search,
  Loader2,
  Clock,
} from "lucide-react";

const QUICK_PAIRS = [
  { from: "USD", to: "IDR", label: "USD \u2192 IDR" },
  { from: "IDR", to: "USD", label: "IDR \u2192 USD" },
  { from: "USD", to: "EUR", label: "USD \u2192 EUR" },
  { from: "USD", to: "SGD", label: "USD \u2192 SGD" },
  { from: "USD", to: "AUD", label: "USD \u2192 AUD" },
  { from: "EUR", to: "USD", label: "EUR \u2192 USD" },
];

export default function CurrencyPage() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("IDR");
  const [search, setSearch] = useState("");

  const currencies = Object.keys(rates).sort();
  const filteredCurrencies = currencies.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  function getRate(from: string, to: string): number {
    if (from === to) return 1;
    if (from === "USD") return rates[to] ?? 0;
    if (to === "USD") return 1 / (rates[from] ?? 1);
    return (1 / (rates[from] ?? 1)) * (rates[to] ?? 0);
  }

  const converted =
    amount && rates && Object.keys(rates).length > 0
      ? parseFloat(amount) * getRate(fromCurrency, toCurrency)
      : null;

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((data) => {
        if (data.rates) {
          setRates(data.rates);
          setFetchedAt(data.fetchedAt);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/exchange-rate/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const rateRes = await fetch("/api/exchange-rate?refresh=1");
        const rateData = await rateRes.json();
        if (rateData.rates) {
          setRates(rateData.rates);
          setFetchedAt(rateData.fetchedAt);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-cm-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cm-purple/15 rounded-xl">
              <TrendingUp size={24} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-dark-text">
                Currency Converter
              </h1>
              <p className="text-sm text-dark-muted mt-1">
                Live rates -- Updated daily from open.er-api.com
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fetchedAt && (
              <span className="flex items-center gap-1.5 text-xs text-dark-muted">
                <Clock size={11} />
                {new Date(fetchedAt).toLocaleString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text rounded-lg text-sm transition-colors"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Rates"}
            </button>
          </div>
        </div>
      </div>

      {/* Converter card */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-base font-bold text-dark-text mb-4">Convert</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-dark-muted mb-1 block">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-4 py-3 text-lg font-bold focus:outline-none focus:border-cm-purple focus:ring-2 focus:ring-cm-purple"
            />
          </div>
          <div className="w-28">
            <label className="text-xs text-dark-muted mb-1 block">From</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-3 focus:outline-none focus:border-cm-purple"
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="pt-5">
            <button
              onClick={() => {
                setFromCurrency(toCurrency);
                setToCurrency(fromCurrency);
              }}
              className="p-2 bg-dark-panel2 border border-dark-border text-dark-muted hover:text-cm-purple rounded-lg transition-colors"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <div className="w-28">
            <label className="text-xs text-dark-muted mb-1 block">To</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-3 focus:outline-none focus:border-cm-purple"
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 pt-5">
            <div className="bg-cm-purple/10 border border-cm-purple/20 rounded-lg px-4 py-3">
              <p className="text-xs text-dark-muted mb-0.5">Result</p>
              <p className="text-2xl font-bold text-cm-purple">
                {converted !== null
                  ? converted.toLocaleString("en-US", {
                      maximumFractionDigits: 4,
                    })
                  : "--"}
                <span className="text-sm font-normal ml-1">{toCurrency}</span>
              </p>
              <p className="text-xs text-dark-muted mt-0.5">
                1 {fromCurrency} ={" "}
                {getRate(fromCurrency, toCurrency).toFixed(4)} {toCurrency}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick pairs grid */}
      <div>
        <h2 className="text-base font-bold text-dark-text mb-3">
          Quick Pairs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_PAIRS.map((pair) => {
            const rate = getRate(pair.from, pair.to);
            return (
              <div
                key={pair.label}
                className="bg-dark-panel border border-dark-border rounded-xl p-4 cursor-pointer hover:border-cm-purple/40 transition-colors"
                onClick={() => {
                  setFromCurrency(pair.from);
                  setToCurrency(pair.to);
                }}
              >
                <p className="text-xs text-dark-muted">{pair.label}</p>
                <p className="text-xl font-bold text-dark-text mt-1">
                  {rate > 1000
                    ? rate.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })
                    : rate < 0.01
                      ? rate.toFixed(6)
                      : rate.toFixed(4)}
                </p>
                <p className="text-xs text-dark-muted mt-0.5">
                  1 {pair.from}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* All rates table */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-dark-border flex items-center gap-3">
          <h2 className="text-base font-bold text-dark-text flex-1">
            All Rates (Base: USD)
          </h2>
          <div className="relative w-48">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
            />
            <input
              type="text"
              placeholder="Search currency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-dark-panel2 border border-dark-border text-dark-text rounded-lg text-sm focus:outline-none focus:border-cm-purple"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-dark-panel">
              <tr className="border-b border-dark-border">
                <th className="text-left px-4 py-2.5 text-dark-muted font-medium">
                  Currency
                </th>
                <th className="text-right px-4 py-2.5 text-dark-muted font-medium">
                  Rate (per 1 USD)
                </th>
                <th className="text-right px-4 py-2.5 text-dark-muted font-medium">
                  1 Unit &rarr; USD
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCurrencies.map((code) => (
                <tr
                  key={code}
                  className="border-b border-dark-border/50 hover:bg-dark-panel2 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-dark-text">
                    {code}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-dark-text">
                    {(rates[code] ?? 0).toLocaleString("en-US", {
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-dark-muted">
                    {(1 / (rates[code] ?? 1)).toFixed(6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
