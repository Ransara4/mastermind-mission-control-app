import { readFile } from "fs/promises";
import { join } from "path";
import { spawnSync } from "child_process";
import os from "os";

const SEO_ROOT = join(os.homedir(), "seo");
const CLAUDE_BIN = "/opt/homebrew/bin/claude";

function CLAUDE_ENV(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  env.PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
  env.HOME = os.homedir();
  return env;
}

async function loadProfile(domain: string): Promise<string> {
  try {
    return await readFile(join(SEO_ROOT, domain, "profile.md"), "utf-8");
  } catch {
    return "";
  }
}

/**
 * Generate a meta description for a site using Claude Haiku.
 * Returns a 150–160 char string, or null if Claude is unavailable.
 */
export async function generateMetaDescription(
  domain: string,
  currentDesc: string,
  pageTitle: string
): Promise<string | null> {
  const profile = await loadProfile(domain);

  const prompt = `You are an SEO copywriter. Write a meta description for this website.

Website: ${domain}
Page title: ${pageTitle}
${currentDesc ? `Current description: "${currentDesc}"` : "No current description."}
${profile ? `\nBusiness profile:\n${profile}` : ""}

Rules:
- Exactly 150–160 characters (count carefully)
- Active voice, sounds human — not a press release
- No em dashes (—)
- No words: delve, unlock, elevate, harness, game-changing, seamlessly, comprehensive, leverage, cutting-edge
- Must end with a clear call-to-action
- Return ONLY the description text, nothing else`;

  try {
    const result = spawnSync(
      CLAUDE_BIN,
      ["-p", "--model", "claude-haiku-4-5-20251001"],
      {
        input: prompt,
        timeout: 60000,
        encoding: "utf-8",
        env: CLAUDE_ENV(),
      }
    );

    if (result.status !== 0 || !result.stdout) {
      return null;
    }

    let desc = result.stdout.trim().replace(/—/g, "-");
    if (desc.length < 50 || desc.length > 300) {
      return null;
    }

    // Trim to 160 chars at a word boundary if needed
    if (desc.length > 160) {
      desc = desc.slice(0, 160).replace(/\s+\S*$/, "");
    }

    return desc;
  } catch {
    return null;
  }
}
