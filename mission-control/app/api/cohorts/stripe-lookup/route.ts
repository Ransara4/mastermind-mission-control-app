import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { config } from "dotenv";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

// Load env from workspace .env
config({
  path: path.join(WS, ".env"),
});

const PRODUCT_PLAN_MAP: Record<string, { name: string; packageMonths: number }> = {
  prod_TByaEiUx41kYm2: { name: "Starter", packageMonths: 1 },
  prod_TBybEOTIMAee6Q: { name: "Growth", packageMonths: 6 },
  prod_TByd4yPozXUgT6: { name: "Leader", packageMonths: 12 },
};

function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// GET /api/cohorts/stripe-lookup?email=xxx
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { error: "email query parameter required" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Search for customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0] || null;

    // If we have a customer, check subscriptions first
    if (customer) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const item = sub.items?.data?.[0];
        const price = item?.price;
        const productId = typeof price?.product === "string" ? price.product : price?.product?.id;
        const planInfo = productId ? PRODUCT_PLAN_MAP[productId] : null;

        return NextResponse.json({
          found: true,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
          },
          subscription: {
            id: sub.id,
            status: sub.status,
            plan_name: planInfo?.name || null,
            amount_cents: price?.unit_amount || null,
            billing_interval: price?.recurring?.interval || null,
            billing_interval_count: price?.recurring?.interval_count || null,
            package_months: planInfo?.packageMonths || null,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            created: new Date(sub.created * 1000).toISOString(),
          },
        });
      }

      // Customer exists, no active sub — check charges
      const charges = await stripe.charges.list({
        customer: customer.id,
        limit: 5,
      });

      const successfulCharge = charges.data.find((c: any) => c.status === "succeeded");
      if (successfulCharge) {
        return NextResponse.json({
          found: true,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
          },
          subscription: {
            id: successfulCharge.id,
            status: "one_time",
            plan_name: successfulCharge.description || "One-time payment",
            amount_cents: successfulCharge.amount,
            billing_interval: null,
            billing_interval_count: null,
            package_months: null,
            current_period_start: null,
            current_period_end: null,
            created: new Date(successfulCharge.created * 1000).toISOString(),
          },
        });
      }
    }

    // No customer found or customer has no payments — search checkout sessions
    const sessions = await stripe.checkout.sessions.list({ limit: 50 });
    const matchingSession = sessions.data.find(
      (s: any) =>
        s.status === "complete" &&
        (s.customer_email?.toLowerCase() === email.toLowerCase() ||
         s.customer_details?.email?.toLowerCase() === email.toLowerCase())
    );

    if (matchingSession) {
      // Get the payment intent for details
      let paymentDate = new Date(matchingSession.created * 1000).toISOString();
      let amountCents = matchingSession.amount_total;

      if (matchingSession.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(matchingSession.payment_intent);
          if (pi.status === "succeeded") {
            paymentDate = new Date(pi.created * 1000).toISOString();
            amountCents = pi.amount;
          }
        } catch {
          // Fall back to session data
        }
      }

      return NextResponse.json({
        found: true,
        customer: customer
          ? { id: customer.id, name: customer.name, email: customer.email }
          : {
              id: null,
              name: matchingSession.customer_details?.name || null,
              email: matchingSession.customer_email || matchingSession.customer_details?.email,
            },
        subscription: {
          id: matchingSession.id,
          status: "one_time",
          plan_name: "One-time payment",
          amount_cents: amountCents,
          billing_interval: null,
          billing_interval_count: null,
          package_months: null,
          current_period_start: null,
          current_period_end: null,
          created: paymentDate,
        },
      });
    }

    // Also search payment intents by receipt_email
    const paymentIntents = await stripe.paymentIntents.list({ limit: 50 });
    const matchingPi = paymentIntents.data.find(
      (pi: any) =>
        pi.status === "succeeded" &&
        pi.receipt_email?.toLowerCase() === email.toLowerCase()
    );

    if (matchingPi) {
      return NextResponse.json({
        found: true,
        customer: customer
          ? { id: customer.id, name: customer.name, email: customer.email }
          : { id: null, name: null, email },
        subscription: {
          id: matchingPi.id,
          status: "one_time",
          plan_name: matchingPi.description || "One-time payment",
          amount_cents: matchingPi.amount,
          billing_interval: null,
          billing_interval_count: null,
          package_months: null,
          current_period_start: null,
          current_period_end: null,
          created: new Date(matchingPi.created * 1000).toISOString(),
        },
      });
    }

    return NextResponse.json({ found: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
