import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execAsync = promisify(exec);

const STRIPE_AGENT = path.join(WS, "agents/stripe");

export async function POST(request: Request) {
  try {
    const { promoCode, paymentUrl } = await request.json();

    if (!promoCode) {
      return NextResponse.json(
        { error: "promoCode is required" },
        { status: 400 }
      );
    }

    const urlArg = paymentUrl ? ` "${paymentUrl}"` : "";
    const cmd = `cd "${STRIPE_AGENT}" && node src/index.js verify "${promoCode}"${urlArg}`;

    const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
    const output = stdout + stderr;

    const success = output.includes("[OK]");
    const failed = output.includes("[FAIL]");

    // Extract message
    const msgMatch = output.match(/\[(OK|FAIL|UNKNOWN)\]\s*(.+)/);
    const message = msgMatch ? msgMatch[2].trim() : output.trim();

    // Extract screenshot path
    const ssMatch = output.match(/Screenshot:\s*(.+)/);
    const screenshot = ssMatch ? ssMatch[1].trim() : null;

    return NextResponse.json({
      success: success ? true : failed ? false : null,
      message,
      screenshot,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
