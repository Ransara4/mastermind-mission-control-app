import { NextResponse } from "next/server";

const PAPERCLIP_URL = process.env.PAPERCLIP_URL || "http://127.0.0.1:3200";

export async function GET() {
  try {
    // Check health
    const healthRes = await fetch(`${PAPERCLIP_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!healthRes.ok) {
      return NextResponse.json({
        status: "down",
        url: PAPERCLIP_URL,
        error: `Health check returned ${healthRes.status}`,
      });
    }

    const health = await healthRes.json();

    // Try to get companies list
    let companies: unknown[] = [];
    try {
      const companiesRes = await fetch(`${PAPERCLIP_URL}/api/companies`, {
        signal: AbortSignal.timeout(5000),
      });
      if (companiesRes.ok) {
        const data = await companiesRes.json();
        companies = Array.isArray(data) ? data : data?.companies || [];
      }
    } catch {
      // Companies endpoint may not exist yet
    }

    return NextResponse.json({
      status: "running",
      url: PAPERCLIP_URL,
      health,
      companies,
      uiUrl: PAPERCLIP_URL,
    });
  } catch (err) {
    return NextResponse.json({
      status: "down",
      url: PAPERCLIP_URL,
      error: err instanceof Error ? err.message : "Connection failed",
    });
  }
}
