export const runtime = "nodejs";

import { spawn, exec } from "child_process";
import { promisify } from "util";
import { execSync, execFileSync } from "child_process";
import { existsSync } from "fs";
import { processes } from "../_state";

const execAsync = promisify(exec);

// Working directory: env var > fallback to this app's root
const ALLSORTED_PATH = (() => {
  const p = process.env.ALLSORTED_APP_PATH;
  if (p && existsSync(p)) return p;
  return process.cwd();
})();

// Resolve claude CLI — try env var, then common install paths
const CLAUDE_BIN = (() => {
  if (process.env.CLAUDE_BIN && existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;
  const candidates = [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // Last resort: let the shell find it
  try { return execFileSync("which", ["claude"]).toString().trim(); } catch { /* ignore */ }
  return "claude";
})();

const MODEL_MAX_TOKENS: Record<string, number> = {
  haiku: 200_000,
  sonnet: 1_000_000,
  opus: 1_000_000,
  opusplan: 1_000_000,
  best: 1_000_000,
};

export async function POST(req: Request) {
  const body = await req.json();
  const {
    prompt,
    model = "sonnet",
    effort = "medium",
    mode = "just-do-it",
    sessionId,
    slot = "A",
  } = body as {
    prompt: string;
    model?: string;
    effort?: string;
    mode?: string;
    sessionId?: string;
    slot?: "A" | "B";
  };

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slotKey = (slot === "B" ? "B" : "A") as "A" | "B";

  // Check if this slot is already occupied
  const existing = processes.get(slotKey);
  if (existing && existing.exitCode === null) {
    return new Response(
      JSON.stringify({ error: `Slot ${slotKey} is already running` }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check 2-slot cap
  const activeCount = [...processes.values()].filter(
    (p) => p.exitCode === null
  ).length;
  if (activeCount >= 2 && !processes.has(slotKey)) {
    return new Response(
      JSON.stringify({ error: "Both terminal slots are busy. Stop a session first." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const maxContext = MODEL_MAX_TOKENS[model] ?? 1_000_000;

  // Capture git SHA before the run so the undo endpoint can reset to exactly this point
  let gitShaBefore: string | null = null;
  try {
    gitShaBefore = execSync("git rev-parse HEAD", { cwd: ALLSORTED_PATH, stdio: "pipe" }).toString().trim();
  } catch { /* not a git repo or no commits yet */ }

  // Adjust prompt based on mode
  const PLAN_PREFIX = "Before making any changes, write out a detailed step-by-step plan of everything you would do, including which files you would modify and why. Do NOT make any changes yet — just write the plan.\n\n";
  const READONLY_PREFIX = "IMPORTANT: You are in Read Only mode. You may read files, analyze code, and answer questions, but you MUST NOT create, edit, delete, or run any commands that modify files or the filesystem.\n\n";
  const finalPrompt =
    mode === "plan-first" ? PLAN_PREFIX + prompt
    : mode === "read-only" ? READONLY_PREFIX + prompt
    : prompt;

  const stream = new ReadableStream({
    start(controller) {
      const args = [
        "--print",
        "--output-format",
        "stream-json",
        "--verbose",
        "--model",
        model,
        "--effort",
        effort,
        "-p",
        finalPrompt,
      ];
      if (mode === "just-do-it") {
        args.push("--dangerously-skip-permissions");
      }
      if (sessionId) {
        args.push("--resume", sessionId);
      }

      const child = spawn(CLAUDE_BIN, args, {
        cwd: ALLSORTED_PATH,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });

      processes.set(slotKey, child);

      // Send slot/context metadata immediately (gitShaBefore lets the frontend record it for per-session undo)
      const meta = JSON.stringify({
        type: "meta",
        slot: slotKey,
        maxContext,
        cwd: ALLSORTED_PATH,
        gitShaBefore,
      });
      controller.enqueue(encoder.encode(`data: ${meta}\n\n`));

      let buffer = "";

      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) {
            controller.enqueue(encoder.encode(`data: ${line}\n\n`));
          }
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const msg = JSON.stringify({
          type: "error",
          message: chunk.toString().trim(),
        });
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      });

      child.on("close", (code) => {
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(`data: ${buffer}\n\n`));
        }
        const done = JSON.stringify({ type: "done", exitCode: code ?? 0 });
        controller.enqueue(encoder.encode(`data: ${done}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        // After successful run, commit everything the Genie changed
        try {
          const shortPrompt = prompt.slice(0, 60).replace(/['"\\]/g, "").trim();
          execSync(`git add -A && git commit -m "genie: ${shortPrompt}" --allow-empty`, {
            cwd: ALLSORTED_PATH,
            stdio: "pipe",
          });
        } catch {
          // Non-fatal — if git commit fails (nothing to commit, no git repo), continue
        }

        processes.delete(slotKey);
      });

      child.on("error", (err) => {
        const msg = JSON.stringify({
          type: "error",
          message: `Failed to start claude: ${err.message}. Is the claude CLI installed?`,
        });
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        processes.delete(slotKey);
      });
    },
    cancel() {
      const child = processes.get(slotKey);
      if (child) {
        child.kill("SIGTERM");
        processes.delete(slotKey);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Slot": slotKey,
    },
  });
}
