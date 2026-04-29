import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SESSIONS_BASE = path.join(WS, "projects/online-program/cohort-1/sessions");

function sessionDataPath(num: number): string {
  return path.join(SESSIONS_BASE, `session-${num}`, "session-data.json");
}

function runClaude(prompt: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "claude",
      ["-p", prompt],
      {
        timeout: 120000,
        maxBuffer: 5 * 1024 * 1024,
        env: (({ ANTHROPIC_API_KEY: _, ...rest }) => rest)(process.env as NodeJS.ProcessEnv) as NodeJS.ProcessEnv,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Claude CLI failed: ${stderr || error.message}`));
          return;
        }
        resolve(String(stdout || "").trim());
      }
    );

    if (child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

// POST /api/online-program/wrap-up/generate-tech-output
// Body: { session: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session } = body as { session: number };

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Missing session parameter", output: "", data: null },
        { status: 400 }
      );
    }

    const dataPath = sessionDataPath(session);

    let sessionData: Record<string, unknown>;
    try {
      const raw = await fs.readFile(dataPath, "utf-8");
      sessionData = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { status: "error", message: `Session ${session} not found`, output: "", data: null },
        { status: 404 }
      );
    }

    const techRequirements = sessionData.tech_requirements as string | null;

    if (!techRequirements || techRequirements.trim().length === 0) {
      return NextResponse.json(
        { status: "error", message: "No tech requirements input found. Fill in step 15a first.", output: "", data: sessionData },
        { status: 400 }
      );
    }

    const prompt = [
      "You are writing a tech setup guide for non-technical online-program participants.",
      "Take this list of requirements and expand each one into clear step-by-step instructions",
      "with official URLs and helpful context.",
      "Format as markdown with ## headers for each requirement.",
      "Be encouraging and specific.",
      "Include what each tool is, approximate cost, how to sign up (step by step with URLs),",
      "and why they need it.",
      "If you include any troubleshooting or help tip, always say 'If you get stuck, post in the group' — never say 'bring a screenshot to the session' or any variation of that.",
    ].join(" ");

    const output = await runClaude(prompt, techRequirements);

    if (!output || output.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Claude returned empty output", output: "", data: sessionData },
        { status: 500 }
      );
    }

    // Save output to session-data.json
    sessionData.tech_requirements_output = output;

    if (!sessionData.pipeline_status || typeof sessionData.pipeline_status !== "object") {
      sessionData.pipeline_status = {};
    }
    (sessionData.pipeline_status as Record<string, boolean>).step_15b_tech_output_generated = true;

    await fs.writeFile(dataPath, JSON.stringify(sessionData, null, 2), "utf-8");

    return NextResponse.json({
      status: "success",
      output,
      data: sessionData,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err), output: "", data: null },
      { status: 500 }
    );
  }
}
