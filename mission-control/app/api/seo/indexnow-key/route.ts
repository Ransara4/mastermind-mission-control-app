import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import os from "os";

const HOME = os.homedir();

const SEO_DIR = join(HOME, "seo");
const KEY_FILE = join(SEO_DIR, "indexnow-key.txt");

async function getIndexNowKey(): Promise<string> {
  if (process.env.INDEXNOW_KEY) {
    return process.env.INDEXNOW_KEY;
  }

  try {
    const key = (await readFile(KEY_FILE, "utf-8")).trim();
    if (key) return key;
  } catch {
    // Fall through to generate
  }

  const newKey = crypto.randomUUID().replace(/-/g, "");
  try {
    await writeFile(KEY_FILE, newKey, "utf-8");
  } catch {
    // Non-fatal
  }
  return newKey;
}

export async function GET() {
  const key = await getIndexNowKey();
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
