import Stripe from "stripe";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { StripeDashboard, StripeCharge, StripePayout, StripeCoupon, StripePromoCode, StripePaymentLink } from "@/lib/stripe-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

// Load Stripe key from workspace .env if not already in process.env
function getStripeKey(): string {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  try {
    const envPath = path.join(WS, ".env");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
    if (match) {
      process.env.STRIPE_SECRET_KEY = match[1].trim();
      return match[1].trim();
    }
  } catch { /* env file not found */ }
  return "";
}

const stripe = new Stripe(getStripeKey(), {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

function emptyDashboard(): StripeDashboard {
  return {
    stats: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      totalCharges: 0,
      successfulCharges: 0,
      failedCharges: 0,
      refundedAmount: 0,
      activeSubscriptions: 0,
      activeCoupons: 0,
    },
    recentCharges: [],
    revenueTrend: [],
    payouts: [],
    coupons: [],
    promoCodes: [],
    paymentLinks: [],
    payoutSummary: {
      totalPaid: 0,
      pending: 0,
      nextPayoutDate: null,
      nextPayoutAmount: null,
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";

    const now = Math.floor(Date.now() / 1000);
    const timeRangeMap: Record<string, number> = {
      today: now - 86400,
      "7d": now - 7 * 86400,
      "30d": now - 30 * 86400,
      "90d": now - 90 * 86400,
    };
    const createdAfter = timeRangeMap[timeRange] || undefined;

    // Fetch all data in parallel
    const chargeParams: Stripe.ChargeListParams = { limit: 100 };
    if (createdAfter) chargeParams.created = { gte: createdAfter };

    const payoutParams: Stripe.PayoutListParams = { limit: 50 };
    if (createdAfter) payoutParams.created = { gte: createdAfter };

    const [
      chargesResponse,
      payoutsResponse,
      couponsResponse,
      promoCodesResponse,
      subsResponse,
      balance,
      paymentLinksResponse,
    ] = await Promise.all([
      stripe.charges.list(chargeParams),
      stripe.payouts.list(payoutParams),
      stripe.coupons.list({ limit: 100 }),
      stripe.promotionCodes.list({ limit: 100 }),
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.balance.retrieve(),
      stripe.paymentLinks.list({ limit: 100 }),
    ]);

    const charges = chargesResponse.data;
    const payouts = payoutsResponse.data;
    const coupons = couponsResponse.data;
    const promoCodes = promoCodesResponse.data;

    // Compute stats
    const succeededCharges = charges.filter((c) => c.status === "succeeded");
    const failedCharges = charges.filter((c) => c.status === "failed");
    const totalRevenue = succeededCharges.reduce((sum, c) => sum + c.amount, 0);
    const refundedAmount = charges.reduce((sum, c) => sum + (c.amount_refunded || 0), 0);

    // Monthly revenue (last 30 days from succeeded charges)
    const thirtyDaysAgo = now - 30 * 86400;
    const monthlyRevenue = succeededCharges
      .filter((c) => c.created >= thirtyDaysAgo)
      .reduce((sum, c) => sum + c.amount, 0);

    const activeCoupons = coupons.filter((c) => c.valid);

    // Map charges to our type
    const recentCharges: StripeCharge[] = charges.slice(0, 50).map((c) => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      status: c.status,
      description: c.description || null,
      customerEmail: c.receipt_email || null,
      created: new Date(c.created * 1000).toISOString(),
      refunded: c.refunded,
      paymentMethod: c.payment_method_details?.type || null,
    }));

    // Build revenue trend (group by day)
    const trendMap: Record<string, { amount: number; count: number }> = {};
    for (const c of succeededCharges) {
      const date = new Date(c.created * 1000).toISOString().split("T")[0];
      if (!trendMap[date]) trendMap[date] = { amount: 0, count: 0 };
      trendMap[date].amount += c.amount;
      trendMap[date].count += 1;
    }
    const revenueTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, amount: data.amount, count: data.count }));

    // Map payouts
    const mappedPayouts: StripePayout[] = payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
      created: new Date(p.created * 1000).toISOString(),
      method: p.method || "standard",
    }));

    // Payout summary
    const paidPayouts = payouts.filter((p) => p.status === "paid");
    const pendingPayouts = payouts.filter(
      (p) => p.status === "pending" || p.status === "in_transit"
    );
    const totalPaid = paidPayouts.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    // Next payout from pending balance
    const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0);

    // Map coupons
    const mappedCoupons: StripeCoupon[] = coupons.map((c) => ({
      id: c.id,
      name: c.name || null,
      percentOff: c.percent_off || null,
      amountOff: c.amount_off || null,
      currency: c.currency || null,
      duration: c.duration,
      durationInMonths: c.duration_in_months || null,
      maxRedemptions: c.max_redemptions || null,
      timesRedeemed: c.times_redeemed,
      valid: c.valid,
      created: new Date(c.created * 1000).toISOString(),
      appliesTo: (c.applies_to?.products as string[]) || [],
      redeemBy: c.redeem_by ? new Date(c.redeem_by * 1000).toISOString() : null,
    }));

    // Map promo codes
    const mappedPromoCodes: StripePromoCode[] = promoCodes.map((p) => {
      // Stripe PromotionCode has coupon directly, not under promotion
      const coupon = (p as any).coupon;
      const couponObj = coupon && typeof coupon !== "string" ? coupon : null;
      return {
        id: p.id,
        code: p.code,
        couponId: couponObj ? couponObj.id : (typeof coupon === "string" ? coupon : ""),
        couponName: couponObj ? (couponObj.name || null) : null,
        active: p.active,
        maxRedemptions: p.max_redemptions || null,
        timesRedeemed: p.times_redeemed,
        expiresAt: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null,
        created: new Date(p.created * 1000).toISOString(),
      };
    });

    // Map payment links (fetch line items for each)
    const mappedPaymentLinks: StripePaymentLink[] = await Promise.all(
      paymentLinksResponse.data.map(async (pl) => {
        let lineItems: { description: string; amount: number; currency: string; productId: string }[] = [];
        try {
          const items = await stripe.paymentLinks.listLineItems(pl.id, { limit: 5 });
          lineItems = items.data.map((li) => ({
            description: li.description || "Item",
            amount: li.amount_total || 0,
            currency: li.currency || "usd",
            productId: (typeof li.price?.product === "string" ? li.price.product : li.price?.product?.id) || "",
          }));
        } catch { /* line items not available */ }
        return {
          id: pl.id,
          url: pl.url,
          active: pl.active,
          name: (pl.metadata?.name) || null,
          lineItems,
          created: new Date().toISOString(),
        };
      })
    );

    const dashboard: StripeDashboard = {
      stats: {
        totalRevenue,
        monthlyRevenue,
        totalCharges: charges.length,
        successfulCharges: succeededCharges.length,
        failedCharges: failedCharges.length,
        refundedAmount,
        activeSubscriptions: subsResponse.data.length,
        activeCoupons: activeCoupons.length,
      },
      recentCharges,
      revenueTrend,
      payouts: mappedPayouts,
      coupons: mappedCoupons,
      promoCodes: mappedPromoCodes,
      paymentLinks: mappedPaymentLinks,
      payoutSummary: {
        totalPaid,
        pending: pendingAmount || pendingBalance,
        nextPayoutDate: null,
        nextPayoutAmount: pendingBalance > 0 ? pendingBalance : null,
      },
    };

    return NextResponse.json(dashboard);
  } catch (err) {
    console.error("Stripe dashboard error:", err);
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    // Return empty dashboard with error info rather than failing completely
    if (message.includes("Invalid API Key") || message.includes("authentication")) {
      return NextResponse.json(
        { error: "Invalid Stripe API key. Check STRIPE_SECRET_KEY in .env" },
        { status: 401 }
      );
    }
    return NextResponse.json(emptyDashboard());
  }
}
