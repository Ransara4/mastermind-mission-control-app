import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import os from "os";

const HOME = os.homedir();
const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

export const dynamic = "force-dynamic";

const JOBS_FILE = path.join(WS, "data/video-jobs.json");
const OUTPUT_DIR = path.join(WS, "data/video-output");
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const WHISPER = "/opt/homebrew/bin/whisper";

interface Job {
  id: string;
  inputFile: string;
  outputFile: string;
  platform: string;
  trimStart: string | null;
  trimEnd: string | null;
  captionsEnabled: boolean;
  status: "queued" | "processing" | "done" | "failed";
  error?: string;
  createdAt: string;
  completedAt?: string;
}

function readJobs(): Job[] {
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeJobs(jobs: Job[]) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

function updateJob(id: string, updates: Partial<Job>) {
  const jobs = readJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx !== -1) {
    jobs[idx] = { ...jobs[idx], ...updates };
    writeJobs(jobs);
  }
}

const PRESETS: Record<string, { w: number; h: number }> = {
  "instagram-reel": { w: 1080, h: 1920 },
  youtube: { w: 1920, h: 1080 },
  tiktok: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

function buildScaleFilter(w: number, h: number): string {
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
}

function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

async function processJob(job: Job) {
  try {
    const preset = PRESETS[job.platform];
    const w = preset?.w || 1080;
    const h = preset?.h || 1080;

    let srtPath: string | null = null;

    // Caption workflow
    if (job.captionsEnabled) {
      const wavPath = `/tmp/audio_${job.id}.wav`;
      // Extract audio
      await runCommand(
        `${FFMPEG} -y -i ${JSON.stringify(job.inputFile)} -vn -acodec pcm_s16le -ar 16000 -ac 1 ${JSON.stringify(wavPath)}`
      );
      // Run whisper
      await runCommand(
        `${WHISPER} ${JSON.stringify(wavPath)} --model base --output_format srt --output_dir /tmp/`
      );
      srtPath = `/tmp/audio_${job.id}.srt`;
      if (!fs.existsSync(srtPath)) {
        throw new Error("Whisper did not produce SRT file");
      }
    }

    // Build ffmpeg command
    const args: string[] = [FFMPEG, "-y"];

    // Trim flags before -i for fast seek
    if (job.trimStart) args.push("-ss", job.trimStart);
    if (job.trimEnd) args.push("-to", job.trimEnd);

    args.push("-i", JSON.stringify(job.inputFile));

    // Build -vf chain
    let vfParts = [buildScaleFilter(w, h)];
    if (srtPath) {
      // Escape special chars in path for subtitles filter
      const escaped = srtPath.replace(/([:\\'])/g, "\\$1");
      vfParts.push(`subtitles='${escaped}'`);
    }
    args.push("-vf", JSON.stringify(vfParts.join(",")));

    args.push("-c:a", "aac", "-b:a", "128k");
    args.push(JSON.stringify(job.outputFile));

    const cmd = args.join(" ");
    await runCommand(cmd);

    updateJob(job.id, { status: "done", completedAt: new Date().toISOString() });

    // Cleanup temp files
    try {
      if (fs.existsSync(`/tmp/audio_${job.id}.wav`)) fs.unlinkSync(`/tmp/audio_${job.id}.wav`);
      if (srtPath && fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
    } catch {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    updateJob(job.id, { status: "failed", error: message, completedAt: new Date().toISOString() });
  }
}

export async function GET(request: NextRequest) {
  try {
    const jobs = readJobs();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    const status = searchParams.get("status");

    if (id) {
      const job = jobs.find((j) => j.id === id);
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      return NextResponse.json(job);
    }

    if (status) {
      return NextResponse.json(jobs.filter((j) => j.status === status));
    }

    return NextResponse.json(jobs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputFile, platform, trimStart, trimEnd, captionsEnabled, customWidth, customHeight } = body;

    if (!inputFile || !platform) {
      return NextResponse.json({ error: "inputFile and platform are required" }, { status: 400 });
    }

    if (!fs.existsSync(inputFile)) {
      return NextResponse.json({ error: "Input file does not exist" }, { status: 400 });
    }

    // Ensure output dir exists
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const id = `vp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(inputFile);
    const base = path.basename(inputFile, ext);
    const outputFile = path.join(OUTPUT_DIR, `${base}_${platform}_${Date.now()}.mp4`);

    // Handle custom preset
    if (platform === "custom" && customWidth && customHeight) {
      PRESETS["custom"] = { w: customWidth, h: customHeight };
    }

    const job: Job = {
      id,
      inputFile,
      outputFile,
      platform,
      trimStart: trimStart || null,
      trimEnd: trimEnd || null,
      captionsEnabled: !!captionsEnabled,
      status: "processing",
      createdAt: new Date().toISOString(),
    };

    const jobs = readJobs();
    jobs.push(job);
    writeJobs(jobs);

    // Process async — don't block the response
    processJob(job);

    return NextResponse.json(job, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    const jobs = readJobs();
    const filtered = jobs.filter((j) => j.id !== id);
    if (filtered.length === jobs.length) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    writeJobs(filtered);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
