import { NextRequest, NextResponse } from "next/server";
import { getAllWebsites, getWebsite, getWebsitesDb, migrateFromSitesJson } from "@/lib/websites-db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain");

    if (domain) {
      const site = getWebsite(domain);
      return NextResponse.json({ website: site });
    }

    let sites = getAllWebsites();

    // Auto-migrate from sites.json if table is empty
    if (sites.length === 0) {
      migrateFromSitesJson();
      sites = getAllWebsites();
    }

    return NextResponse.json({ websites: sites });
  } catch (err) {
    console.error("websites GET error:", err);
    return NextResponse.json({ websites: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.domain || !body.name) {
      return NextResponse.json({ error: "domain and name are required" }, { status: 400 });
    }

    const db = getWebsitesDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    db.prepare(`INSERT INTO websites
      (domain, name, status, hosting, base_url, registrar, entity, notes,
       hosting_credentials, search_console, bing_webmaster, analytics, cdn, dns, tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      body.domain,
      body.name,
      body.status || "active",
      body.hosting || "",
      body.base_url || `https://www.${body.domain}`,
      body.registrar || "",
      body.entity || "",
      body.notes || "",
      body.hosting_credentials ? JSON.stringify(body.hosting_credentials) : "{}",
      body.search_console ? JSON.stringify(body.search_console) : "{}",
      body.bing_webmaster ? JSON.stringify(body.bing_webmaster) : "{}",
      body.analytics ? JSON.stringify(body.analytics) : "{}",
      body.cdn ? JSON.stringify(body.cdn) : "{}",
      body.dns ? JSON.stringify(body.dns) : "{}",
      body.tokens ? JSON.stringify(body.tokens) : "{}"
    );

    db.close();
    return NextResponse.json({ ok: true, domain: body.domain });
  } catch (err) {
    console.error("websites POST error:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const db = getWebsitesDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    const { domain, ...fields } = body;

    // Stringify any JSON fields passed as objects
    const jsonFields = ["hosting_credentials", "search_console", "bing_webmaster", "analytics", "cdn", "dns", "tokens"];
    for (const f of jsonFields) {
      if (fields[f] && typeof fields[f] === "object") {
        fields[f] = JSON.stringify(fields[f]);
      }
    }

    fields.updated_at = new Date().toISOString().replace("T", " ").slice(0, 19);

    const keys = Object.keys(fields);
    if (keys.length === 0) {
      db.close();
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const setClauses = keys.map(k => `${k} = ?`).join(", ");
    const values = keys.map(k => fields[k] ?? null);

    db.prepare(`UPDATE websites SET ${setClauses} WHERE domain = ?`).run(...values, domain);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("websites PUT error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { domain } = await req.json();
    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const db = getWebsitesDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    db.prepare("DELETE FROM websites WHERE domain = ?").run(domain);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("websites DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
