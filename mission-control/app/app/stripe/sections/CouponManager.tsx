"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, X, Tag } from "lucide-react";
import type { StripeCoupon, StripePaymentLink } from "@/lib/stripe-types";

function formatCurrency(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDiscount(coupon: StripeCoupon): string {
  if (coupon.percentOff) return `${coupon.percentOff}% off`;
  if (coupon.amountOff)
    return `${formatCurrency(coupon.amountOff, coupon.currency || "usd")} off`;
  return "Unknown";
}

function formatDuration(coupon: StripeCoupon): string {
  if (coupon.duration === "once") return "Once";
  if (coupon.duration === "forever") return "Forever";
  if (coupon.duration === "repeating" && coupon.durationInMonths)
    return `${coupon.durationInMonths} months`;
  return coupon.duration;
}

// Build a map of productId -> product name from payment links
function buildProductMap(
  paymentLinks: StripePaymentLink[]
): { id: string; name: string; linkUrl: string }[] {
  const seen = new Set<string>();
  const products: { id: string; name: string; linkUrl: string }[] = [];
  for (const pl of paymentLinks) {
    for (const li of pl.lineItems) {
      if (li.productId && !seen.has(li.productId)) {
        seen.add(li.productId);
        products.push({
          id: li.productId,
          name: li.description,
          linkUrl: pl.url,
        });
      }
    }
  }
  return products;
}

export default function CouponManager({
  coupons,
  paymentLinks,
  onRefresh,
}: {
  coupons: StripeCoupon[];
  paymentLinks: StripePaymentLink[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState(""); // dollars, not cents
  const [currency, setCurrency] = useState("usd");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationInMonths, setDurationInMonths] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [redeemBy, setRedeemBy] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const products = buildProductMap(paymentLinks);

  function toggleProduct(productId: string) {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  function selectAllProducts() {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.id));
    }
  }

  function resetForm() {
    setName("");
    setDiscountType("percent");
    setPercentOff("");
    setAmountOff("");
    setCurrency("usd");
    setDuration("once");
    setDurationInMonths("");
    setMaxRedemptions("");
    setRedeemBy("");
    setSelectedProducts([]);
    setFormError(null);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setFormError("Coupon name is required");
      return;
    }

    const body: Record<string, unknown> = {
      name: name.trim(),
      duration,
    };

    if (discountType === "percent") {
      const pct = parseFloat(percentOff);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        setFormError("Percent off must be between 1 and 100");
        return;
      }
      body.percentOff = pct;
    } else {
      const dollars = parseFloat(amountOff);
      if (isNaN(dollars) || dollars <= 0) {
        setFormError("Amount off must be greater than $0");
        return;
      }
      body.amountOff = Math.round(dollars * 100); // convert to cents
      body.currency = currency;
    }

    if (duration === "repeating") {
      const months = parseInt(durationInMonths, 10);
      if (isNaN(months) || months <= 0) {
        setFormError("Duration in months is required for repeating coupons");
        return;
      }
      body.durationInMonths = months;
    }

    if (maxRedemptions) body.maxRedemptions = parseInt(maxRedemptions, 10);
    if (redeemBy) body.redeemBy = redeemBy;
    if (selectedProducts.length > 0) body.appliesTo = selectedProducts;

    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch("/api/stripe/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.error) {
        setFormError(data.error);
        return;
      }

      setShowForm(false);
      resetForm();
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(couponId: string) {
    setDeletingId(couponId);
    try {
      const res = await fetch(`/api/stripe/coupons?id=${couponId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        console.error("Delete failed:", data.error);
      }
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  }

  // Resolve product names from IDs
  function getProductNames(productIds: string[]): string[] {
    if (!productIds || productIds.length === 0) return [];
    return productIds
      .map((id) => {
        const p = products.find((prod) => prod.id === id);
        return p?.name || id;
      });
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight">Coupons</h3>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
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
              Create Coupon
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-dark-panel2 border border-dark-border rounded-lg">
          <h4 className="text-sm font-medium text-dark-text mb-3">
            New Coupon
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="block text-xs text-dark-muted mb-1">Coupon Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Sale 2026"
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-xs text-dark-muted mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")}
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              >
                <option value="percent">Percentage Off (%)</option>
                <option value="amount">Fixed Amount Off ($)</option>
              </select>
            </div>

            {/* Discount Value */}
            {discountType === "percent" ? (
              <div>
                <label className="block text-xs text-dark-muted mb-1">Percent Off</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={percentOff}
                    onChange={(e) => setPercentOff(e.target.value)}
                    placeholder="25"
                    className="w-full px-3 py-2 pr-8 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  />
                  <span className="absolute right-3 top-2 text-sm text-dark-muted">%</span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-dark-muted mb-1">Amount Off</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-dark-muted">$</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.01}
                      value={amountOff}
                      onChange={(e) => setAmountOff(e.target.value)}
                      placeholder="10.00"
                      className="w-full pl-7 pr-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-dark-muted mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR</option>
                    <option value="gbp">GBP</option>
                    <option value="cad">CAD</option>
                  </select>
                </div>
              </>
            )}

            {/* Duration */}
            <div>
              <label className="block text-xs text-dark-muted mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as "once" | "repeating" | "forever")}
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              >
                <option value="once">Once (single purchase)</option>
                <option value="repeating">Repeating (X months of subscription)</option>
                <option value="forever">Forever (all future invoices)</option>
              </select>
            </div>

            {/* Duration in Months (conditional) */}
            {duration === "repeating" && (
              <div>
                <label className="block text-xs text-dark-muted mb-1">Duration in Months</label>
                <input
                  type="number"
                  min={1}
                  value={durationInMonths}
                  onChange={(e) => setDurationInMonths(e.target.value)}
                  placeholder="3"
                  className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
              </div>
            )}

            {/* Max Redemptions */}
            <div>
              <label className="block text-xs text-dark-muted mb-1">Max Redemptions (optional)</label>
              <input
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>

            {/* Redeem By (expiry) */}
            <div>
              <label className="block text-xs text-dark-muted mb-1">Expires On (optional)</label>
              <input
                type="date"
                value={redeemBy}
                onChange={(e) => setRedeemBy(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>
          </div>

          {/* Applies To - Product Multi-Select */}
          {products.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-dark-muted">
                  Applies To (select products)
                </label>
                <button
                  type="button"
                  onClick={selectAllProducts}
                  className="text-[10px] text-cm-purple hover:text-cm-purple-mid"
                >
                  {selectedProducts.length === products.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {products.map((product) => {
                  const isSelected = selectedProducts.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                        isSelected
                          ? "border-cm-purple bg-cm-purple/10 text-cm-purple"
                          : "border-dark-border bg-dark-panel2 text-dark-muted hover:bg-dark-panel2/80"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${
                          isSelected
                            ? "bg-cm-purple border-cm-purple"
                            : "border-dark-border"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="truncate">{product.name}</span>
                    </button>
                  );
                })}
              </div>
              {selectedProducts.length === 0 && (
                <p className="text-[10px] text-dark-muted mt-1">
                  No products selected = coupon applies to all products
                </p>
              )}
            </div>
          )}

          {formError && (
            <div className="mt-3 p-2 bg-dark-danger/10 border border-dark-danger/30 rounded text-sm text-dark-danger">
              {formError}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create Coupon
            </button>
          </div>
        </div>
      )}

      {/* Coupon Table */}
      {coupons.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-dark-muted text-sm">
          No coupons found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Discount
                </th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Duration
                </th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Applies To
                </th>
                <th className="text-center text-xs font-medium text-dark-muted uppercase pb-2">
                  Used
                </th>
                <th className="text-center text-xs font-medium text-dark-muted uppercase pb-2">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {coupons.map((coupon) => {
                const productNames = getProductNames(coupon.appliesTo);
                return (
                  <tr key={coupon.id} className="hover:bg-dark-panel2">
                    <td className="py-2.5 text-sm text-dark-text font-medium">
                      {coupon.name || coupon.id}
                    </td>
                    <td className="py-2.5 text-sm text-dark-text">
                      {formatDiscount(coupon)}
                    </td>
                    <td className="py-2.5 text-sm text-dark-muted">
                      <div>{formatDuration(coupon)}</div>
                      {coupon.redeemBy && (
                        <div className="text-[10px] text-dark-muted">
                          Expires: {new Date(coupon.redeemBy).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5">
                      {productNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {productNames.map((pn, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-cm-purple/10 text-cm-purple rounded"
                            >
                              <Tag size={8} />
                              {pn}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-dark-muted">All products</span>
                      )}
                    </td>
                    <td className="py-2.5 text-sm text-dark-muted text-center">
                      {coupon.timesRedeemed}
                      {coupon.maxRedemptions
                        ? ` / ${coupon.maxRedemptions}`
                        : ""}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          coupon.valid
                            ? "bg-dark-success/20 text-dark-success"
                            : "bg-dark-panel2 text-dark-muted"
                        }`}
                      >
                        {coupon.valid ? "Active" : "Expired"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {confirmDeleteId === coupon.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-dark-danger">Delete?</span>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            disabled={deletingId === coupon.id}
                            className="px-2 py-1 text-xs bg-dark-danger text-white rounded hover:opacity-80 disabled:opacity-50"
                          >
                            {deletingId === coupon.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              "Yes"
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs bg-dark-panel2 text-dark-text rounded hover:bg-dark-panel2/80"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(coupon.id)}
                          className="p-1 text-dark-muted hover:text-dark-danger transition-colors"
                          title="Delete coupon"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
