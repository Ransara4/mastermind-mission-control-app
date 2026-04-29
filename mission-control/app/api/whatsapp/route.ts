import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const CONFIG_PATH = join(process.cwd(), "lib", "whatsapp-config.json");
const WACLI_DB = join(process.env.HOME || "/Users/openclaw", ".wacli", "wacli.db");
const UNIFIED_DB = join(WS, "data/contacts.db");

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    return JSON.stringify({ error: err.stderr || err.message });
  }
}

function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {
      signature: "\n\n\u2014 Sent from Joe's Agent Uni \u{1F984}",
      signatureEnabled: true,
      templates: [],
      stats: { totalSent: 0, totalFiles: 0, byContact: {}, history: [] },
    };
  }
}

function saveConfig(config: Record<string, unknown>) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function recordSend(
  config: Record<string, unknown>,
  to: string,
  type: "text" | "file",
  contactName?: string
) {
  const stats = config.stats as {
    totalSent: number;
    totalFiles: number;
    byContact: Record<string, number>;
    history: Array<Record<string, unknown>>;
  };
  if (type === "text") stats.totalSent++;
  else stats.totalFiles++;
  const key = contactName || to;
  stats.byContact[key] = (stats.byContact[key] || 0) + 1;
  stats.history.unshift({
    to,
    contactName: contactName || to,
    type,
    timestamp: new Date().toISOString(),
  });
  // Keep last 200 entries
  if (stats.history.length > 200) stats.history.length = 200;
  saveConfig(config);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "chats";

  switch (action) {
    case "chats": {
      const raw = run("wacli chats --json");
      try {
        return NextResponse.json({ chats: JSON.parse(raw) });
      } catch {
        return NextResponse.json({ chats: [], raw });
      }
    }
    case "contacts": {
      const query = searchParams.get("q") || "";
      const escaped = query.replace(/'/g, "'\\''");
      const raw = run(`wacli contacts search '${escaped}' --json`);
      try {
        return NextResponse.json({ contacts: JSON.parse(raw) });
      } catch {
        return NextResponse.json({ contacts: [], raw });
      }
    }
    case "autocomplete": {
      const q = (searchParams.get("q") || "").trim();
      if (q.length < 2) {
        return NextResponse.json({ results: [] });
      }
      try {
        const db = new Database(WACLI_DB, { readonly: true });
        const pattern = `%${q}%`;
        // Search WACLI contacts by push_name, full_name, first_name
        // Deduplicate by phone — prefer @s.whatsapp.net JIDs over @lid
        const rows = db.prepare(`
          SELECT jid, phone, push_name, full_name, first_name
          FROM contacts
          WHERE (push_name LIKE ? OR full_name LIKE ? OR first_name LIKE ?)
            AND jid NOT LIKE '%:_%@lid'
          ORDER BY
            CASE WHEN jid LIKE '%@s.whatsapp.net' THEN 0 ELSE 1 END,
            CASE
              WHEN push_name LIKE ? OR full_name LIKE ? THEN 0
              ELSE 1
            END,
            COALESCE(NULLIF(full_name,''), NULLIF(push_name,''), first_name) ASC
          LIMIT 25
        `).all(pattern, pattern, pattern, `${q}%`, `${q}%`);
        db.close();

        // Also check unified DB for Google contacts with WA IDs
        let unifiedRows: Array<Record<string, unknown>> = [];
        try {
          const udb = new Database(UNIFIED_DB, { readonly: true });
          unifiedRows = udb.prepare(`
            SELECT id, name, phones, whatsapp_id
            FROM contacts
            WHERE name LIKE ? AND whatsapp_id IS NOT NULL AND whatsapp_id <> ''
            LIMIT 10
          `).all(pattern) as Array<Record<string, unknown>>;
          udb.close();
        } catch {
          // unified DB may not be available
        }

        // Merge and deduplicate
        const seen = new Set<string>();
        const results: Array<{
          jid: string;
          phone: string;
          name: string;
          source: string;
        }> = [];

        for (const r of rows as Array<Record<string, string>>) {
          // Prefer push_name/first_name over full_name when full_name looks like a phone number
          const fullNameIsPhone = /^[+\d\s().-]+$/.test(r.full_name || "");
          const name = fullNameIsPhone
            ? (r.push_name || r.first_name || r.full_name || "")
            : (r.full_name || r.push_name || r.first_name || "");
          const dedup = `${name}::${r.phone}`;
          if (!name || /^[+\d\s().-]+$/.test(name) || seen.has(dedup) || seen.has(r.phone)) continue;
          seen.add(dedup);
          seen.add(r.phone);
          results.push({
            jid: r.jid,
            phone: r.phone,
            name,
            source: "whatsapp",
          });
        }

        for (const r of unifiedRows) {
          const waId = r.whatsapp_id as string;
          if (seen.has(waId)) continue;
          seen.add(waId);
          let phone = "";
          try {
            const phones = JSON.parse((r.phones as string) || "[]");
            phone = phones[0] || "";
          } catch { /* */ }
          results.push({
            jid: waId.includes("@") ? waId : `${waId}@s.whatsapp.net`,
            phone: phone || waId,
            name: r.name as string,
            source: "google",
          });
        }

        return NextResponse.json({ results: results.slice(0, 15) });
      } catch (e: unknown) {
        const err = e as { message?: string };
        return NextResponse.json({ results: [], error: err.message });
      }
    }
    case "messages": {
      const jid = searchParams.get("jid") || "";
      const limit = searchParams.get("limit") || "20";
      const raw = run(
        `wacli messages --jid '${jid.replace(/'/g, "\\'")}' --limit ${parseInt(limit)} --json`
      );
      try {
        return NextResponse.json({ messages: JSON.parse(raw) });
      } catch {
        return NextResponse.json({ messages: [], raw });
      }
    }
    case "config": {
      const config = loadConfig();
      return NextResponse.json(config);
    }
    case "stats": {
      const config = loadConfig();
      return NextResponse.json(config.stats);
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  // Update config (signature, templates)
  if (action === "update-config") {
    const config = loadConfig();
    if (body.signature !== undefined) config.signature = body.signature;
    if (body.signatureEnabled !== undefined)
      config.signatureEnabled = body.signatureEnabled;
    if (body.templates !== undefined) config.templates = body.templates;
    saveConfig(config);
    return NextResponse.json({ success: true, config });
  }

  // Send text message
  if (action === "send-text" || !action) {
    const { to, message, contactName } = body;
    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing 'to' or 'message'" },
        { status: 400 }
      );
    }
    const config = loadConfig();
    const sig =
      config.signatureEnabled && body.noSignature !== true
        ? config.signature
        : "";
    const finalMessage = message + sig;
    const escaped = finalMessage.replace(/'/g, "'\\''");
    const toEscaped = to.replace(/'/g, "'\\''");
    const result = run(`wacli send text --to '${toEscaped}' --message '${escaped}'`);
    const success = !result.includes('"error"');
    if (success) recordSend(config, to, "text", contactName);
    return NextResponse.json({ success, result });
  }

  // Send file
  if (action === "send-file") {
    const { to, filePath, caption, contactName } = body;
    if (!to || !filePath) {
      return NextResponse.json(
        { error: "Missing 'to' or 'filePath'" },
        { status: 400 }
      );
    }
    const config = loadConfig();
    const sig =
      config.signatureEnabled && body.noSignature !== true
        ? config.signature
        : "";
    const finalCaption = caption ? caption + sig : sig.trim();
    const toEscaped = to.replace(/'/g, "'\\''");
    const fileEscaped = filePath.replace(/'/g, "'\\''");
    const captionFlag = finalCaption
      ? ` --caption '${finalCaption.replace(/'/g, "'\\''")}'`
      : "";
    const result = run(
      `wacli send file --to '${toEscaped}' --file '${fileEscaped}'${captionFlag}`
    );
    const success = !result.includes('"error"');
    if (success) recordSend(config, to, "file", contactName);
    return NextResponse.json({ success, result });
  }

  // Reset stats
  if (action === "reset-stats") {
    const config = loadConfig();
    config.stats = {
      totalSent: 0,
      totalFiles: 0,
      byContact: {},
      history: [],
    };
    saveConfig(config);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
