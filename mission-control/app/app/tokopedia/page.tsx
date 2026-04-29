"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Star,
  Loader,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Store,
  MapPin,
  Package,
  BadgeCheck,
  Zap,
  ExternalLink,
  TrendingDown,
  MessageSquareWarning,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

const IDR_TO_USD = 16000;

interface Product {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  originalPrice: string;
  originalPriceNum: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  imageUrl: string;
  url: string;
  shop: {
    id: string;
    name: string;
    city: string;
    isOfficial: boolean;
    isPowerBadge: boolean;
  };
  badges: string[];
}

interface ScoredProduct extends Product {
  trustScore: number;
  trustSignals: string[];
  redFlags: string[];
}

interface StatusData {
  lastRun: string | null;
  lastCommand: string | null;
  lastQuery: string | null;
  lastResult: string | null;
  cartItems: string[];
  status: string;
}

function computeTrustScore(product: Product, medianPrice: number): ScoredProduct {
  let score = 0;
  const signals: string[] = [];
  const flags: string[] = [];

  // Rating + reviews scoring
  if (product.rating >= 4.5 && product.reviewCount >= 100) {
    score += 40;
    signals.push(`${product.rating} rating with ${product.reviewCount.toLocaleString()} reviews`);
  } else if (product.rating >= 4.0 && product.reviewCount >= 10) {
    score += 20;
    signals.push(`${product.rating} rating with ${product.reviewCount.toLocaleString()} reviews`);
  } else if (product.rating > 0) {
    signals.push(`${product.rating} rating (${product.reviewCount} reviews)`);
  }

  // Sold count scoring -- primary trust signal when ratings aren't available from search API
  if (product.soldCount >= 500) {
    score += 60;
    signals.push(`${product.soldCount.toLocaleString()}+ sold`);
  } else if (product.soldCount >= 100) {
    score += 45;
    signals.push(`${product.soldCount.toLocaleString()}+ sold`);
  } else if (product.soldCount >= 50) {
    score += 35;
    signals.push(`${product.soldCount.toLocaleString()}+ sold`);
  } else if (product.soldCount >= 10) {
    score += 20;
    signals.push(`${product.soldCount.toLocaleString()} sold`);
  } else if (product.soldCount >= 1) {
    score += 8;
    signals.push(`${product.soldCount} sold`);
  }

  // Rating + reviews (when available -- Tokopedia search API often omits these)
  if (product.rating >= 4.5 && product.reviewCount >= 100) {
    score += 30;
    signals.push(`${product.rating} rating, ${product.reviewCount.toLocaleString()} reviews`);
  } else if (product.rating >= 4.0 && product.reviewCount >= 10) {
    score += 15;
    signals.push(`${product.rating} rating, ${product.reviewCount.toLocaleString()} reviews`);
  } else if (product.rating > 0) {
    signals.push(`${product.rating} rating (${product.reviewCount} reviews)`);
  }

  // Official store
  if (product.shop.isOfficial) {
    score += 20;
    signals.push("Official Store");
  }

  // Power badge
  if (product.shop.isPowerBadge) {
    score += 10;
    signals.push("Power Badge seller");
  }

  // Dropshipper penalty -- no sales AND no reviews
  if (product.reviewCount === 0 && product.soldCount === 0) {
    flags.push("No sales history -- likely a dropshipper listing");
  }

  // Price anomaly -- suspiciously cheap vs market
  if (medianPrice > 0 && product.priceNum < medianPrice * 0.5) {
    score -= 15;
    flags.push(`Price ${formatIDR(product.priceNum)} is less than half market median (${formatIDR(medianPrice)}) -- may be fake or wrong size`);
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    ...product,
    trustScore: score,
    trustSignals: signals,
    redFlags: flags,
  };
}

function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatUSD(idrAmount: number): string {
  const usd = idrAmount / IDR_TO_USD;
  if (usd < 1) return `$${usd.toFixed(2)}`;
  return `$${Math.round(usd).toLocaleString()}`;
}

function trustLabel(score: number, soldCount: number, reviewCount: number): string {
  if (score >= 30) {
    if (soldCount >= 500) return `${soldCount}+ sold · Established seller`;
    if (soldCount >= 50) return `${soldCount}+ sold · Verified track record`;
    if (soldCount >= 10) return `${soldCount} sold · Active seller`;
    if (reviewCount >= 100) return `${reviewCount} reviews · Well reviewed`;
    return "Verified seller";
  }
  if (score >= 8) {
    if (soldCount >= 1) return `${soldCount} sold · Limited history`;
    if (reviewCount > 0) return `${reviewCount} reviews · Few sales`;
    return "Minimal history";
  }
  return "No verified sales";
}

function normalizeCity(city: string): string {
  if (!city) return "";
  const c = city.toLowerCase();
  if (c.includes("bali") || c.includes("denpasar") || c.includes("badung") || c.includes("gianyar") || c.includes("ubud") || c.includes("seminyak") || c.includes("canggu") || c.includes("kuta")) return "Bali";
  if (c.includes("jakarta")) return "Jakarta";
  if (c.includes("tangerang")) return "Tangerang";
  if (c.includes("bandung")) return "Bandung";
  if (c.includes("surabaya")) return "Surabaya";
  if (c.includes("yogyakarta") || c.includes("jogja") || c.includes("sleman") || c.includes("bantul")) return "Yogyakarta";
  if (c.includes("semarang")) return "Semarang";
  if (c.includes("medan")) return "Medan";
  if (c.includes("makassar")) return "Makassar";
  if (c.includes("bogor")) return "Bogor";
  if (c.includes("depok")) return "Depok";
  if (c.includes("bekasi")) return "Bekasi";
  if (c.includes("malang")) return "Malang";
  // Strip "Kab." / "Kota" prefixes for anything else
  return city.replace(/^(Kab\.|Kota)\s*/i, "");
}

function TrustBadge({ score, soldCount, reviewCount }: { score: number; soldCount: number; reviewCount: number }) {
  const label = trustLabel(score, soldCount, reviewCount);
  if (score >= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-dark-success/20 text-dark-success">
        <ShieldCheck className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  }
  if (score >= 8) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-dark-warn/20 text-dark-warn">
        <ShieldAlert className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-dark-danger/20 text-dark-danger">
      <ShieldX className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export default function TokopediaPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("relevant");
  const [showRisky, setShowRisky] = useState(false);
  const [allScored, setAllScored] = useState<ScoredProduct[]>([]);
  const [results, setResults] = useState<ScoredProduct[]>([]);
  const [_totalFound, setTotalFound] = useState(0);
  const [filteredOut, setFilteredOut] = useState(0);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (allScored.length === 0) return;
    setResults(showRisky ? allScored : allScored.filter((p) => p.trustScore >= 8));
  }, [showRisky, allScored]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/tokopedia?action=status");
      const data = await res.json();
      if (data.success) setStatus(data.status);
    } catch {
      // Silent
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    setSuccessMsg("");
    setTotalFound(0);
    setFilteredOut(0);

    try {
      const res = await fetch(
        `/api/tokopedia?action=search&q=${encodeURIComponent(query)}&sort=${sort}&limit=20`
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Search failed");
        return;
      }

      const products: Product[] = data.products || [];
      setTotalFound(products.length);

      if (products.length === 0) {
        setError("No products found. Try a different search query.");
        return;
      }

      // Compute median price for anomaly detection
      const prices = products.map((p) => p.priceNum).filter((p) => p > 0).sort((a, b) => a - b);
      const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;

      // Score all products
      const scored = products.map((p) => computeTrustScore(p, medianPrice));
      scored.sort((a, b) => b.trustScore - a.trustScore || b.soldCount - a.soldCount);

      const risky = scored.filter((p) => p.trustScore < 8);
      const safe = scored.filter((p) => p.trustScore >= 8);
      setAllScored(scored);
      setFilteredOut(risky.length);
      setResults(showRisky ? scored : safe);
      if (data.status) setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleAddToCart = async (productUrl: string, productName: string) => {
    setAddingToCart(productUrl);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/tokopedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cart", productUrl }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to add to cart");
      } else {
        setSuccessMsg(`Added "${productName}" to cart`);
        fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cart operation failed");
    } finally {
      setAddingToCart(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ApiKeyBanner slug="tokopedia" agentName="Tokopedia" />
      {/* Header */}
      <div className="bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-xl p-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-cm-purple" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Tokopedia</h1>
            <p className="text-sm text-dark-muted">
              Search, evaluate sellers with trust scoring, and add to cart
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search products... (e.g. biossance squalane, SSD 500GB)"
              className="w-full pl-10 pr-4 py-2.5 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-cm-purple bg-dark-panel2 placeholder:text-dark-muted"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel2"
          >
            <option value="relevant">Relevant</option>
            <option value="lowest">Lowest Price</option>
            <option value="review">Most Reviewed</option>
            <option value="newest">Newest</option>
          </select>
          <select
            value={showRisky ? "all" : "safe"}
            onChange={(e) => setShowRisky(e.target.value === "all")}
            className="px-3 py-2.5 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel2"
          >
            <option value="safe">Trusted + Caution</option>
            <option value="all">Show all</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-cm-purple text-white rounded-lg font-medium hover:bg-cm-purple/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-dark-danger/10 border border-dark-danger/20 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-dark-danger flex-shrink-0" />
          <p className="text-dark-danger text-sm">{error}</p>
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div className="bg-dark-success/10 border border-dark-success/30 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-dark-success flex-shrink-0" />
          <p className="text-dark-success text-sm">{successMsg}</p>
        </div>
      )}

      {/* Results summary */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">
            {results.length} Results
            {filteredOut > 0 && !showRisky && (
              <span className="ml-2 text-sm font-normal text-dark-muted">
                · {filteredOut} risky seller{filteredOut !== 1 ? "s" : ""} hidden
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3 text-xs text-dark-muted">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cm-purple" /> Trusted
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-dark-warn" /> Caution
            </span>
            {showRisky && (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-dark-danger" /> Risky (hidden by default)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Product Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map((product) => (
            <div
              key={product.id || product.url}
              className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden hover:shadow-md hover:shadow-black/20 transition-shadow"
            >
              <div className="flex">
                {/* Product Image */}
                {product.imageUrl && (
                  <div className="w-28 h-28 flex-shrink-0 bg-dark-bg">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-1 p-3 space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-dark-text text-sm leading-tight line-clamp-2">
                      {product.name}
                    </h3>
                    <TrustBadge score={product.trustScore} soldCount={product.soldCount} reviewCount={product.reviewCount} />
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-cm-purple">
                      {product.price}
                    </span>
                    <span className="text-xs text-dark-muted">
                      (~{formatUSD(product.priceNum)} USD)
                    </span>
                    {product.discountPercentage > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-dark-danger font-medium">
                        <TrendingDown className="w-3 h-3" />
                        {product.discountPercentage}%
                      </span>
                    )}
                  </div>

                  {/* Shop + Location */}
                  <div className="flex items-center gap-3 text-xs text-dark-muted flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      {product.shop.name}
                    </span>
                    {product.shop.isOfficial && (
                      <span className="inline-flex items-center gap-0.5 bg-cm-purple/15 text-cm-purple px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                        <BadgeCheck className="w-3 h-3" /> Official
                      </span>
                    )}
                    {product.shop.isPowerBadge && !product.shop.isOfficial && (
                      <span className="inline-flex items-center gap-0.5 bg-cm-pink-light text-[#9b5b5e] px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                        <Zap className="w-3 h-3" /> Power
                      </span>
                    )}
                    {product.shop.city && (
                      <span className="inline-flex items-center gap-1 font-medium text-dark-muted">
                        <MapPin className="w-3 h-3" />
                        {normalizeCity(product.shop.city)}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-dark-muted">
                    {product.rating > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {product.rating}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MessageSquareWarning className="w-3 h-3" />
                      {product.reviewCount > 0 ? `${product.reviewCount.toLocaleString()} reviews` : "No reviews"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {product.soldCount > 0
                        ? `${product.soldCount >= 1000 ? `${(product.soldCount / 1000).toFixed(product.soldCount >= 10000 ? 0 : 1)}K` : product.soldCount.toLocaleString()} sold`
                        : "Not sold yet"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust signals + red flags */}
              <div className="px-3 pb-2 space-y-1.5">
                {product.trustSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.trustSignals.map((signal, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-dark-success/10 text-dark-success"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
                {product.redFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.redFlags.map((flag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-dark-danger/10 text-dark-danger"
                      >
                        <MessageSquareWarning className="w-3 h-3" />
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 px-3 pb-3">
                {product.url && (
                  <button
                    onClick={() => handleAddToCart(product.url, product.name)}
                    disabled={addingToCart === product.url}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingToCart === product.url ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </>
                    )}
                  </button>
                )}
                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-cm-purple/15 text-cm-purple rounded-lg text-sm font-medium hover:bg-cm-purple/25 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Items */}
      {status && status.cartItems && status.cartItems.length > 0 && (
        <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 to-dark-panel">
            <h3 className="font-semibold tracking-tight text-dark-text flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-cm-purple" />
              Recent Cart Items
            </h3>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {status.cartItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-sm text-dark-text bg-dark-bg rounded-lg px-3 py-2"
                >
                  <CheckCircle className="w-4 h-4 text-dark-success flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Status footer */}
      {status && status.lastRun && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4 flex items-center gap-3 text-sm text-dark-muted">
          <CheckCircle className="w-4 h-4 text-dark-success flex-shrink-0" />
          <span>
            Last: <strong className="text-dark-text">{status.lastCommand}</strong> - {status.lastResult}
            <span className="ml-2 text-xs text-dark-muted">
              {new Date(status.lastRun).toLocaleString()}
            </span>
          </span>
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && !error && (
        <div className="bg-dark-panel rounded-lg border border-dark-border p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-cm-purple-mid mx-auto mb-4" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-1">
            Search Tokopedia
          </h3>
          <p className="text-sm text-dark-muted mb-4">
            Enter a product name above to search with anti-rip-off trust scoring.
          </p>
          <div className="inline-flex flex-col items-start text-xs text-dark-muted space-y-1">
            <span>Trust Score evaluates: rating, reviews, sales, official status, power badge, price anomalies</span>
            <span>Low-trust dropshippers are automatically filtered out</span>
            <span>Prices shown in IDR + USD equivalent</span>
          </div>
        </div>
      )}
    </div>
  );
}
