import Stripe from "stripe";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
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

export async function GET() {
  try {
    const links = await stripe.paymentLinks.list({ limit: 100 });
    const mapped = await Promise.all(
      links.data.map(async (pl) => {
        let lineItems: { description: string; amount: number; currency: string }[] = [];
        try {
          const items = await stripe.paymentLinks.listLineItems(pl.id, { limit: 5 });
          lineItems = items.data.map((li) => ({
            description: li.description || "Item",
            amount: li.amount_total || 0,
            currency: li.currency || "usd",
            productId: (typeof li.price?.product === "string" ? li.price.product : li.price?.product?.id) || "",
          }));
        } catch { /* ignore */ }
        return {
          id: pl.id,
          url: pl.url,
          active: pl.active,
          name: pl.metadata?.name || null,
          lineItems,
        };
      })
    );
    return NextResponse.json({ paymentLinks: mapped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list payment links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, amount, currency = "usd", allowPromoCode = true } = body;

    if (!name || !amount) {
      return NextResponse.json(
        { error: "name and amount are required" },
        { status: 400 }
      );
    }

    const link = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: allowPromoCode,
      metadata: { name },
    });

    return NextResponse.json({
      success: true,
      paymentLink: {
        id: link.id,
        url: link.url,
        active: link.active,
        name,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
