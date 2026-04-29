import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { ICP_BASE, validateIcpId } from "../_db";

const execFileAsync = promisify(execFile);

// Simple in-memory rate limiter: max 10 requests per minute (raised for test mode)
const rateLimitWindow = 60_000;
const rateLimitMax = 10;
const requestTimestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - rateLimitWindow) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= rateLimitMax) {
    return false;
  }
  requestTimestamps.push(now);
  return true;
}

async function generateHook(hookTemplate: Record<string, unknown>, prospect: { name: string; domain: string; email?: string; research?: string }) {
  const promptTemplate = hookTemplate.prompt_template as string;
  if (!promptTemplate) throw new Error("No prompt_template in hook template");

  const filledPrompt = promptTemplate
    .replace(/\{name\}/g, prospect.name)
    .replace(/\{domain\}/g, prospect.domain)
    .replace(/\{email\}/g, prospect.email || "not provided")
    .replace(/\{research\}/g, prospect.research || "No additional research provided");

  const { stdout } = await execFileAsync(
    "claude",
    [
      "--print",
      "--model", "claude-sonnet-4-6",
      "--max-tokens", "1024",
      filledPrompt,
    ],
    { timeout: 60_000 }
  );

  const textContent = stdout.trim();

  try {
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent;
    return JSON.parse(jsonStr);
  } catch {
    return { raw_response: textContent };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { icp_id, batch } = body;

    if (!icp_id) {
      return NextResponse.json({ error: "icp_id is required" }, { status: 400 });
    }

    if (!validateIcpId(icp_id)) {
      return NextResponse.json({ error: "Invalid ICP ID format" }, { status: 400 });
    }

    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${rateLimitMax} requests per minute.` },
        { status: 429 }
      );
    }

    // Read hook template
    const hookPath = path.join(ICP_BASE, icp_id, "hook_template.json");
    if (!fs.existsSync(hookPath)) {
      return NextResponse.json(
        { error: `Hook template not found for ICP: ${icp_id}. Configure one in the Hook Writer section.` },
        { status: 404 }
      );
    }

    const hookTemplate = JSON.parse(fs.readFileSync(hookPath, "utf-8"));

    if (!hookTemplate.prompt_template) {
      return NextResponse.json(
        { error: "Hook template has no prompt_template field." },
        { status: 400 }
      );
    }

    // Batch mode: process array of prospects
    if (Array.isArray(batch)) {
      const prospects = batch.slice(0, 3); // Cap at 3
      const results = [];
      for (const p of prospects) {
        if (!p.name || !p.domain) continue;
        try {
          const hookResult = await generateHook(hookTemplate, p);
          results.push({ prospect: p, hookResult });
        } catch (err) {
          results.push({
            prospect: p,
            hookResult: { raw_response: `Error: ${err instanceof Error ? err.message : "Unknown error"}` },
          });
        }
      }
      return NextResponse.json({ success: true, results });
    }

    // Single mode (original behavior)
    const { prospect_name, prospect_domain, prospect_email, research_notes } = body;

    if (!prospect_name || !prospect_domain) {
      return NextResponse.json(
        { error: "prospect_name and prospect_domain are required" },
        { status: 400 }
      );
    }

    const hookResult = await generateHook(hookTemplate, {
      name: prospect_name,
      domain: prospect_domain,
      email: prospect_email,
      research: research_notes,
    });

    return NextResponse.json({ success: true, hookResult });
  } catch (err) {
    console.error("cold-outreach test-hook POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to test hook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
