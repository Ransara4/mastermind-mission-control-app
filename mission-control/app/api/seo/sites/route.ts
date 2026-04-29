import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import os from "os";
import { getWebsitesForSeo, getWebsitesDb } from "@/lib/websites-db";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const SITES_PATH = join(SEO_ROOT, "sites.json");

async function loadSites(): Promise<any[]> {
  const dbSites = getWebsitesForSeo();
  if (dbSites.length > 0) return dbSites;
  try {
    const raw = await readFile(SITES_PATH, "utf-8");
    return JSON.parse(raw).sites || [];
  } catch {
    return [];
  }
}

async function saveSites(sites: any[]) {
  await writeFile(SITES_PATH, JSON.stringify({ sites }, null, 2) + "\n");
}

async function validateWix(
  wixSiteId: string,
  wixApiKey: string,
  wixAccountId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!wixSiteId || !wixApiKey || !wixAccountId) {
    return { ok: true }; // skip validation if not provided
  }
  try {
    const res = await fetch(
      "https://www.wixapis.com/site-properties/v4/properties",
      {
        headers: {
          Authorization: wixApiKey,
          "wix-account-id": wixAccountId,
          "wix-site-id": wixSiteId,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      await res.text();
      return {
        ok: false,
        error: `Wix API returned ${res.status} — check your Site ID, API Key, and Account ID`,
      };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: `Wix connection failed: ${err.message}` };
  }
}

async function scaffoldSiteDir(domain: string) {
  const siteDir = join(SEO_ROOT, domain);
  for (const sub of ["audits", "content", "outreach", "gsc"]) {
    await mkdir(join(siteDir, sub), { recursive: true });
  }
  // Write a basic profile.md if it doesn't exist
  const profilePath = join(siteDir, "profile.md");
  try {
    await readFile(profilePath);
  } catch {
    await writeFile(
      profilePath,
      `# ${domain}\n\n- **Domain**: ${domain}\n- **Added**: ${new Date().toISOString().slice(0, 10)}\n`
    );
  }
  // Write empty keywords.md if missing
  const kwPath = join(siteDir, "keywords.md");
  try {
    await readFile(kwPath);
  } catch {
    await writeFile(
      kwPath,
      `# Keywords — ${domain}\n\n| Keyword | Rank | Target | Difficulty | Volume | Last Checked |\n|---------|------|--------|------------|--------|--------------|\n`
    );
  }
}

// POST /api/seo/sites — add a new site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      domain,
      name,
      hosting,
      gscPropertyUrl,
      wixSiteId,
      wixApiKey,
      wixAccountId,
      clientId,
      notes,
    } = body;

    if (!domain?.trim()) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const sites = await loadSites();

    // Duplicate check
    if (sites.find((s) => s.domain === domain.trim())) {
      return NextResponse.json(
        { error: `Site "${domain}" already exists` },
        { status: 409 }
      );
    }

    // Validate Wix credentials if provided
    if (wixSiteId && wixApiKey && wixAccountId) {
      const validation = await validateWix(wixSiteId, wixApiKey, wixAccountId);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 422 });
      }
    }

    const newSite = {
      domain: domain.trim(),
      name: name.trim(),
      status: "active",
      addedAt: new Date().toISOString().slice(0, 10),
      hosting: hosting || "",
      agent: hosting === "wix" ? "wix" : hosting === "wordpress" ? "wordpress" : "",
      notes: notes || "",
      gscPropertyUrl: gscPropertyUrl || `sc-domain:${domain.trim()}`,
      wixSiteId: wixSiteId || "",
      wixApiKey: wixApiKey || "",
      wixAccountId: wixAccountId || "",
      clientId: clientId || "",
    };

    sites.push(newSite);
    await saveSites(sites);

    // Also write to websites.db
    try {
      const db = getWebsitesDb(false);
      if (db) {
        db.exec(`CREATE TABLE IF NOT EXISTS websites (
          domain TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT DEFAULT 'active',
          hosting TEXT DEFAULT '', base_url TEXT DEFAULT '', registrar TEXT DEFAULT '',
          entity TEXT DEFAULT '', notes TEXT DEFAULT '', added_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')), hosting_credentials TEXT DEFAULT '{}',
          search_console TEXT DEFAULT '{}', bing_webmaster TEXT DEFAULT '{}',
          analytics TEXT DEFAULT '{}', cdn TEXT DEFAULT '{}', dns TEXT DEFAULT '{}', tokens TEXT DEFAULT '{}'
        )`);
        const creds: Record<string,string> = {};
        if (newSite.wixSiteId) creds.site_id = newSite.wixSiteId;
        if (newSite.wixApiKey) creds.api_key = newSite.wixApiKey;
        if (newSite.wixAccountId) creds.account_id = newSite.wixAccountId;
        const gsc: Record<string,string> = {};
        if (newSite.gscPropertyUrl) gsc.property_url = newSite.gscPropertyUrl;
        db.prepare(`INSERT OR REPLACE INTO websites (domain, name, status, hosting, base_url, entity, notes, hosting_credentials, search_console)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          newSite.domain, newSite.name, newSite.status, newSite.hosting,
          `https://www.${newSite.domain}`, newSite.clientId || '', newSite.notes || '',
          JSON.stringify(creds), JSON.stringify(gsc)
        );
        db.close();
      }
    } catch {}

    await scaffoldSiteDir(domain.trim());

    return NextResponse.json({ site: newSite }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/seo/sites error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// DELETE /api/seo/sites — remove a site (body: { domain })
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;
    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const sites = await loadSites();
    const filtered = sites.filter((s) => s.domain !== domain);
    if (filtered.length === sites.length) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    await saveSites(filtered);

    // Also delete from websites.db
    try {
      const db = getWebsitesDb(false);
      if (db) {
        db.prepare("DELETE FROM websites WHERE domain = ?").run(domain);
        db.close();
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// PATCH /api/seo/sites — update a site's credentials
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, ...updates } = body;
    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const sites = await loadSites();
    const idx = sites.findIndex((s) => s.domain === domain);
    if (idx === -1) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Re-validate Wix if credentials changed
    const merged = { ...sites[idx], ...updates };
    if (updates.wixSiteId || updates.wixApiKey || updates.wixAccountId) {
      const validation = await validateWix(
        merged.wixSiteId,
        merged.wixApiKey,
        merged.wixAccountId
      );
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 422 });
      }
    }

    sites[idx] = merged;
    await saveSites(sites);

    // Also update websites.db
    try {
      const db = getWebsitesDb(false);
      if (db) {
        const creds: Record<string,string> = {};
        if (merged.wixSiteId) creds.site_id = merged.wixSiteId;
        if (merged.wixApiKey) creds.api_key = merged.wixApiKey;
        if (merged.wixAccountId) creds.account_id = merged.wixAccountId;
        const gsc: Record<string,string> = {};
        if (merged.gscPropertyUrl) gsc.property_url = merged.gscPropertyUrl;
        db.prepare(`UPDATE websites SET name = ?, status = ?, hosting = ?, entity = ?, notes = ?,
          hosting_credentials = ?, search_console = ?, updated_at = datetime('now')
          WHERE domain = ?`).run(
          merged.name || '', merged.status || 'active', merged.hosting || '',
          merged.clientId || '', merged.notes || '',
          JSON.stringify(creds), JSON.stringify(gsc), domain
        );
        db.close();
      }
    } catch {}

    return NextResponse.json({ site: sites[idx] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
