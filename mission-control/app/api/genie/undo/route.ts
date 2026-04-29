export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { execSync } from "child_process";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const WORKTREE_PATH = (() => {
  const candidate = process.env.ALLSORTED_APP_PATH;
  if (candidate && fs.existsSync(candidate)) return candidate;
  return process.cwd();
})();
const DB_PATH = path.join(process.cwd(), "..", "data", "genie-history.db");
const TABLE_NAME = "genie_sessions";

function getDb(readonly = true) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new Database(DB_PATH, { readonly });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as {
      sessionId?: number;
      gitShaBefore?: string;
      rollback?: boolean;
    };

    let sha: string | null = null;

    if (body.sessionId) {
      // Look up the pre-run SHA from the DB — most reliable, ties undo to a specific session
      try {
        const db = getDb(true);
        const row = db.prepare(
          `SELECT git_sha_before, run_commit_sha, safe_undo_available, started_at FROM ${TABLE_NAME} WHERE id = ?`
        ).get(body.sessionId) as {
          git_sha_before: string | null;
          run_commit_sha: string | null;
          safe_undo_available: number | null;
          started_at: string | null;
        } | undefined;
        db.close();

        if (body.rollback && row) {
          const dbRollback = getDb(true);
          const rollbackRows = dbRollback.prepare(
            `SELECT id, started_at, run_commit_sha
             FROM ${TABLE_NAME}
             WHERE started_at >= ? AND id >= ?
             ORDER BY started_at DESC, id DESC`
          ).all(row.started_at ?? "", body.sessionId) as Array<{
            id: number;
            started_at: string;
            run_commit_sha: string | null;
          }>;
          dbRollback.close();

          if (rollbackRows.length > 0 && rollbackRows.every((entry) => !!entry.run_commit_sha)) {
            for (const entry of rollbackRows) {
              execSync(`git revert --no-edit ${entry.run_commit_sha}`, { cwd: WORKTREE_PATH, stdio: "pipe" });
            }

            const db2 = getDb(false);
            db2.prepare(`DELETE FROM ${TABLE_NAME} WHERE started_at >= ? AND id >= ?`).run(row.started_at ?? "", body.sessionId);
            db2.close();
            return NextResponse.json({ ok: true, rollback: true, mode: "revert" });
          }
        }

        if (row?.safe_undo_available && row.run_commit_sha) {
          execSync(`git revert --no-edit ${row.run_commit_sha}`, { cwd: WORKTREE_PATH, stdio: "pipe" });
          try {
            const db2 = getDb(false);
            db2.prepare(
              `UPDATE ${TABLE_NAME} SET safe_undo_available = 0 WHERE id = ?`
            ).run(body.sessionId);
            db2.close();
          } catch { /* non-fatal */ }
          return NextResponse.json({ ok: true, rollback: body.rollback ?? false, mode: "revert" });
        }

        sha = row?.git_sha_before ?? null;
      } catch { /* DB not available */ }
    }

    // Fallback: accept a SHA directly from the caller (e.g. from the current session before it was saved)
    if (!sha && body.gitShaBefore && /^[0-9a-f]{40}$/i.test(body.gitShaBefore)) {
      sha = body.gitShaBefore;
    }

    if (!sha) {
      return NextResponse.json(
        { error: "Undo is unavailable for this session. Safe per-session undo now requires a tracked Genie commit." },
        { status: 409 }
      );
    }

    // Legacy fallback for sessions created before safe per-session undo metadata existed.
    execSync(`git reset --hard ${sha}`, { cwd: WORKTREE_PATH, stdio: "pipe" });

    if (body.sessionId) {
      try {
        const db2 = getDb(false);
        db2.prepare(
          `UPDATE ${TABLE_NAME} SET safe_undo_available = 0 WHERE id = ?`
        ).run(body.sessionId);
        db2.close();
      } catch { /* non-fatal */ }
    }

    // If rollback mode, remove this session and all subsequent sessions from DB
    if (body.rollback && body.sessionId) {
      try {
        const db2 = getDb(false);
        const thisSession = db2.prepare(`SELECT started_at FROM ${TABLE_NAME} WHERE id = ?`).get(body.sessionId) as { started_at: string } | undefined;
        if (thisSession) {
          db2.prepare(`DELETE FROM ${TABLE_NAME} WHERE started_at >= ? AND id >= ?`).run(thisSession.started_at, body.sessionId);
        }
        db2.close();
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ ok: true, rollback: body.rollback ?? false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "git reset failed" },
      { status: 500 }
    );
  }
}
