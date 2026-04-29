"use client";

import Link from "next/link";
import { ShoppingBag, ArrowLeft, Bot, FileText } from "lucide-react";

export default function ShopifyStoreOwnersPage() {
  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/app/business1/icps"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-dark-text mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        ICPs
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <ShoppingBag size={24} className="text-cm-purple" />
        <h1 className="text-2xl font-bold tracking-tight text-dark-text">Shopify Store Owners</h1>
        <span className="text-xs bg-dark-warn/20 text-dark-warn px-2 py-0.5 rounded-full font-medium">
          Research Pending
        </span>
      </div>
      <p className="text-dark-muted mb-8">
        E-commerce operators managing customer conversations and support on WhatsApp.
      </p>

      <div className="bg-dark-bg border border-dark-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} className="text-dark-muted" />
          <span className="text-sm font-medium text-dark-muted">Coming Soon</span>
        </div>
        <p className="text-sm text-dark-muted">
          Deep research and agent workflows for this ICP will be set up in a future phase.
          Research will include ICP interviews, pain points, messaging frameworks, and outreach sequences.
        </p>
      </div>

      <div className="bg-dark-bg border border-dark-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-dark-muted" />
          <span className="text-sm font-medium text-dark-muted">Project Files</span>
        </div>
        <p className="text-sm text-dark-muted font-mono font-dm-mono">
          ~/.attache/workspace/projects/business1/icps/shopify-store-owners/
        </p>
      </div>
    </div>
  );
}
