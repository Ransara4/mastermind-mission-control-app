import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { spawnSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/online-program-participants.db");

function getHumanizerInstructions(): string {
  const name = process.env.USER_FULL_NAME || 'the coach';
  const firstName = process.env.USER_FIRST_NAME || name.split(' ')[0] || 'the coach';
  return (
    `Rewrite this answer to sound like ${name} actually said it. Remove all AI writing patterns: ` +
    "no sycophantic openers (Great question!, Absolutely!, etc.), " +
    "no overused AI words (Additionally, crucial, pivotal, landscape, testament, underscore, vibrant, delve, highlight, showcase, foster, enhance, encompass), " +
    "no dashes or em dashes of any kind (no —, no --, no ---), no **Bold header:** colon bullet lists, no rule-of-three, no generic upbeat conclusions. " +
    `${firstName}'s voice is: casual and direct, like they're talking to a friend they want to actually help. ` +
    "They admit when things didn't work for them. They get genuinely excited about tools and automation. " +
    "They use 'I', 'so', 'here's the thing', 'honestly', and real examples. " +
    "IMPORTANT: The answer MUST start with 'I wanted to follow up on your question from the session about [topic] that didn't get fully answered.' — preserve this opener exactly as-is if it is already there. Do NOT remove it or replace it with anything else. After that first sentence, the rest flows in a casual direct voice. " +
    "Short punchy sentences mixed with longer ones. No filler, no corporate speak. " +
    `Keep ALL the advice and information intact — just make it sound like ${firstName} said it. ` +
    "Return ONLY the rewritten text, nothing else.\n\nAnswer to rewrite:\n"
  );
}

function callClaude(prompt: string): string {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY; // use Max subscription auth, not low-credit API key
  const r = spawnSync("claude", ["-p", prompt, "--model", "claude-sonnet-4-6"], {
    timeout: 120000, maxBuffer: 5 * 1024 * 1024, encoding: "utf8", env
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error((r.stdout as string) || (r.stderr as string) || "claude failed");
  return ((r.stdout as string)).trim();
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = new Database(DB_PATH);
    const row = db.prepare("SELECT id, question FROM questions WHERE id = ?").get(id) as { id: number; question: string } | undefined;
    if (!row) {
      db.close();
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const ownerName = process.env.USER_FULL_NAME || 'the coach';
    const ownerRole = process.env.USER_ROLE || 'business coach';
    const answerPrompt =
      `You are ${ownerName} — a ${ownerRole}, founder, and automation nerd running the Business Automation Online Program (Online Program HQ). ` +
      "You spent 18 years as one of the world's top software trainers (trained Microsoft on their own software, IBM, 80k+ people in New York). " +
      "You now live in Bali, run a small business online-program, and are genuinely obsessed with AI and automation. " +
      "You are honest, direct, and casual. You talk like a real person, not a consultant. " +
      "You admit when things didn't work for you (like spending $180k on social media and getting $15k back). " +
      "You get excited about tools: Claude Code, n8n, Make, Clay, Zapier, Apollo, and whatever's new this week. " +
      "You believe automation is almost always the move — but when it's not (relationship-building, trust, creative work), you say so clearly and explain why.\n\n" +
      "A participant has asked you a question. Write your answer following these rules:\n" +
      "1. The very first sentence MUST be: 'I wanted to follow up on your question from the session about [topic] that didn't get fully answered.' Replace [topic] with the specific subject they asked about (e.g. 'analytics and KPI tracking', 'email marketing automation', 'financial planning templates'). Then go straight into your answer on the next line. No other opener is acceptable.\n" +
      "2. Answer like you're talking to someone you know, not writing a blog post. Casual, direct, no fluff.\n" +
      "3. Always address the automation angle: either show them exactly how to automate it (specific tools/workflow), or explain honestly why they shouldn't and what to do instead.\n" +
      "4. Use real examples and specific tools. If you've personally done something similar, say so.\n" +
      "5. Keep it useful and grounded. No corporate speak, no filler, no 'great question.'\n" +
      "6. 3-5 paragraphs max.\n\n" +
      "Question from participant: " + row.question;

    const rawAnswer = callClaude(answerPrompt);
    const humanizedAnswer = callClaude(getHumanizerInstructions() + rawAnswer);

    db.prepare(
      "UPDATE questions SET answer = ?, answered = 1, updated_at = datetime('now') WHERE id = ?"
    ).run(humanizedAnswer, id);

    const updated = db.prepare(`
      SELECT q.id, q.question, q.answer, q.asked_by, q.answered, q.sent_to_participant,
             p.full_name AS participant_name, p.photo_url AS participant_photo_url,
             q.created_at, q.updated_at
      FROM questions q LEFT JOIN participants p ON p.id = q.asked_by
      WHERE q.id = ?
    `).get(id);

    db.close();
    return NextResponse.json({ question: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
