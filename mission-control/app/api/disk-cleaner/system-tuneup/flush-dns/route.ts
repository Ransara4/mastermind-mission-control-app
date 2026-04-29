/**
 * API Route: Flush DNS Cache
 * POST /api/mac-cleaner/system-tuneup/flush-dns
 */

import { NextResponse } from "next/server";
import { execSync } from "child_process";

const CMD_TIMEOUT = 10000;

export async function POST() {
  const errors: string[] = [];

  try {
    execSync("dscacheutil -flushcache 2>&1", {
      encoding: "utf-8",
      timeout: CMD_TIMEOUT,
    });
  } catch (err) {
    errors.push(
      "dscacheutil: " + (err instanceof Error ? err.message : String(err))
    );
  }

  try {
    execSync("killall -HUP mDNSResponder 2>&1", {
      encoding: "utf-8",
      timeout: CMD_TIMEOUT,
    });
  } catch (err) {
    errors.push(
      "mDNSResponder: " + (err instanceof Error ? err.message : String(err))
    );
  }

  if (errors.length === 2) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to flush DNS cache",
        details: errors,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "DNS cache flushed",
    warnings: errors.length > 0 ? errors : undefined,
  });
}
