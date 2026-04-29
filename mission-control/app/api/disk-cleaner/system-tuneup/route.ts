/**
 * API Route: System Tune-Up — GET system health snapshot
 * GET /api/mac-cleaner/system-tuneup
 */

import { NextResponse } from "next/server";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

const HOME = os.homedir();
const PAGE_SIZE = 4096;
const CMD_TIMEOUT = 10000;

interface MemoryInfo {
  totalGb: number;
  freeGb: number;
  usedGb: number;
  pressureLevel: "normal" | "warn" | "critical" | "unknown";
}

interface DnsCacheInfo {
  canFlush: boolean;
}

interface PeriodicScriptsInfo {
  lastDaily: string | null;
  lastWeekly: string | null;
}

interface BackupEntry {
  path: string;
  sizeMb: number;
  date: string | null;
  deviceName: string;
}

interface IOSBackupsInfo {
  count: number;
  totalSizeMb: number;
  backups: BackupEntry[];
}

interface SystemHealthSnapshot {
  success: true;
  memory: MemoryInfo;
  dnsCache: DnsCacheInfo;
  periodicScripts: PeriodicScriptsInfo;
  iosBackups: IOSBackupsInfo;
  scannedAt: string;
}

function getMemoryInfo(): MemoryInfo {
  const result: MemoryInfo = {
    totalGb: 0,
    freeGb: 0,
    usedGb: 0,
    pressureLevel: "unknown",
  };

  try {
    const totalOutput = execSync("sysctl -n hw.memsize", {
      encoding: "utf-8",
      timeout: CMD_TIMEOUT,
    });
    const totalBytes = parseInt(totalOutput.trim(), 10) || 0;
    result.totalGb = Math.round((totalBytes / (1024 ** 3)) * 100) / 100;
  } catch {
    return result;
  }

  try {
    const vmOutput = execSync("vm_stat", { encoding: "utf-8", timeout: CMD_TIMEOUT });
    const lines = vmOutput.split("\n");
    const pages: Record<string, number> = {};

    for (const line of lines) {
      const match = line.match(/^(.+?):\s+([\d.]+)/);
      if (match) {
        const key = match[1].trim().toLowerCase();
        const value = parseInt(match[2], 10);
        if (!isNaN(value)) {
          pages[key] = value;
        }
      }
    }

    const freePages = (pages["pages free"] || 0) + (pages["pages speculative"] || 0);
    const inactivePages = pages["pages inactive"] || 0;
    const totalBytes = result.totalGb * 1024 ** 3;
    const freeBytes = (freePages + inactivePages) * PAGE_SIZE;

    result.freeGb = Math.round((freeBytes / (1024 ** 3)) * 100) / 100;
    result.usedGb = Math.round((result.totalGb - result.freeGb) * 100) / 100;

    if (totalBytes > 0) {
      const ratio = freeBytes / totalBytes;
      if (ratio > 0.2) {
        result.pressureLevel = "normal";
      } else if (ratio > 0.08) {
        result.pressureLevel = "warn";
      } else {
        result.pressureLevel = "critical";
      }
    }
  } catch {
    // vm_stat unavailable
  }

  return result;
}

function getDnsCacheInfo(): DnsCacheInfo {
  try {
    execSync("which dscacheutil", { encoding: "utf-8", timeout: CMD_TIMEOUT });
    return { canFlush: true };
  } catch {
    return { canFlush: false };
  }
}

function getPeriodicScriptsInfo(): PeriodicScriptsInfo {
  const result: PeriodicScriptsInfo = {
    lastDaily: null,
    lastWeekly: null,
  };

  const logFiles: Record<string, keyof PeriodicScriptsInfo> = {
    "/var/log/daily.out": "lastDaily",
    "/var/log/weekly.out": "lastWeekly",
  };

  for (const [logPath, key] of Object.entries(logFiles)) {
    try {
      const stat = require("fs").statSync(logPath);
      if (key === "lastDaily") {
        result.lastDaily = stat.mtime.toISOString();
      } else if (key === "lastWeekly") {
        result.lastWeekly = stat.mtime.toISOString();
      }
    } catch {
      // Log file not accessible
    }
  }

  return result;
}

function getIOSBackupsInfo(): IOSBackupsInfo {
  const backupRoot = path.join(HOME, "Library", "Application Support", "MobileSync", "Backup");
  const result: IOSBackupsInfo = { count: 0, totalSizeMb: 0, backups: [] };

  let entries: string[];
  try {
    entries = require("fs").readdirSync(backupRoot);
  } catch {
    return result;
  }

  for (const name of entries) {
    const backupPath = path.join(backupRoot, name);
    let stat;
    try {
      stat = require("fs").statSync(backupPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) {
      continue;
    }

    const backup: BackupEntry = {
      path: backupPath,
      sizeMb: 0,
      date: null,
      deviceName: "Unknown Device",
    };

    try {
      const duOutput = execSync(`du -sk "${backupPath}" 2>/dev/null`, {
        encoding: "utf-8",
        timeout: CMD_TIMEOUT,
      });
      const kb = parseInt(duOutput.split("\t")[0], 10);
      if (!isNaN(kb)) {
        backup.sizeMb = Math.round((kb / 1024) * 100) / 100;
      }
    } catch {
      // Size unknown
    }

    const plistPath = path.join(backupPath, "Info.plist");
    try {
      const plistXml = execSync(`plutil -convert xml1 -o - "${plistPath}" 2>/dev/null`, {
        encoding: "utf-8",
        timeout: CMD_TIMEOUT,
      });

      const nameMatch = plistXml.match(/<key>Device Name<\/key>\s*<string>([^<]+)<\/string>/);
      if (nameMatch) {
        backup.deviceName = nameMatch[1];
      }

      const dateMatch = plistXml.match(/<key>Last Backup Date<\/key>\s*<date>([^<]+)<\/date>/);
      if (dateMatch) {
        backup.date = dateMatch[1];
      }
    } catch {
      backup.date = stat.mtime.toISOString();
    }

    result.backups.push(backup);
    result.totalSizeMb += backup.sizeMb;
  }

  result.count = result.backups.length;
  result.totalSizeMb = Math.round(result.totalSizeMb * 100) / 100;

  return result;
}

export async function GET() {
  try {
    const snapshot: SystemHealthSnapshot = {
      success: true,
      memory: getMemoryInfo(),
      dnsCache: getDnsCacheInfo(),
      periodicScripts: getPeriodicScriptsInfo(),
      iosBackups: getIOSBackupsInfo(),
      scannedAt: new Date().toISOString(),
    };

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[/api/mac-cleaner/system-tuneup] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate system health snapshot",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
