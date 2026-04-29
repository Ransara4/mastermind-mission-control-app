import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-participants.db");

function ensureDir(p: string) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDb() {
  ensureDir(DB_PATH);
  const db = new Database(DB_PATH, { readonly: false });
  initTables(db);
  return db;
}

function initTables(db: InstanceType<typeof Database>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      airtable_id TEXT,
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      email TEXT,
      photo_url TEXT,
      cohort_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT,
      asked_by INTEGER,
      answered INTEGER DEFAULT 0,
      sent_to_participant INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const count = (db.prepare("SELECT COUNT(*) as c FROM questions").get() as { c: number }).c;
  if (count === 0) {
    const seed = db.prepare("INSERT INTO questions (question, answer, asked_by, answered, sent_to_participant) VALUES (?, ?, ?, ?, ?)");
    seed.run("How do I set up my first email automation?", "Start with a simple welcome sequence: trigger on signup, send 3 emails over 7 days. Tools like ConvertKit or Mailchimp make this easy.", 1, 1, 1);
    seed.run("Best tool for tracking client progress?", null, 2, 0, 0);
    seed.run("How often should I host group calls?", "Weekly or bi-weekly works best. Consistency matters more than frequency.", 4, 1, 0);
  }
}

interface QuestionRow {
  id: number;
  question: string;
  answer: string | null;
  asked_by: number | null;
  answered: number;
  sent_to_participant: number;
  participant_name: string | null;
  participant_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

const QUESTION_QUERY = `
  SELECT
    q.id, q.question, q.answer, q.asked_by,
    q.answered, q.sent_to_participant,
    p.full_name AS participant_name,
    p.photo_url AS participant_photo_url,
    q.created_at, q.updated_at
  FROM questions q
  LEFT JOIN participants p ON p.id = q.asked_by
`;

// GET /api/cohorts/questions
export async function GET() {
  try {
    const db = getDb();

    const rows = db.prepare(
      `${QUESTION_QUERY} ORDER BY q.created_at DESC`
    ).all() as QuestionRow[];

    db.close();
    return NextResponse.json({ questions: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/cohorts/questions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, answer, asked_by, answered, sent_to_participant } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO questions (question, answer, asked_by, answered, sent_to_participant)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      question.trim(),
      answer?.trim() || null,
      asked_by || null,
      answered ? 1 : 0,
      sent_to_participant ? 1 : 0
    );

    const row = db.prepare(
      `${QUESTION_QUERY} WHERE q.id = ?`
    ).get(result.lastInsertRowid) as QuestionRow;

    db.close();
    return NextResponse.json({ question: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/cohorts/questions
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, question, answer, asked_by, answered, sent_to_participant } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (question !== undefined && !question?.trim()) {
      return NextResponse.json({ error: "question cannot be empty" }, { status: 400 });
    }

    const db = getDb();

    const setClauses: string[] = [];
    const params: Record<string, unknown> = { id };

    if (question !== undefined) {
      setClauses.push("question = @question");
      params.question = question.trim();
    }
    if (answer !== undefined) {
      setClauses.push("answer = @answer");
      params.answer = answer?.trim() || null;
    }
    if (asked_by !== undefined) {
      setClauses.push("asked_by = @asked_by");
      params.asked_by = asked_by || null;
    }
    if (answered !== undefined) {
      setClauses.push("answered = @answered");
      params.answered = answered ? 1 : 0;
    }
    if (sent_to_participant !== undefined) {
      setClauses.push("sent_to_participant = @sent_to_participant");
      params.sent_to_participant = sent_to_participant ? 1 : 0;
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "no valid fields" }, { status: 400 });
    }

    db.prepare(
      `UPDATE questions SET ${setClauses.join(", ")}, updated_at = datetime('now') WHERE id = @id`
    ).run(params);

    const row = db.prepare(
      `${QUESTION_QUERY} WHERE q.id = ?`
    ).get(id) as QuestionRow;

    db.close();
    return NextResponse.json({ question: row });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/cohorts/questions?id=X
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = getDb();
    db.prepare("DELETE FROM questions WHERE id = ?").run(id);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
