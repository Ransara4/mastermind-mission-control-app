import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SCREENSHOTS_DIR = path.join(WS, "projects/business1/waba-setup/screenshots");

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const CLAUDE_BIN = "/opt/homebrew/bin/claude";

type AnalysisResult = {
  relevant: boolean;
  stage: string | null;
  errors: string[];
  search_query: string;
  description: string;
  irrelevant_reason?: string;
  error_codes?: string[];
};

function extractErrorCodes(text: string): string[] {
  const patterns = [
    /\b(13\d{4})\b/g,           // 130xxx, 131xxx, 133xxx range
    /\b(1[0-9]{3})\b/g,         // 1000-1999 range
    /\berror\s+(?:code[:\s]+)?(\d{3,6})\b/gi,  // "error code: XXXXXX"
    /\(#(\d{3,6})\)/g,          // (#XXXXXX)
    /\bcode[:\s]+(\d{3,6})\b/gi, // "code: XXXXXX"
  ];

  const codes = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      codes.add(match[1]);
    }
  }
  return [...codes];
}

function callClaudeWithImage(
  filePath: string,
  mimeType: string,
  prompt: string,
  timeoutMs: number
): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    // Read image as base64 and send via stream-json input format so Claude can see it
    const imageData = fs.readFileSync(filePath).toString("base64");

    // Claude CLI stream-json message with image content
    const message = JSON.stringify({
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: imageData,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    });

    const proc = spawn(
      CLAUDE_BIN,
      ["--print", "--output-format", "stream-json", "--input-format", "stream-json", "--verbose"],
      { env: { ...process.env } }
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
      reject(new Error("Timeout"));
    }, timeoutMs);

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (timedOut) return;
      if (code === 0 && stdout.trim()) {
        try {
          // Parse stream-json output: find the result line and extract the text
          const lines = stdout.trim().split("\n");
          let resultText = "";
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.type === "result" && event.result) {
                resultText = event.result;
                break;
              }
            } catch { /* skip non-JSON lines */ }
          }
          if (!resultText) throw new Error("No result in output");
          const cleaned = resultText.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
          resolve(JSON.parse(cleaned));
        } catch {
          reject(new Error("Could not parse JSON response"));
        }
      } else {
        reject(new Error(stderr.trim() || `Claude exited with code ${code}`));
      }
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.stdin.write(message + "\n");
    proc.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const context = formData.get("context") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP, and GIF images are supported" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Create screenshots dir if needed
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Save file with safe name
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(SCREENSHOTS_DIR, fileName);

    const bytes = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(bytes));

    const contextNote = context ? `\nThe user is also asking: "${context}". Incorporate this into the search_query.` : "";

    const prompt = `Analyze this screenshot and determine if it is from a WABA (WhatsApp Business API) setup process, Meta Business Manager, Meta embedded signup flow, WhatsApp Business Account configuration, or the BUSINESS1 platform (a WhatsApp SMB tool).

If the image is NOT related to any of the above (e.g., it's a random website, desktop app, social media post, etc.), set relevant=false.

If relevant, identify:
1. The WABA onboarding stage or screen shown
2. Any error codes or error messages (exact text)
3. A concise search query (5-10 words) to find relevant help documentation
${contextNote}

Valid stages: pre-setup, waba-creation, number-registration, display-name, business-verification, security, coexistence, partner-management, triage, errors, competitor-reference

Respond ONLY with valid JSON (no markdown):
{"relevant": true, "stage": "stage-name-or-null", "errors": ["error text if any"], "search_query": "concise query", "description": "brief description"}

Or if not relevant:
{"relevant": false, "stage": null, "errors": [], "search_query": "", "description": "brief description of what was shown", "irrelevant_reason": "one sentence explaining why it's not relevant"}`;

    let analysis: AnalysisResult;

    // Analyze with claude CLI vision via stream-json input
    try {
      analysis = await callClaudeWithImage(filePath, file.type, prompt, 45000);
    } catch {
      // Return a fallback query so search can still fire
      analysis = {
        relevant: true,
        stage: null,
        errors: [],
        search_query: "WABA setup error",
        description: "Could not fully analyze screenshot — searching for general WABA setup help",
      };
    }

    // Extract Meta error codes from all text fields in the analysis
    const textToScan = [
      analysis.description,
      analysis.search_query,
      ...analysis.errors,
    ].filter(Boolean).join(" ");
    const errorCodes = extractErrorCodes(textToScan);

    if (errorCodes.length > 0) {
      analysis.error_codes = errorCodes;
      analysis.search_query = `error ${errorCodes[0]}`;
    }

    return NextResponse.json({
      file_path: filePath,
      file_name: fileName,
      analysis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Allow large payloads for image upload
export const config = {
  api: {
    bodyParser: false,
  },
};
