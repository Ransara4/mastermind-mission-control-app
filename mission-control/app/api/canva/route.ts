import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const TOKEN_FILE = path.join(HOME, ".canva/tokens.json");
const ENV_PATH = path.join(WS, ".env");
const CANVA_API = "https://api.canva.com/rest/v1";

function loadEnvVar(name: string): string | null {
  try {
    const content = fs.readFileSync(ENV_PATH, "utf-8");
    const match = content.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

function getTokens(): { access_token: string; refresh_token?: string } | null {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
  } catch {
    return null;
  }
}

async function canvaFetch(endpoint: string, token: string, options?: RequestInit) {
  const res = await fetch(`${CANVA_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET(_request: NextRequest) {
  try {
    const hasClientId = !!loadEnvVar("CANVA_CLIENT_ID");
    const hasClientSecret = !!loadEnvVar("CANVA_CLIENT_SECRET");
    const tokens = getTokens();

    const auth = {
      hasClientId,
      hasClientSecret,
      hasTokens: !!tokens,
      connected: hasClientId && hasClientSecret && !!tokens,
    };

    if (!auth.connected || !tokens) {
      return NextResponse.json({
        auth,
        user: null,
        designs: [],
        templates: [],
        error: null,
      });
    }

    const token = tokens.access_token;

    // Fetch data in parallel
    const [userResult, designsResult, templatesResult] = await Promise.allSettled([
      canvaFetch("/users/me", token),
      canvaFetch("/designs", token),
      canvaFetch("/brand-templates", token),
    ]);

    const user = userResult.status === "fulfilled" ? userResult.value : null;
    const designsRaw = designsResult.status === "fulfilled" ? designsResult.value : null;
    const templatesRaw = templatesResult.status === "fulfilled" ? templatesResult.value : null;

    const designs = designsRaw?.items || [];
    const templates = templatesRaw?.items || [];

    // Collect any errors
    const errors: string[] = [];
    if (userResult.status === "rejected") errors.push(`User: ${userResult.reason}`);
    if (designsResult.status === "rejected") errors.push(`Designs: ${designsResult.reason}`);
    if (templatesResult.status === "rejected") errors.push(`Templates: ${templatesResult.reason}`);

    return NextResponse.json({
      auth,
      user,
      designs,
      templates,
      stats: {
        totalDesigns: designs.length,
        totalTemplates: templates.length,
      },
      error: errors.length > 0 ? errors.join("; ") : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), auth: { connected: false }, designs: [], templates: [], user: null },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokens = getTokens();
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action, designId, format } = body;

    if (action === "export") {
      const result = await canvaFetch("/exports", tokens.access_token, {
        method: "POST",
        body: JSON.stringify({
          design_id: designId,
          format: { type: format || "png" },
        }),
      });
      return NextResponse.json(result);
    }

    if (action === "export-status") {
      const result = await canvaFetch(`/exports/${body.jobId}`, tokens.access_token);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
