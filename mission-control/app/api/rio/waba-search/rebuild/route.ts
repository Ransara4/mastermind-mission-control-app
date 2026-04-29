import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const RAG_DIR = path.join(WS, "projects/rio/waba-setup/rag");

export async function POST() {
  try {
    const output = execSync(`cd "${RAG_DIR}" && python3 build_index.py`, {
      timeout: 120000,
      encoding: "utf-8",
    });
    const chunkMatch = output.match(/(\d+)\s+chunks/);
    const chunks = chunkMatch ? parseInt(chunkMatch[1]) : null;
    return NextResponse.json({ ok: true, chunks, output: output.slice(-500) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
