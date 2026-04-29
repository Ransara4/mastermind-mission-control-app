import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const TRIGGER_SCRIPT = path.join(WS, "agents/guard-dog/bin/mission-control-trigger.js");

export async function POST(request: NextRequest) {
  try {
    const { packageName, ecosystem } = await request.json();

    if (!packageName || typeof packageName !== "string") {
      return NextResponse.json(
        { success: false, result: null, error: "packageName is required" },
        { status: 400 }
      );
    }

    const eco = ecosystem || "npm";
    // Sanitize inputs to prevent command injection
    const safePkg = packageName.replace(/[^a-zA-Z0-9@/_.-]/g, "");
    const safeEco = eco.replace(/[^a-zA-Z]/g, "");

    const result = await new Promise<string>((resolve, reject) => {
      const child = exec(
        `node "${TRIGGER_SCRIPT}" "${safePkg}" "${safeEco}"`,
        { timeout: 30000, env: { ...process.env, HOME } },
        (error, stdout, stderr) => {
          if (error && !stdout) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        }
      );

      // Kill after 30s
      setTimeout(() => {
        child.kill("SIGTERM");
      }, 30000);
    });

    const parsed = JSON.parse(result);
    const pkg = parsed.packages?.[0] || null;

    return NextResponse.json({ success: true, result: pkg });
  } catch (err) {
    console.error("Guard Dog scan error:", err);
    return NextResponse.json(
      {
        success: false,
        result: null,
        error: err instanceof Error ? err.message : "Scan failed",
      },
      { status: 500 }
    );
  }
}
