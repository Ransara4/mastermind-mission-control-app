"use client";

import Link from "next/link";
import { ShoppingBag, Briefcase, Users } from "lucide-react";

const icps = [
  {
    name: "Shopify Store Owners",
    href: "/app/business1/icps/shopify-store-owners",
    icon: ShoppingBag,
    description: "E-commerce operators managing customer conversations on WhatsApp.",
    status: "Research Pending",
  },
  {
    name: "SMB Coaches & Consultants",
    href: "/app/business1/icps/smb-coaches-consultants",
    icon: Briefcase,
    description: "Coaches and consultants running their practice through WhatsApp.",
    status: "Research Pending",
  },
];

export default function ICPsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Users size={24} className="text-cm-purple" />
        <h1 className="text-2xl font-bold tracking-tight text-dark-text">Ideal Customer Profiles</h1>
      </div>
      <p className="text-dark-muted mb-8">
        BUSINESS1 ICP research, targeting, and agent workflows.
      </p>

      <div className="grid gap-4">
        {icps.map(({ name, href, icon: Icon, description, status }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 p-5 bg-dark-panel border border-dark-border rounded-xl hover:border-cm-purple hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 bg-cm-purple/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon size={20} className="text-cm-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-dark-text">{name}</span>
                <span className="text-xs bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded-full">
                  {status}
                </span>
              </div>
              <p className="text-sm text-dark-muted">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
