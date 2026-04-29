import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, ICP_BASE, validateIcpId } from "../_db";

const JSON_FIELDS = ["target_profile", "niche_categories", "qualification_rules", "track_definitions"];

function parseIcpJsonFields(icp: Record<string, unknown>): Record<string, unknown> {
  const parsed = { ...icp };
  for (const field of JSON_FIELDS) {
    if (typeof parsed[field] === "string") {
      try {
        parsed[field] = JSON.parse(parsed[field] as string);
      } catch {
        parsed[field] = field === "niche_categories" ? [] : {};
      }
    } else if (parsed[field] == null) {
      parsed[field] = field === "niche_categories" ? [] : {};
    }
  }
  return parsed;
}

function syncIcpsFromFilesystem(db: ReturnType<typeof getDb>) {
  if (!db) return;
  try {
    if (!fs.existsSync(ICP_BASE)) return;
    const icpDirs = fs.readdirSync(ICP_BASE).filter((d) => {
      const fullPath = path.join(ICP_BASE, d);
      return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, "icp.json"));
    });

    const existing = (db.prepare("SELECT id FROM icps").all() as { id: string }[]).map((r) => r.id);
    const existingSet = new Set(existing);

    const insertIcp = db.prepare(`
      INSERT OR IGNORE INTO icps (id, name, description, icp_tag, target_profile, niche_categories, qualification_rules, track_definitions, hook_template_id, total_leads, total_qualified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const dir of icpDirs) {
      const icpId = dir;
      if (existingSet.has(icpId)) continue;
      const icpData = JSON.parse(fs.readFileSync(path.join(ICP_BASE, dir, "icp.json"), "utf-8"));
      insertIcp.run(
        icpData.icp_id || dir,
        icpData.icp_name || icpData.name || dir,
        icpData.description || "",
        icpData.icp_tag || dir,
        JSON.stringify(icpData.target_profile || {}),
        JSON.stringify(icpData.niche_categories_searched || icpData.search_niches || []),
        JSON.stringify(icpData.qualification_rules || {}),
        JSON.stringify(icpData.track_definitions || {}),
        icpData.hook_template || `hook_template_${dir.replace("icp_", "")}`,
        icpData.total_leads_generated || 0,
        icpData.total_qualified || 0,
        icpData.created || new Date().toISOString().split("T")[0]
      );
    }
  } catch (err) {
    console.error("syncIcpsFromFilesystem error:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Use writable DB for list (sync needs writes), readonly for single fetch
    const db = id ? getDb() : getDb(false);
    if (!db) {
      return NextResponse.json(id ? { icp: null } : { icps: [], tag_issues: [] });
    }

    if (id) {
      if (!validateIcpId(id)) {
        db.close();
        return NextResponse.json({ error: "Invalid ICP ID format" }, { status: 400 });
      }
      const icp = db
        .prepare("SELECT * FROM icps WHERE id = ?")
        .get(id) as Record<string, unknown> | undefined;
      db.close();

      if (!icp) {
        return NextResponse.json({ error: "ICP not found" }, { status: 404 });
      }

      // Read hook_template.json from filesystem
      let hookTemplate = null;
      const hookPath = path.join(ICP_BASE, id, "hook_template.json");
      try {
        if (fs.existsSync(hookPath)) {
          hookTemplate = JSON.parse(fs.readFileSync(hookPath, "utf-8"));
        }
      } catch {
        /* ignore read errors */
      }

      return NextResponse.json({ icp: { ...parseIcpJsonFields(icp), hookTemplate } });
    }

    // Auto-sync ICPs from filesystem
    syncIcpsFromFilesystem(db);

    const icpsRaw = db.prepare("SELECT * FROM icps ORDER BY created_at DESC").all() as Record<string, unknown>[];
    const icps = icpsRaw.map(parseIcpJsonFields);

    // Tag consistency check
    const tagIssues: { icp_id: string; issue: string }[] = [];
    // Check batches referencing unknown tags
    const batchTags = db.prepare("SELECT DISTINCT icp_tag FROM batches WHERE icp_tag IS NOT NULL").all() as { icp_tag: string }[];
    const icpIds = new Set(icps.map((i) => i.id as string));
    for (const row of batchTags) {
      if (!icpIds.has(row.icp_tag)) {
        tagIssues.push({ icp_id: row.icp_tag, issue: `Batch references unknown ICP tag "${row.icp_tag}"` });
      }
    }

    db.close();
    return NextResponse.json({ icps, tag_issues: tagIssues });
  } catch (err) {
    console.error("cold-outreach icps GET error:", err);
    return NextResponse.json(
      { error: "Failed to load ICPs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      description,
      icp_tag,
      target_profile,
      niche_categories,
      qualification_rules,
      track_definitions,
      hook_template,
    } = body;

    if (!id || !name || !icp_tag) {
      return NextResponse.json(
        { error: "id, name, and icp_tag are required" },
        { status: 400 }
      );
    }

    if (!validateIcpId(id)) {
      return NextResponse.json(
        { error: "Invalid ICP ID format. Use only alphanumeric, underscore, or hyphen." },
        { status: 400 }
      );
    }

    const db = getDb(false);
    if (!db) {
      return NextResponse.json(
        { error: "Failed to open database" },
        { status: 500 }
      );
    }

    // Insert into DB
    db.prepare(
      `INSERT INTO icps (id, name, description, icp_tag, target_profile, niche_categories, qualification_rules, track_definitions, hook_template_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      description || "",
      icp_tag,
      JSON.stringify(target_profile || {}),
      JSON.stringify(niche_categories || []),
      JSON.stringify(qualification_rules || {}),
      JSON.stringify(track_definitions || {}),
      `hook_template_${id.replace("icp_", "")}`
    );

    db.close();

    // Create ICP directory and write JSON files
    const icpDir = path.join(ICP_BASE, id);
    if (!fs.existsSync(icpDir)) {
      fs.mkdirSync(icpDir, { recursive: true });
    }

    const icpJson = {
      icp_id: id,
      icp_name: name,
      icp_tag,
      description: description || "",
      target_profile: target_profile || {},
      niche_categories_searched: niche_categories || [],
      qualification_rules: qualification_rules || {},
      track_definitions: track_definitions || {},
      hook_template: `hook_template_${id.replace("icp_", "")}`,
      total_leads_generated: 0,
      total_qualified: 0,
      created: new Date().toISOString().split("T")[0],
    };
    fs.writeFileSync(
      path.join(icpDir, "icp.json"),
      JSON.stringify(icpJson, null, 2)
    );

    if (hook_template) {
      fs.writeFileSync(
        path.join(icpDir, "hook_template.json"),
        JSON.stringify(hook_template, null, 2)
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("cold-outreach icps POST error:", err);
    return NextResponse.json(
      { error: "Failed to create ICP" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, hook_template, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    if (!validateIcpId(id)) {
      return NextResponse.json(
        { error: "Invalid ICP ID format" },
        { status: 400 }
      );
    }

    const db = getDb(false);
    if (!db) {
      return NextResponse.json(
        { error: "Failed to open database" },
        { status: 500 }
      );
    }

    // Build dynamic UPDATE query from provided fields
    const updateFields: string[] = [];
    const values: unknown[] = [];

    const columnMap: Record<string, string> = {
      name: "name",
      description: "description",
      icp_tag: "icp_tag",
      target_profile: "target_profile",
      niche_categories: "niche_categories",
      qualification_rules: "qualification_rules",
      track_definitions: "track_definitions",
      status: "status",
      total_leads: "total_leads",
      total_qualified: "total_qualified",
    };

    const jsonFields = new Set([
      "target_profile",
      "niche_categories",
      "qualification_rules",
      "track_definitions",
    ]);

    for (const [key, col] of Object.entries(columnMap)) {
      if (fields[key] !== undefined) {
        updateFields.push(`${col} = ?`);
        values.push(
          jsonFields.has(key) ? JSON.stringify(fields[key]) : fields[key]
        );
      }
    }

    if (updateFields.length > 0) {
      updateFields.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(
        `UPDATE icps SET ${updateFields.join(", ")} WHERE id = ?`
      ).run(...values);
    }

    db.close();

    // Update filesystem JSON files
    const icpDir = path.join(ICP_BASE, id);
    if (fs.existsSync(icpDir)) {
      // Update icp.json
      const icpJsonPath = path.join(icpDir, "icp.json");
      if (fs.existsSync(icpJsonPath)) {
        const existing = JSON.parse(fs.readFileSync(icpJsonPath, "utf-8"));
        const fsFieldMap: Record<string, string> = {
          name: "icp_name",
          description: "description",
          icp_tag: "icp_tag",
          target_profile: "target_profile",
          niche_categories: "niche_categories_searched",
          qualification_rules: "qualification_rules",
          track_definitions: "track_definitions",
          total_leads: "total_leads_generated",
          total_qualified: "total_qualified",
        };
        for (const [key, fsKey] of Object.entries(fsFieldMap)) {
          if (fields[key] !== undefined) {
            existing[fsKey] = fields[key];
          }
        }
        fs.writeFileSync(icpJsonPath, JSON.stringify(existing, null, 2));
      }

      // Update hook_template.json if provided — merge with existing to avoid wiping fields
      if (hook_template) {
        const hookPath = path.join(icpDir, "hook_template.json");
        let merged = hook_template;
        try {
          if (fs.existsSync(hookPath)) {
            const existing = JSON.parse(fs.readFileSync(hookPath, "utf-8"));
            merged = { ...existing, ...hook_template };
          }
        } catch {
          /* use hook_template as-is if read fails */
        }
        fs.writeFileSync(hookPath, JSON.stringify(merged, null, 2));
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("cold-outreach icps PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update ICP" },
      { status: 500 }
    );
  }
}
