import { NextRequest, NextResponse } from "next/server";
import { getDb, getEnvVar } from "../_db";
import { execSync } from "child_process";

const INSTANTLY_BASE = "https://api.instantly.ai/api/v2";

function getApiKey(): string {
  return getEnvVar("INSTANTLY_API_KEY");
}

async function instantlyFetch(path: string, options: RequestInit = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("INSTANTLY_API_KEY not configured");

  const url = `${INSTANTLY_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "campaigns") {
      const data = await instantlyFetch("/campaigns?limit=100&skip=0");
      const campaigns = (data.items || data || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      }));
      return NextResponse.json({ campaigns });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("instantly GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Instantly API error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, batch_id, campaign_id } = body;

    if (action !== "upload") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!batch_id || !campaign_id) {
      return NextResponse.json(
        { error: "batch_id and campaign_id are required" },
        { status: 400 }
      );
    }

    // Get leads from Google Sheet for this batch
    const db = getDb(false);
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const batch = db.prepare("SELECT * FROM batches WHERE id = ?").get(batch_id) as Record<string, unknown> | undefined;
    if (!batch) {
      db.close();
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Get Google Sheet URL from settings
    const sheetSetting = db.prepare("SELECT value FROM settings WHERE key = 'google_sheet_url'").get() as { value: string } | undefined;
    if (!sheetSetting?.value) {
      db.close();
      return NextResponse.json({ error: "Google Sheet URL not configured in settings" }, { status: 400 });
    }

    // Extract sheet ID from URL
    const sheetMatch = sheetSetting.value.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!sheetMatch) {
      db.close();
      return NextResponse.json({ error: "Invalid Google Sheet URL" }, { status: 400 });
    }
    const sheetId = sheetMatch[1];

    // Read leads from Google Sheet via gog
    let sheetData: string;
    try {
      sheetData = execSync(
        `gog sheets get ${sheetId} "All Prospects!A1:T236" --plain 2>/dev/null`,
        { encoding: "utf-8", timeout: 30000 }
      );
    } catch {
      // Fallback: try without tab name
      sheetData = execSync(
        `gog sheets get ${sheetId} "A1:T236" --plain 2>/dev/null`,
        { encoding: "utf-8", timeout: 30000 }
      );
    }

    const rows = sheetData.trim().split("\n");
    if (rows.length < 2) {
      db.close();
      return NextResponse.json({ error: "No data in Google Sheet" }, { status: 400 });
    }

    const headers = rows[0].split("\t").map((h) => h.trim().toLowerCase());
    const batchTag = (batch.icp_tag as string) || "";

    // Map column indices
    const colIdx = (name: string) => headers.indexOf(name);
    const emailIdx = colIdx("email");
    const firstNameIdx = colIdx("first name") !== -1 ? colIdx("first name") : colIdx("first_name");
    const lastNameIdx = colIdx("last name") !== -1 ? colIdx("last name") : colIdx("last_name");
    const nameIdx = colIdx("name");
    const websiteIdx = colIdx("website") !== -1 ? colIdx("website") : colIdx("domain");
    const hookIdx = colIdx("hook");
    const subjectIdx = colIdx("subject");
    const nicheIdx = colIdx("niche");
    const trackIdx = colIdx("track");
    const linkedinIdx = colIdx("linkedin");
    const icpTagIdx = colIdx("icp tags") !== -1 ? colIdx("icp tags") : colIdx("icp_tag");
    const sendIdx = colIdx("send?") !== -1 ? colIdx("send?") : colIdx("send");

    if (emailIdx === -1) {
      db.close();
      return NextResponse.json({ error: "No 'email' column found in Google Sheet" }, { status: 400 });
    }

    // Filter rows: match batch ICP tag and Send=Yes
    const leads: Record<string, unknown>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split("\t");
      const email = cols[emailIdx]?.trim();
      if (!email) continue;

      // Only include rows with Send=Yes
      const sendVal = sendIdx !== -1 ? cols[sendIdx]?.trim().toLowerCase() : "yes";
      if (sendVal !== "yes") continue;

      // Filter by ICP tag if batch has one
      if (batchTag && icpTagIdx !== -1) {
        const rowTag = cols[icpTagIdx]?.trim().toLowerCase() || "";
        if (rowTag && !rowTag.includes(batchTag.toLowerCase())) continue;
      }

      let firstName = firstNameIdx !== -1 ? cols[firstNameIdx]?.trim() : "";
      let lastName = lastNameIdx !== -1 ? cols[lastNameIdx]?.trim() : "";

      // Split name if first/last not available
      if (!firstName && !lastName && nameIdx !== -1) {
        const nameParts = (cols[nameIdx]?.trim() || "").split(/\s+/);
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ");
      }

      const hook = hookIdx !== -1 ? cols[hookIdx]?.trim() || "" : "";
      const subject = subjectIdx !== -1 ? cols[subjectIdx]?.trim() || "" : "";

      leads.push({
        email,
        first_name: firstName,
        last_name: lastName,
        website: websiteIdx !== -1 ? cols[websiteIdx]?.trim() || "" : "",
        personalization: hook,
        campaign_id: campaign_id,
        custom_variables: {
          subject,
          hook,
          niche: nicheIdx !== -1 ? cols[nicheIdx]?.trim() || "" : "",
          track: trackIdx !== -1 ? cols[trackIdx]?.trim() || "" : "",
          linkedin: linkedinIdx !== -1 ? cols[linkedinIdx]?.trim() || "" : "",
          icp_tag: icpTagIdx !== -1 ? cols[icpTagIdx]?.trim() || "" : batchTag,
        },
      });
    }

    if (leads.length === 0) {
      db.close();
      return NextResponse.json({ error: "No matching leads found for this batch" }, { status: 400 });
    }

    // Upload to Instantly in batches of 100
    let totalUploaded = 0;
    const batchSize = 100;
    for (let i = 0; i < leads.length; i += batchSize) {
      const chunk = leads.slice(i, i + batchSize);
      await instantlyFetch("/lead/add/bulk", {
        method: "POST",
        body: JSON.stringify({
          leads: chunk,
          skip_if_in_campaign: true,
        }),
      });
      totalUploaded += chunk.length;
    }

    // Update batch in DB
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE batches SET instantly_campaign_id = ?, instantly_uploaded_at = ?, instantly_upload_count = ? WHERE id = ?"
    ).run(campaign_id, now, totalUploaded, batch_id);

    db.close();

    return NextResponse.json({
      success: true,
      uploaded: totalUploaded,
      campaign_id,
      instantly_link: `https://app.instantly.ai/app/campaign/${campaign_id}/leads`,
    });
  } catch (err) {
    console.error("instantly POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
