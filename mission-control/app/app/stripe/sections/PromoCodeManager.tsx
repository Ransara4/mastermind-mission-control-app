"use client";

import { useState } from "react";
import { Plus, XCircle, Loader2, X, Copy, Check, ShieldCheck } from "lucide-react";
import type { StripeCoupon, StripePromoCode, StripePaymentLink } from "@/lib/stripe-types";

export default function PromoCodeManager({
  promoCodes,
  coupons,
  paymentLinks,
  onRefresh,
}: {
  promoCodes: StripePromoCode[];
  coupons: StripeCoupon[];
  paymentLinks: StripePaymentLink[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    id: string;
    success: boolean | null;
    message: string;
  } | null>(null);

  const [couponId, setCouponId] = useState("");
  const [code, setCode] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedPaymentLinkId, setSelectedPaymentLinkId] = useState("");

  const validCoupons = coupons.filter((c) => c.valid);
  const activePaymentLinks = paymentLinks.filter((pl) => pl.active);

  async function copyPromoLink(promoCode: string, paymentLinkUrl: string, id: string) {
    const url = `${paymentLinkUrl}?prefilled_promo_code=${promoCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function copyCode(text: string, id: string) {
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
    setCopiedId(`code-${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreate() {
    if (!couponId) {
      setFormError("Please select a coupon");
      return;
    }
    if (!code.trim()) {
      setFormError("Code is required");
      return;
    }

    setCreating(true);
    setFormError(null);

    try {
      const body: Record<string, unknown> = {
        couponId,
        code: code.trim().toUpperCase(),
      };
      if (maxRedemptions) body.maxRedemptions = Number(maxRedemptions);
      if (expiresAt) body.expiresAt = expiresAt;

      const res = await fetch("/api/stripe/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.error) {
        setFormError(data.error);
        return;
      }

      // Build promo URLs for all active payment links
      const createdCode = code.trim().toUpperCase();
      const promoUrls: { name: string; url: string }[] = [];
      for (const pl of activePaymentLinks) {
        const name = pl.name || pl.lineItems?.map((li) => li.description).join(", ") || "Link";
        promoUrls.push({
          name,
          url: `${pl.url}?prefilled_promo_code=${createdCode}`,
        });
      }

      // Copy the selected payment link's promo URL (or first one)
      const primaryPl = selectedPaymentLinkId
        ? activePaymentLinks.find((p) => p.id === selectedPaymentLinkId)
        : activePaymentLinks[0];
      if (primaryPl) {
        const promoUrl = `${primaryPl.url}?prefilled_promo_code=${createdCode}`;
        try {
          await navigator.clipboard.writeText(promoUrl);
        } catch { /* ignore */ }
      }

      // Send to Telegram: summary first, then each promo URL as separate plain-text message
      if (promoUrls.length > 0) {
        const couponInfo = validCoupons.find((c) => c.id === couponId);
        const discount = couponInfo
          ? couponInfo.percentOff
            ? `${couponInfo.percentOff}% off`
            : couponInfo.amountOff
              ? `$${(couponInfo.amountOff / 100).toFixed(2)} off`
              : ""
          : "";
        let tgMsg = `*Promo Code Created*\n\nCode: \`${createdCode}\``;
        if (discount) tgMsg += `\nDiscount: ${discount}`;

        // Send summary
        fetch("/api/stripe/send-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: tgMsg }),
        })
          .then(() => {
            // Then send each promo URL as a separate plain-text message for easy copy-paste
            for (const pu of promoUrls) {
              fetch("/api/stripe/send-telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: `${pu.name}:\n${pu.url}`,
                  plainText: true,
                }),
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }

      setShowForm(false);
      setCouponId("");
      setCode("");
      setMaxRedemptions("");
      setExpiresAt("");
      setSelectedPaymentLinkId("");
      onRefresh();

      // Auto-verify after a short delay to let Stripe propagate
      if (data.promoCode?.id) {
        const verifyPl = selectedPaymentLinkId
          ? activePaymentLinks.find((p) => p.id === selectedPaymentLinkId)
          : activePaymentLinks[0];
        if (verifyPl) {
          setTimeout(() => {
            handleVerify(createdCode, data.promoCode.id, verifyPl.url);
          }, 1500);
        }
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create promo code"
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(promoId: string) {
    setDeactivatingId(promoId);
    try {
      const res = await fetch("/api/stripe/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", id: promoId }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("Deactivate failed:", data.error);
      }
      onRefresh();
    } catch (err) {
      console.error("Deactivate error:", err);
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleVerify(promoCode: string, promoId: string, paymentUrl?: string) {
    setVerifyingId(promoId);
    setVerifyResult(null);
    try {
      const body: Record<string, string> = { promoCode };
      if (paymentUrl) body.paymentUrl = paymentUrl;
      const res = await fetch("/api/stripe/verify-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setVerifyResult({
        id: promoId,
        success: data.success ?? null,
        message: data.message || data.error || "Unknown result",
      });
    } catch (err) {
      setVerifyResult({
        id: promoId,
        success: false,
        message: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setVerifyingId(null);
    }
  }

  // Get display name for a payment link
  function getPaymentLinkLabel(pl: StripePaymentLink): string {
    if (pl.name) return pl.name;
    if (pl.lineItems.length > 0) return pl.lineItems.map((li) => li.description).join(", ");
    return pl.url.split("/").pop() || "Payment Link";
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight">
          Promotion Codes
        </h3>
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
              Create Promo Code
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-dark-panel2 border border-dark-border rounded-lg">
          <h4 className="text-sm font-medium text-dark-text mb-3">
            New Promo Code
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Coupon
              </label>
              <select
                value={couponId}
                onChange={(e) => setCouponId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              >
                <option value="">Select a coupon...</option>
                {validCoupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id} (
                    {c.percentOff
                      ? `${c.percentOff}% off`
                      : `$${((c.amountOff || 0) / 100).toFixed(2)} off`}
                    )
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER2026"
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple uppercase"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Payment Link
              </label>
              <select
                value={selectedPaymentLinkId}
                onChange={(e) => setSelectedPaymentLinkId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              >
                <option value="">Select payment link (optional)...</option>
                {activePaymentLinks.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {getPaymentLinkLabel(pl)}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-dark-muted mt-1">
                Promo link will be auto-copied on creation
              </p>
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Max Redemptions (optional)
              </label>
              <input
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-1">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
            </div>
          </div>

          {validCoupons.length === 0 && (
            <div className="mt-3 p-2 bg-dark-warn/10 border border-dark-warn/30 rounded text-sm text-dark-warn">
              No active coupons found. Create a coupon first.
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
              disabled={creating || validCoupons.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create Promo Code
            </button>
          </div>
        </div>
      )}

      {/* Promo Code Table */}
      {promoCodes.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-dark-muted text-sm">
          No promotion codes found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Code
                </th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Coupon
                </th>
                <th className="text-center text-xs font-medium text-dark-muted uppercase pb-2">
                  Status
                </th>
                <th className="text-center text-xs font-medium text-dark-muted uppercase pb-2">
                  Redemptions
                </th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Expires
                </th>
                <th className="text-center text-xs font-medium text-dark-muted uppercase pb-2">
                  Promo Link
                </th>
                <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-dark-panel2">
                  <td className="py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="inline-flex px-2 py-0.5 text-xs font-mono font-dm-mono font-medium bg-dark-panel2 text-dark-text rounded">
                        {promo.code}
                      </span>
                      <button
                        onClick={() => copyCode(promo.code, promo.id)}
                        className={`p-0.5 rounded transition-colors ${
                          copiedId === `code-${promo.id}`
                            ? "text-dark-success"
                            : "text-dark-muted hover:text-dark-text"
                        }`}
                        title="Copy code"
                      >
                        {copiedId === `code-${promo.id}` ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 text-sm text-dark-muted">
                    {promo.couponName || promo.couponId}
                  </td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        promo.active
                          ? "bg-dark-success/20 text-dark-success"
                          : "bg-dark-panel2 text-dark-muted"
                      }`}
                    >
                      {promo.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2.5 text-sm text-dark-muted text-center">
                    {promo.timesRedeemed}
                    {promo.maxRedemptions
                      ? ` / ${promo.maxRedemptions}`
                      : ""}
                  </td>
                  <td className="py-2.5 text-sm text-dark-muted">
                    {promo.expiresAt
                      ? new Date(promo.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Never"}
                  </td>
                  <td className="py-2.5 text-center">
                    {activePaymentLinks.length > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <select
                          className="text-xs border border-dark-border rounded px-1 py-0.5 bg-dark-panel2 text-dark-text max-w-[100px]"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const pl = activePaymentLinks.find(
                                (p) => p.id === e.target.value
                              );
                              if (pl) {
                                copyPromoLink(promo.code, pl.url, `link-${promo.id}`);
                              }
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Copy link...</option>
                          {activePaymentLinks.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {getPaymentLinkLabel(pl)}
                            </option>
                          ))}
                        </select>
                        {copiedId === `link-${promo.id}` && (
                          <span className="text-[10px] text-dark-success font-medium">
                            Copied!
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-dark-muted">-</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {promo.active && activePaymentLinks.length > 0 && (
                        <button
                          onClick={() => handleVerify(promo.code, promo.id)}
                          disabled={verifyingId === promo.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-dark-muted hover:text-cm-purple hover:bg-cm-purple/10 rounded transition-colors disabled:opacity-50"
                          title="Verify promo code works"
                        >
                          {verifyingId === promo.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={12} />
                          )}
                          Verify
                        </button>
                      )}
                      {promo.active && (
                        <button
                          onClick={() => handleDeactivate(promo.id)}
                          disabled={deactivatingId === promo.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded transition-colors disabled:opacity-50"
                          title="Deactivate promo code"
                        >
                          {deactivatingId === promo.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <XCircle size={12} />
                          )}
                          Deactivate
                        </button>
                      )}
                    </div>
                    {verifyResult?.id === promo.id && (
                      <div
                        className={`mt-1 text-[10px] font-medium ${
                          verifyResult.success === true
                            ? "text-dark-success"
                            : verifyResult.success === false
                              ? "text-dark-danger"
                              : "text-dark-warn"
                        }`}
                      >
                        {verifyResult.message}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
