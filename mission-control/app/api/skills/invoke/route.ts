import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import os from "os";

const HOME = os.homedir();

const CLAUDE_BIN = "/opt/homebrew/bin/claude";

// Allowlist of skills that can be invoked from MC quick-actions.
// Only short, non-destructive skills should be here.
const ALLOWED_SKILLS = new Set([
  "audit-env-variables",
  "capability-evolver",
  "cashclaw-seo-auditor",
  "code-stats",
  "service-uptime",
  "summarize",
  "guard-dog",
  "deep-research",
  "gog",
]);

export async function POST(request: NextRequest) {
  let skill: string;
  let prompt: string | undefined;

  try {
    const body = await request.json();
    skill = body.skill;
    prompt = body.prompt;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!skill || typeof skill !== "string") {
    return NextResponse.json(
      { success: false, error: "skill is required" },
      { status: 400 }
    );
  }

  // Sanitize: only allow alphanumeric, dash, underscore
  const safeSkill = skill.replace(/[^a-zA-Z0-9_-]/g, "");
  if (safeSkill !== skill) {
    return NextResponse.json(
      { success: false, error: "Invalid skill name" },
      { status: 400 }
    );
  }

  if (!ALLOWED_SKILLS.has(safeSkill)) {
    return NextResponse.json(
      { success: false, error: `Skill '${safeSkill}' is not in the MC quick-action allowlist` },
      { status: 403 }
    );
  }

  // Build the prompt: invoke the skill as a slash command
  const invokePrompt = prompt
    ? `/${safeSkill} ${prompt}`
    : `/${safeSkill}`;

  const output = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
    (resolve) => {
      let stdout = "";
      let stderr = "";

      const child = spawn(
        CLAUDE_BIN,
        ["-p", "--dangerously-skip-permissions"],
        {
          env: { ...process.env, HOME },
          cwd: HOME,
          timeout: 60000,
        }
      );

      child.stdin.write(invokePrompt);
      child.stdin.end();

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("close", (code: number | null) => {
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });

      child.on("error", (err: Error) => {
        resolve({ stdout, stderr: stderr + err.message, exitCode: -1 });
      });

      // Hard kill after 60s
      setTimeout(() => {
        child.kill("SIGTERM");
      }, 60000);
    }
  );

  if (output.exitCode !== 0) {
    return NextResponse.json(
      {
        success: false,
        error: output.stderr || `Process exited with code ${output.exitCode}`,
        output: output.stdout,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    skill: safeSkill,
    output: output.stdout,
  });
}
