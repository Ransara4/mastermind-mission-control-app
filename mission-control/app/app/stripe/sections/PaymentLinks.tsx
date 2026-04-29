"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Link2, Plus, X, Loader2 } from "lucide-react";
import type { StripePaymentLink } from "@/lib/stripe-types";

function formatCurrency(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function PaymentLinks({
  paymentLinks,
  onRefresh,
}: {
  paymentLinks: StripePaymentLink[];
  onRefresh: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setFormError("Product name is required");
      return;
    }
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents <= 0) {
      setFormError("Enter a valid price");
      return;
    }

    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch("/api/stripe/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: cents,
          currency,
          allowPromoCode: true,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setFormError(data.error);
        return;
      }

      // Auto-copy the new link
      if (data.paymentLink?.url) {
        try {
          await navigator.clipboard.writeText(data.paymentLink.url);
          setCopiedId("new-link");
          setTimeout(() => setCopiedId(null), 3000);
        } catch { /* ignore */ }
      }

      setShowForm(false);
      setName("");
      setAmount("");
      setCurrency("usd");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-cm-purple" />
          <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight">
            Payment Links
          </h3>
          <span className="text-xs text-dark-muted">
            ({paymentLinks.length})
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          {showForm ? (
            <>
              <X size={14} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={14} />
              Create Link
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-4 p-4 bg-dark-panel2 border border-dark-border rounded-lg">
          <h4 className="text-sm font-medium text-dark-text mb-3">
            New Payment Link
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium Plan"
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Price ($)
              </label>
              <input
                type="number"
                min="0.50"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="19.99"
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              >
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
                <option value="cad">CAD</option>
                <option value="aud">AUD</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-dark-muted mt-2">
            Promo codes enabled by default. Link auto-copied on creation.
          </p>

          {formError && (
            <div className="mt-3 p-2 bg-dark-danger/10 border border-dark-danger/30 rounded text-sm text-dark-danger">
              {formError}
            </div>
          )}

          {copiedId === "new-link" && (
            <div className="mt-3 p-2 bg-dark-success/10 border border-dark-success/30 rounded text-sm text-dark-success">
              Payment link created and copied to clipboard!
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create Payment Link
            </button>
          </div>
        </div>
      )}

      {paymentLinks.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-dark-muted text-sm">
          No payment links found
        </div>
      ) : (
        <div className="space-y-3">
          {paymentLinks.map((pl) => {
            const isCopied = copiedId === pl.id;
            const totalAmount = pl.lineItems.reduce((sum, li) => sum + li.amount, 0);
            const plCurrency = pl.lineItems[0]?.currency || "usd";

            return (
              <div
                key={pl.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  pl.active
                    ? "border-dark-border bg-dark-panel2 hover:bg-dark-panel2/80"
                    : "border-dark-border bg-dark-panel2/50 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-dark-text truncate">
                      {pl.name || pl.lineItems.map((li) => li.description).join(", ") || "Payment Link"}
                    </span>
                    {pl.active ? (
                      <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-dark-success/20 text-dark-success">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-dark-panel2 text-dark-muted">
                        Inactive
                      </span>
                    )}
                    {totalAmount > 0 && (
                      <span className="text-sm font-semibold text-dark-text">
                        {formatCurrency(totalAmount, plCurrency)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-dark-muted font-mono font-dm-mono truncate">
                    {pl.url}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => copyToClipboard(pl.url, pl.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      isCopied
                        ? "bg-dark-success/20 text-dark-success"
                        : "bg-cm-purple text-white hover:bg-cm-purple/80"
                    }`}
                    title="Copy payment link"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy
                      </>
                    )}
                  </button>
                  <a
                    href={pl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center p-1.5 text-dark-muted hover:text-cm-purple rounded-lg hover:bg-cm-purple/10 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
