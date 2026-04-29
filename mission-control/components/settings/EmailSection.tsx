"use client";

import { Mail } from "lucide-react";

interface MCSettings {
  emailProvider: "gmail" | "mandrill" | "resend" | "sendgrid" | "ses" | "postmark";
  emailRecipient: string;
  emailFromName: string;
  dailyBriefingEnabled: boolean;
  dailyBriefingTime: string;
  [key: string]: unknown;
}

interface SectionProps {
  settings: MCSettings;
  onChange: (updates: Partial<MCSettings>) => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cm-purple focus:ring-offset-2 focus:ring-offset-dark-panel ${
        checked
          ? "bg-cm-purple"
          : "bg-dark-panel2 border border-dark-border"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const inputClasses =
  "bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cm-purple focus:ring-1 focus:ring-cm-purple";

const PROVIDERS = [
  { value: "gmail", label: "Gmail (Google)", hint: "Uses gog CLI. No API key needed." },
  { value: "mandrill", label: "Mandrill (Mailchimp)", hint: "Requires MANDRILL_API_KEY in .env" },
  { value: "resend", label: "Resend", hint: "Requires RESEND_API_KEY in .env" },
  { value: "sendgrid", label: "SendGrid", hint: "Requires SENDGRID_API_KEY in .env" },
  { value: "ses", label: "Amazon SES", hint: "Requires AWS credentials in .env" },
  { value: "postmark", label: "Postmark", hint: "Requires POSTMARK_API_KEY in .env" },
];

export default function EmailSection({
  settings,
  onChange,
}: SectionProps) {
  const provider = PROVIDERS.find((p) => p.value === settings.emailProvider) || PROVIDERS[0];

  return (
    <section id="email">
      <h2 className="text-base font-bold text-dark-text flex items-center gap-2 mb-1">
        <Mail size={16} className="text-cm-purple" />
        Email & Daily Briefing
      </h2>
      <p className="text-xs text-dark-muted mb-4">
        Choose your email provider and configure the daily morning briefing.
      </p>

      {/* Email Provider */}
      <div className="py-3 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-dark-text">Email Provider</p>
            <p className="text-xs text-dark-muted mt-0.5">
              Used for sending daily briefings and notifications.
            </p>
          </div>
          <div className="ml-4 shrink-0">
            <select
              value={settings.emailProvider}
              onChange={(e) => onChange({ emailProvider: e.target.value as MCSettings["emailProvider"] })}
              className={`w-52 ${inputClasses}`}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-dark-muted mt-2 pl-0.5">
          {provider.hint}
        </p>
      </div>

      {/* Recipient Email */}
      <div className="py-3 border-b border-dark-border">
        <p className="text-sm font-medium text-dark-text">Recipient Email</p>
        <p className="text-xs text-dark-muted mt-0.5 mb-2">
          Where to send the daily briefing and notifications.
        </p>
        <input
          type="email"
          value={settings.emailRecipient}
          onChange={(e) => onChange({ emailRecipient: e.target.value })}
          placeholder="you@example.com"
          className={`w-full ${inputClasses} py-2`}
        />
      </div>

      {/* From Name */}
      <div className="py-3 border-b border-dark-border">
        <p className="text-sm font-medium text-dark-text">From Name</p>
        <p className="text-xs text-dark-muted mt-0.5 mb-2">
          Display name on outgoing emails.
        </p>
        <input
          type="text"
          value={settings.emailFromName}
          onChange={(e) => onChange({ emailFromName: e.target.value })}
          placeholder="Mission Control"
          className={`w-full ${inputClasses} py-2`}
        />
      </div>

      {/* Daily Briefing Toggle */}
      <div className="flex items-center justify-between py-3 border-b border-dark-border">
        <div>
          <p className="text-sm font-medium text-dark-text">Daily Briefing Email</p>
          <p className="text-xs text-dark-muted mt-0.5">
            Receive a morning executive summary with revenue, tasks, and agent activity.
          </p>
        </div>
        <div className="ml-4 shrink-0">
          <Toggle
            checked={settings.dailyBriefingEnabled}
            onChange={(v) => onChange({ dailyBriefingEnabled: v })}
          />
        </div>
      </div>

      {/* Briefing Time (shown only when enabled) */}
      {settings.dailyBriefingEnabled && (
        <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
          <div>
            <p className="text-sm font-medium text-dark-text">Briefing Time</p>
            <p className="text-xs text-dark-muted mt-0.5">
              When to send the daily briefing (your local timezone).
            </p>
          </div>
          <div className="ml-4 shrink-0">
            <input
              type="time"
              value={settings.dailyBriefingTime}
              onChange={(e) => onChange({ dailyBriefingTime: e.target.value })}
              className={`w-32 ${inputClasses}`}
            />
          </div>
        </div>
      )}
    </section>
  );
}
