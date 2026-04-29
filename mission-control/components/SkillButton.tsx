"use client";

import { useState } from "react";
import { Zap, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface SkillButtonProps {
  /** Skill slug to invoke (must be in server allowlist) */
  skillName: string;
  /** Button label */
  label: string;
  /** Optional extra prompt text passed to the skill */
  prompt?: string;
  /** Button size variant */
  size?: "sm" | "md";
  /** Show output inline below button */
  showOutput?: boolean;
}

type Status = "idle" | "running" | "success" | "error";

export default function SkillButton({
  skillName,
  label,
  prompt,
  size = "md",
  showOutput = true,
}: SkillButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const px = size === "sm" ? "px-3 py-1.5" : "px-4 py-2";
  const iconSize = size === "sm" ? 13 : 15;

  const handleRun = async () => {
    if (status === "running") return;

    setStatus("running");
    setOutput(null);
    setErrorMsg(null);
    setShowPanel(false);

    try {
      const res = await fetch("/api/skills/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: skillName, prompt }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setOutput(data.output || "Skill ran successfully.");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Skill invocation failed.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    } finally {
      if (showOutput) setShowPanel(true);
      // Reset button state after 4s
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const buttonClass = [
    "inline-flex items-center gap-2 font-medium rounded-lg transition-colors",
    textSize,
    px,
    status === "running"
      ? "bg-cm-purple/40 text-dark-muted cursor-wait"
      : status === "success"
      ? "bg-dark-success/20 text-dark-success hover:bg-dark-success/30"
      : status === "error"
      ? "bg-dark-danger/20 text-dark-danger hover:bg-dark-danger/30"
      : "bg-cm-purple text-white hover:bg-cm-purple/80",
  ].join(" ");

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRun}
        disabled={status === "running"}
        className={buttonClass}
        title={`Run /${skillName}`}
      >
        {status === "running" ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 size={iconSize} />
        ) : status === "error" ? (
          <AlertCircle size={iconSize} />
        ) : (
          <Zap size={iconSize} />
        )}
        {status === "running"
          ? "Running..."
          : status === "success"
          ? "Done"
          : status === "error"
          ? "Failed"
          : label}
      </button>

      {showOutput && showPanel && (
        <div
          className={`relative rounded-lg border p-3 text-xs font-mono ${
            status === "error" || errorMsg
              ? "bg-dark-danger/10 border-dark-danger/30 text-dark-danger"
              : "bg-dark-panel2 border-dark-border text-dark-muted"
          }`}
        >
          <button
            onClick={() => setShowPanel(false)}
            className="absolute top-2 right-2 text-dark-muted hover:text-dark-text"
          >
            <X size={12} />
          </button>
          <pre className="whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-4">
            {errorMsg || output || ""}
          </pre>
        </div>
      )}
    </div>
  );
}
