"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import GenieLampIcon from "@/components/icons/GenieLampIcon";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Square,
  Mic,
  MicOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Zap,
  Clipboard,
  ClipboardCheck,
  RotateCcw,
  FileEdit,
  FilePlus,
  Code2,
  Sparkles,
  Bell,
  BellOff,
  Timer,
  X,
} from "lucide-react";


// ── Types ──────────────────────────────────────────────────────────────────────

type Slot = "A" | "B";
type Status = "idle" | "running" | "done" | "error";
type Effort = "low" | "medium" | "high" | "max";

interface ModelDef {
  label: string;
  value: string;
  description: string;
  maxContext: number;
}

interface OutputEntry {
  id: number;
  type: "text" | "tool" | "result" | "error" | "system" | "prompt" | "complete";
  content: string;
  toolName?: string;
}

interface FileChange {
  type: "edit" | "create" | "bash";
  path: string;
}

interface SessionRecord {
  id: number;
  session_id: string | null;
  slot: string;
  prompt: string;
  model: string;
  effort: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  output_preview: string | null;
  tokens_used: number;
  cost_usd: number;
  git_sha_before: string | null;
  has_changes: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MODELS: ModelDef[] = [
  { label: "Fast",     value: "haiku",  description: "Haiku — fastest and cheapest. Great for simple, obvious tasks.", maxContext: 200_000 },
  { label: "Balanced", value: "sonnet", description: "Sonnet — best for most things. Use this 90% of the time.", maxContext: 1_000_000 },
  { label: "Powerful", value: "opus",   description: "Opus — most capable. Use for complex, multi-file changes and hard planning.", maxContext: 1_000_000 },
];

const EFFORTS: { label: string; value: Effort; description: string }[] = [
  { label: "Low",    value: "low",    description: "Fast and light. For simple, obvious tasks." },
  { label: "Medium", value: "medium", description: "The default. Works well for most tasks." },
  { label: "High",   value: "high",   description: "More thorough thinking. Better for complex tasks." },
  { label: "Max",    value: "max",    description: "Deepest reasoning. Opus only. Takes longer." },
];

type Mode = "just-do-it" | "plan-first" | "confirm-each" | "read-only";

const MODES: { value: Mode; label: string; cli: string; tooltip: string }[] = [
  {
    value: "just-do-it",
    label: "Just Do It",
    cli: "--dangerously-skip-permissions",
    tooltip: "Fast and furious. The Genie acts immediately without asking for permission. This can be dangerous — but you can always click Undo.",
  },
  {
    value: "plan-first",
    label: "Plan First",
    cli: "custom instruction",
    tooltip: "The Genie writes out a full plan before touching anything. Review it, then run again to execute.",
  },
  {
    value: "confirm-each",
    label: "Confirm Each Step",
    cli: "default (no flag)",
    tooltip: "The Genie asks for your approval before each action. Slower, but you stay in full control.",
  },
  {
    value: "read-only",
    label: "Read Only",
    cli: "read-only tools only",
    tooltip: "The Genie can read files, analyze code, and answer questions — but cannot modify anything.",
  },
];

const PROMPT_TEMPLATES = [
  {
    category: "Build things",
    templates: [
      "Build me a landing page with a hero, features section, and a call-to-action button. Keep it clean and professional.",
      "Add a pricing page with three tiers: Starter $9/mo, Pro $29/mo, and Business $99/mo. Each should list 5 key features.",
      "Add a contact form with fields for name, email, and message. Send submissions to the console for now.",
      "Create a Stripe promo code for 20% off for the next 30 days. Call it WELCOME20.",
      "Add a new navigation item called 'About' that links to /about.",
    ],
  },
  {
    category: "Make changes",
    templates: [
      "Change the color theme to use a deep blue as the primary accent instead of purple.",
      "Add someone to the participants table: name is Jane Smith, email is jane@example.com.",
      "Add a 'notes' field to the contacts database table.",
      "Make the navigation sticky so it stays visible when scrolling.",
      "Update all copyright years to 2026 across the whole site.",
    ],
  },
  {
    category: "Ask questions",
    templates: [
      "How does the authentication system work? Walk me through it step by step.",
      "What database tables exist and what data is stored in each one?",
      "Are there any TypeScript errors or broken imports in this project? List them.",
      "What API routes exist and what does each one do?",
      "Summarize what this app does and how the main pages are structured.",
    ],
  },
  {
    category: "Tips for best results",
    templates: [
      "Be specific: instead of 'improve the homepage', say 'add a testimonials section with 3 quotes and star ratings below the hero'.",
      "Give context: 'The signup form is broken — it submits but users get a 500 error. Fix it.'",
      "Ask for a plan first: 'Before you make changes, tell me what you would do to add a dark mode toggle.'",
      "Chain requests: 'Create a promo code, then add it to the pricing page, then send me a summary of what you did.'",
    ],
  },
];

// 50 quick suggestions — 8 are picked randomly each page load (no API key needed, VPS-safe)
const ALL_QUICK_TEMPLATES: { label: string; prompt: string }[] = [
  { label: "Build a website",       prompt: "Build me a one-page website based on everything you know about my business so far. Make it clean, professional, and ready to share with potential clients." },
  { label: "Business advice",       prompt: "Based on everything you know about my business, give me your best recommendations on what I should focus on or work on next. Be specific and prioritize." },
  { label: "Color theme",           prompt: "Build me a new color theme for this app. Use these colors as the base: " },
  { label: "Add a page",            prompt: "Add a new page to this app called: " },
  { label: "Add a nav item",        prompt: "Add a new item to the navigation called: " },
  { label: "Add a card",            prompt: "Add a new card to the dashboard. It should show: " },
  { label: "Add a table field",     prompt: "Add a new field to a database table. Table name: [table]. Field name: [field]. Type: text." },
  { label: "Add a person",          prompt: "Add a new person to the contacts or participants table. Name: [name]. Email: [email]. Add any other fields that make sense." },
  { label: "Build a pricing page",  prompt: "Build a pricing page with three tiers. Starter at $9/month, Pro at $29/month, and Business at $99/month. List five features for each tier." },
  { label: "Add a hero section",    prompt: "Add a bold hero section to the homepage. Include a headline, a short subtitle, and a call-to-action button. Base the copy on what you know about the business." },
  { label: "Add testimonials",      prompt: "Add a testimonials section to the homepage with three quotes. Use realistic placeholder names and short, believable quotes about the product." },
  { label: "Add a FAQ section",     prompt: "Add a FAQ section to the homepage with five common questions and answers. Base them on what you know about the business." },
  { label: "Add a contact form",    prompt: "Add a contact form page at /contact with fields for name, email, and message. On submit, log the data to the console and show a success message." },
  { label: "Make nav sticky",       prompt: "Make the top navigation bar sticky so it stays visible when the user scrolls down the page." },
  { label: "Add a footer",          prompt: "Add a footer to every page with links, a copyright line, and the business name. Keep it clean and professional." },
  { label: "Dark mode toggle",      prompt: "Add a dark mode toggle button to the navigation. When clicked, it should switch the whole app between light and dark mode and remember the preference." },
  { label: "Add a banner",          prompt: "Add a banner at the top of every page with this message: [your message here]. Give it a dismiss button." },
  { label: "Add loading states",    prompt: "Add loading spinners or skeleton loaders to all data-fetching sections of the app so it looks polished while data is being fetched." },
  { label: "Add error handling",    prompt: "Review all the API routes in this app and add proper error handling so failed requests return useful error messages instead of crashing." },
  { label: "Find broken things",    prompt: "Audit this project for broken imports, TypeScript errors, and missing files. List everything you find and fix what you can." },
  { label: "List all routes",       prompt: "List every page route and API route in this project. For each one, briefly explain what it does." },
  { label: "List all DB tables",    prompt: "List all database tables in this project. For each table, describe what data it stores and what it is used for." },
  { label: "Summarize the app",     prompt: "Give me a plain-English summary of what this app does, how it is structured, and what the main pages and features are." },
  { label: "Audit the code",        prompt: "Do a code quality audit of this project. Look for unused variables, duplicated logic, and anything that could be simplified. List your findings." },
  { label: "Add pagination",        prompt: "Add pagination to any page or table in this app that lists more than 10 items. Use simple previous/next buttons." },
  { label: "Add search",            prompt: "Add a search input to filter items on this page: [page name]. Filter results as the user types." },
  { label: "Add sorting",           prompt: "Add column sorting to the main table on this page: [page name]. Clicking a column header should sort ascending then descending." },
  { label: "Add CSV export",        prompt: "Add a button to export the main table on this page as a CSV file. Include all visible columns." },
  { label: "Add a badge",           prompt: "Add a status badge to the items in this list: [list name]. Use green for active, yellow for pending, and red for inactive." },
  { label: "Show last updated",     prompt: "Add a 'last updated' timestamp to every record that gets modified. Show it in the UI next to each item." },
  { label: "Add a modal",           prompt: "Add a confirmation modal to the delete button on this page: [page name]. Ask 'Are you sure?' before deleting." },
  { label: "Add tooltips",          prompt: "Add helpful tooltips to all buttons and icons in this app that are not obviously labeled." },
  { label: "Add keyboard shortcuts", prompt: "Add keyboard shortcuts to the most common actions in this app. Show a shortcut reference in the help section." },
  { label: "Mobile friendly",       prompt: "Review this app for mobile responsiveness. Fix any sections that look broken or cramped on a small screen." },
  { label: "Speed it up",           prompt: "Look for any slow or unnecessary database queries or API calls in this project. Suggest and apply optimizations." },
  { label: "Add logging",           prompt: "Add server-side logging to every API route. Log the method, path, response status, and time taken for each request." },
  { label: "Update copyright",      prompt: "Find and update all copyright year references across this project to 2026." },
  { label: "Rename something",      prompt: "Rename [old name] to [new name] everywhere in the codebase, including files, variables, labels, and database columns." },
  { label: "Fix a bug",             prompt: "There is a bug: [describe what goes wrong]. Investigate and fix it." },
  { label: "Add a chart",          prompt: "Add a simple bar chart or line chart to the dashboard showing: [what to show]. Use a library that is already installed, or use plain SVG." },
  { label: "Add a stat card",       prompt: "Add a stat card to the dashboard that shows: [what to show]. Include a label, a big number, and a trend indicator." },
  { label: "Add a timeline",        prompt: "Add a timeline or activity log section to this page: [page name]. Show recent events in reverse chronological order." },
  { label: "Add notifications",     prompt: "Add an in-app notification system. Show a bell icon in the nav with a count. When clicked, show recent alerts." },
  { label: "Add an about page",     prompt: "Create an About page at /about based on everything you know about the business. Include a brief description, mission statement, and contact info." },
  { label: "Improve copy",          prompt: "Review the text on this page: [page name]. Rewrite the headlines, labels, and descriptions to be clearer and more compelling." },
  { label: "Clean up the UI",       prompt: "Do a visual cleanup pass on this page: [page name]. Fix inconsistent spacing, misaligned elements, and any text that is hard to read." },
  { label: "Add a 404 page",        prompt: "Create a custom 404 page that is friendly and on-brand. Include a message and a button to go back to the homepage." },
  { label: "Add a sitemap",         prompt: "Generate a sitemap.xml for this app that lists all public page routes." },
  { label: "Add robots.txt",        prompt: "Add a robots.txt file to this project that allows all search engine crawlers to index the site." },
  { label: "Write a README",        prompt: "Write a clean README.md for this project. Include what it is, how to run it locally, environment variables needed, and key features." },
];

function pickRandomTemplates(all: typeof ALL_QUICK_TEMPLATES, count: number) {
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// NOTE: QUICK_TEMPLATES is intentionally NOT module-level — Math.random() causes SSR/client hydration mismatch.
// It is initialized inside the component via useState lazy init.

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd <= 0) return "";
  if (usd < 0.01) return "< $0.01";
  return `$${usd.toFixed(3)}`;
}

function formatSessionTime(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  if (isToday) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function modelLabel(modelValue: string): string {
  return MODELS.find((m) => m.value === modelValue)?.label ?? modelValue;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

const COMPLETION_MESSAGES = [
  "Your wish has been granted.",
  "Completed.",
  "Done.",
  "Finished.",
  "What's next?",
  "Wish granted, master.",
  "It is done.",
  "Consider it done.",
  "Magic complete.",
  "The Genie has spoken.",
  "Another wish fulfilled.",
  "As you wish.",
  "Your command has been executed.",
];

function pickCompletionMessage(): string {
  return COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
}

// ── Sub-components (module level — never inside another component) ──────────────

interface HandoffBannerProps {
  content: string;
  onResume: () => void;
  onDismiss: () => void;
}

function HandoffBanner({ content, onResume, onDismiss }: HandoffBannerProps) {
  const taskLine = content.split("\n").find((l) => l.startsWith("## Task"))?.replace("## Task", "").trim() || "";
  return (
    <div className="flex items-center gap-2 bg-dark-warn/10 border border-dark-warn/30 rounded-lg px-3 py-2">
      <AlertTriangle className="w-3.5 h-3.5 text-dark-warn shrink-0" />
      <span className="text-dark-warn text-xs flex-1 truncate">
        Previous session paused{taskLine ? `: "${taskLine}"` : ""}
      </span>
      <button onClick={onResume} className="text-dark-warn text-xs underline hover:no-underline shrink-0">Resume</button>
      <button onClick={onDismiss} className="text-dark-muted hover:text-dark-text ml-1 shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface ContextMeterProps {
  tokensUsed: number;
  maxContext: number;
  costUsd: number;
  elapsed: number;
  isRunning: boolean;
}

function ContextMeter({ tokensUsed, maxContext, costUsd, elapsed, isRunning }: ContextMeterProps) {
  const pct = maxContext > 0 ? Math.min((tokensUsed / maxContext) * 100, 100) : 0;
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4" title="This shows how much of Claude's memory is filled up. When it gets close to full, Claude will automatically save its progress and continue in a fresh session.">
      <div className="flex items-center justify-between mb-2">
        <span className="text-dark-muted text-xs font-medium">Context window</span>
        <div className="flex items-center gap-3">
          {isRunning && elapsed > 0 && (
            <span className="flex items-center gap-1 text-cm-purple text-xs">
              <Timer className="w-3 h-3" />
              {formatElapsed(elapsed)}
            </span>
          )}
          <span className={`text-xs font-mono ${isCritical ? "text-dark-danger" : isWarning ? "text-dark-warn" : "text-dark-muted"}`}>
            {formatTokens(tokensUsed)} / {formatTokens(maxContext)} ({pct.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-dark-panel2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isCritical ? "bg-dark-danger" : isWarning ? "bg-dark-warn" : "bg-cm-purple"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {isWarning ? (
          <p className={`text-xs ${isCritical ? "text-dark-danger" : "text-dark-warn"}`}>
            {isCritical ? "Context almost full — Claude will auto-compact and continue." : "Context filling up — Claude will auto-compact soon."}
          </p>
        ) : <span />}
        {costUsd > 0 && (
          <p className="text-dark-muted text-xs flex items-center gap-1">
            <Coins className="w-3 h-3 opacity-60" />
            {formatCost(costUsd)}
          </p>
        )}
      </div>
    </div>
  );
}

// align="right" anchors the tooltip to the right edge (for far-right controls that would overflow)
function Tip({ children, content, wide, align = "left" }: { children: React.ReactNode; content: string; wide?: boolean; align?: "left" | "right" }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className={`absolute bottom-full ${align === "right" ? "right-0" : "left-0"} mb-2 z-50 ${wide ? "w-72" : "w-60"} bg-dark-panel2 border border-dark-border text-dark-text text-xs rounded-lg px-3 py-2.5 shadow-2xl pointer-events-none whitespace-pre-line leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity duration-75`}>
        {content}
        <div className={`absolute top-full ${align === "right" ? "right-4" : "left-4"} w-2 h-2 overflow-hidden`}>
          <div className="w-2 h-2 bg-dark-panel2 border-r border-b border-dark-border rotate-45 -mt-1" />
        </div>
      </div>
    </div>
  );
}

// Compact inline context meter for the controls row — always visible
function InlineContextMeter({ tokensUsed, maxContext }: { tokensUsed: number; maxContext: number; costUsd: number; isRunning: boolean }) {
  const pct = maxContext > 0 ? Math.min((tokensUsed / maxContext) * 100, 100) : 0;
  const isCompacting = pct >= 95;
  const isWarning = pct >= 50;
  const isCritical = pct >= 75;
  const barColor = isCritical ? "bg-dark-danger" : isWarning ? "bg-dark-warn" : "bg-cm-purple";
  const textColor = isCritical ? "text-dark-danger" : isWarning ? "text-dark-warn" : "text-dark-muted";

  if (isCompacting) {
    return (
      <Tip content={`Context window is full. The Genie is auto-compacting and will continue seamlessly.`}>
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-dark-warn" />
          <span className="text-dark-warn text-xs font-medium">Compacting...</span>
        </div>
      </Tip>
    );
  }

  return (
    <Tip content={`How much of the Genie's memory is used.\n${pct.toFixed(1)}% of ${formatTokens(maxContext)} tokens used.\nWhen full, it will auto-compact and continue.`}>
      <div className="flex flex-col gap-1.5">
        <span className="text-dark-muted text-[10px] uppercase tracking-wider font-medium">Context</span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-dark-panel2 rounded-full overflow-hidden border border-dark-border">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-mono tabular-nums ${textColor}`}>{pct.toFixed(0)}%</span>
        </div>
      </div>
    </Tip>
  );
}

interface WhatChangedCardProps {
  fileChanges: FileChange[];
  costUsd: number;
  elapsed: number;
  stashName: string | null;
  undoState: "idle" | "loading" | "done" | "error";
  onUndo: () => void;
}

function WhatChangedCard({ fileChanges, costUsd, elapsed, stashName, undoState, onUndo }: WhatChangedCardProps) {
  const edits = fileChanges.filter((c) => c.type === "edit");
  const creates = fileChanges.filter((c) => c.type === "create");
  const cmds = fileChanges.filter((c) => c.type === "bash");

  if (fileChanges.length === 0 && undoState === "idle") return null;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-dark-success" />
          <span className="text-dark-text text-sm font-semibold">What the Genie changed</span>
        </div>
        <div className="flex items-center gap-2">
          {elapsed > 0 && <span className="text-dark-muted text-xs">{formatElapsed(elapsed)}</span>}
          {costUsd > 0 && <span className="text-dark-muted text-xs">{formatCost(costUsd)}</span>}
        </div>
      </div>

      {fileChanges.length === 0 ? (
        <p className="text-dark-muted text-xs">No file changes detected in this session.</p>
      ) : (
        <div className="space-y-1.5">
          {creates.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <FilePlus className="w-3.5 h-3.5 text-dark-success shrink-0" />
              <span className="text-dark-text text-xs font-mono truncate">{c.path}</span>
              <span className="text-dark-success text-xs shrink-0">created</span>
            </div>
          ))}
          {edits.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <FileEdit className="w-3.5 h-3.5 text-cm-purple shrink-0" />
              <span className="text-dark-text text-xs font-mono truncate">{c.path}</span>
              <span className="text-cm-purple-mid text-xs shrink-0">edited</span>
            </div>
          ))}
          {cmds.length > 0 && (
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-dark-muted shrink-0" />
              <span className="text-dark-muted text-xs">{cmds.length} command{cmds.length > 1 ? "s" : ""} run</span>
            </div>
          )}
        </div>
      )}

      {/* Refresh nudge */}
      <p className="text-dark-muted text-xs">
        Changes are live. If you don&apos;t see them yet, refresh the page.
      </p>

      {/* Undo button */}
      {undoState !== "done" && (
        <div className="border-t border-dark-border pt-3">
          {undoState === "error" ? (
            <p className="text-dark-danger text-xs">Could not undo — the git history may have changed. Try reverting manually.</p>
          ) : undoState === "loading" ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-dark-panel2 border border-dark-border rounded-lg w-fit">
              <RotateCcw className="w-3.5 h-3.5 text-dark-muted animate-spin" />
              <span className="text-dark-muted text-xs">Undoing changes...</span>
            </div>
          ) : (
            <button
              onClick={onUndo}
              title="Undo everything the Genie changed in this session."
              className="flex items-center gap-2 px-3 py-1.5 border border-dark-border hover:border-dark-danger hover:text-dark-danger text-dark-muted text-xs rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo
            </button>
          )}
        </div>
      )}
      {undoState === "done" && (
        <div className="border-t border-dark-border pt-3 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-dark-success" />
          <span className="text-dark-success text-xs">Wish undone. Project restored to its previous state.</span>
        </div>
      )}
    </div>
  );
}

interface TemplatePickerProps {
  onSelect: (template: string) => void;
  onClose: () => void;
}

function TemplatePicker({ onSelect, onClose }: TemplatePickerProps) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cm-purple" />
          <span className="text-dark-text text-sm font-semibold">Examples &amp; Tips</span>
        </div>
        <button onClick={onClose} className="text-dark-muted hover:text-dark-text transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {PROMPT_TEMPLATES.map((group) => (
          <div key={group.category}>
            <p className="text-dark-muted text-xs font-semibold uppercase tracking-wide mb-2">{group.category}</p>
            <div className="space-y-1">
              {group.templates.map((t) => (
                <button
                  key={t}
                  onClick={() => { onSelect(t); onClose(); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-dark-text text-xs hover:bg-dark-panel2 transition-colors leading-relaxed"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface OutputLineProps {
  entry: OutputEntry;
}

function OutputLine({ entry }: OutputLineProps) {
  if (entry.type === "prompt") {
    return (
      <div className="mb-4">
        <div className="bg-cm-purple/10 border border-cm-purple/20 rounded-xl px-3 py-2.5">
          <p className="text-dark-text text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
        </div>
      </div>
    );
  }
  if (entry.type === "system") return <div className="text-dark-muted text-xs italic leading-snug">{entry.content}</div>;
  if (entry.type === "error") return <div className="text-dark-danger text-xs font-mono leading-snug">{entry.content}</div>;
  if (entry.type === "tool") {
    return (
      <div className="leading-snug">
        <span className="text-cm-purple text-xs font-mono font-semibold">[{entry.toolName ?? "Tool"}]</span>{" "}
        <span className="text-dark-muted text-xs font-mono">{entry.content}</span>
      </div>
    );
  }
  if (entry.type === "result") {
    return (
      <div className="border-t border-dark-border mt-1.5 pt-1.5">
        <div className="flex items-center gap-2 mb-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-dark-success" />
          <span className="text-dark-success text-xs font-semibold">Done</span>
        </div>
        <div className="text-dark-muted text-xs font-mono whitespace-pre-wrap leading-snug">{entry.content}</div>
      </div>
    );
  }
  if (entry.type === "complete") {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-border/30">
        <GenieLampIcon className="w-3.5 h-3.5 text-cm-purple" />
        <span className="text-dark-muted text-sm font-medium">{entry.content}</span>
      </div>
    );
  }
  return <div className="text-dark-text text-xs font-mono whitespace-pre-wrap leading-snug">{entry.content}</div>;
}

interface SessionHistoryRowProps {
  session: SessionRecord;
}

function SessionHistoryRow({ session }: SessionHistoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [rowUndoState, setRowUndoState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const statusDot = session.status === "completed" ? "bg-dark-success" : session.status === "running" ? "bg-cm-purple" : session.status === "error" ? "bg-dark-danger" : "bg-dark-muted";

  const handleRowUndo = async () => {
    setRowUndoState("loading");
    try {
      const res = await fetch("/api/claude-terminal/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      setRowUndoState(res.ok ? "done" : "error");
    } catch {
      setRowUndoState("error");
    }
  };

  return (
    <div className="border border-dark-border rounded-lg overflow-hidden">
      <div className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-panel2 transition-colors">
        {/* Expand toggle */}
        <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
          <span className="text-dark-text text-xs truncate flex-1">{session.prompt}</span>
        </button>
        {/* Metadata + undo — always visible */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-dark-muted text-xs tabular-nums">{formatSessionTime(session.started_at)}</span>
          <span className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">{modelLabel(session.model)}</span>
          {!!session.has_changes && (
            <>
              {rowUndoState === "idle" && (
                <button
                  onClick={handleRowUndo}
                  title="Undo everything this session changed. Uses git to restore the project to how it was before this run."
                  className="flex items-center gap-1 px-2 py-0.5 border border-dark-border hover:border-dark-warn hover:text-dark-warn text-dark-muted text-xs rounded-md transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Undo
                </button>
              )}
              {rowUndoState === "loading" && (
                <span className="flex items-center gap-1 text-dark-muted text-xs">
                  <RotateCcw className="w-3 h-3 animate-spin" />Undoing...
                </span>
              )}
              {rowUndoState === "done" && (
                <span className="flex items-center gap-1 text-dark-success text-xs">
                  <CheckCircle2 className="w-3 h-3" />Undone
                </span>
              )}
              {rowUndoState === "error" && (
                <span className="text-dark-danger text-xs">Failed</span>
              )}
            </>
          )}
          <button onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-dark-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-dark-muted" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 bg-dark-panel2 border-t border-dark-border">
          {session.output_preview && (
            <pre className="text-dark-muted text-xs font-mono whitespace-pre-wrap mt-2 leading-relaxed">{session.output_preview}</pre>
          )}
          {rowUndoState === "error" && (
            <p className="text-dark-danger text-xs mt-2">Could not undo — git history may have changed. Try reverting manually.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────

function ClaudeTerminalContent() {
  const searchParams = useSearchParams();
  const slot = ((searchParams.get("slot") ?? "A") as Slot) === "B" ? "B" : "A";

  const [model, setModel] = useState("sonnet");
  const [effort, setEffort] = useState<Effort>("medium");
  const [mode, setMode] = useState<Mode>("just-do-it");
  const [prompt, setPrompt] = useState("");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [slotStatus, setSlotStatus] = useState<Record<Slot, "idle" | "running">>({ A: "idle", B: "idle" });

  const [output, setOutput] = useState<OutputEntry[]>([]);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [costUsd, setCostUsd] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [gitShaBefore, setGitShaBefore] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [handoff, setHandoff] = useState<{ exists: boolean; content: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [quickTemplates, setQuickTemplates] = useState<typeof ALL_QUICK_TEMPLATES>([]);

  const outputEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const outputIdRef = useRef(0);
  const startedAtRef = useRef<string>("");
  const elapsedAtDoneRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel = MODELS.find((m) => m.value === model) ?? MODELS[1];
  const maxContext = selectedModel.maxContext;
  const otherSlot: Slot = slot === "A" ? "B" : "A";
  const otherSlotRunning = slotStatus[otherSlot] === "running";
  const bothBusy = slotStatus.A === "running" && slotStatus.B === "running";
  const isRunning = status === "running";

  // Pick random templates on client only (avoids SSR hydration mismatch with Math.random)
  useEffect(() => { setQuickTemplates(pickRandomTemplates(ALL_QUICK_TEMPLATES, 8)); }, []);

  // Elapsed timer
  useEffect(() => {
    if (status !== "running") return;
    setElapsed(0);
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Capture elapsed at completion
  useEffect(() => {
    if (status === "done" || status === "error") {
      elapsedAtDoneRef.current = elapsed;
    }
  }, [status, elapsed]);

  // Browser notification on done
  useEffect(() => {
    if (status !== "done") return;
    if (notifPermission === "granted") {
      new Notification("The Builder — Done", {
        body: fileChanges.length > 0
          ? `${fileChanges.filter(c => c.type !== "bash").length} file(s) changed.`
          : "Session complete.",
        icon: "/favicon.ico",
      });
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notification permission
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Focus textarea when run completes or context is cleared — fires after re-render so disabled is lifted
  useEffect(() => {
    if (status === "done" || status === "idle") {
      textareaRef.current?.focus();
    }
  }, [status]);

  // Auto-scroll — set scrollTop directly on the container so it never touches window scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [output]);

  // Slot status polling
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/claude-terminal/status");
        const data = await res.json();
        setSlotStatus(data.slots);
      } catch {}
    };
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/claude-terminal/history");
      const data = await res.json();
      setHistory(data.sessions ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/claude-terminal/handoff");
        const data = await res.json();
        setHandoff(data);
      } catch {}
    })();
  }, []);

  const addOutput = useCallback((entry: Omit<OutputEntry, "id">) => {
    setOutput((prev) => [...prev, { ...entry, id: ++outputIdRef.current }]);
  }, []);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }, []);

  const toggleDictation = useCallback(async () => {
    if (isTranscribing) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        audioChunksRef.current = [];
        if (blob.size < 500) return;

        setIsTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch("/api/claude-terminal/transcribe", { method: "POST", body: form });
          const data = await res.json();
          if (data.transcript) {
            setPrompt((prev) => prev + (prev.trim() ? " " : "") + data.transcript.trim());
          }
        } catch { /* ignore */ }
        setIsTranscribing(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch { /* permission denied */ }
  }, [isRecording, isTranscribing]);

  // Push-to-talk: hold Alt+D to record, release to transcribe
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "d" && !isRecording && !isTranscribing) {
        e.preventDefault();
        toggleDictation();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.key === "Alt" || e.key === "d") && isRecording) {
        toggleDictation();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [isRecording, isTranscribing, toggleDictation]);

  const handleCopyOutput = useCallback(() => {
    const text = output.map((o) => {
      if (o.type === "tool") return `[${o.toolName}] ${o.content}`;
      return o.content;
    }).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output]);

  const handleUndo = useCallback(async () => {
    setUndoState("loading");
    try {
      const res = await fetch("/api/claude-terminal/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gitShaBefore }),
      });
      if (res.ok) {
        setUndoState("done");
        setFileChanges([]);
        addOutput({ type: "system", content: "Wish undone. Project restored to its previous state." });
      } else {
        setUndoState("error");
      }
    } catch {
      setUndoState("error");
    }
  }, [gitShaBefore, addOutput]);

  const handleRun = useCallback(
    async (overridePrompt?: string, overrideSessionId?: string | null) => {
      const p = overridePrompt ?? prompt;
      if (!p.trim() || isRunning) return;

      // Silently inject marathon handoff context if it exists — never shown to user
      const fullPrompt = handoff?.exists
        ? `${p}\n\n---\nContext from your previous session (use this to resume or stay consistent):\n${handoff.content}`
        : p;

      setStatus("running");
      setTokensUsed(0);
      setCostUsd(0);
      setFileChanges([]);
      setGitShaBefore(null);
      setUndoState("idle");
      setConfirmClear(false);
      setShowTemplates(false);
      startedAtRef.current = new Date().toISOString();

      setPrompt("");
      addOutput({ type: "prompt", content: p });

      let finalSessionId: string | null = null;
      let totalTokens = 0;
      let totalCost = 0;
      let outputPreview = "";
      const changesThisRun: FileChange[] = [];
      let localSha: string | null = null; // capture sha locally — closure on gitShaBefore state is stale

      try {
        const res = await fetch("/api/claude-terminal/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt, model, effort, mode,
            sessionId: overrideSessionId !== undefined ? overrideSessionId : sessionId,
            slot,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          addOutput({ type: "error", content: err.error ?? "Failed to start" });
          setStatus("error");
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) { addOutput({ type: "error", content: "No response stream" }); setStatus("error"); return; }

        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.replace(/^data: /, "").trim();
            if (!line || line === "[DONE]") continue;

            let parsed: Record<string, unknown>;
            try { parsed = JSON.parse(line); } catch { continue; }

            const type = parsed.type as string;

            if (type === "meta") {
              const sha = (parsed as { gitShaBefore?: string }).gitShaBefore;
              if (sha) { localSha = sha; setGitShaBefore(sha); }
            } else if (type === "error") {
              addOutput({ type: "error", content: parsed.message as string });
            } else if (type === "system" && (parsed as { subtype?: string }).subtype === "init") {
              finalSessionId = (parsed as { session_id?: string }).session_id ?? null;
              if (finalSessionId) setSessionId(finalSessionId);
            } else if (type === "assistant") {
              const msg = (parsed as { message?: { content?: unknown[]; usage?: Record<string, number> } }).message;

              if (msg?.usage) {
                // Context window = latest input tokens (not cumulative — each message includes full context)
                const inputCtx = (msg.usage.input_tokens ?? 0) + (msg.usage.cache_read_input_tokens ?? 0);
                setTokensUsed(inputCtx);
                // Accumulate output tokens for history record
                const outTokens = (msg.usage.output_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0);
                totalTokens += outTokens;
              }

              if (msg?.content && Array.isArray(msg.content)) {
                for (const block of msg.content) {
                  const b = block as { type: string; text?: string; name?: string; input?: Record<string, unknown> };
                  if (b.type === "text" && b.text) {
                    addOutput({ type: "text", content: b.text });
                    outputPreview += b.text + "\n";
                  } else if (b.type === "tool_use") {
                    const toolName = b.name ?? "Tool";
                    const input = b.input ?? {};
                    const filePath = String(input.file_path ?? input.path ?? "");
                    const cmd = String(input.command ?? "");

                    addOutput({ type: "tool", toolName, content: filePath || cmd || toolName });

                    // Track file changes
                    if ((toolName === "Edit" || toolName === "MultiEdit") && filePath) {
                      if (!changesThisRun.find((c) => c.path === filePath && c.type === "edit")) {
                        changesThisRun.push({ type: "edit", path: filePath });
                        setFileChanges([...changesThisRun]);
                      }
                    } else if (toolName === "Write" && filePath) {
                      if (!changesThisRun.find((c) => c.path === filePath)) {
                        changesThisRun.push({ type: "create", path: filePath });
                        setFileChanges([...changesThisRun]);
                      }
                    } else if (toolName === "Bash" && cmd) {
                      changesThisRun.push({ type: "bash", path: cmd.slice(0, 60) });
                      setFileChanges([...changesThisRun]);
                    }
                  }
                }
              }
            } else if (type === "result") {
              const r = parsed as { result?: string; total_cost_usd?: number; duration_ms?: number };
              totalCost = r.total_cost_usd ?? 0;
              setCostUsd(totalCost);
              const summary = [
                r.result?.slice(0, 300) ?? "",
                r.duration_ms ? `(${(r.duration_ms / 1000).toFixed(1)}s)` : "",
              ].filter(Boolean).join(" ");
              addOutput({ type: "result", content: summary });
            }
          }
        }

        setStatus("done");
        addOutput({ type: "complete", content: pickCompletionMessage() });

        await fetch("/api/claude-terminal/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: finalSessionId, slot, prompt: p, model, effort,
            status: "completed",
            started_at: startedAtRef.current,
            finished_at: new Date().toISOString(),
            output_preview: outputPreview.slice(0, 1000),
            tokens_used: totalTokens,
            cost_usd: totalCost,
            git_sha_before: localSha,
            has_changes: changesThisRun.length > 0 ? 1 : 0,
          }),
        }).catch(() => {});

        loadHistory();
      } catch (err) {
        addOutput({ type: "error", content: err instanceof Error ? err.message : "Unexpected error" });
        setStatus("error");
      }
    },
    [prompt, model, effort, sessionId, slot, isRunning, addOutput, loadHistory]
  );

  const handleStop = useCallback(async () => {
    await fetch("/api/claude-terminal/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot }),
    });
    setStatus("idle");
    addOutput({ type: "system", content: "Stopped by user." });
  }, [slot, addOutput]);

  const handleClearContext = useCallback(() => {
    setSessionId(null);
    setOutput([]);
    setTokensUsed(0);
    setCostUsd(0);
    setFileChanges([]);
    setGitShaBefore(null);
    setUndoState("idle");
    setStatus("idle");
    setConfirmClear(false);
  }, []);


  const showContextMeter = tokensUsed > 0 || isRunning;
  const showWhatChanged = (status === "done" || status === "error") && fileChanges.length > 0;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-cm-purple/15 border border-cm-purple/30 text-cm-purple text-xs font-semibold rounded-full px-2.5 py-1">Genie {slot === "A" ? "1" : "2"}</span>
        {otherSlotRunning && (
          <span className="bg-dark-panel2 border border-dark-border text-dark-muted text-xs rounded-full px-2.5 py-1">Genie {otherSlot === "A" ? "1" : "2"}: running</span>
        )}
        <button
          onClick={notifPermission === "default" ? requestNotifications : undefined}
          title={
            notifPermission === "granted" ? "Browser notifications are on — you'll be alerted when the Genie finishes."
            : notifPermission === "denied" ? "Notifications are blocked in your browser settings."
            : "Click to get a notification when the Genie finishes (so you can switch tabs while it runs)."
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-dark-panel2 border border-dark-border text-xs rounded-lg transition-colors ${notifPermission === "granted" ? "text-dark-success" : "text-dark-muted hover:text-dark-text"}`}
        >
          {notifPermission === "granted" ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          {notifPermission === "granted" ? "Notify on" : "Notify me"}
        </button>
        <button
          onClick={() => window.open(`/app/genie?slot=${otherSlot}`, "_blank")}
          title="Open Genie 2 in a new browser tab. You can run two sessions at the same time."
          className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel2 hover:bg-dark-border border border-dark-border text-dark-muted text-xs rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Genie 2
        </button>
      </div>

      {/* Unified terminal — single card, flex column, fixed height */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: "540px" }}>

        {/* Card header — shrink-0 so it never compresses */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border shrink-0">
          <div className="flex items-center gap-2">
            <GenieLampIcon className="w-4 h-4 text-cm-purple" />
            <span className="text-dark-text text-sm font-semibold">Genie Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && <span className="text-cm-purple text-xs animate-pulse">streaming...</span>}
            {status === "done" && <span className="flex items-center gap-1 text-dark-success text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Complete</span>}
            {status === "error" && <span className="text-dark-danger text-xs">Error</span>}
            {output.length > 0 && (
              <button
                onClick={handleCopyOutput}
                title="Copy all output text to your clipboard."
                className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-panel2 hover:bg-dark-border border border-dark-border text-dark-muted text-xs rounded-lg transition-colors"
              >
                {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-dark-success" /> : <Clipboard className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
            <button
              onClick={() => setShowTemplates((v) => !v)}
              title="See example instructions — great for getting started or learning how to talk to the Genie."
              className="flex items-center gap-1.5 text-cm-purple text-xs hover:text-cm-purple-mid transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Examples &amp; Tips
            </button>
          </div>
        </div>

        {/* Template picker */}
        {showTemplates && (
          <div className="border-b border-dark-border shrink-0">
            <TemplatePicker onSelect={(t) => setPrompt(t)} onClose={() => setShowTemplates(false)} />
          </div>
        )}

        {/* Scrollable conversation — grows to fill all remaining height */}
        <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto bg-dark-panel2 p-4">
          {output.length === 0 ? (
            <div className="space-y-4">
              {!showTemplates && !sessionId && quickTemplates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickTemplates.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setPrompt(t.prompt)}
                      disabled={isRunning}
                      className="px-2.5 py-1 bg-dark-panel hover:bg-dark-border border border-dark-border text-dark-muted hover:text-dark-text text-xs rounded-full transition-colors disabled:opacity-40"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-dark-muted text-xs font-mono italic">Type your wish below and hit Enter. The Genie will stream its work right here.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {output.map((entry) => <OutputLine key={entry.id} entry={entry} />)}
              {isRunning && <span className="inline-block w-2 h-4 bg-cm-purple animate-pulse rounded-sm ml-1 align-middle" />}
              <div ref={outputEndRef} />
            </div>
          )}
        </div>

        {/* Input bar — pinned to bottom, same bg as chat for seamless feel */}
        <div className="shrink-0 border-t border-dark-border/50 bg-dark-panel2 px-4 pt-3 pb-4 space-y-2">

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isRunning}
              rows={3}
              autoFocus
              className="w-full bg-dark-panel border border-dark-border text-dark-text text-sm rounded-lg px-3 py-2.5 pb-7 resize-y disabled:opacity-50 focus:outline-none focus:border-cm-purple placeholder:text-dark-muted/40 placeholder:italic"
              placeholder="What do you wish for? Ask the Genie to build something, answer a question, or get anything done."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isRunning) {
                  e.preventDefault();
                  handleRun();
                }
              }}
            />
            <span className="absolute bottom-2 right-3 text-dark-muted/40 text-[10px] pointer-events-none select-none">
              Enter to run · Shift+Enter for new line
            </span>
          </div>

          {/* Controls row — stable layout using invisible instead of conditional rendering */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Make it Happen — invisible when running to keep layout stable */}
            <button
              onClick={() => handleRun()}
              disabled={!prompt.trim() || bothBusy || isRunning}
              title="Send your wish to the Genie. It will read and edit files automatically. (Enter)"
              className={`flex items-center gap-2 px-4 py-2 bg-cm-purple hover:bg-cm-purple/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors ${isRunning ? "invisible pointer-events-none" : ""}`}
            >
              <GenieLampIcon className="w-4 h-4" />
              Make it Happen
            </button>

            <button
              type="button"
              onClick={toggleDictation}
              disabled={isRunning && !isRecording}
              title={isRecording ? "Stop recording — Whisper will transcribe it." : isTranscribing ? "Transcribing with Whisper..." : "Dictate your wish by voice (or hold Alt+D). Uses local Whisper AI."}
              className={`flex items-center gap-1.5 px-3 py-2 border text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 ${
                isRecording
                  ? "border-cm-purple text-cm-purple bg-cm-purple/10 animate-pulse"
                  : isTranscribing
                  ? "border-dark-border text-dark-muted"
                  : "border-dark-border text-dark-muted hover:border-dark-text hover:text-dark-text"
              }`}
            >
              {isTranscribing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isRecording
                ? <MicOff className="w-4 h-4" />
                : <Mic className="w-4 h-4" />}
              {isTranscribing ? "Transcribing..." : isRecording ? "Stop" : "Dictate"}
            </button>

            {/* Stop — invisible when not running */}
            <button
              onClick={handleStop}
              title="Stop the Genie immediately. Any changes already made will stay."
              className={`flex items-center gap-2 px-4 py-2 border border-dark-border text-dark-muted hover:border-dark-warn hover:text-dark-warn text-sm font-semibold rounded-lg transition-colors ${!isRunning ? "invisible pointer-events-none" : ""}`}
            >
              <Square className="w-4 h-4" />
              Stop
            </button>

            {/* Working indicator — always rendered, invisible when idle, fixed width to prevent timer reflow */}
            <div className={`flex items-center gap-2 ${!isRunning ? "invisible" : ""}`}>
              <Loader2 className="w-4 h-4 animate-spin text-cm-purple" />
              <span className="text-cm-purple text-sm w-10 tabular-nums">{elapsed > 0 ? formatElapsed(elapsed) : ""}</span>
            </div>

            <InlineContextMeter tokensUsed={tokensUsed} maxContext={maxContext} costUsd={costUsd} isRunning={isRunning} />

            <div className="flex-1" />

            <Tip wide align="right" content={"How the Genie handles permissions:\n\n• Just Do It — acts immediately, no questions. Fast and powerful. Use Undo if needed.\n• Plan First — writes a plan before touching anything. Review it, then run again.\n• Confirm Each Step — asks your approval before each action. Slowest, but you stay in control.\n• Read Only — reads and answers questions. Cannot modify any files."}>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                disabled={isRunning}
                className="bg-dark-panel border border-dark-border text-dark-muted text-xs rounded-lg px-2.5 py-1.5 disabled:opacity-50 cursor-pointer focus:outline-none focus:border-cm-purple"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Tip>

            <Tip wide align="right" content={"How smart (and how expensive) the Genie should be:\n\n• Fast — Haiku. Quickest, uses the fewest credits. Good for simple tasks.\n• Balanced — Sonnet. Best for most things. Good mix of quality and credit usage. Use this 90% of the time.\n• Powerful — Opus. Most capable, but burns through credits fast. Reserve for complex, multi-file work.\n\nHigher = better results, but your usage runs out faster."}>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isRunning}
                className="bg-dark-panel border border-dark-border text-dark-muted text-xs rounded-lg px-2.5 py-1.5 disabled:opacity-50 cursor-pointer focus:outline-none focus:border-cm-purple"
              >
                {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Tip>

            <Tip wide align="right" content={"How hard the Genie thinks before acting:\n\n• Low — fast, minimal reasoning. Fewest credits used.\n• Medium — the default. Good balance of speed and quality.\n• High — more careful step-by-step thinking. Uses more credits, but better for tricky tasks.\n• Max — deepest reasoning available. Powerful only. Uses the most credits and takes the longest.\n\nHigher effort = slower but smarter. Only go higher when Medium isn't cutting it."}>
              <select
                value={effort}
                onChange={(e) => setEffort(e.target.value as Effort)}
                disabled={isRunning}
                className="bg-dark-panel border border-dark-border text-dark-muted/70 text-xs rounded-lg px-2.5 py-1.5 disabled:opacity-50 cursor-pointer focus:outline-none focus:border-cm-purple"
              >
                {EFFORTS.map((e) => {
                  const disabled = e.value === "max" && model !== "opus";
                  return (
                    <option key={e.value} value={e.value} disabled={disabled}>
                      {e.label}{disabled ? " (Powerful only)" : ""}
                    </option>
                  );
                })}
              </select>
            </Tip>

            {/* New Wish — invisible when running or nothing to clear */}
            <button
              onClick={handleClearContext}
              title="Start a new wish from scratch. The Genie forgets this conversation — your previous sessions stay saved in history below."
              className={`flex items-center gap-1.5 px-3 py-1.5 border border-dark-border text-dark-muted hover:border-dark-text hover:text-dark-text text-xs font-medium rounded-lg transition-colors ${(isRunning || (!sessionId && output.length === 0)) ? "invisible pointer-events-none" : ""}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Wish
            </button>
          </div>

          {/* Status lines */}
          {(bothBusy && !isRunning) && (
            <span className="text-dark-danger text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Both slots busy. Stop a session first.
            </span>
          )}
          {sessionId && !isRunning && (
            <span className="text-dark-muted text-xs">
              <span className="text-cm-purple-mid">Continuing session.</span> Click New Wish to start fresh.
            </span>
          )}
        </div>
      </div>

      {/* Last run summary — always visible, no header */}
      {history.length > 0 && (
        <div className="space-y-1.5">
          {history.map((s) => <SessionHistoryRow key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}

// ── Page export ────────────────────────────────────────────────────────────────

export default function ClaudeTerminalPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 animate-pulse">
          <div className="h-6 w-48 bg-dark-panel2 rounded" />
        </div>
      </div>
    }>
      <ClaudeTerminalContent />
    </Suspense>
  );
}
