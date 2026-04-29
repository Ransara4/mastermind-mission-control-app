import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SESSIONS_BASE = path.join(WS, "projects/mastermind/cohort-1/sessions");

async function findLatestSession(): Promise<number> {
  try {
    const entries = await fs.readdir(SESSIONS_BASE);
    const sessionNums = entries
      .filter((e) => e.startsWith("session-"))
      .map((e) => parseInt(e.replace("session-", ""), 10))
      .filter((n) => !isNaN(n));
    return sessionNums.length > 0 ? Math.max(...sessionNums) : 0;
  } catch {
    return 0;
  }
}

function sessionDir(num: number): string {
  return path.join(SESSIONS_BASE, `session-${num}`);
}

function sessionDataPath(num: number): string {
  return path.join(sessionDir(num), "session-data.json");
}

function transcriptPath(num: number): string {
  return path.join(sessionDir(num), "transcript-raw.md");
}

// GET /api/cohorts/wrap-up?session=N
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionParam = searchParams.get("session");
    const sessionNum = sessionParam
      ? parseInt(sessionParam, 10)
      : await findLatestSession();

    if (sessionNum === 0) {
      return NextResponse.json(
        { error: "No sessions found" },
        { status: 404 }
      );
    }

    const dataPath = sessionDataPath(sessionNum);
    const txPath = transcriptPath(sessionNum);

    let sessionData;
    try {
      const raw = await fs.readFile(dataPath, "utf-8");
      sessionData = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: `Session ${sessionNum} not found` },
        { status: 404 }
      );
    }

    let transcript = "";
    try {
      transcript = await fs.readFile(txPath, "utf-8");
    } catch {
      // transcript may not exist yet
    }

    // List all available sessions
    let availableSessions: number[] = [];
    try {
      const entries = await fs.readdir(SESSIONS_BASE);
      availableSessions = entries
        .filter((e) => e.startsWith("session-"))
        .map((e) => parseInt(e.replace("session-", ""), 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => b - a);
    } catch {
      // ignore
    }

    return NextResponse.json({
      session_number: sessionNum,
      data: sessionData,
      transcript,
      available_sessions: availableSessions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/cohorts/wrap-up — create a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const latestNum = await findLatestSession();
    const newNum = latestNum + 1;

    const dir = sessionDir(newNum);
    await fs.mkdir(dir, { recursive: true });

    const cohortNum: number = body.cohort_number || 1;
    const cohortLabel: string = body.cohort || `Cohort ${cohortNum}`;

    const sessionData = {
      session_number: newNum,
      cohort: cohortLabel,
      cohort_number: cohortNum,
      title: body.title || `${cohortLabel}, Session ${newNum}: Business Automation Masterminds`,
      date: body.date || null,
      descript_link: null,
      zoom_meeting_id: body.zoom_meeting_id || null,
      zoom_recording_url: null,
      youtube_id: null,
      youtube_url: null,
      transcript_file: null,
      transcript_summary: null,
      chat_highlights: null,
      pdf_path: null,
      wix_cms_id: null,
      whatsapp_sent: false,
      notion_card_created: false,
      tech_requirements: null,
      tech_requirements_output: null,
      tech_requirements_pdf_path: null,
      tech_requirements_wa_sent: false,
      member_requests: null,
      reel_clips: null,
      next_session_plan: null,
      pipeline_status: {
        step_1_download: false,
        step_2_youtube: false,
        step_2b_workshop_video: false,
        step_3_descript_manual: false,
        step_4_transcript_pasted: false,
        step_4b_reel_clips: false,
        step_4c_questions_saved: true,  // intentionally skipped
        step_5_chat_analyzed: false,
        step_6_transcript_summarized: false,
        step_7_mc_reviewed: false,
        step_8_wix_cms: true,           // not needed — Wix CMS retired
        step_9_cohort_record: true,     // legacy/orphaned — always true
        step_10_pdf_built: false,
        step_11_pdf_approved: false,
        step_12_member_requests: false,
        step_13_whatsapp: false,
        step_14_notion_card: false,
        step_15_tech_requirements: false,
        step_15b_tech_output_generated: false,
        step_15c_tech_pdf_built: true,  // intentionally skipped — web page used instead
        step_15d_tech_wa_sent: false,
        step_16_next_session_plan: false,
      },
    };

    await fs.writeFile(
      sessionDataPath(newNum),
      JSON.stringify(sessionData, null, 2),
      "utf-8"
    );

    return NextResponse.json({ session_number: newNum, data: sessionData });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/cohorts/wrap-up?session=N
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionParam = searchParams.get("session");
    const sessionNum = sessionParam
      ? parseInt(sessionParam, 10)
      : await findLatestSession();

    if (sessionNum === 0) {
      return NextResponse.json(
        { error: "No sessions found" },
        { status: 404 }
      );
    }

    const dataPath = sessionDataPath(sessionNum);

    let sessionData;
    try {
      const raw = await fs.readFile(dataPath, "utf-8");
      sessionData = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: `Session ${sessionNum} not found` },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Updatable fields
    const allowedFields = [
      "descript_link",
      "transcript_summary",
      "chat_highlights",
      "member_requests",
      "youtube_url",
      "youtube_id",
      "title",
      "tech_requirements",
      "tech_requirements_output",
      "tech_requirements_pdf_path",
      "tech_requirements_wa_sent",
      "next_session_plan",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        sessionData[field] = body[field];
      }
    }

    // Allow updating pipeline_status flags
    if (body.pipeline_status && typeof body.pipeline_status === "object") {
      sessionData.pipeline_status = {
        ...sessionData.pipeline_status,
        ...body.pipeline_status,
      };
    }

    // Allow updating transcript file
    if (typeof body.transcript === "string") {
      const txPath = transcriptPath(sessionNum);
      await fs.writeFile(txPath, body.transcript, "utf-8");
    }

    await fs.writeFile(dataPath, JSON.stringify(sessionData, null, 2), "utf-8");

    return NextResponse.json({ ok: true, data: sessionData });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
