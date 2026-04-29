import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import os from "os";

const execFileAsync = promisify(execFile);

const HOME = process.env.HOME || "";
const AGENT_DIR = path.join(HOME, "golden-claw/agents/bookkeeping");
const CONFIG_PATH = path.join(AGENT_DIR, "config/config.json");
const RUNS_PATH = path.join(AGENT_DIR, "data/runs.json");
const STATE_PATH = path.join(AGENT_DIR, "data/state.json");
const STATUS_PATH = path.join(AGENT_DIR, "status.json");
const SHEET_MAP_PATH = path.join(AGENT_DIR, "data/sheet-map.json");
const COA_PATH = path.join(AGENT_DIR, "config/chart-of-accounts.csv");
const RULES_PATH = path.join(AGENT_DIR, "config/rules.json");
const EXAMPLES_DIR = path.join(AGENT_DIR, "examples");

const REFERENCE_FILES = {
  chartOfAccounts: {
    label: "Chart of Accounts",
    path: path.join(AGENT_DIR, "config/chart-of-accounts.csv"),
  },
  sampleBankStatement: {
    label: "Sample Bank Statement",
    path: path.join(EXAMPLES_DIR, "sample-bank-statement.csv"),
  },
  classificationRules: {
    label: "Classification Rules",
    path: path.join(AGENT_DIR, "config/rules.json"),
  },
  quickbooksSample: {
    label: "QuickBooks Sample Output",
    path: path.join(EXAMPLES_DIR, "quickbooks-sample-output.csv"),
  },
  xeroSample: {
    label: "Xero Sample Output",
    path: path.join(EXAMPLES_DIR, "xero-sample-output.csv"),
  },
  zohoSample: {
    label: "Zoho Books Sample Output",
    path: path.join(EXAMPLES_DIR, "zoho-sample-output.csv"),
  },
};

function readJSON(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function countCSVLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return Math.max(0, content.split("\n").filter((l) => l.trim()).length - 1);
  } catch {
    return 0;
  }
}

function parseCoaCSV(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    return lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim());
      return {
        accountId: cols[0] || "",
        accountName: cols[1] || "",
        accountCode: cols[2] || "",
        description: cols[3] || "",
        accountType: cols[4] || "",
        currency: cols[5] || "",
      };
    });
  } catch {
    return [];
  }
}

const SAMPLE_COA_PATH = path.join(EXAMPLES_DIR, "sample-chart-of-accounts.csv");

async function runIntegrationAction(payload: object): Promise<unknown> {
  const tmpFile = path.join(os.tmpdir(), `bk-action-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(payload));
  try {
    const actionScript = path.join(AGENT_DIR, "src/integration-action.js");
    const { stdout } = await execFileAsync("node", [actionScript, tmpFile], { timeout: 30000, cwd: AGENT_DIR });
    return JSON.parse(stdout);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

let running = false;

export async function GET(req: NextRequest) {
  const cmd = req.nextUrl.searchParams.get("cmd");

  // Command-style API (used by toggle, sheet-map, etc.)
  if (cmd) {
    try {
      switch (cmd) {
        case "toggle-test": {
          const config = readJSON(CONFIG_PATH);
          if (!config) return NextResponse.json({ success: false, error: "Config not found" }, { status: 404 });
          config.testMode = !config.testMode;
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
          return NextResponse.json({ success: true, testMode: config.testMode });
        }
        case "sheet-map": {
          const sheetMap = readJSON(SHEET_MAP_PATH) || {};
          return NextResponse.json({ success: true, data: sheetMap });
        }
        case "download-coa": {
          if (!fs.existsSync(COA_PATH)) return NextResponse.json({ error: "COA not found" }, { status: 404 });
          const content = fs.readFileSync(COA_PATH, "utf-8");
          return new NextResponse(content, {
            headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=chart-of-accounts.csv" },
          });
        }
        case "download-sample-coa": {
          if (!fs.existsSync(SAMPLE_COA_PATH)) return NextResponse.json({ error: "Sample COA not found" }, { status: 404 });
          const sampleContent = fs.readFileSync(SAMPLE_COA_PATH, "utf-8");
          return new NextResponse(sampleContent, {
            headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=sample-chart-of-accounts.csv" },
          });
        }
        case "example": {
          const software = req.nextUrl.searchParams.get("software") || "zoho";
          const sampleMap: Record<string, string> = {
            zoho: path.join(EXAMPLES_DIR, "zoho-sample-output.csv"),
            quickbooks: path.join(EXAMPLES_DIR, "quickbooks-sample-output.csv"),
            xero: path.join(EXAMPLES_DIR, "xero-sample-output.csv"),
          };
          const samplePath = sampleMap[software] || sampleMap.zoho;
          if (!fs.existsSync(samplePath)) return NextResponse.json({ error: "Sample not found" }, { status: 404 });
          const exampleContent = fs.readFileSync(samplePath, "utf-8");
          return new NextResponse(exampleContent, {
            headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${software}-sample-output.csv` },
          });
        }
        case "open-downloads": {
          if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
          exec(`open "${DOWNLOADS_DIR}"`);
          return NextResponse.json({ success: true, path: DOWNLOADS_DIR });
        }
        case "coa-match": {
          const runId = req.nextUrl.searchParams.get("runId");
          if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
          const runsData = readJSON(RUNS_PATH) || { runs: [] };
          const run = (runsData.runs || []).find((r: { id?: string; csvPath?: string }) => r.id === runId);
          if (!run?.csvPath) return NextResponse.json({ error: "Run not found or has no CSV" }, { status: 404 });
          if (!fs.existsSync(run.csvPath)) return NextResponse.json({ error: "CSV not found on disk" }, { status: 404 });
          const rawCsv = fs.readFileSync(run.csvPath, "utf-8");
          const lines = rawCsv.split("\n").filter((l: string) => l.trim());
          if (lines.length < 2) return NextResponse.json({ success: true, accounts: [], total: 0 });
          const headers = lines[0].split(",").map((h: string) => h.trim());
          const accountIdx = headers.indexOf("Account");
          const debitIdx = headers.indexOf("Debit");
          const creditIdx = headers.indexOf("Credit");
          const summary: Record<string, { account: string; debit: number; credit: number; count: number }> = {};
          for (const line of lines.slice(1)) {
            const cols = line.split(",").map((c: string) => c.trim().replace(/^"|"$/g, ""));
            const account = cols[accountIdx] || "Unknown";
            const debit = parseFloat(cols[debitIdx]) || 0;
            const credit = parseFloat(cols[creditIdx]) || 0;
            if (!summary[account]) summary[account] = { account, debit: 0, credit: 0, count: 0 };
            summary[account].debit += debit;
            summary[account].credit += credit;
            if (debit > 0 || credit > 0) summary[account].count++;
          }
          const accounts = Object.values(summary).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit));
          return NextResponse.json({ success: true, accounts, total: lines.length - 1 });
        }
        case "download-csv": {
          const runId = req.nextUrl.searchParams.get("runId");
          if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
          const runsData = readJSON(RUNS_PATH) || { runs: [] };
          const run = (runsData.runs || []).find((r: { id?: string; csvPath?: string }) => r.id === runId);
          if (!run?.csvPath) return NextResponse.json({ error: "Run not found or has no CSV" }, { status: 404 });
          if (!fs.existsSync(run.csvPath)) return NextResponse.json({ error: "CSV file not found on disk" }, { status: 404 });
          const csvContent = fs.readFileSync(run.csvPath, "utf-8");
          return new NextResponse(csvContent, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename=journal-entries-${runId}.csv`,
            },
          });
        }
        default:
          return NextResponse.json({ success: false, error: `Unknown command: ${cmd}` }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
    }
  }

  // Default GET — return all data for the page
  try {
    const status = readJSON(STATUS_PATH) || {
      agentId: "bookkeeping",
      status: "unknown",
      lastRun: null,
      lastResult: null,
      lastMessage: "No status yet",
      errorCount: 0,
      enabled: true,
    };

    const runsData = readJSON(RUNS_PATH) || { runs: [] };
    const config = readJSON(CONFIG_PATH) || {};
    const rulesFile = readJSON(RULES_PATH);
    const rules = {
      version: rulesFile?.version ?? 0,
      count: rulesFile?.rules?.length ?? 0,
    };
    const state = readJSON(STATE_PATH) || { processedFiles: {}, lastSuffix: 0 };
    const coaCount = countCSVLines(COA_PATH);
    const coaEntries = parseCoaCSV(COA_PATH);
    const sheetMap = readJSON(SHEET_MAP_PATH) || {};

    const referencePaths = Object.fromEntries(
      Object.entries(REFERENCE_FILES).map(([key, val]) => [
        key,
        { label: val.label, path: val.path, exists: fs.existsSync(val.path) },
      ])
    );

    return NextResponse.json({
      status,
      runs: runsData.runs || [],
      config: { ...config, accountingSoftware: config.accountingSoftware || "zoho", contacts: config.contacts || {} },
      rules,
      state,
      coaCount,
      coaEntries,
      sheetMap,
      referencePaths,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

const DOWNLOADS_DIR = path.join(AGENT_DIR, "data/downloads");

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  // Handle multipart file uploads
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const files = formData.getAll("files");
      if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

      // Ensure downloads directory exists
      if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

      const savedPaths: string[] = [];
      for (const file of files) {
        if (!(file instanceof File)) continue;
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(DOWNLOADS_DIR, file.name);
        fs.writeFileSync(filePath, buffer);
        savedPaths.push(filePath);
      }

      if (savedPaths.length === 0) return NextResponse.json({ error: "No valid files saved" }, { status: 400 });

      // Run the agent process command on the uploaded files
      const fileArgs = savedPaths.map(p => `"${p}"`).join(" ");
      const result = await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          exec(
            `cd "${AGENT_DIR}" && node src/index.js process ${fileArgs}`,
            { timeout: 120000 },
            (error, stdout, stderr) => {
              if (error) reject(new Error(stderr || error.message));
              else resolve({ stdout, stderr });
            }
          );
        }
      );
      return NextResponse.json({ success: true, output: result.stdout, filesProcessed: savedPaths.length });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
    }
  }

  // Handle JSON body with action
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { action, runId, software } = body;

      if (action === "upload-coa") {
        const { content } = body;
        if (!content) return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
        const lines = content.split("\n").filter((l: string) => l.trim());
        if (lines.length < 2) return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
        fs.writeFileSync(COA_PATH, content);
        return NextResponse.json({ success: true, count: lines.length - 1 });
      }

      if (action === "import" || action === "test-connection" || action === "export-csv") {
        const config = readJSON(CONFIG_PATH);
        if (!config) return NextResponse.json({ error: "Config not found" }, { status: 500 });

        const targetSoftware = software || config.accountingSoftware;
        if (!targetSoftware) {
          return NextResponse.json({ error: "No accounting software selected" }, { status: 400 });
        }

        // Run integration action via child process to avoid Turbopack
        // static analysis of external module paths outside the project tree.
        const actionScript = path.join(AGENT_DIR, "src/integration-action.js");
        if (!fs.existsSync(actionScript)) {
          return NextResponse.json({ error: "Integration action script not found" }, { status: 500 });
        }

        if (action === "test-connection") {
          const result = await runIntegrationAction({ action: "test-connection", software: targetSoftware, config, entries: [] });
          return NextResponse.json(result);
        }

        if (action === "export-csv" || action === "import") {
          const runsData = readJSON(RUNS_PATH) || { runs: [] };
          const run = runsData.runs.find((r: RunEntry) => r.id === runId);
          if (!run?.csvPath) return NextResponse.json({ error: "Run or CSV not found" }, { status: 404 });
          const csvContent = fs.existsSync(run.csvPath) ? fs.readFileSync(run.csvPath, "utf-8") : null;
          if (!csvContent) return NextResponse.json({ error: "CSV file not found" }, { status: 404 });
          const lines = csvContent.split("\n").filter((l: string) => l.trim());
          const headers = lines[0].split(",");
          const entries = lines.slice(1).map((line: string) => {
            const vals = line.split(",");
            const entry: Record<string, string> = {};
            headers.forEach((h: string, i: number) => { entry[h.trim()] = (vals[i] || "").trim().replace(/^"|"$/g, ""); });
            return entry;
          });
          const adapterAction = action === "export-csv" ? "format-entries" : "import";
          const result = await runIntegrationAction({ action: adapterAction, software: targetSoftware, config, entries });
          return NextResponse.json(result);
        }
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Action failed" },
        { status: 500 }
      );
    }
  }

  // Default POST: trigger a run
  if (running) {
    return NextResponse.json({ error: "A run is already in progress" }, { status: 409 });
  }

  running = true;
  try {
    const result = await new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        exec(
          `bash ${path.join(AGENT_DIR, "bin/run.sh")} poll`,
          { timeout: 120000 },
          (error, stdout, stderr) => {
            if (error) reject(new Error(stderr || error.message));
            else resolve({ stdout, stderr });
          }
        );
      }
    );
    return NextResponse.json({ success: true, output: result.stdout, warnings: result.stderr || null });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Run failed" },
      { status: 500 }
    );
  } finally {
    running = false;
  }
}

interface RunEntry {
  id?: string;
  csvPath?: string;
  [key: string]: unknown;
}

export async function PATCH(request: Request) {
  try {
    const updates = await request.json();
    const config = readJSON(CONFIG_PATH);
    if (!config) return NextResponse.json({ error: "Config not found" }, { status: 500 });

    if (updates.approval !== undefined) {
      if (!config.approval) config.approval = { enabled: true, approver: {} };
      if (typeof updates.approval.enabled === "boolean") {
        config.approval.enabled = updates.approval.enabled;
      }
      if (updates.approval.approver) {
        config.approval.approver = { ...config.approval.approver, ...updates.approval.approver };
      }
    }

    if (updates.slackEnrichment !== undefined) {
      if (!config.slackEnrichment) config.slackEnrichment = { enabled: true };
      if (typeof updates.slackEnrichment.enabled === "boolean") {
        config.slackEnrichment.enabled = updates.slackEnrichment.enabled;
      }
    }

    if (updates.accountingSoftware !== undefined) {
      config.accountingSoftware = updates.accountingSoftware;
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
