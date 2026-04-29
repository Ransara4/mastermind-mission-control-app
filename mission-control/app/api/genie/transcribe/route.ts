export const runtime = "nodejs";

import { execFileSync } from "child_process";
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Self-resolving whisper binary — works on macOS (Homebrew) and Linux (pip/system)
const WHISPER_BIN = (() => {
  const candidates = [
    process.env.WHISPER_BIN,
    "/opt/homebrew/bin/whisper",               // macOS Homebrew
    "/usr/local/bin/whisper",                   // Linux pip install (global)
    "/usr/bin/whisper",                         // Linux system package
    `${process.env.HOME}/.local/bin/whisper`,   // Linux pip install (user)
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try { if (existsSync(c)) return c; } catch { /* ignore */ }
  }
  try { return execFileSync("which", ["whisper"]).toString().trim(); } catch { /* not found */ }
  return null;
})();

function transcribeLocally(buffer: Buffer, ext: string): string {
  const tmpBase = `genie-${Date.now()}`;
  const tmpAudio = join(tmpdir(), `${tmpBase}.${ext}`);
  const tmpTxt = join(tmpdir(), `${tmpBase}.txt`);

  writeFileSync(tmpAudio, buffer);
  try {
    execFileSync(WHISPER_BIN!, [
      tmpAudio,
      "--model", "base",
      "--output_format", "txt",
      "--output_dir", tmpdir(),
      "--language", "en",
    ], { timeout: 60_000, stdio: "pipe" });
    return readFileSync(tmpTxt, "utf-8").trim();
  } finally {
    try { unlinkSync(tmpAudio); } catch { /* ignore */ }
    try { unlinkSync(tmpTxt); } catch { /* ignore */ }
  }
}

async function transcribeWithGroq(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("No GROQ_API_KEY");

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "audio/webm" }), filename);
  form.append("model", "whisper-large-v3");
  form.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { text: string };
  return data.text?.trim() ?? "";
}

async function transcribeWithOpenAI(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OPENAI_API_KEY");

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "audio/webm" }), filename);
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
  const data = await res.json() as { text: string };
  return data.text?.trim() ?? "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      return Response.json({ error: "No audio file" }, { status: 400 });
    }

    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const mime = audioFile.type || "audio/webm";
    const ext = mime.includes("mp4") || mime.includes("m4a") ? "mp4"
              : mime.includes("ogg") ? "ogg"
              : "webm";
    const filename = `recording.${ext}`;

    let transcript: string;
    let method: string;

    if (WHISPER_BIN) {
      // 1. Local whisper — Mac dev or VPS with whisper installed (free, offline)
      transcript = transcribeLocally(buffer, ext);
      method = "local";
    } else if (process.env.GROQ_API_KEY) {
      // 2. Groq Whisper Large v3 — free tier, ~300ms, best quality (VPS default)
      transcript = await transcribeWithGroq(buffer, filename);
      method = "groq";
    } else if (process.env.OPENAI_API_KEY) {
      // 3. OpenAI whisper-1 — paid fallback
      transcript = await transcribeWithOpenAI(buffer, filename);
      method = "openai";
    } else {
      return Response.json({ error: "No transcription method available. Set GROQ_API_KEY or install whisper locally." }, { status: 503 });
    }

    return Response.json({ transcript, method });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
