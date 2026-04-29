import { readFile } from "fs/promises";
import { join } from "path";
import { spawnSync } from "child_process";

import os from "os";

export const CLAUDE_BIN = "/opt/homebrew/bin/claude";
const HOME = os.homedir();

// Build env for claude subprocess — explicitly unset ANTHROPIC_API_KEY so
// claude uses its stored OAuth credentials rather than a potentially-expired key
export const CLAUDE_ENV = () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY; // let claude use ~/.claude stored credentials
  env.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`;
  env.HOME = HOME;
  return env;
};

const SEO_ROOT = join(HOME, "seo");

async function loadProfile(domain: string): Promise<string> {
  try {
    return await readFile(join(SEO_ROOT, domain, "profile.md"), "utf-8");
  } catch {
    return "";
  }
}

export async function generateMetaDescription(
  domain: string,
  currentDesc: string,
  pageTitle: string
): Promise<string | null> {
  const profile = await loadProfile(domain);

  const profileContext = profile
    ? `\n\nSite profile:\n${profile.slice(0, 800)}`
    : "";

  const currentContext = currentDesc
    ? `\n\nCurrent description (${currentDesc.length} chars): "${currentDesc}"`
    : "";

  const prompt = `You are an SEO expert writing a meta description for ${domain}.

Rules (follow all of them exactly):
- Length: 150-160 characters EXACTLY — not shorter, not longer
- Include the primary keyword naturally
- End with a clear call-to-action
- Write in active voice
- No em dashes (—) anywhere
- No AI slop: no "delve", "unlock", "elevate", "harness", "game-changing", "seamlessly", "comprehensive", "leverage", "cutting-edge"
- No exclamation marks
- No phrases like "In today's world" or "In the realm of"
- Sound human and direct, not like a press release
- No Oxford comma padding
- If shortening an existing description, preserve the core message${profileContext}${currentContext}
Page title: "${pageTitle || domain}"

Respond with ONLY the meta description text — no quotes, no explanation, nothing else.`;

  try {
    const proc = spawnSync(
      CLAUDE_BIN,
      ["-p", "--model", "claude-haiku-4-5-20251001"],
      {
        input: prompt,
        encoding: "utf-8",
        timeout: 60000,
        env: CLAUDE_ENV(),
      }
    );

    if (proc.error || proc.status !== 0) return null;

    const result = (proc.stdout || "").trim();

    // Strip quotes if Claude wrapped in them
    const clean = result.replace(/^["']|["']$/g, "").replace(/—/g, "-").trim();

    if (clean.length >= 120 && clean.length <= 170) return clean;

    // If slightly over, trim at last word boundary under 160
    if (clean.length > 160) {
      const trimmed = clean.slice(0, 160).replace(/\s+\S*$/, "");
      if (trimmed.length >= 120) return trimmed;
    }

    return clean.length >= 80 ? clean : null;
  } catch {
    return null;
  }
}
