import Stripe from "stripe";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CreateCouponRequest } from "@/lib/stripe-types";
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

function getStripe(): Stripe | null {
  const key = getStripeKey();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion });
}

export async function GET() {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  try {
    const coupons = await stripe.coupons.list({ limit: 100 });
    const mapped = coupons.data.map((c) => ({
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
    }));
    return NextResponse.json({ coupons: mapped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list coupons";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  try {
    const body: CreateCouponRequest = await request.json();

    const params: Stripe.CouponCreateParams = {
      name: body.name,
      duration: body.duration,
    };

    if (body.percentOff) {
      params.percent_off = body.percentOff;
    }
    if (body.amountOff) {
      params.amount_off = body.amountOff;
      params.currency = body.currency || "usd";
    }
    if (body.durationInMonths) {
      params.duration_in_months = body.durationInMonths;
    }
    if (body.maxRedemptions) {
      params.max_redemptions = body.maxRedemptions;
    }
    if (body.appliesTo && body.appliesTo.length > 0) {
      params.applies_to = { products: body.appliesTo };
    }
    if (body.redeemBy) {
      params.redeem_by = Math.floor(new Date(body.redeemBy).getTime() / 1000);
    }

    const coupon = await stripe.coupons.create(params);

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months,
        maxRedemptions: coupon.max_redemptions,
        timesRedeemed: coupon.times_redeemed,
        valid: coupon.valid,
        created: new Date(coupon.created * 1000).toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create coupon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing coupon id" }, { status: 400 });
    }

    await stripe.coupons.del(id);
    return NextResponse.json({ success: true, deleted: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete coupon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
