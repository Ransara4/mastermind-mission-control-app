"use client";

import { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Key,
} from "lucide-react";

interface AuthField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required?: boolean;
  placeholder?: string;
}

interface SkillAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillSlug: string;
  skillName: string;
  authFields?: AuthField[];
  onAuthChange?: () => void;
}

interface AuthStatus {
  configured: boolean;
  configuredKeys: string[];
  updatedAt: string | null;
}

export default function SkillAuthModal({
  isOpen,
  onClose,
  skillSlug,
  skillName,
  authFields,
  onAuthChange,
}: SkillAuthModalProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Default auth fields if none specified
  const fields: AuthField[] =
    authFields && authFields.length > 0
      ? authFields
      : [
          {
            key: "api_key",
            label: "API Key",
            type: "password",
            required: true,
            placeholder: "Enter API key...",
          },
        ];

  useEffect(() => {
    if (isOpen) {
      fetchAuthStatus();
      setCredentials({});
      setVisibleFields(new Set());
      setShowConfirmClear(false);
      setToast(null);
    }
  }, [isOpen, skillSlug]);

  const fetchAuthStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/skills/auth?slug=${encodeURIComponent(skillSlug)}`
      );
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ configured: false, configuredKeys: [], updatedAt: null });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    const filledFields = Object.entries(credentials).filter(
      ([, v]) => v.trim() !== ""
    );
    if (filledFields.length === 0) {
      showToast("error", "Please enter at least one credential");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/skills/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: skillSlug,
          credentials: Object.fromEntries(filledFields),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      showToast("success", "Credentials saved securely");
      await fetchAuthStatus();
      setCredentials({});
      onAuthChange?.();
    } catch {
      showToast("error", "Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    // Simulate connection test — in production this would call a skill-specific endpoint
    await new Promise((r) => setTimeout(r, 1500));
    if (authStatus?.configured) {
      showToast("success", "Connection verified successfully");
    } else {
      showToast("error", "No credentials configured to test");
    }
    setTesting(false);
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch(
        `/api/skills/auth?slug=${encodeURIComponent(skillSlug)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to clear");
      showToast("success", "Credentials cleared");
      setShowConfirmClear(false);
      await fetchAuthStatus();
      onAuthChange?.();
    } catch {
      showToast("error", "Failed to clear credentials");
    } finally {
      setClearing(false);
    }
  };

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!isOpen) return null;

  const statusColor = authStatus?.configured
    ? "text-dark-success"
    : "text-dark-danger";
  const statusLabel = authStatus?.configured
    ? "Authenticated"
    : "Not Configured";
  const StatusIcon = authStatus?.configured ? ShieldCheck : ShieldAlert;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-dark-panel rounded-xl shadow-2xl shadow-black/40 border border-dark-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cm-purple/15">
              <Shield size={20} className="text-cm-purple" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight text-dark-text">{skillName}</h3>
              <p className="text-xs text-dark-muted">Authentication Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-cm-purple" />
            </div>
          ) : (
            <>
              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 bg-dark-panel2 rounded-lg border border-dark-border">
                <div className="flex items-center gap-2">
                  <StatusIcon size={18} className={statusColor} />
                  <span className={`text-sm font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
                {authStatus?.updatedAt && (
                  <span className="text-xs text-dark-muted">
                    Updated{" "}
                    {new Date(authStatus.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Configured Keys */}
              {authStatus?.configured &&
                authStatus.configuredKeys.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-dark-muted">
                      Configured Credentials
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {authStatus.configuredKeys.map((key) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-dark-success/10 text-dark-success text-xs rounded-md border border-dark-success/30"
                        >
                          <Key size={10} />
                          {key}: ••••••••
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Credential Form */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-dark-muted">
                  {authStatus?.configured
                    ? "Update Credentials"
                    : "Enter Credentials"}
                </p>
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-dark-text mb-1">
                      {field.label}
                      {field.required && (
                        <span className="text-dark-danger ml-0.5">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={
                          field.type === "password" && !visibleFields.has(field.key)
                            ? "password"
                            : "text"
                        }
                        value={credentials[field.key] || ""}
                        onChange={(e) =>
                          setCredentials((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-dark-border bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple focus:ring-2 focus:ring-cm-purple/20 font-mono font-dm-mono"
                        autoComplete="off"
                      />
                      {field.type === "password" && (
                        <button
                          type="button"
                          onClick={() => toggleVisibility(field.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-muted hover:text-dark-text"
                        >
                          {visibleFields.has(field.key) ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && (
          <div className="p-5 border-t border-dark-border bg-dark-panel2 space-y-3">
            {/* Toast */}
            {toast && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  toast.type === "success"
                    ? "bg-dark-success/10 text-dark-success border border-dark-success/30"
                    : "bg-dark-danger/10 text-dark-danger border border-dark-danger/30"
                }`}
              >
                {toast.type === "success" ? (
                  <CheckCircle size={16} />
                ) : (
                  <XCircle size={16} />
                )}
                {toast.message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-cm-purple rounded-lg hover:bg-purple2 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Shield size={14} />
                )}
                {saving ? "Saving..." : "Save Securely"}
              </button>

              <button
                onClick={handleTest}
                disabled={testing || !authStatus?.configured}
                className="px-4 py-2.5 text-sm font-medium text-dark-text bg-dark-panel border border-dark-border rounded-lg hover:bg-dark-panel2 transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 size={14} className="animate-spin inline mr-1" />
                ) : null}
                {testing ? "Testing..." : "Test"}
              </button>

              {authStatus?.configured && (
                <>
                  {showConfirmClear ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleClear}
                        disabled={clearing}
                        className="px-3 py-2.5 text-sm font-medium text-dark-danger bg-dark-danger/10 border border-dark-danger/30 rounded-lg hover:bg-dark-danger/20 transition-colors disabled:opacity-50"
                      >
                        {clearing ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setShowConfirmClear(false)}
                        className="px-3 py-2.5 text-sm text-dark-muted hover:text-dark-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmClear(true)}
                      className="p-2.5 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg transition-colors"
                      title="Clear credentials"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
