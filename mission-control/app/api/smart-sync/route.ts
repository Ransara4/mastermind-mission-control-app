import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const GC_ROOT = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const MANIFEST_PATH = path.join(GC_ROOT, "gc-sync-manifest.json");
const REPORT_PATH = path.join(GC_ROOT, "_sync-report.md");
const SYNC_SCRIPT = path.join(GC_ROOT, "gc-smart-sync.js");

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

function loadReport() {
  try {
    return fs.readFileSync(REPORT_PATH, "utf8");
  } catch {
    return null;
  }
}

function getReportStat() {
  try {
    const stat = fs.statSync(REPORT_PATH);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

function getCurrentHead() {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: os.homedir(),
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function getChangedFileCount(lastSyncCommit: string) {
  try {
    const sourceDir = path.join(GC_ROOT, "mission-control");
    const output = execSync(
      `git diff --name-only ${lastSyncCommit}..HEAD -- "${sourceDir}"`,
      { cwd: os.homedir(), encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
    return output.trim().split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

// GET — return sync status, manifest, and latest report
export async function GET() {
  const manifest = loadManifest();
  if (!manifest) {
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }

  const currentHead = getCurrentHead();
  const pendingChanges = getChangedFileCount(manifest.lastSyncCommit);
  const report = loadReport();
  const reportDate = getReportStat();

  return NextResponse.json({
    manifest,
    currentHead,
    pendingChanges,
    isSynced: manifest.lastSyncCommit === currentHead,
    report,
    reportDate,
  });
}

// POST — run sync commands (report or apply)
export async function POST(req: Request) {
  const { action } = await req.json();

  if (!["report", "apply", "apply-all"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const cmd =
    action === "apply-all"
      ? `node "${SYNC_SCRIPT}" apply --all`
      : `node "${SYNC_SCRIPT}" ${action}`;

  try {
    const output = execSync(cmd, {
      cwd: GC_ROOT,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const manifest = loadManifest();
    const report = loadReport();

    return NextResponse.json({ success: true, output, manifest, report });
  } catch (e: unknown) {
    const error = e as { message?: string; stdout?: string; stderr?: string };
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}

// PUT — update manifest (skipPaths, protectedFiles, routeRenames, etc.)
export async function PUT(req: Request) {
  const updates = await req.json();
  const manifest = loadManifest();

  if (!manifest) {
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }

  // Merge updates into manifest
  for (const [key, value] of Object.entries(updates)) {
    if (key === "version" || key === "lastSyncCommit") continue; // protected fields
    (manifest as Record<string, unknown>)[key] = value;
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  return NextResponse.json({ success: true, manifest });
}
