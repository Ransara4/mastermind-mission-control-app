import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { sanitizeQuery, validateStage, validateMode, validateAudience } from "@/lib/waba-sanitize";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const execFileAsync = promisify(execFile);

const RAG_DIR = path.join(WS, "projects/business1/waba-setup/rag");

const SEARCH_SCRIPT = path.join(RAG_DIR, "search.py");
const SEMANTIC_SCRIPT = path.join(RAG_DIR, "semantic_search.py");
const INDEX_FILE = path.join(RAG_DIR, "index.pkl");

const PYTHON_PATH = "/Library/Developer/CommandLineTools/usr/bin/python3";

const PYTHON_ENV = {
  ...process.env,
  PYTHONPATH: [
    `${process.env.HOME}/Library/Python/3.9/lib/python/site-packages`,
    process.env.PYTHONPATH,
  ].filter(Boolean).join(":"),
};

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get("q");
  const q = sanitizeQuery(rawQ);
  const topKRaw = req.nextUrl.searchParams.get("top_k") || "5";
  const stage = validateStage(req.nextUrl.searchParams.get("stage"));
  const audience = validateAudience(req.nextUrl.searchParams.get("audience"));
  const mode = validateMode(req.nextUrl.searchParams.get("mode"));

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  const topK = String(Math.max(1, Math.min(20, parseInt(topKRaw, 10) || 5)));

  const indexExists = fs.existsSync(INDEX_FILE);
  const useSemanticScript = indexExists && mode !== "keyword";
  const script = useSemanticScript ? SEMANTIC_SCRIPT : SEARCH_SCRIPT;

  const args = [script, q, "--json", "--top-k", topK];
  if (stage) args.push("--stage", stage);
  if (audience) args.push("--audience", audience);
  if (useSemanticScript) args.push("--mode", mode);
  else args.push("--no-history");

  try {
    const { stdout, stderr } = await execFileAsync(PYTHON_PATH, args, {
      timeout: 15000,
      env: PYTHON_ENV,
    });

    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr.trim() }, { status: 500 });
    }

    const parsed = JSON.parse(stdout);
    // search.py now returns {results: [...], detected_language?: string}
    // semantic_search.py still returns a plain array
    const results = Array.isArray(parsed) ? parsed : parsed.results ?? parsed;
    const detected_language = Array.isArray(parsed) ? undefined : parsed.detected_language;

    return NextResponse.json({
      results,
      query: q,
      mode: useSemanticScript ? mode : "keyword",
      index_available: indexExists,
      ...(detected_language ? { detected_language } : {}),
    });
  } catch (err: unknown) {
    console.error("[waba-search] exec error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
