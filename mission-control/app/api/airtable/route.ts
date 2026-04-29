import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

export const dynamic = "force-dynamic";

const AGENT_DIR = path.join(WS, "agents/airtable");
const ENV_PATH = path.join(WS, ".env");
const AIRTABLE_BASE = "https://api.airtable.com/v0";

function readJSON(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function loadEnvVar(name: string): string | null {
  try {
    const content = fs.readFileSync(ENV_PATH, "utf-8");
    const match = content.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

async function airtableFetch(
  apiPath: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<unknown> {
  const url = `${AIRTABLE_BASE}${apiPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Airtable ${res.status}: ${errText}`);
  }
  return res.json();
}

export async function GET(request: Request) {
  const apiKey = loadEnvVar("AIRTABLE_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "AIRTABLE_API_KEY not configured in .env" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const agentStatus = readJSON(path.join(AGENT_DIR, "status.json"));

  try {
    if (action === "bases") {
      const data = (await airtableFetch("/meta/bases", apiKey)) as { bases: unknown[] };
      return NextResponse.json({ bases: data.bases || [], agentStatus });
    }

    if (action === "tables") {
      const baseId = searchParams.get("baseId");
      if (!baseId)
        return NextResponse.json({ error: "baseId required" }, { status: 400 });
      const data = (await airtableFetch(`/meta/bases/${baseId}/tables`, apiKey)) as { tables: unknown[] };
      return NextResponse.json({ tables: data.tables || [] });
    }

    if (action === "records") {
      const baseId = searchParams.get("baseId");
      const tableId = searchParams.get("tableId");
      if (!baseId || !tableId)
        return NextResponse.json(
          { error: "baseId and tableId required" },
          { status: 400 }
        );
      const limit = Math.min(Number(searchParams.get("limit") || 100), 100);
      const filter = searchParams.get("filter");
      const params = new URLSearchParams({ pageSize: String(limit) });
      if (filter) params.set("filterByFormula", filter);
      const data = (await airtableFetch(`/${baseId}/${tableId}?${params.toString()}`, apiKey)) as { records: unknown[]; offset?: string };
      return NextResponse.json({ records: data.records || [], offset: data.offset });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const apiKey = loadEnvVar("AIRTABLE_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "AIRTABLE_API_KEY not configured in .env" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { action, baseId, tableId, fields } = body;

    if (action === "create") {
      if (!baseId || !tableId || !fields)
        return NextResponse.json(
          { error: "baseId, tableId, and fields required" },
          { status: 400 }
        );
      const data = await airtableFetch(`/${baseId}/${tableId}`, apiKey, {
        method: "POST",
        body: JSON.stringify({ fields }),
      });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const apiKey = loadEnvVar("AIRTABLE_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "AIRTABLE_API_KEY not configured in .env" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { action, baseId, tableId, recordId, fields } = body;

    if (action === "update") {
      if (!baseId || !tableId || !recordId || !fields)
        return NextResponse.json(
          { error: "baseId, tableId, recordId, and fields required" },
          { status: 400 }
        );
      const data = await airtableFetch(`/${baseId}/${tableId}/${recordId}`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
