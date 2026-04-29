"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bug,
  FolderKanban,
  FileBarChart,
  ClipboardList,
  Settings,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useGuardDogData } from "@/hooks/useGuardDogData";

const GUARD_DOG_TABS = [
  { name: "Overview", href: "/app/guard-dog", icon: LayoutDashboard, exact: true },
  { name: "Vulnerabilities", href: "/app/guard-dog/vulnerabilities", icon: Bug },
  { name: "Projects", href: "/app/guard-dog/projects", icon: FolderKanban },
  { name: "Reports", href: "/app/guard-dog/reports", icon: FileBarChart },
  { name: "Audit Trail", href: "/app/guard-dog/audit", icon: ClipboardList },
  { name: "Settings", href: "/app/guard-dog/settings", icon: Settings },
];

function SecurityBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-cm-purple" : score >= 60 ? "bg-dark-warn" : "bg-dark-danger";
  const label =
    score >= 80 ? "Secure" : score >= 60 ? "At Risk" : "Critical";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color} animate-pulse`} />
      <span className="text-sm font-medium text-dark-muted">{label}</span>
      <span className="text-lg font-bold text-dark-text">{score}</span>
    </div>
  );
}

export default function GuardDogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data, loading, refresh } = useGuardDogData();

  return (
    <div className="space-y-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-dark-panel2 to-dark-panel rounded-xl">
            <Shield size={24} className="text-dark-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Guard Dog</h1>
            <p className="text-sm text-dark-muted">
              Package security scanner & threat monitor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {data && <SecurityBadge score={data.securityScore} />}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-all disabled:opacity-50"
            title="Refresh all data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-dark-border mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {GUARD_DOG_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-cm-purple text-cm-purple bg-cm-purple/10"
                    : "border-transparent text-dark-muted hover:text-dark-text hover:border-dark-muted hover:bg-dark-panel2"
                }`}
              >
                <Icon size={16} />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
