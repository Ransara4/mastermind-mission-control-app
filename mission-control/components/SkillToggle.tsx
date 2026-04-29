"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface SkillToggleProps {
  skillId: string;
  skillSlug: string;
  initialEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
  size?: "sm" | "md";
}

export default function SkillToggle({
  skillId,
  skillSlug,
  initialEnabled,
  onToggle,
  size = "md",
}: SkillToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(false);
    const newState = !enabled;

    try {
      // Update registry status
      const registryRes = await fetch("/api/skills/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          skill: {
            id: skillId,
            status: newState ? "active" : "inactive",
          },
        }),
      });

      // Also toggle filesystem if applicable
      await fetch("/api/skills/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: skillSlug,
          enabled: newState,
        }),
      });

      if (registryRes.ok) {
        setEnabled(newState);
        onToggle?.(newState);
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const w = size === "sm" ? "w-9" : "w-11";
  const h = size === "sm" ? "h-5" : "h-6";
  const dot = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Disable skill" : "Enable skill"}
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex ${w} ${h} items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:ring-offset-1 ${
        loading
          ? "bg-dark-muted cursor-wait"
          : error
          ? "bg-dark-danger"
          : enabled
          ? "bg-cm-purple hover:bg-purple2"
          : "bg-dark-muted hover:bg-dark-muted"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center ${dot} rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          enabled ? translate : "translate-x-0.5"
        }`}
      >
        {loading && (
          <Loader2
            size={size === "sm" ? 8 : 10}
            className="animate-spin text-dark-muted"
          />
        )}
      </span>
    </button>
  );
}
