import Stripe from "stripe";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CreatePromoCodeRequest } from "@/lib/stripe-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

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

function extractCouponInfo(promo: Stripe.PromotionCode): { couponId: string; couponName: string | null } {
  // Stripe PromotionCode has coupon directly, not nested under promotion
  const coupon = (promo as any).coupon;
  if (coupon && typeof coupon !== "string") {
    return { couponId: coupon.id, couponName: coupon.name || null };
  }
  if (typeof coupon === "string") {
    return { couponId: coupon, couponName: null };
  }
  return { couponId: "", couponName: null };
}

export async function GET() {
  try {
    const promos = await stripe.promotionCodes.list({ limit: 100 });
    const mapped = promos.data.map((p) => {
      const { couponId, couponName } = extractCouponInfo(p);
      return {
        id: p.id,
        code: p.code,
        couponId,
        couponName,
        active: p.active,
        maxRedemptions: p.max_redemptions || null,
        timesRedeemed: p.times_redeemed,
        expiresAt: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null,
        created: new Date(p.created * 1000).toISOString(),
      };
    });
    return NextResponse.json({ promoCodes: mapped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list promotion codes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle deactivation action
    if (body.action === "deactivate" && body.id) {
      const updated = await stripe.promotionCodes.update(body.id, {
        active: false,
      });
      return NextResponse.json({
        success: true,
        promoCode: {
          id: updated.id,
          code: updated.code,
          active: updated.active,
        },
      });
    }

    // Create new promo code
    const createBody = body as CreatePromoCodeRequest;

    const params: Record<string, any> = {
      coupon: createBody.couponId,
      code: createBody.code,
    };

    if (createBody.maxRedemptions) {
      params.max_redemptions = createBody.maxRedemptions;
    }
    if (createBody.expiresAt) {
      params.expires_at = Math.floor(new Date(createBody.expiresAt).getTime() / 1000);
    }

    const promo = await stripe.promotionCodes.create(params as Stripe.PromotionCodeCreateParams);
    const { couponId, couponName } = extractCouponInfo(promo);

    return NextResponse.json({
      success: true,
      promoCode: {
        id: promo.id,
        code: promo.code,
        couponId,
        couponName,
        active: promo.active,
        maxRedemptions: promo.max_redemptions || null,
        timesRedeemed: promo.times_redeemed,
        expiresAt: promo.expires_at
          ? new Date(promo.expires_at * 1000).toISOString()
          : null,
        created: new Date(promo.created * 1000).toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create promotion code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
