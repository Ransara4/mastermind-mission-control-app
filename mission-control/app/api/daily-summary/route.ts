import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const SUMMARIES_DIR = path.join(WS, "agents/daily-summary/data");
const SETTINGS_PATH = path.join(SUMMARIES_DIR, 'settings.json');
const NARRATIVE_EXAMPLES_PATH = path.join(SUMMARIES_DIR, 'narrative-examples.json');
const MANUAL_ENTRIES_PATH = path.join(WS, "agents/daily-summary/data/manual-entries.json");
const CLAUDE_PROJECTS_DIR = path.join(HOME, ".claude/projects/-Users-openclaw");
const OPENCLAW_SESSIONS_DIR = path.join(HOME, ".openclaw/agents/main/sessions");
const TASK_LOGS_DIR = path.join(WS, "logs/task-executor");
const CLAWHUB_LOCK = path.join(HOME, ".clawhub/lock.json");
const MC_DB_PATH = path.join(process.cwd(), "lib", "db.json");

// ── Settings ─────────────────────────────────────────────────────────

interface LittlebirdSettings {
  littlebirdEnabled: boolean;
  littlebirdAffiliateUrl: string;
  bannerDismissed: boolean;
}

const DEFAULT_SETTINGS: LittlebirdSettings = {
  littlebirdEnabled: false,
  littlebirdAffiliateUrl: 'https://littlebird.ai',
  bannerDismissed: false,
};

async function loadSettings(): Promise<LittlebirdSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function fetchLittlebirdSummary(date: string): Promise<DailySummary | null> {
  try {
    const reportsPath = path.join(WS, "agents/littlebird/data/reports.json");
    const raw = await fs.readFile(reportsPath, 'utf-8');
    const reports: Array<{ id: number; date: string; text: string; title: string }> = JSON.parse(raw);
    const report = reports.find((r) => r.date.startsWith(date));
    if (!report || report.text.length < 50) return null;

    const narrative = report.text.split('\n').filter((l: string) => l.trim().length > 0);
    return {
      date,
      generatedAt: new Date().toISOString(),
      source: 'littlebird' as string,
      littlebirdReportId: report.id,
      narrative,
      quickStats: {
        claudeCodeSessions: 0, openclawSessions: 0, totalMessages: 0,
        skillsInstalled: [], telegramSentByBot: 0, telegramFromPhone: 0,
        taskExecutorRuns: 0, gitCommits: 0, tasksCompleted: 0, vercelDeployments: 0,
      },
      sessions: [], taskExecutorRuns: [], gitCommits: [],
    } as DailySummary;
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────────────

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface SessionSummary {
  sessionId: string;
  source: "claude-code" | "openclaw";
  startTime: string;
  endTime: string;
  userMessages: string[];
  assistantSnippets: string[];
  toolsUsed: string[];
}

interface TaskExecutorLog {
  filename: string;
  timestamp: string;
  content: string;
}

interface GitCommit {
  hash: string;
  date: string;
  message: string;
  repo: string;
  filesChanged?: number;
}

interface QuickStats {
  claudeCodeSessions: number;
  openclawSessions: number;
  totalMessages: number;
  skillsInstalled: string[];
  telegramSentByBot: number;
  telegramFromPhone: number;
  taskExecutorRuns: number;
  gitCommits: number;
  tasksCompleted: number;
  vercelDeployments: number;
}

interface ManualEntry {
  id: string;
  text: string;
  category: "built" | "fixed" | "configured" | "ran" | "other";
  addedAt: string;
}

interface ReviewCard {
  id: string;
  title: string;
  labels: string[];
  column: string;
  executorStatus?: string;
  updatedAt?: number;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  createdAt: string;
  target?: string;
}

interface DailySummary {
  date: string;
  generatedAt: string;
  source?: string;
  littlebirdReportId?: number;
  narrative: string[];
  quickStats: QuickStats;
  sessions: SessionSummary[];
  taskExecutorRuns: TaskExecutorLog[];
  gitCommits: GitCommit[];
  manualEntries?: ManualEntry[];
  reviewCards?: ReviewCard[];
  vercelDeployments?: VercelDeployment[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function extractText(content: string | ContentBlock[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join(" ");
  }
  return "";
}

// ── Claude Code Session Parser ───────────────────────────────────────

async function parseClaudeCodeFile(
  filePath: string,
  targetDate: string
): Promise<{ session: SessionSummary | null; telegramSends: number }> {
  let telegramSends = 0;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());

    const dayEntries: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.timestamp && (obj.timestamp as string).startsWith(targetDate)) {
          dayEntries.push(obj);
        }
      } catch {
        // skip
      }
    }

    if (dayEntries.length === 0) return { session: null, telegramSends: 0 };

    const sessionId = path.basename(filePath, ".jsonl");
    const timestamps = dayEntries.map((e) => e.timestamp as string).sort();
    const userMessages: string[] = [];
    const assistantSnippets: string[] = [];
    const toolsUsed = new Set<string>();

    for (const entry of dayEntries) {
      const msg = entry.message as { role?: string; content?: string | ContentBlock[] } | undefined;
      if (!msg) continue;

      // Skip tool_result entries (these are tool outputs, not real user messages)
      if (Array.isArray(msg.content) && msg.content.some((b: ContentBlock) => b.type === "tool_result")) {
        continue;
      }

      const text = extractText(msg.content);

      if (entry.type === "user" && msg.role === "user" && text) {
        const trimmed = text.trim();
        // Skip noise: tool results, interrupts, task notifications, system messages
        if (
          trimmed.length > 5 &&
          !trimmed.startsWith("[Request interrupted") &&
          !trimmed.startsWith("<task-notification") &&
          !trimmed.startsWith("<local-command") &&
          !trimmed.startsWith("<command-name") &&
          !trimmed.startsWith("<system") &&
          !trimmed.includes("sk_live_") &&
          !trimmed.includes("sk_test_") &&
          !trimmed.includes("API key provided")
        ) {
          // Strip continuation preambles
          let clean = trimmed;
          const contIdx = clean.indexOf("Summary:\n");
          if (clean.includes("session is being continued") && contIdx !== -1) {
            clean = clean.slice(0, clean.indexOf("This session is being continued")).trim();
            if (clean.length < 10) continue;
          }
          userMessages.push(clean.slice(0, 500));
        }
      }

      if (entry.type === "assistant" && msg.role === "assistant" && text) {
        const trimmed = text.trim();
        if (trimmed.length > 10) {
          assistantSnippets.push(trimmed.slice(0, 500));
        }
      }

      // Detect tool usage and telegram sends from assistant content
      if (entry.type === "assistant" && Array.isArray(msg.content)) {
        for (const block of msg.content as ContentBlock[]) {
          if (block.type === "tool_use" && block.name) {
            toolsUsed.add(block.name);
            // Count Telegram sends
            const inputStr = JSON.stringify(block.input || {});
            if (
              inputStr.includes("send_telegram") ||
              inputStr.includes("api.telegram") ||
              (inputStr.toLowerCase().includes("telegram") && inputStr.includes("sendMessage"))
            ) {
              telegramSends++;
            }
          }
        }
      }

    }

    if (userMessages.length === 0 && assistantSnippets.length === 0) {
      return { session: null, telegramSends };
    }

    return {
      session: {
        sessionId,
        source: "claude-code",
        startTime: timestamps[0],
        endTime: timestamps[timestamps.length - 1],
        userMessages: userMessages.slice(0, 25),
        assistantSnippets: assistantSnippets.slice(0, 30),
        toolsUsed: Array.from(toolsUsed),
      },
      telegramSends,
    };
  } catch {
    return { session: null, telegramSends: 0 };
  }
}

// ── OpenClaw Session Parser ──────────────────────────────────────────

async function parseOpenClawFile(
  filePath: string,
  targetDate: string
): Promise<{ session: SessionSummary | null; telegramFromPhone: number; telegramSends: number }> {
  let telegramFromPhone = 0;
  let telegramSends = 0;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());

    const dayEntries: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.timestamp && (obj.timestamp as string).startsWith(targetDate)) {
          dayEntries.push(obj);
        }
      } catch {
        // skip
      }
    }

    if (dayEntries.length === 0) return { session: null, telegramFromPhone: 0, telegramSends: 0 };

    const sessionId = path.basename(filePath, ".jsonl");
    const timestamps = dayEntries.map((e) => e.timestamp as string).sort();
    const userMessages: string[] = [];
    const assistantSnippets: string[] = [];
    const toolsUsed = new Set<string>();

    for (const entry of dayEntries) {
      if (entry.type === "message") {
        const msg = entry.message as { role?: string; content?: string | ContentBlock[] } | undefined;
        if (!msg) continue;
        const text = extractText(msg.content);

        if (msg.role === "user" && text) {
          // Check if from Telegram (phone)
          if (text.includes('"sender": "Joe Che Tandle"') || text.includes('"sender":"Joe Che Tandle"')) {
            telegramFromPhone++;
          }

          // Extract the actual message (after metadata blocks)
          const userText = text.replace(/```json[\s\S]*?```/g, "").replace(/\[Queued messages.*?\]\s*/g, "").replace(/Queued #\d+\s*/g, "").replace(/Conversation info[\s\S]*?Sender[\s\S]*?```\s*/g, "").trim();
          // Get the last meaningful line
          const msgLines = userText.split("\n").filter((l: string) => l.trim().length > 5);
          const lastLine = msgLines[msgLines.length - 1]?.trim();
          if (lastLine && lastLine.length > 5) {
            userMessages.push(lastLine.slice(0, 500));
          }
        }

        if (msg.role === "assistant" && text) {
          const trimmed = text.trim();
          if (trimmed.length > 10) {
            assistantSnippets.push(trimmed.slice(0, 500));
          }
        }

        // Check for telegram sends in tool results
        if (msg.role === "toolResult") {
          const resultText = text.toLowerCase();
          if (resultText.includes("telegram") && resultText.includes("sendmessage")) {
            telegramSends++;
          }
        }
      }

      // Track tool usage
      if (entry.type === "message") {
        const msg = entry.message as { role?: string; content?: ContentBlock[] } | undefined;
        if (msg?.role === "assistant" && Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === "tool_use" && block.name) {
              toolsUsed.add(block.name);
              // Count telegram sends from tool calls
              const inputStr = JSON.stringify(block.input || {});
              if (inputStr.includes("telegram") && inputStr.includes("send")) {
                telegramSends++;
              }
            }
          }
        }
      }
    }

    // Filter out cron-only sessions with no real user interaction
    const realMessages = userMessages.filter(
      (m) => !m.startsWith("[cron:") && !m.startsWith("Current time:")
    );

    if (realMessages.length === 0 && assistantSnippets.length === 0) {
      return { session: null, telegramFromPhone, telegramSends };
    }

    return {
      session: {
        sessionId,
        source: "openclaw",
        startTime: timestamps[0],
        endTime: timestamps[timestamps.length - 1],
        userMessages: realMessages.slice(0, 25),
        assistantSnippets: assistantSnippets.slice(0, 30),
        toolsUsed: Array.from(toolsUsed),
      },
      telegramFromPhone,
      telegramSends,
    };
  } catch {
    return { session: null, telegramFromPhone: 0, telegramSends: 0 };
  }
}

// ── Skills Installed ─────────────────────────────────────────────────

const SKILL_DIRS = [
  path.join(HOME, ".openclaw/skills"),
  path.join(WS, "skills"),
];

async function getSkillsInstalledOnDate(targetDate: string): Promise<string[]> {
  const skills = new Set<string>();

  // 1. Check clawhub lock.json for install timestamps
  try {
    const raw = await fs.readFile(CLAWHUB_LOCK, "utf-8");
    const lock = JSON.parse(raw);
    const dateStart = new Date(targetDate + "T00:00:00Z").getTime();
    const dateEnd = dateStart + 86400000;

    for (const [name, info] of Object.entries(lock.skills || {})) {
      const installed = (info as { installedAt?: number }).installedAt;
      if (installed && installed >= dateStart && installed < dateEnd) {
        skills.add(name);
      }
    }
  } catch {
    // no lock file
  }

  // 2. Check skill directories for creation dates matching target date
  for (const dir of SKILL_DIRS) {
    try {
      const entries = await fs.readdir(dir);
      for (const entry of entries) {
        try {
          const stat = await fs.stat(path.join(dir, entry));
          const created = stat.birthtime.toISOString().slice(0, 10);
          if (created === targetDate) {
            skills.add(entry);
          }
        } catch {
          // skip
        }
      }
    } catch {
      // dir doesn't exist
    }
  }

  return Array.from(skills);
}

// ── Task Executor Logs ───────────────────────────────────────────────

async function getTaskExecutorLogs(targetDate: string): Promise<TaskExecutorLog[]> {
  try {
    const files = await fs.readdir(TASK_LOGS_DIR);
    const matchingFiles = files.filter(
      (f) => f.startsWith(targetDate) && f.endsWith(".log")
    );

    const logs: TaskExecutorLog[] = [];
    for (const file of matchingFiles) {
      try {
        const content = await fs.readFile(path.join(TASK_LOGS_DIR, file), "utf-8");
        logs.push({
          filename: file,
          timestamp: file.replace(".log", "").replace("_", " "),
          content: content.slice(0, 2000),
        });
      } catch {
        // skip
      }
    }
    return logs;
  } catch {
    return [];
  }
}

// ── Git Commit Parser ────────────────────────────────────────────────

const GIT_REPOS = [
  { path: HOME, name: "home" },
  { path: WS, name: "workspace" },
  { path: path.join(WS, "mission-control"), name: "mission-control" },
  { path: path.join(HOME, "marathon"), name: "marathon" },
  { path: path.join(HOME, "claude-code-switchboard"), name: "switchboard" },
];

async function getGitCommits(targetDate: string): Promise<GitCommit[]> {
  const commits: GitCommit[] = [];
  const seenHashes = new Set<string>();

  // targetDate is YYYY-MM-DD — use local timezone offsets for accurate day boundaries
  // Get system timezone offset (e.g., +0800)
  let tzOffset = "+0000";
  try {
    tzOffset = execSync("date +%z", { encoding: "utf-8", timeout: 2000 }).trim();
  } catch { /* fallback to UTC */ }

  const sinceDate = `${targetDate}T00:00:00${tzOffset.slice(0, 3)}:${tzOffset.slice(3)}`;
  // Calculate next day using simple string math to avoid timezone conversion issues
  const [y, m, d] = targetDate.split("-").map(Number);
  const nextDay = new Date(y, m - 1, d + 1); // local date constructor
  const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;
  const untilDate = `${nextDayStr}T00:00:00${tzOffset.slice(0, 3)}:${tzOffset.slice(3)}`;

  for (const repo of GIT_REPOS) {
    try {
      // Check if repo exists
      await fs.access(path.join(repo.path, ".git"));

      const output = execSync(
        `/usr/bin/git log --format="%H|%ai|%s" --since="${sinceDate}" --until="${untilDate}"`,
        { cwd: repo.path, encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }
      ).trim();

      if (!output) continue;

      for (const line of output.split("\n")) {
        const [hash, date, ...msgParts] = line.split("|");
        if (!hash || seenHashes.has(hash)) continue;
        seenHashes.add(hash);

        const message = msgParts.join("|"); // rejoin in case commit msg had |

        // Get files changed count
        let filesChanged = 0;
        try {
          const stat = execSync(
            `/usr/bin/git diff --shortstat ${hash}^..${hash}`,
            { cwd: repo.path, encoding: "utf-8", timeout: 3000, stdio: ["pipe", "pipe", "pipe"] }
          ).trim();
          const filesMatch = stat.match(/(\d+) files? changed/);
          if (filesMatch) filesChanged = parseInt(filesMatch[1], 10);
        } catch {
          // first commit or error
        }

        commits.push({
          hash: hash.slice(0, 8),
          date,
          message,
          repo: repo.name,
          filesChanged: filesChanged || undefined,
        });
      }
    } catch {
      // repo doesn't exist or git error — skip
    }
  }

  // Sort by date
  commits.sort((a, b) => a.date.localeCompare(b.date));
  return commits;
}

// ── Narrative Generator ──────────────────────────────────────────────

// Clean a raw message into something readable
function cleanMsg(msg: string): string {
  return msg
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/\[.*?\]/g, "")
    .replace(/Conversation info[\s\S]*/m, "")
    .replace(/This session is being continued[\s\S]*/m, "")
    .replace(/Implement the following plan:\s*/i, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Extract what was accomplished from assistant messages
// @ts-ignore: kept for future narrative generation
function extractAccomplishments(sessions: SessionSummary[]): string[] {
  const accomplishments: string[] = [];
  for (const s of sessions) {
    for (const snippet of s.assistantSnippets) {
      const clean = cleanMsg(snippet);
      // Look for completion/action language
      if (/(?:created|built|added|fixed|updated|installed|configured|set up|implemented|deployed|wrote|generated|refactored)/i.test(clean)) {
        const sentence = clean.match(/^[^.!?\n]+[.!?]?/);
        if (sentence && sentence[0].length > 15) {
          accomplishments.push(sentence[0].slice(0, 150));
        }
      }
    }
  }
  return accomplishments;
}

// @ts-ignore: kept for future narrative generation
function extractIntents(userMsgs: string[]): string[] {
  const intents: string[] = [];
  for (const msg of userMsgs) {
    const clean = cleanMsg(msg);
    if (clean.length < 10) continue;
    // First sentence only
    const sentence = clean.match(/^[^.!?\n]+[.!?]?/);
    const text = sentence && sentence[0].length > 10 ? sentence[0] : clean.slice(0, 120);
    intents.push(text.trim());
  }
  return intents;
}

// @ts-ignore: kept for future narrative generation
interface TopicMatch {
  topic: string;
  msgIndices: number[];
  assistantHits: string[];
}

// Extract a short, clean description from an assistant snippet about what was done
function extractAction(snippet: string): string | null {
  const clean = cleanMsg(snippet);
  if (clean.length < 15) return null;

  // Split into sentences
  const sentences = clean.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);

  // First pass: past-tense action verbs at sentence start
  const verbPattern =
    /^(?:(?:I(?:'ve|'ll)?\s+)|(?:All\s+))?(?:created|built|added|fixed|updated|installed|configured|set up|implemented|deployed|wrote|generated|refactored|moved|deleted|removed|renamed|wired|connected|registered|enabled|disabled|patched|resolved|migrated|upgraded|integrated|launched|found|verified|tested|completed|done)\b/i;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (verbPattern.test(trimmed)) {
      const result = trimmed
        .replace(/^(?:I(?:'ve)?\s+|All\s+)/i, "")
        .replace(/^\w/, (c) => c.toUpperCase())
        .slice(0, 150);
      if (result.length < 25 && !/[.!?]$/.test(result)) continue;
      if (/^(?:let me|now let|found it|found the|found both|found \d)/i.test(result)) continue;
      return result;
    }
  }

  // Second pass: other completion patterns
  for (const sentence of sentences) {
    const trimmed = sentence.trim();

    // Skip meta-phrases
    if (/^(?:here's|here is|this is|that's|note|what |the \w+ is|no |yes |good|ok |okay|now |let me|clear )/i.test(trimmed)) continue;

    // "Here's what I did: ..." summary pattern
    const summaryMatch = trimmed.match(/(?:Here's what (?:I|was) did|Here's what happened)[:\s]+(.{15,150})/i);
    if (summaryMatch) return summaryMatch[1].replace(/^\d+\.\s*\*\*/, "").replace(/\*\*/g, "").trim().slice(0, 150);

    // "It added/created/..." — third person reports
    const thirdPerson = trimmed.match(/^It\s+(added|created|built|installed|configured|set up|generated|deployed|launched|integrated|connected|enabled|disabled)\b(.{5,120})/i);
    if (thirdPerson) return (thirdPerson[1] + thirdPerson[2]).replace(/^\w/, (c) => c.toUpperCase()).trim().slice(0, 150);

    // "X is now installed/configured/working" — passive/state patterns
    const passiveMatch = trimmed.match(/^(.{5,60})\s+(?:is|are|was)\s+(?:now\s+)?(?:installed|configured|set up|deployed|working|ready|live|enabled|fixed|resolved|done)\b/i);
    if (passiveMatch && passiveMatch[0].length > 20) {
      return passiveMatch[0].trim().slice(0, 150);
    }
  }

  return null;
}

// Check if text is vague/conversational (not describing concrete work)
function isVagueText(text: string): boolean {
  return /^(?:go |look |think |tell me|make sure|make it so|hey |ok[,. ]|okay[,. ]|yes[,. ]|no[,. ]|thanks|let me|let's|\/clear|\/|what |how |why |where |when |who |is |are |was |were |have |has |had |should |would |did |do you |\d+ |continue |I don't |I'm not |command failed|after |http)/i.test(text);
}

// Extract a clean intent from a user message (verb + object, not raw text)
function extractIntent(msg: string): string | null {
  const clean = cleanMsg(msg);
  if (clean.length < 10) return null;

  // Skip vague/conversational messages
  if (isVagueText(clean)) return null;

  // Try to find an imperative or request pattern
  // "I want you to evaluate X" → "Evaluate X"
  // "Can you fix X" → "Fix X"
  // "I need to set up X" → "Set up X"
  const unwrapRe = /(?:I(?:'d| would)? (?:want|need|like) (?:you )?to |I just (?:want (?:you )?to )?|(?:can|could) you (?:please )?|please )([\w][\w\s'/-]{10,120})/i;
  const unwrapMatch = clean.match(unwrapRe);
  if (unwrapMatch && unwrapMatch[1]) {
    let intent = unwrapMatch[1].trim().replace(/^\w/, (c) => c.toUpperCase());
    intent = intent.replace(/[,;]\s*(?:and|but|so|because|if|when|since)?\s*$/, "").slice(0, 120);
    // Re-check: the extracted inner text might also be vague
    if (intent.length > 15 && !isVagueText(intent)) return intent;
  }

  // Direct imperative with a concrete verb (not vague ones)
  const concreteVerbs = /^((?:set up|create|build|fix|add|install|configure|deploy|implement|generate|write|update|remove|delete|rename|enable|disable|connect|register|integrate|launch|refactor|debug|migrate|upgrade|evaluate|check if)\b[\w\s',./:()-]{5,120})/i;
  const directMatch = clean.match(concreteVerbs);
  if (directMatch && directMatch[1]) {
    let intent = directMatch[1].trim().replace(/^\w/, (c) => c.toUpperCase());
    intent = intent.replace(/[,;]\s*(?:and|but|so|because|if|when|since)?\s*$/, "").slice(0, 120);
    if (intent.length > 15) return intent;
  }

  return null;
}

// Try to identify the topic/subject of a session from user messages + assistant context
function extractSessionTopic(session: SessionSummary): string | null {
  const allUser = session.userMessages.join(" ");
  const allAsst = session.assistantSnippets.join(" ");
  const allText = allUser + " " + allAsst;

  // Match specific named things — more specific patterns first
  const namedThings: Array<{ re: RegExp; label: string }> = [
    { re: /daily.?summary/i, label: "Daily Summary feature" },
    { re: /task.?executor/i, label: "Task Executor" },
    { re: /task.?board/i, label: "MC task board" },
    { re: /\bevolver\b|\bmachine.?learning\b|\blshml\b/i, label: "Machine Learning" },
    { re: /\bemmie?\b/i, label: "Emmy agent" },
    { re: /\bstripe\b/i, label: "Stripe integration" },
    { re: /\bgsd\b|get.?shit.?done/i, label: "GSD skill" },
    { re: /google.?calendar/i, label: "Google Calendar" },
    { re: /google.?(?:drive|workspace|oauth|api)/i, label: "Google Workspace" },
    { re: /\btelegram.?router\b/i, label: "Telegram Router" },
    { re: /\btelegram\b/i, label: "Telegram" },
    { re: /\bseo\b|site.?audit/i, label: "SEO" },
    { re: /\bguard.?dog\b/i, label: "Guard Dog" },
    { re: /\bmcp\b.*connector/i, label: "MCP connectors" },
    { re: /\bclaude.?code\b.*skill/i, label: "Claude Code skills" },
    { re: /\bcron\b|\blaunchd\b|\bplist\b/i, label: "scheduled jobs" },
    { re: /\bcanva\b/i, label: "Canva" },
    { re: /\binstagram\b/i, label: "Instagram" },
    { re: /\bwix\b/i, label: "Wix" },
    { re: /\bdropbox\b/i, label: "Dropbox integration" },
    { re: /\blastpass\b|\blpass\b/i, label: "LastPass CLI" },
    { re: /\bheliconia\b|\bchantique\b|\btierr?a\b/i, label: "Heliconia Chantique project" },
    { re: /\bzoho\b.*book/i, label: "Zoho Books agent" },
    { re: /\bmandiri\b/i, label: "Mandiri bank export" },
    { re: /\bbank.?(?:account|statement)/i, label: "bank accounts" },
    { re: /\baffiliate/i, label: "affiliate links" },
    { re: /\bgumroad\b/i, label: "Gumroad pipeline" },
    { re: /\bwhatsapp\b|\bwacli\b/i, label: "WhatsApp" },
    { re: /\blinkedin\b/i, label: "LinkedIn" },
    { re: /\breddit\b/i, label: "Reddit" },
    { re: /\bslack\b/i, label: "Slack integration" },
    { re: /\bpassive.?income/i, label: "passive income" },
    { re: /\bcold.?outreach/i, label: "cold outreach" },
    { re: /\bmastermind\b/i, label: "Mastermind" },
    { re: /personal.?(?:info|data|process)/i, label: "personal data" },
    { re: /\bcontacts?\b.*(?:db|database|import|sync)/i, label: "contacts database" },
    { re: /\bproject.?index|_index\.json/i, label: "project index" },
    { re: /sidebar|kanban|calendar.?view/i, label: "MC UI" },
    { re: /mission.?control/i, label: "Mission Control" },
  ];

  for (const { re, label } of namedThings) {
    if (re.test(allText)) return label;
  }
  return null;
}

// Infer the work verb from the PRIMARY user intent (first 2 messages only)
function inferWorkVerb(session: SessionSummary): string {
  const primary = (session.userMessages[0] || "").toLowerCase();
  if (/\b(?:fix|fixes|debug|broken|error|bug|not working|doesn't work|won't work)\b/i.test(primary)) return "Debugged";
  if (/\b(?:check|evaluat|review|audit|inspect)\b/i.test(primary)) return "Reviewed";
  if (/\b(?:build|create|set up|new |add )\b/i.test(primary)) return "Built";
  if (/\bmake\b/i.test(primary) && !/\bmake .{0,10}\bbetter\b/i.test(primary)) return "Built";
  if (/\b(?:install|configure|enable)\b/i.test(primary)) return "Configured";
  if (/\b(?:update|upgrade|migrat)\b/i.test(primary)) return "Updated";
  return "Worked on";
}

// Summarize a session into a short description of what happened
function summarizeSession(session: SessionSummary): string[] {
  const items: string[] = [];

  // First try assistant messages for concrete accomplishments (take best 1)
  for (const snippet of session.assistantSnippets) {
    const action = extractAction(snippet);
    if (action && action.length > 15 && !items.some((it) => it === action)) {
      // Skip concatenated markdown headings and section titles
      if (/\b(?:handoff|what was done|this session|overview)\b/i.test(action)) continue;
      items.push(action);
      break; // One good action per session is enough
    }
  }

  // If no assistant actions found, synthesize from topic + work verb
  // Only if the session had real work (multiple tool calls or assistant messages)
  if (items.length === 0 && (session.toolsUsed.length > 2 || session.assistantSnippets.length > 3)) {
    const topic = extractSessionTopic(session);
    if (topic) {
      const verb = inferWorkVerb(session);
      items.push(`${verb} ${topic}`);
    }
  }

  // Fallback: try extractIntent, but ONLY for specific/actionable intents (not vague asks)
  if (items.length === 0) {
    for (const msg of session.userMessages.slice(0, 2)) {
      const intent = extractIntent(msg);
      if (intent && intent.length > 15) {
        // Only accept intents that mention something specific (not "debug something" or "build something")
        if (/\b(?:something|stuff|things?|it)\b/i.test(intent) && intent.length < 50) continue;
        items.push(intent);
        break;
      }
    }
  }

  return items.slice(0, 2);
}

// Classify a text into a bucket
function classifyAction(text: string): "built" | "fixed" | "configured" | "other" {
  const lower = text.toLowerCase();
  if (/\b(?:fix|debug|patch|repair|resolv|bug|issue|broken|error)\b/i.test(lower)) return "fixed";
  if (/\b(?:built|build|creat|add|implement|new|generat|wrote|launch|set up|wire|integrat|evaluat)\b/i.test(lower)) return "built";
  if (/\b(?:install|configur|enabl|upgrad|migrat|deploy|register|check)\b/i.test(lower)) return "configured";
  return "other";
}

// Detect which area of work a text relates to
// Priority: check the action text first, only fall back to session context if no match
function detectArea(text: string, sessionMsgs: string[]): string {
  // First try to detect area from the action text alone
  const actionArea = detectAreaFromText(text.toLowerCase());
  if (actionArea) return actionArea;
  // Fall back to session context
  const combined = (text + " " + sessionMsgs.join(" ")).toLowerCase();
  return detectAreaFromText(combined);
}

function detectAreaFromText(combined: string): string {
  if (/heliconia|chantique|tierr?a/i.test(combined)) return "Heliconia Chantique";
  if (/dropbox/i.test(combined)) return "Dropbox";
  if (/lastpass|lpass/i.test(combined)) return "LastPass";
  if (/zoho.*book/i.test(combined)) return "Zoho Books";
  if (/mandiri|bank.?(?:statement|export)/i.test(combined)) return "Banking";
  if (/bank.?account|affiliate/i.test(combined)) return "Personal Data";
  if (/gumroad/i.test(combined)) return "Gumroad";
  if (/mission.?control|dashboard|sidebar|page\.tsx|kanban|task.?board/i.test(combined)) return "Mission Control";
  if (/\bseo\b|site.?audit|alt.?text|meta.?desc|sitemap/i.test(combined)) return "SEO";
  if (/guard.?dog/i.test(combined)) return "Guard Dog";
  if (/emmie/i.test(combined)) return "Emmie";
  if (/evolver|machine.?learning|lshml/i.test(combined)) return "Machine Learning";
  if (/telegram.?router/i.test(combined)) return "Telegram Router";
  if (/stripe|payment|coupon|promo/i.test(combined)) return "Stripe";
  if (/slack/i.test(combined)) return "Slack";
  if (/whatsapp|wacli/i.test(combined)) return "WhatsApp";
  if (/linkedin/i.test(combined)) return "LinkedIn";
  if (/google.*calendar|google.*drive|gog\s|google.*workspace/i.test(combined)) return "Google Workspace";
  if (/passive.?income/i.test(combined)) return "Passive Income";
  if (/mastermind/i.test(combined)) return "Mastermind";
  if (/launchd|plist|cron|gateway|tailscale/i.test(combined)) return "Infrastructure";
  if (/email|inbox|gmail|cleanup/i.test(combined)) return "Email";
  if (/notion/i.test(combined)) return "Notion";
  if (/agent/i.test(combined)) return "Agents";
  if (/personal.?(?:info|data|process)|contacts?.?db/i.test(combined)) return "Personal Data";
  return "";
}


// Detect major project themes across ALL sessions for the day
// This catches high-level work that individual session extraction misses
function detectDayProjects(sessions: SessionSummary[]): string[] {
  const allUserText = sessions.flatMap((s) => s.userMessages).join(" ");
  const allAsstText = sessions.flatMap((s) => s.assistantSnippets).join(" ");
  const allText = (allUserText + " " + allAsstText).toLowerCase();

  // Project-level patterns — each needs significant presence (not just a passing mention)
  const projectPatterns: Array<{ re: RegExp; label: string; verb: string; minMentions: number }> = [
    { re: /heliconia|chantique|tierr?a/gi, label: "Heliconia Chantique project", verb: "Built", minMentions: 2 },
    { re: /dropbox/gi, label: "Dropbox integration", verb: "Configured", minMentions: 3 },
    { re: /lastpass|lpass/gi, label: "LastPass CLI", verb: "Configured", minMentions: 3 },
    { re: /zoho.*book/gi, label: "Zoho Books agent", verb: "Built", minMentions: 2 },
    { re: /mandiri.*(?:export|statement|bank)/gi, label: "Mandiri bank export automation", verb: "Built", minMentions: 2 },
    { re: /bank.?account/gi, label: "bank accounts data", verb: "Built", minMentions: 2 },
    { re: /affiliate/gi, label: "affiliate links data", verb: "Built", minMentions: 2 },
    { re: /personal.?(?:info|data|process)/gi, label: "personal data import", verb: "Built", minMentions: 2 },
    { re: /gumroad.*pipeline/gi, label: "Gumroad pipeline", verb: "Built", minMentions: 2 },
    { re: /project.?(?:index|structure)/gi, label: "project organization", verb: "Built", minMentions: 2 },
    { re: /contacts?.?(?:db|database|import|sync)/gi, label: "contacts database", verb: "Updated", minMentions: 2 },
    { re: /cold.?outreach/gi, label: "cold outreach system", verb: "Built", minMentions: 2 },
    { re: /mastermind/gi, label: "Mastermind program", verb: "Worked on", minMentions: 2 },
    { re: /passive.?income/gi, label: "passive income projects", verb: "Built", minMentions: 2 },
  ];

  const dayProjects: string[] = [];
  for (const { re, label, verb, minMentions } of projectPatterns) {
    const matches = allText.match(re);
    if (matches && matches.length >= minMentions) {
      dayProjects.push(`${verb} ${label}`);
    }
  }

  return dayProjects;
}

// ── Manual Entries ───────────────────────────────────────────────────

async function loadManualEntries(): Promise<Record<string, ManualEntry[]>> {
  try {
    const raw = await fs.readFile(MANUAL_ENTRIES_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveManualEntries(entries: Record<string, ManualEntry[]>): Promise<void> {
  await fs.mkdir(path.dirname(MANUAL_ENTRIES_PATH), { recursive: true });
  await fs.writeFile(MANUAL_ENTRIES_PATH, JSON.stringify(entries, null, 2));
}

async function getManualEntriesForDate(date: string): Promise<ManualEntry[]> {
  const all = await loadManualEntries();
  return all[date] || [];
}

function tryLlmNarrative(
  date: string,
  sessions: SessionSummary[],
  stats: QuickStats
): string[] | null {
  try {
    const fsSync = require('fs');
    const examplesRaw = fsSync.readFileSync(NARRATIVE_EXAMPLES_PATH, 'utf-8');
    const examples: Array<{ date: string; text: string }> = JSON.parse(examplesRaw);
    if (examples.length < 2) return null;

    const example1 = examples[0];
    const example2 = examples[1];

    // Condense session data: top 5 user messages from up to 10 sessions
    const topMessages: string[] = [];
    for (const s of sessions.slice(0, 10)) {
      for (const msg of s.userMessages.slice(0, 2)) {
        const clean = msg.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '').trim().slice(0, 150);
        if (clean.length > 10) topMessages.push(clean);
        if (topMessages.length >= 5) break;
      }
      if (topMessages.length >= 5) break;
    }

    if (topMessages.length === 0) return null;

    const prompt = `You are generating a daily activity summary for an AI power user named Joe.
Style guide -- match this format exactly:

EXAMPLE 1 (${example1.date}):
${example1.text.slice(0, 800)}

EXAMPLE 2 (${example2.date}):
${example2.text.slice(0, 800)}

Now generate a summary for ${date}. Raw activity data:
Sessions: ${sessions.length} Claude Code sessions, ${stats.totalMessages} messages
Top activities: ${topMessages.join(' | ')}
Stats: ${JSON.stringify(stats)}

Output only the summary markdown, no preamble.`;

    const tmpFile = `/tmp/ds-prompt-${date}.txt`;
    fsSync.writeFileSync(tmpFile, prompt);
    const result = execSync(`claude -p --model claude-sonnet-4-5 < "${tmpFile}"`, {
      timeout: 60000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf-8',
    });
    fsSync.unlinkSync(tmpFile);
    return result.toString().split('\n').filter((l: string) => l.trim().length > 0);
  } catch {
    return null;
  }
}

function generateNarrative(
  sessions: SessionSummary[],
  taskLogs: TaskExecutorLog[],
  stats: QuickStats,
  gitCommits: GitCommit[] = [],
  doneCards: DoneCard[] = [],
  manualEntries: ManualEntry[] = [],
  reviewCards: ReviewCard[] = [],
  vercelDeployments: VercelDeployment[] = [],
  date: string = ""
): string[] {
  // Try LLM-based narrative first (if examples exist and sessions have data)
  if (date && sessions.length > 0) {
    const llmNarrative = tryLlmNarrative(date, sessions, stats);
    if (llmNarrative && llmNarrative.length > 3) {
      return llmNarrative;
    }
  }

  const narrative: string[] = [];
  const built: string[] = [];
  const fixed: string[] = [];
  const installed: string[] = [];
  const ran: string[] = [];
  const other: string[] = [];

  // Process each session and extract specific accomplishments
  for (const session of sessions) {
    const actions = summarizeSession(session);
    for (const action of actions) {
      // Skip low-quality items (markdown noise, section titles, fragments, generic)
      if (/\b(?:handoff|what was done|this session|overview)\b/i.test(action)) continue;
      if (action.length < 20) continue;
      if (/:\.$/.test(action)) continue; // ends with ":." — truncated list
      if (/^(?:installed|done|completed|finished|ready)\b.{0,15}[.!]?\s*$/i.test(action)) continue; // generic status
      if (/^found\b.{0,30}:\s*\d/i.test(action)) continue; // "Found both issues: 1." — fragment

      const area = detectArea(action, session.userMessages);
      // Truncate long items
      const truncated = action.length > 120 ? action.slice(0, 117) + "..." : action;
      const label = area ? `${truncated} (${area})` : truncated;
      const bucket = classifyAction(action);

      switch (bucket) {
        case "built": built.push(label); break;
        case "fixed": fixed.push(label); break;
        case "configured": installed.push(label); break;
        default: other.push(label); break;
      }
    }
  }

  // Day-level project detection — catch major themes individual sessions miss
  const dayProjects = detectDayProjects(sessions);
  const existingLabels = [...built, ...fixed, ...installed, ...other].join(" ").toLowerCase();
  for (const proj of dayProjects) {
    // Skip if already covered by session-level extraction
    const projTopic = proj.replace(/^(?:Built|Configured|Updated|Worked on)\s+/i, "").toLowerCase();
    if (existingLabels.includes(projTopic)) continue;

    const bucket = classifyAction(proj);
    switch (bucket) {
      case "built": built.push(proj); break;
      case "fixed": fixed.push(proj); break;
      case "configured": installed.push(proj); break;
      default: other.push(proj); break;
    }
  }

  // Skills installed
  if (stats.skillsInstalled.length > 0) {
    const count = stats.skillsInstalled.length;
    if (count > 10) {
      installed.unshift(`Installed ${count} Claude Code skills (batch install)`);
    } else {
      installed.unshift(`Installed ${count} skill${count > 1 ? "s" : ""}: ${stats.skillsInstalled.join(", ")}`);
    }
  }

  // Task executor
  if (taskLogs.length > 0) {
    for (const log of taskLogs) {
      const matches = log.content.match(/Processing: (.+?)(?:\s*\(id:|\s*---)/g);
      if (matches) {
        for (const m of matches) {
          const name = m.replace(/Processing:\s*/, "").replace(/\s*\(id:.*/, "").replace(/\s*---.*/, "");
          if (name.length > 3) ran.push(`Task Executor: ${name}`);
        }
      }
    }
    if (ran.length === 0) {
      ran.push(`Task Executor ran ${taskLogs.length} time${taskLogs.length > 1 ? "s" : ""}`);
    }
  }
  if (stats.telegramFromPhone > 0) {
    ran.push(`${stats.telegramFromPhone} command${stats.telegramFromPhone > 1 ? "s" : ""} sent from phone via Telegram`);
  }
  if (stats.telegramSentByBot > 0) {
    ran.push(`${stats.telegramSentByBot} Telegram notification${stats.telegramSentByBot > 1 ? "s" : ""} sent`);
  }

  // Git commits — group by project/scope and summarize
  if (gitCommits.length > 0) {
    // Group commits by conventional commit scope or repo
    const projectCommits = new Map<string, string[]>();
    for (const commit of gitCommits) {
      // Extract scope from conventional commit: feat(scope): msg or docs(scope): msg
      const scopeMatch = commit.message.match(/^\w+\(([^)]+)\):\s*(.+)/);
      const typeMatch = commit.message.match(/^(\w+)(?:\([^)]+\))?:\s*(.+)/);

      const scope = scopeMatch?.[1] || commit.repo;
      const desc = typeMatch?.[2] || commit.message;
      const type = typeMatch?.[1] || "chore";

      if (!projectCommits.has(scope)) projectCommits.set(scope, []);
      projectCommits.get(scope)!.push(`${type}: ${desc}`);
    }

    // Generate project-level summaries
    for (const [scope, msgs] of Array.from(projectCommits.entries())) {
      // Classify commits for each project
      const feats = msgs.filter((m) => m.startsWith("feat:"));
      const fixes = msgs.filter((m) => m.startsWith("fix:"));
      const tests = msgs.filter((m) => m.startsWith("test:"));
      const docs = msgs.filter((m) => m.startsWith("docs:"));

      if (feats.length > 0) {
        if (feats.length === 1) {
          built.push(`${feats[0].replace("feat: ", "")} [${scope}]`);
        } else {
          built.push(`${feats.length} features committed [${scope}]: ${feats.map((f) => f.replace("feat: ", "")).join(", ").slice(0, 120)}`);
        }
      }
      if (fixes.length > 0) {
        if (fixes.length === 1) {
          fixed.push(`${fixes[0].replace("fix: ", "")} [${scope}]`);
        } else {
          fixed.push(`${fixes.length} fixes committed [${scope}]`);
        }
      }
      if (tests.length > 0) {
        built.push(`${tests.length} test${tests.length > 1 ? "s" : ""} added [${scope}]`);
      }
      if (docs.length > 0 && docs.length <= 3) {
        for (const d of docs) {
          other.push(`${d.replace("docs: ", "Documentation: ")} [${scope}]`);
        }
      } else if (docs.length > 3) {
        other.push(`${docs.length} docs committed [${scope}]`);
      }
    }

    // Add overall commit count to ran
    ran.push(`${gitCommits.length} git commit${gitCommits.length > 1 ? "s" : ""} across ${projectCommits.size} project${projectCommits.size > 1 ? "s" : ""}`);
  }

  // Vercel deployments
  if (vercelDeployments.length > 0) {
    const successful = vercelDeployments.filter((d) => d.state === "READY").length;
    ran.push(`${vercelDeployments.length} Vercel deployment${vercelDeployments.length > 1 ? "s" : ""} (${successful} successful)`);
  }

  // Done cards from MC board
  if (doneCards.length > 0) {
    const existingLower = [...built, ...fixed, ...installed, ...ran, ...other].join(" ").toLowerCase();
    for (const card of doneCards) {
      // Clean emoji prefix from title
      const title = card.title.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]\s*/u, "").trim();
      // Skip if already mentioned in other buckets
      if (existingLower.includes(title.toLowerCase().slice(0, 30))) continue;
      const label = card.labels.length > 0 ? ` [${card.labels[0]}]` : "";
      other.push(`Completed: ${title}${label}`);
    }
  }

  // Manual entries — user-reported accomplishments
  for (const entry of manualEntries) {
    switch (entry.category) {
      case "built": built.push(entry.text); break;
      case "fixed": fixed.push(entry.text); break;
      case "configured": installed.push(entry.text); break;
      case "ran": ran.push(entry.text); break;
      default: other.push(entry.text); break;
    }
  }

  // Deduplicate: remove generic "Worked on X" if a more specific verb exists for X
  const allItems = [...built, ...fixed, ...installed, ...other];
  const removeGeneric = (arr: string[]) => {
    return [...new Set(arr)].filter((item) => {
      // If item starts with "Worked on", check if there's a more specific version
      if (/^Worked on /i.test(item)) {
        const topic = item.replace(/^Worked on /i, "").replace(/\s*\(.*\)$/, "");
        return !allItems.some((other) => other !== item && other.toLowerCase().includes(topic.toLowerCase()));
      }
      return true;
    });
  };
  built.splice(0, built.length, ...removeGeneric(built));
  fixed.splice(0, fixed.length, ...removeGeneric(fixed));
  installed.splice(0, installed.length, ...removeGeneric(installed));
  other.splice(0, other.length, ...removeGeneric(other));

  const dedup = (arr: string[]) => [...new Set(arr)];

  if (dedup(built).length > 0) {
    narrative.push("**Built**");
    for (const b of dedup(built).slice(0, 8)) narrative.push(`  - ${b}`);
  }
  if (dedup(fixed).length > 0) {
    narrative.push("**Fixed**");
    for (const f of dedup(fixed).slice(0, 6)) narrative.push(`  - ${f}`);
  }
  if (dedup(installed).length > 0) {
    narrative.push("**Installed & Configured**");
    for (const i of dedup(installed).slice(0, 6)) narrative.push(`  - ${i}`);
  }
  if (dedup(ran).length > 0) {
    narrative.push("**Ran**");
    for (const r of dedup(ran)) narrative.push(`  - ${r}`);
  }
  if (dedup(other).length > 0) {
    narrative.push("**Other**");
    for (const o of dedup(other).slice(0, 5)) narrative.push(`  - ${o}`);
  }

  // Still Requires Human Review — cards in review column or needs-attention
  if (reviewCards.length > 0) {
    narrative.push("**Still Requires Human Review**");
    for (const card of reviewCards) {
      const title = card.title.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]\s*/u, "").trim();
      const label = card.labels.length > 0 ? ` [${card.labels[0]}]` : "";
      const status = card.executorStatus === "needs-attention" ? " ⚠️ needs attention" : "";
      const source = card.column === "review" ? "Review" : card.column === "claude-code-todo" ? "To Do" : card.column;
      narrative.push(`  - ${title}${label} (${source})${status}`);
    }
  }

  if (narrative.length === 0) {
    narrative.push("No activity recorded for this day.");
  }

  return narrative;
}

// ── Done Cards from MC Board ────────────────────────────────────────

interface DoneCard {
  title: string;
  labels: string[];
  completedAt: number;
}

async function getDoneCardsForDate(targetDate: string): Promise<DoneCard[]> {
  try {
    const raw = await fs.readFile(MC_DB_PATH, "utf-8");
    const db = JSON.parse(raw);
    const cards: DoneCard[] = [];

    const dayStart = new Date(targetDate + "T00:00:00").getTime();
    const dayEnd = dayStart + 86400000;

    for (const card of db.cards || []) {
      if (card.column !== "done") continue;

      // Use completedAt if available, fall back to updatedAt
      const ts = card.completedAt || card.updatedAt;
      if (ts && ts >= dayStart && ts < dayEnd) {
        cards.push({
          title: card.title,
          labels: card.labels || [],
          completedAt: ts,
        });
      }
    }

    return cards;
  } catch {
    return [];
  }
}

// ── Review Cards (Still Requires Human Review) ─────────────────────

async function getReviewCards(): Promise<ReviewCard[]> {
  try {
    const raw = await fs.readFile(MC_DB_PATH, "utf-8");
    const db = JSON.parse(raw);
    const cards: ReviewCard[] = [];

    for (const card of db.cards || []) {
      // Cards in review column OR cards with needs-attention status
      if (card.column === "review" || card.executorStatus === "needs-attention") {
        cards.push({
          id: card._id,
          title: card.title,
          labels: card.labels || [],
          column: card.column,
          executorStatus: card.executorStatus,
          updatedAt: card.updatedAt,
        });
      }
    }

    return cards;
  } catch {
    return [];
  }
}

async function fetchVercelDeployments(targetDate: string): Promise<VercelDeployment[]> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return [];
  try {
    const since = new Date(targetDate + "T00:00:00Z").getTime();
    const until = new Date(targetDate + "T23:59:59Z").getTime();
    const url = `https://api.vercel.com/v6/deployments?since=${since}&until=${until}&limit=50`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = await res.json() as { deployments?: VercelDeployment[] };
    return data.deployments || [];
  } catch {
    return [];
  }
}

// ── Main Generator ───────────────────────────────────────────────────

async function generateSummary(targetDate: string): Promise<DailySummary> {
  // Gather all Claude Code conversation files
  const ccFiles: string[] = [];
  const ccDirs = [
    CLAUDE_PROJECTS_DIR,
    path.join(HOME, ".claude/projects/-Users-openclaw--openclaw-workspace-mission-control"),
  ];
  for (const dir of ccDirs) {
    try {
      const files = await fs.readdir(dir);
      ccFiles.push(...files.filter((f) => f.endsWith(".jsonl")).map((f) => path.join(dir, f)));
    } catch {
      // dir doesn't exist
    }
  }

  // Gather OpenClaw session files
  const ocFiles: string[] = [];
  try {
    const files = await fs.readdir(OPENCLAW_SESSIONS_DIR);
    ocFiles.push(
      ...files.filter((f) => f.endsWith(".jsonl")).map((f) => path.join(OPENCLAW_SESSIONS_DIR, f))
    );
  } catch {
    // no sessions
  }

  // Parse all in parallel
  const ccPromises = ccFiles.map((f) => parseClaudeCodeFile(f, targetDate));
  const ocPromises = ocFiles.map((f) => parseOpenClawFile(f, targetDate));

  const [ccResults, ocResults, lockedSkills, taskLogs, gitCommits, doneCards, manualEntries, reviewCards, vercelDeployments] = await Promise.all([
    Promise.all(ccPromises),
    Promise.all(ocPromises),
    getSkillsInstalledOnDate(targetDate),
    getTaskExecutorLogs(targetDate),
    getGitCommits(targetDate),
    getDoneCardsForDate(targetDate),
    getManualEntriesForDate(targetDate),
    getReviewCards(),
    fetchVercelDeployments(targetDate),
  ]);

  const sessions: SessionSummary[] = [];
  let telegramSentByBot = 0;
  let telegramFromPhone = 0;
  for (const r of ccResults) {
    if (r.session) sessions.push(r.session);
    telegramSentByBot += r.telegramSends;
  }

  for (const r of ocResults) {
    if (r.session) sessions.push(r.session);
    telegramFromPhone += r.telegramFromPhone;
    telegramSentByBot += r.telegramSends;
  }

  sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const quickStats: QuickStats = {
    claudeCodeSessions: sessions.filter((s) => s.source === "claude-code").length,
    openclawSessions: sessions.filter((s) => s.source === "openclaw").length,
    totalMessages: sessions.reduce((acc, s) => acc + s.userMessages.length, 0),
    skillsInstalled: lockedSkills,
    telegramSentByBot,
    telegramFromPhone,
    taskExecutorRuns: taskLogs.length,
    gitCommits: gitCommits.length,
    tasksCompleted: doneCards.length,
    vercelDeployments: vercelDeployments.length,
  };

  const narrative = generateNarrative(sessions, taskLogs, quickStats, gitCommits, doneCards, manualEntries, reviewCards, vercelDeployments, targetDate);

  return {
    date: targetDate,
    generatedAt: new Date().toISOString(),
    narrative,
    quickStats,
    sessions,
    taskExecutorRuns: taskLogs,
    gitCommits,
    manualEntries,
    reviewCards,
    vercelDeployments,
  };
}

// ── Cache ────────────────────────────────────────────────────────────

async function getCachedOrGenerate(date: string): Promise<DailySummary> {
  const cachePath = path.join(SUMMARIES_DIR, `${date}.json`);
  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    return JSON.parse(cached);
  } catch {
    // generate
  }

  // Try Little Bird from local cache
  const lbSummary = await fetchLittlebirdSummary(date);
  if (lbSummary) {
    try {
      await fs.mkdir(SUMMARIES_DIR, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(lbSummary, null, 2));
    } catch { /* cache write failed */ }
    return lbSummary;
  }

  // Only generate for today — past dates without LB data stay empty
  const today = new Date().toISOString().slice(0, 10);
  if (date !== today) {
    return { date, generatedAt: new Date().toISOString(), source: 'none', narrative: [], quickStats: { claudeCodeSessions: 0, openclawSessions: 0, totalMessages: 0, skillsInstalled: [], telegramSentByBot: 0, telegramFromPhone: 0, taskExecutorRuns: 0, gitCommits: 0, tasksCompleted: 0, vercelDeployments: 0 }, sessions: [], taskExecutorRuns: [], gitCommits: [] } as DailySummary;
  }

  // Today only: generate and cache
  const summary = await generateSummary(date);
  try {
    await fs.mkdir(SUMMARIES_DIR, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(summary, null, 2));
  } catch {
    // cache write failed
  }
  return summary;
}

// ── All-Time Stats ───────────────────────────────────────────────────

interface AllTimeStats {
  totalDays: number;
  totalSessions: number;
  totalMessages: number;
  totalSkillsInstalled: number;
  totalTelegramSent: number;
  totalTelegramFromPhone: number;
  totalTaskExecutorRuns: number;
  totalGitCommits: number;
  totalTasksCompleted: number;
  claudeCodeSessions: number;
  openclawSessions: number;
  firstDay: string | null;
}

async function computeAllTimeStats(): Promise<AllTimeStats> {
  const stats: AllTimeStats = {
    totalDays: 0,
    totalSessions: 0,
    totalMessages: 0,
    totalSkillsInstalled: 0,
    totalTelegramSent: 0,
    totalTelegramFromPhone: 0,
    totalTaskExecutorRuns: 0,
    totalGitCommits: 0,
    totalTasksCompleted: 0,
    claudeCodeSessions: 0,
    openclawSessions: 0,
    firstDay: null,
  };

  try {
    await fs.mkdir(SUMMARIES_DIR, { recursive: true });
    const files = await fs.readdir(SUMMARIES_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();

    const seenSkills = new Set<string>();

    for (const file of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(SUMMARIES_DIR, file), "utf-8");
        const summary: DailySummary = JSON.parse(raw);
        const qs = summary.quickStats;

        if (qs.claudeCodeSessions > 0 || qs.openclawSessions > 0 || qs.taskExecutorRuns > 0) {
          stats.totalDays++;
        }

        stats.claudeCodeSessions += qs.claudeCodeSessions;
        stats.openclawSessions += qs.openclawSessions;
        stats.totalSessions += qs.claudeCodeSessions + qs.openclawSessions;
        stats.totalMessages += qs.totalMessages;
        stats.totalTelegramSent += qs.telegramSentByBot;
        stats.totalTelegramFromPhone += qs.telegramFromPhone;
        stats.totalTaskExecutorRuns += qs.taskExecutorRuns;
        stats.totalGitCommits += qs.gitCommits || 0;
        stats.totalTasksCompleted += qs.tasksCompleted || 0;

        for (const skill of qs.skillsInstalled) {
          seenSkills.add(skill);
        }

        if (!stats.firstDay) {
          stats.firstDay = summary.date;
        }
      } catch {
        // skip corrupt files
      }
    }

    stats.totalSkillsInstalled = seenSkills.size;
  } catch {
    // no summaries dir
  }

  return stats;
}

// ── Handlers ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const month = searchParams.get("month");
  const regenerate = searchParams.get("regenerate") === "true";
  const alltime = searchParams.get("alltime") === "true";

  if (searchParams.get('settings') === 'true') {
    const settings = await loadSettings();
    return NextResponse.json(settings);
  }

  if (alltime) {
    const stats = await computeAllTimeStats();
    return NextResponse.json(stats);
  }

  if (month) {
    try {
      await fs.mkdir(SUMMARIES_DIR, { recursive: true });
      const files = await fs.readdir(SUMMARIES_DIR);
      const dates = files
        .filter((f) => f.endsWith(".json") && f.startsWith(month))
        .map((f) => f.replace(".json", ""));
      return NextResponse.json({ dates });
    } catch {
      return NextResponse.json({ dates: [] });
    }
  }

  if (!date) {
    return NextResponse.json({ error: "date or month parameter required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  if (regenerate) {
    try { await fs.unlink(path.join(SUMMARIES_DIR, `${date}.json`)); } catch { /* ok */ }
  }

  const summary = await getCachedOrGenerate(date);
  return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Settings update mode: { action: "update-settings", updates: { ... } }
    if (body.action === "update-settings") {
      const updates = body.updates as Partial<LittlebirdSettings>;
      const current = await loadSettings();
      const merged = { ...current, ...updates };
      await fs.writeFile(SETTINGS_PATH, JSON.stringify(merged, null, 2));
      return NextResponse.json({ ok: true });
    }

    // Manual entry mode: { action: "add-entry", date, text, category? }
    if (body.action === "add-entry") {
      const date = body.date as string;
      const text = body.text as string;
      const category = (body.category || "other") as ManualEntry["category"];

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
      }

      const validCategories = ["built", "fixed", "configured", "ran", "other"];
      if (!validCategories.includes(category)) {
        return NextResponse.json({ error: `Invalid category. Use: ${validCategories.join(", ")}` }, { status: 400 });
      }

      const entry: ManualEntry = {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: text.trim(),
        category,
        addedAt: new Date().toISOString(),
      };

      const all = await loadManualEntries();
      if (!all[date]) all[date] = [];
      all[date].push(entry);
      await saveManualEntries(all);

      // Invalidate cached summary so it regenerates with the new entry
      try { await fs.unlink(path.join(SUMMARIES_DIR, `${date}.json`)); } catch { /* ok */ }

      return NextResponse.json({ ok: true, entry });
    }

    // Remove manual entry: { action: "remove-entry", date, id }
    if (body.action === "remove-entry") {
      const date = body.date as string;
      const id = body.id as string;

      if (!date || !id) {
        return NextResponse.json({ error: "date and id are required" }, { status: 400 });
      }

      const all = await loadManualEntries();
      if (all[date]) {
        all[date] = all[date].filter((e: ManualEntry) => e.id !== id);
        if (all[date].length === 0) delete all[date];
        await saveManualEntries(all);
        try { await fs.unlink(path.join(SUMMARIES_DIR, `${date}.json`)); } catch { /* ok */ }
      }

      return NextResponse.json({ ok: true });
    }

    // Original regenerate mode: { date: "YYYY-MM-DD" }
    const date = body.date as string;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    try { await fs.unlink(path.join(SUMMARIES_DIR, `${date}.json`)); } catch { /* ok */ }

    const summary = await generateSummary(date);
    await fs.mkdir(SUMMARIES_DIR, { recursive: true });
    await fs.writeFile(path.join(SUMMARIES_DIR, `${date}.json`), JSON.stringify(summary, null, 2));
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: `Generation failed: ${err}` }, { status: 500 });
  }
}
