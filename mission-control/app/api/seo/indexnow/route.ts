import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import os from "os";

const HOME = os.homedir();

const SEO_DIR = join(HOME, "seo");
const KEY_FILE = join(SEO_DIR, "indexnow-key.txt");

async function getIndexNowKey(): Promise<string> {
  // 1. Check environment variable
  if (process.env.INDEXNOW_KEY) {
    return process.env.INDEXNOW_KEY;
  }

  // 2. Check file
  try {
    const key = (await readFile(KEY_FILE, "utf-8")).trim();
    if (key) return key;
  } catch {
    // File doesn't exist — generate one
  }

  // 3. Generate new key and persist it
  const newKey = crypto.randomUUID().replace(/-/g, "");
  try {
    await writeFile(KEY_FILE, newKey, "utf-8");
  } catch {
    // Non-fatal — return the key even if we can't save it
  }
  return newKey;
}

export async function POST(request: NextRequest) {
  let body: { domain?: string; urls?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, urls } = body;

  if (!domain || typeof domain !== "string") {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "urls must be a non-empty array" }, { status: 400 });
  }

  const key = await getIndexNowKey();
  const keyFileUrl = `https://${domain}/${key}.txt`;

  let responseStatus = 0;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: domain,
        key,
        keyLocation: keyFileUrl,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(15000),
    });
    responseStatus = res.status;
  } catch {
    // Network failure — treat as setup-required
    responseStatus = 0;
  }

  const setupRequired = responseStatus === 422 || responseStatus === 0;

  return NextResponse.json({
    submitted: setupRequired ? 0 : urls.length,
    key,
    keyFileUrl,
    status: responseStatus,
    setupRequired,
    setupInstructions: setupRequired
      ? `Host the key file at ${keyFileUrl} with content: ${key}\nFor Wix: Dashboard → Marketing & SEO → SEO Tools → URL Redirects → add redirect from /${key}.txt → https://[mc-domain]/api/seo/indexnow-key`
      : "",
  });
}
