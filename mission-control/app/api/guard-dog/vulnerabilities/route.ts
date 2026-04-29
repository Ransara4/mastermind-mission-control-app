import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "agents/guard-dog/data/vulnerabilities.db");

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    return null;
  }
  const db = new Database(DB_PATH, { readonly: false });
  db.pragma("journal_mode = WAL");
  return db;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ vulnerabilities: [], total: 0 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "200", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = "SELECT * FROM vulnerabilities WHERE 1=1";
    const params: Record<string, string | number> = {};

    if (status && status !== "all") {
      query += " AND status = @status";
      params.status = status;
    }

    if (severity && severity !== "all") {
      query += " AND severity = @severity";
      params.severity = severity;
    }

    if (search) {
      query += " AND (package LIKE @search OR id LIKE @search OR title LIKE @search OR summary LIKE @search)";
      params.search = `%${search}%`;
    }

    // Get total count
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
    const countResult = db.prepare(countQuery).get(params) as { total: number };

    // Get severity counts
    const severityCounts = db
      .prepare(
        "SELECT severity, COUNT(*) as count FROM vulnerabilities GROUP BY severity"
      )
      .all() as { severity: string; count: number }[];

    // Get status counts
    const statusCounts = db
      .prepare(
        "SELECT status, COUNT(*) as count FROM vulnerabilities GROUP BY status"
      )
      .all() as { status: string; count: number }[];

    // Order: critical first, then high, medium, low; within each, newest first
    query +=
      " ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, last_seen DESC";
    query += " LIMIT @limit OFFSET @offset";
    params.limit = limit;
    params.offset = offset;

    const rows = db.prepare(query).all(params) as Record<string, unknown>[];

    const vulnerabilities = rows.map((row) => ({
      id: row.id,
      packageName: row.package,
      ecosystem: row.ecosystem,
      cveId: typeof row.id === "string" && (row.id as string).startsWith("CVE-") ? row.id : null,
      severity: row.severity,
      title: row.title || `${row.id} - ${row.package}`,
      description: row.summary || "No description available",
      cvssScore: row.cvss_score || null,
      affectedVersions: row.affected_versions || "Unknown",
      fixedVersion: row.fixed_version || null,
      status: row.status,
      discoveredAt: row.first_seen,
      lastSeen: row.last_seen,
      publishedDate: row.published_date,
      source: row.source,
      url: row.url,
      remediationSteps: row.fixed_version
        ? [`Update ${row.package} to version ${row.fixed_version} or later`]
        : [],
      references: row.url ? [row.url as string] : [],
      remediationNotes: row.remediation_notes,
    }));

    db.close();

    return NextResponse.json({
      vulnerabilities,
      total: countResult.total,
      severityCounts: Object.fromEntries(
        severityCounts.map((s) => [s.severity, s.count])
      ),
      statusCounts: Object.fromEntries(
        statusCounts.map((s) => [s.status, s.count])
      ),
    });
  } catch (error) {
    db.close();
    console.error("Error reading vulnerabilities:", error);
    return NextResponse.json(
      { error: "Failed to read vulnerabilities" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Vulnerability database not found" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { id, status, remediationNotes } = body;

    if (!id || !status) {
      db.close();
      return NextResponse.json(
        { error: "Missing required fields: id, status" },
        { status: 400 }
      );
    }

    const validStatuses = ["open", "reviewed", "snoozed", "patched"];
    if (!validStatuses.includes(status)) {
      db.close();
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = db
      .prepare("SELECT id FROM vulnerabilities WHERE id = ?")
      .get(id);
    if (!existing) {
      db.close();
      return NextResponse.json(
        { error: `Vulnerability ${id} not found` },
        { status: 404 }
      );
    }

    let updateQuery = "UPDATE vulnerabilities SET status = @status";
    const params: Record<string, string> = { id, status };

    if (remediationNotes !== undefined) {
      updateQuery += ", remediation_notes = @remediationNotes";
      params.remediationNotes = remediationNotes;
    }

    updateQuery += " WHERE id = @id";

    db.prepare(updateQuery).run(params);
    db.close();

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    db.close();
    console.error("Error updating vulnerability:", error);
    return NextResponse.json(
      { error: "Failed to update vulnerability" },
      { status: 500 }
    );
  }
}
