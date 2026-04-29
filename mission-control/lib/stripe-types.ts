// Stripe Dashboard Types

export type TimeRange = "today" | "7d" | "30d" | "90d" | "all";

export interface StripeDashboard {
  stats: {
    totalRevenue: number;
    monthlyRevenue: number;
    totalCharges: number;
    successfulCharges: number;
    failedCharges: number;
    refundedAmount: number;
    activeSubscriptions: number;
    activeCoupons: number;
  };
  recentCharges: StripeCharge[];
  revenueTrend: { date: string; amount: number; count: number }[];
  payouts: StripePayout[];
  coupons: StripeCoupon[];
  promoCodes: StripePromoCode[];
  paymentLinks: StripePaymentLink[];
  payoutSummary: {
    totalPaid: number;
    pending: number;
    nextPayoutDate: string | null;
    nextPayoutAmount: number | null;
  };
}

export interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  customerEmail: string | null;
  created: string;
  refunded: boolean;
  paymentMethod: string | null;
}

export interface StripePayout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: string;
  created: string;
  method: string;
}

export interface StripeCoupon {
  id: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  valid: boolean;
  created: string;
  appliesTo: string[]; // product IDs this coupon applies to
  redeemBy: string | null; // expiry timestamp
}

export interface StripePromoCode {
  id: string;
  code: string;
  couponId: string;
  couponName: string | null;
  active: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
  created: string;
}

export interface StripePaymentLink {
  id: string;
  url: string;
  active: boolean;
  name: string | null;
  lineItems: { description: string; amount: number; currency: string; productId: string }[];
  created: string;
}

export interface CreateCouponRequest {
  name: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
  maxRedemptions?: number;
  appliesTo?: string[]; // product IDs
  redeemBy?: string; // ISO date string for expiry
}

export interface CreatePromoCodeRequest {
  couponId: string;
  code: string;
  maxRedemptions?: number;
  expiresAt?: string;
  paymentLinkIds?: string[]; // which payment links to generate promo URLs for
  sendToTelegram?: boolean;
}
