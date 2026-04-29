import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-participants.db");

function getDb() {
  return new Database(DB_PATH, { readonly: false });
}

interface UnansweredQuestion {
  id: number;
  question: string;
}

// POST /api/cohorts/questions/generate-answers
export async function POST() {
  try {
    const db = getDb();

    const unanswered = db.prepare(`
      SELECT id, question
      FROM questions
      WHERE answered = 0 AND (answer IS NULL OR answer = '')
      ORDER BY created_at ASC
    `).all() as UnansweredQuestion[];

    if (unanswered.length === 0) {
      db.close();
      return NextResponse.json({ processed: 0, results: [] });
    }

    const results: { id: number; question: string; answer: string }[] = [];

    for (const row of unanswered) {
      try {
        const prompt = `You are ${process.env.USER_FULL_NAME || 'the coach'}, a ${process.env.USER_ROLE || 'business coach'} running a mastermind program. Answer this participant question concisely and helpfully (2-4 paragraphs max): ${row.question}`;
        const escaped = prompt.replace(/"/g, '\\"');
        const output = execSync(
          `claude -p "${escaped}" --model claude-sonnet-4-6`,
          { timeout: 60000, encoding: "utf8" }
        );
        const answer = output.trim();

        db.prepare(`
          UPDATE questions
          SET answer = ?, answered = 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(answer, row.id);

        results.push({ id: row.id, question: row.question, answer });
      } catch {
        // Skip this question on failure, continue with the rest
      }
    }

    db.close();
    return NextResponse.json({ processed: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
