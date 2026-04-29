"use client";

import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react";

/* ── Stat Card ─────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
}) {
  const inner = (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-dark-muted">{label}</span>
        <div className="p-1.5 rounded-lg bg-cm-purple/15">
          <Icon size={16} className="text-cm-purple" />
        </div>
      </div>
      <p className="text-2xl font-bold text-dark-text truncate">{value}</p>
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:ring-2 hover:ring-cm-purple rounded-xl transition-all">
        {inner}
      </a>
    );
  }
  return inner;
}

/* ── Toast Banner ──────────────────────────────────────────────── */

export function Toast({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    success: "bg-dark-success/10 border-dark-success/30 text-dark-success",
    error: "bg-dark-danger/10 border-dark-danger/30 text-dark-danger",
    info: "bg-cm-purple/10 border-cm-purple/30 text-cm-purple",
  };
  const icons = {
    success: <CheckCircle size={16} className="text-dark-success flex-shrink-0" />,
    error: <AlertCircle size={16} className="text-dark-danger flex-shrink-0" />,
    info: <Loader2 size={16} className="text-cm-purple animate-spin flex-shrink-0" />,
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-0.5 rounded hover:bg-dark-panel2">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* ── Error inline ──────────────────────────────────────────────── */

export function InlineError({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
      <AlertCircle size={14} className="flex-shrink-0" />
      {message}
    </div>
  );
}
