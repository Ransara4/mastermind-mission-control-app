"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { GuardDogDashboard } from "@/lib/guard-dog-types";

function CollapsibleGroup({
  title,
  items,
  defaultOpen,
}: {
  title: string;
  items: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border-b border-dark-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-3 text-left hover:bg-dark-panel2 px-2 rounded"
      >
        {open ? (
          <ChevronDown size={16} className="text-dark-muted" />
        ) : (
          <ChevronRight size={16} className="text-dark-muted" />
        )}
        <span className="text-sm font-medium text-dark-text">{title}</span>
        <span className="text-xs text-dark-muted ml-auto">{items.length}</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 pb-3 px-2">
          {items.length === 0 ? (
            <span className="text-xs text-dark-muted">None configured</span>
          ) : (
            items.map((item) => (
              <span
                key={item}
                className="inline-flex px-2.5 py-1 bg-dark-panel2 text-dark-muted text-xs rounded-full"
              >
                {item}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TrustedProviders({
  trustedProviders,
}: {
  trustedProviders: GuardDogDashboard["trustedProviders"];
}) {
  // Flatten scopes for display
  const scopeItems: string[] = [];
  for (const [eco, names] of Object.entries(trustedProviders.scopes)) {
    for (const name of names) {
      scopeItems.push(`${name} (${eco})`);
    }
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-1">
        🐕‍🦺 Trusted Pack
      </h3>
      <p className="text-xs text-dark-muted mb-4">
        Good boys — these packages skip all scanning
      </p>

      <CollapsibleGroup
        title="Exact Providers"
        items={trustedProviders.providers}
        defaultOpen
      />
      <CollapsibleGroup
        title="Namespaces"
        items={trustedProviders.namespaces}
      />
      <CollapsibleGroup title="Scopes" items={scopeItems} />
    </div>
  );
}
