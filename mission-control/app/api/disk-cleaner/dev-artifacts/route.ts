/**
 * API Route: Dev Artifacts Scanner
 * GET /api/mac-cleaner/dev-artifacts
 *
 * Performs an inline dry-run scan of common project directories for stale
 * developer artifact folders (node_modules, venvs, Rust targets, etc.).
 */

import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const HOME = os.homedir();
const WS = process.env.GET_SORTED_WORKSPACE || path.join(HOME, "golden-claw");

const SCAN_ROOTS = [
  path.join(HOME, "Documents"),
  path.join(HOME, "Desktop"),
  path.join(HOME, "code"),
  path.join(HOME, "projects"),
  path.join(HOME, "src"),
  path.join(HOME, "workspace"),
  path.join(HOME, "Developer"),
];

const NODE_MODULES = "node_modules";
const PYTHON_VENVS = [".venv", "venv", "env"];
const PYCACHE = "__pycache__";
const RUST_TARGET = "target";
const GRADLE_DIR = ".gradle";
const PYCACHE_MIN_BYTES = 10 * 1024 * 1024;

const CONFIG_FILE = path.join(WS, "agents/mac-cleaner/config/config.json");

// -- Types --

interface DevArtifact {
  path: string;
  size_mb: number;
  type: string;
  ageDays: number;
}

interface ScanResponse {
  success: true;
  artifacts: DevArtifact[];
  totalSizeMb: number;
  scannedAt: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

// -- Helpers --

function getDirSizeBytes(dirPath: string): number {
  try {
    const result = execSync(`du -sk "${dirPath}" 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    const kb = parseInt(result.split("\t")[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}

function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function safeReaddir(p: string): fs.Dirent[] {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isProtectedPath(p: string): boolean {
  return p.startsWith(WS) || p.includes(".attache");
}

function ageDays(mtimeMs: number): number {
  return Math.round((Date.now() - mtimeMs) / (24 * 60 * 60 * 1000));
}

function loadConfig(): { devArtifactsMaxAgeDays: number } {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);
    return { devArtifactsMaxAgeDays: config.devArtifactsMaxAgeDays || 30 };
  } catch {
    return { devArtifactsMaxAgeDays: 30 };
  }
}

function walkDirs(
  root: string,
  maxDepth: number,
  visitor: (fullPath: string, name: string, parentDir: string) => void
): void {
  if (maxDepth < 0) return;
  const entries = safeReaddir(root);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(root, entry.name);
    if (isProtectedPath(fullPath)) continue;
    visitor(fullPath, entry.name, root);
    if (maxDepth > 0) {
      walkDirs(fullPath, maxDepth - 1, visitor);
    }
  }
}

function scanArtifacts(maxAgeDays: number): DevArtifact[] {
  const artifacts: DevArtifact[] = [];

  for (const root of SCAN_ROOTS) {
    if (!safeStat(root)) continue;

    walkDirs(root, 3, (fullPath, name, parentDir) => {
      // node_modules
      if (name === NODE_MODULES) {
        const stat = safeStat(fullPath);
        if (!stat) return;
        const age = ageDays(stat.mtimeMs);
        if (age < maxAgeDays) return;
        const sizeBytes = getDirSizeBytes(fullPath);
        artifacts.push({
          path: fullPath,
          size_mb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
          type: "node_modules",
          ageDays: age,
        });
        return;
      }

      // Python venvs
      if (PYTHON_VENVS.includes(name)) {
        const hasCfg =
          safeStat(path.join(fullPath, "pyvenv.cfg")) ||
          safeStat(path.join(fullPath, "bin", "activate"));
        if (!hasCfg) return;
        const stat = safeStat(fullPath);
        if (!stat) return;
        const age = ageDays(stat.mtimeMs);
        if (age < maxAgeDays) return;
        const sizeBytes = getDirSizeBytes(fullPath);
        artifacts.push({
          path: fullPath,
          size_mb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
          type: "python_venv",
          ageDays: age,
        });
        return;
      }

      // Rust target/
      if (name === RUST_TARGET) {
        const cargoToml = path.join(parentDir, "Cargo.toml");
        if (!safeStat(cargoToml)) return;
        const stat = safeStat(fullPath);
        if (!stat) return;
        const age = ageDays(stat.mtimeMs);
        if (age < maxAgeDays) return;
        const sizeBytes = getDirSizeBytes(fullPath);
        artifacts.push({
          path: fullPath,
          size_mb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
          type: "rust_target",
          ageDays: age,
        });
        return;
      }

      // __pycache__
      if (name === PYCACHE) {
        const sizeBytes = getDirSizeBytes(fullPath);
        if (sizeBytes < PYCACHE_MIN_BYTES) return;
        const stat = safeStat(fullPath);
        if (!stat) return;
        const age = ageDays(stat.mtimeMs);
        if (age < maxAgeDays) return;
        artifacts.push({
          path: fullPath,
          size_mb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
          type: "pycache",
          ageDays: age,
        });
        return;
      }
    });
  }

  // ~/.gradle
  const gradlePath = path.join(HOME, GRADLE_DIR);
  const gradleStat = safeStat(gradlePath);
  if (gradleStat) {
    const age = ageDays(gradleStat.mtimeMs);
    if (age >= maxAgeDays) {
      const sizeBytes = getDirSizeBytes(gradlePath);
      if (sizeBytes > 0) {
        artifacts.push({
          path: gradlePath,
          size_mb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
          type: "gradle",
          ageDays: age,
        });
      }
    }
  }

  return artifacts;
}

// -- Route Handler --

export async function GET(): Promise<NextResponse<ScanResponse | ErrorResponse>> {
  try {
    const config = loadConfig();
    const artifacts = scanArtifacts(config.devArtifactsMaxAgeDays);
    const totalSizeMb =
      Math.round(artifacts.reduce((sum, a) => sum + a.size_mb, 0) * 100) / 100;

    return NextResponse.json({
      success: true as const,
      artifacts,
      totalSizeMb,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/mac-cleaner/dev-artifacts] Error:", error);
    return NextResponse.json(
      {
        success: false as const,
        error: "Failed to scan dev artifacts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
