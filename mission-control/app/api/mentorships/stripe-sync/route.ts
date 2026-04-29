import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { readDB, writeDB, nowISO, Payment } from "@/lib/mentorships-db";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const ENV_PATH = path.join(WS, ".env");

async function getStripeKey(): Promise<string> {
  const raw = await fs.readFile(ENV_PATH, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("STRIPE_SECRET_KEY=")) {
      return trimmed.split("=").slice(1).join("=").replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("STRIPE_SECRET_KEY not found in .env");
}

// POST /api/mentorships/stripe-sync - Sync mentorship charges from Stripe
export async function POST() {
  try {
    const stripeKey = await getStripeKey();
    const db = await readDB();

    // Fetch charges from Stripe
    const res = await fetch("https://api.stripe.com/v1/charges?limit=100", {
      headers: {
        Authorization: `Bearer ${stripeKey}`,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: `Stripe API error: ${res.status} - ${errBody}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const charges = data.data || [];

    let synced = 0;
    let skipped = 0;

    for (const charge of charges) {
      // Filter for mentorship charges
      const isMentorship =
        (charge.metadata && charge.metadata.type === "mentorship") ||
        (charge.description &&
          charge.description.toLowerCase().includes("mentorship"));

      if (!isMentorship) {
        skipped++;
        continue;
      }

      // Skip if already recorded
      const existing = db.payments.find(
        (p) => p.stripe_charge_id === charge.id
      );
      if (existing) {
        skipped++;
        continue;
      }

      // Find matching client by stripe_customer_id
      const client = db.clients.find(
        (c) => c.stripe_customer_id === charge.customer
      );

      if (!client) {
        skipped++;
        continue;
      }

      const amountUsd = charge.amount / 100;
      const hourlyRate = client.hourly_rate || 150;
      const hoursPurchased =
        charge.metadata?.hours_purchased
          ? parseFloat(charge.metadata.hours_purchased)
          : amountUsd / hourlyRate;

      const now = nowISO();
      const newPayment: Payment = {
        id: `pay-stripe-${charge.id}`,
        client_id: client.id,
        amount: amountUsd,
        currency: (charge.currency || "usd").toUpperCase(),
        hours_purchased: hoursPurchased,
        stripe_charge_id: charge.id,
        stripe_payment_intent_id: charge.payment_intent || null,
        method: "stripe",
        date: new Date(charge.created * 1000).toISOString().split("T")[0],
        notes: charge.description || "",
        created_at: now,
      };

      db.payments.push(newPayment);

      // Update client ID in stripe_payment_ids
      if (!client.stripe_payment_ids.includes(charge.id)) {
        client.stripe_payment_ids.push(charge.id);
      }

      // Recalculate client totals
      const clientIdx = db.clients.findIndex((c) => c.id === client.id);
      const clientPayments = db.payments.filter(
        (p) => p.client_id === client.id
      );
      db.clients[clientIdx].total_paid = clientPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      db.clients[clientIdx].hours_purchased = clientPayments.reduce(
        (sum, p) => sum + p.hours_purchased,
        0
      );
      db.clients[clientIdx].hours_remaining =
        db.clients[clientIdx].hours_purchased -
        db.clients[clientIdx].hours_used;
      db.clients[clientIdx].updated_at = now;

      synced++;
    }

    if (synced > 0) {
      await writeDB(db);
    }

    return NextResponse.json({ synced, skipped });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
