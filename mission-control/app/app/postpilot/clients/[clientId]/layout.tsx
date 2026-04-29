"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Settings, FileText, Search } from "lucide-react";

const TABS = [
  { key: "setup", label: "Setup", icon: Settings },
  { key: "blog", label: "Blog", icon: FileText },
  { key: "discoveries", label: "Source Discovery", icon: Search },
];

export default function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const pathname = usePathname();
  const [clientName, setClientName] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    fetch(`/api/postpilot/clients/${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        setClientName(d.name || clientId);
        setPlatform(d.platform || "");
      })
      .catch(() => {});
  }, [clientId]);

  const base = `/app/postpilot/clients/${clientId}`;
  const activeTab = TABS.find((t) => pathname.endsWith(`/${t.key}`))?.key ?? "setup";

  return (
    <div>
      {/* Client header */}
      <div className="flex items-start gap-3 mb-5">
        <Link
          href="/app/postpilot/clients"
          className="mt-1 p-1 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="text-xs text-dark-muted font-medium uppercase tracking-wide mb-0.5">
            PostPilot Client
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text leading-tight">
            {clientName || <span className="text-dark-muted">Loading...</span>}
          </h1>
          {platform && (
            <div className="text-sm text-dark-muted mt-0.5 capitalize">{platform}</div>
          )}
        </div>
      </div>

      {/* Folder-tab nav */}
      <div className="flex items-end gap-0.5 border-b border-dark-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`${base}/${tab.key}`}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-all ${
                isActive
                  ? "bg-dark-panel border-dark-border text-cm-purple -mb-px z-10"
                  : "bg-dark-panel2 border-transparent text-dark-muted hover:bg-dark-panel2 hover:text-dark-text"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-dark-panel border border-dark-border border-t-0 rounded-b-xl rounded-tr-xl p-6">
        {children}
      </div>
    </div>
  );
}
