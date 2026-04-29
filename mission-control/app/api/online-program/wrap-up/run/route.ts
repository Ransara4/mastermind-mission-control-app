import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import https from "https";
import { execFile } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SESSIONS_BASE = path.join(WS, "projects/online-program/cohort-1/sessions");
const SCRIPTS_CWD = path.join(WS, "projects/online-program");

type SessionData = Record<string, unknown>;
type StepKey = number | string;

function sessionDataPath(num: number): string {
  return path.join(SESSIONS_BASE, `session-${num}`, "session-data.json");
}

interface StepConfig {
  command: string;
  args: string[];
  skipInTestMode?: boolean;
  pipelineKey: string;
  background?: boolean;
  testCleanup?: (sessionData: SessionData) => Promise<void>;
}

function buildArgs(scriptPath: string, session: number): string[] {
  return [scriptPath, "--live", "--session", String(session)];
}

function getStepConfig(
  step: StepKey,
  session: number
): StepConfig | "manual" | undefined {
  const s = String(step);

  const manualSteps = ["3", "6", "8", "10", "11", "14", "15", "15a"];
  if (manualSteps.includes(s)) {
    return "manual";
  }

  const configs: Record<string, StepConfig> = {
    "1": {
      command: "bash",
      args: buildArgs("scripts/zoom-download.sh", session),
      pipelineKey: "step_1_download",
    },
    "2": {
      command: "node",
      args: buildArgs("scripts/youtube-upload.js", session),
      pipelineKey: "step_2_youtube",
      testCleanup: async (data) => {
        data.youtube_id = null;
        data.youtube_url = null;
        const pipeline = data.pipeline_status as Record<string, boolean>;
        pipeline.step_2_youtube = false;
      },
    },
    "4": {
      command: "node",
      args: buildArgs("scripts/analyze-chat.js", session),
      pipelineKey: "step_5_chat_analyzed",
    },
    "4b": {
      command: "node",
      args: buildArgs("scripts/extract-reel-clips.js", session),
      pipelineKey: "step_4b_reel_clips",
      testCleanup: async (data) => {
        data.reel_clips = null;
        const pipeline = data.pipeline_status as Record<string, boolean>;
        pipeline.step_4b_reel_clips = false;
      },
    },
    "4c": {
      command: "node",
      args: buildArgs("scripts/answer-questions.js", session),
      pipelineKey: "step_4c_questions_answered",
      background: true,
    },
    "5": {
      command: "node",
      args: buildArgs("scripts/summarize-transcript.js", session),
      pipelineKey: "step_6_transcript_summarized",
    },
    "7": {
      command: "node",
      args: buildArgs("scripts/wix-push.js", session),
      pipelineKey: "step_8_wix_cms",
      testCleanup: async (data) => {
        const wixId = data.wix_cms_id as string | null;
        if (wixId) {
          await wixDeleteItem(wixId);
        }
        data.wix_cms_id = null;
        const pipeline = data.pipeline_status as Record<string, boolean>;
        pipeline.step_8_wix_cms = false;
      },
    },
    "9": {
      command: "node",
      args: buildArgs("scripts/build-pdf.js", session),
      pipelineKey: "step_10_pdf_built",
      testCleanup: async (data) => {
        const pdfPath = data.pdf_path as string | null;
        if (pdfPath) {
          try {
            await fs.unlink(pdfPath);
          } catch {
            // file may not exist
          }
        }
        data.pdf_path = null;
        const pipeline = data.pipeline_status as Record<string, boolean>;
        pipeline.step_10_pdf_built = false;
      },
    },
    "12": {
      command: "node",
      args: buildArgs("scripts/distribute-wa.js", session),
      pipelineKey: "step_13_whatsapp",
      skipInTestMode: true,
    },
    "13": {
      command: "node",
      args: buildArgs("scripts/notion-sm-record.js", session),
      pipelineKey: "step_14_notion_card",
      testCleanup: async (data) => {
        const notionId = data.notion_sm_record_id as string | null;
        if (notionId) {
          await notionArchivePage(notionId);
        }
        data.notion_sm_record_id = null;
        const pipeline = data.pipeline_status as Record<string, boolean>;
        pipeline.step_14_notion_card = false;
      },
    },
    "15c": {
      command: "node",
      args: buildArgs("scripts/build-tech-requirements-pdf.js", session),
      pipelineKey: "step_15c_tech_pdf_built",
      testCleanup: async (data) => {
        const pdfPath = data.tech_requirements_pdf_path as string | null;
        if (pdfPath) {
          try {
            await fs.unlink(pdfPath);
          } catch {
            // file may not exist
          }
        }
        data.tech_requirements_pdf_path = null;
        const pipeline = data.pipeline_status as Record<string, boolean>;
        pipeline.step_15c_tech_pdf_built = false;
      },
    },
    "15d": {
      command: "node",
      args: buildArgs("scripts/send-tech-requirements-wa.js", session),
      pipelineKey: "step_15d_tech_wa_sent",
      skipInTestMode: true,
    },
  };

  return configs[s];
}

// --- External API helpers (Node built-ins only) ---

function httpsRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...headers,
        ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () =>
        resolve({ statusCode: res.statusCode || 0, body: data })
      );
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function wixDeleteItem(itemId: string): Promise<void> {
  const token = process.env.WIX_API_TOKEN;
  const accountId = process.env.WIX_ACCOUNT_ID;
  if (!token || !accountId) return;

  await httpsRequest(
    "DELETE",
    `https://www.wixapis.com/wix-data/v2/items/${itemId}?dataCollectionId=OnlineProgramRecordings`,
    {
      Authorization: token,
      "wix-account-id": accountId,
      "Content-Type": "application/json",
    }
  );
}

async function notionArchivePage(pageId: string): Promise<void> {
  const notionKey = process.env.NOTION_API_KEY;
  if (!notionKey) return;

  const body = JSON.stringify({ archived: true });
  await httpsRequest(
    "PATCH",
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      Authorization: `Bearer ${notionKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body
  );
}

// --- Script runner ---

function runScript(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        const exitCode = error
          ? (error as NodeJS.ErrnoException & { code?: number }).code || 1
          : 0;
        resolve({
          stdout: String(stdout || ""),
          stderr: String(stderr || ""),
          exitCode,
        });
      }
    );

    setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // already dead
      }
    }, timeoutMs + 1000);
  });
}

function truncateOutput(text: string, maxLines: number = 50): string {
  const lines = text.trim().split("\n");
  if (lines.length > maxLines) {
    return (
      `... (${lines.length - maxLines} lines truncated)\n` +
      lines.slice(-maxLines).join("\n")
    );
  }
  return text.trim();
}

// POST /api/online-program/wrap-up/run
// Body: { step: number | string, session: number, testMode: boolean, forceRerun: boolean }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, session, testMode, forceRerun } = body as {
      step: number | string;
      session: number;
      testMode: boolean;
      forceRerun: boolean;
    };

    if (step === undefined || step === null || !session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing step or session parameter",
          data: null,
          output: "",
        },
        { status: 400 }
      );
    }

    const dataPath = sessionDataPath(session);
    let sessionData: SessionData;
    try {
      const raw = await fs.readFile(dataPath, "utf-8");
      sessionData = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          status: "error",
          message: `Session ${session} not found`,
          data: null,
          output: "",
        },
        { status: 404 }
      );
    }

    const config = getStepConfig(step, session);

    // Unknown step
    if (config === undefined) {
      return NextResponse.json(
        {
          status: "error",
          message: `No configuration for step ${step}`,
          data: sessionData,
          output: "",
        },
        { status: 400 }
      );
    }

    // Manual steps
    if (config === "manual") {
      return NextResponse.json({
        status: "manual",
        message: "Manual step -- mark complete in UI",
        data: sessionData,
        output: "",
      });
    }

    const pipeline = (sessionData.pipeline_status || {}) as Record<
      string,
      boolean
    >;

    // Test mode: skip WA-sending steps regardless of forceRerun
    if (testMode && config.skipInTestMode) {
      return NextResponse.json({
        status: "test_skipped",
        message: `Step ${step} skipped in test mode (sends external messages)`,
        data: sessionData,
        output: "",
      });
    }

    // Skip if already done and not force-rerunning
    if (!forceRerun && pipeline[config.pipelineKey]) {
      return NextResponse.json({
        status: "skipped",
        message: "Already complete",
        data: sessionData,
        output: "",
      });
    }

    // Force rerun: run cleanup before re-executing
    if (forceRerun && config.testCleanup) {
      await config.testCleanup(sessionData);
      await fs.writeFile(
        dataPath,
        JSON.stringify(sessionData, null, 2),
        "utf-8"
      );
    }

    // Background (fire-and-forget) steps
    if (config.background) {
      const { spawn } = await import("child_process");
      const child = spawn(config.command, config.args, {
        cwd: SCRIPTS_CWD,
        detached: true,
        stdio: "ignore",
        env: { ...process.env },
      });
      child.unref();

      // Mark pipeline key as started (not completed — script runs async)
      const bgPipeline = (sessionData.pipeline_status || {}) as Record<string, boolean>;
      bgPipeline[config.pipelineKey] = true;
      await fs.writeFile(dataPath, JSON.stringify(sessionData, null, 2), "utf-8");

      return NextResponse.json({
        status: "success",
        message: `Step ${step} started in background — answers will appear in Questions page as they complete`,
        data: sessionData,
        output: "Background process spawned.",
      });
    }

    // Run the script
    const TIMEOUT_MS = 5 * 60 * 1000;
    const result = await runScript(
      config.command,
      config.args,
      SCRIPTS_CWD,
      TIMEOUT_MS
    );

    // Re-read session data (script may have updated it)
    let freshData: SessionData;
    try {
      freshData = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    } catch {
      freshData = sessionData;
    }

    const combinedOutput = truncateOutput(
      [result.stdout, result.stderr].filter(Boolean).join("\n")
    );

    if (result.exitCode !== 0) {
      return NextResponse.json({
        status: "error",
        message: `Step ${step} failed (exit code ${result.exitCode})`,
        data: freshData,
        output: combinedOutput,
      });
    }

    return NextResponse.json({
      status: "success",
      message: `Step ${step} completed successfully`,
      data: freshData,
      output: combinedOutput,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: String(err),
        data: null,
        output: "",
      },
      { status: 500 }
    );
  }
}
