import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import {
  readDB,
  writeDB,
  nowISO,
  PDFS_DIR,
  MENTORSHIPS_BASE,
} from "@/lib/mentorships-db";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const execFileAsync = promisify(execFile);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface RouteContext {
  params: Promise<{ clientId: string; sessionId: string }>;
}

// GET /api/mentorships/[clientId]/sessions/[sessionId]/pdf - Serve PDF
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { clientId, sessionId } = await context.params;
    const db = await readDB();

    const session = db.sessions.find(
      (s) => s.id === sessionId && s.client_id === clientId
    );
    if (!session) {
      return new NextResponse("Session not found", { status: 404 });
    }

    if (!session.pdf_path) {
      return new NextResponse("No PDF generated for this session", {
        status: 404,
      });
    }

    const resolved = path.resolve(session.pdf_path);
    if (!resolved.startsWith(MENTORSHIPS_BASE)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    try {
      const buf = await fs.readFile(resolved);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${path.basename(resolved)}"`,
        },
      });
    } catch {
      return new NextResponse("PDF file not found on disk", { status: 404 });
    }
  } catch (err) {
    return new NextResponse(String(err), { status: 500 });
  }
}

// POST /api/mentorships/[clientId]/sessions/[sessionId]/pdf - Generate PDF
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { clientId, sessionId } = await context.params;
    const db = await readDB();

    const sessionIdx = db.sessions.findIndex(
      (s) => s.id === sessionId && s.client_id === clientId
    );
    if (sessionIdx === -1) {
      return NextResponse.json(
        { error: `Session "${sessionId}" not found` },
        { status: 404 }
      );
    }

    const session = db.sessions[sessionIdx];
    const client = db.clients.find((c) => c.id === clientId);
    if (!client) {
      return NextResponse.json(
        { error: `Client "${clientId}" not found` },
        { status: 404 }
      );
    }

    // Ensure PDFs directory exists
    await fs.mkdir(PDFS_DIR, { recursive: true });

    const pdfFilename = `${clientId}-session-${session.session_number}-${session.date}.pdf`;
    const pdfPath = path.join(PDFS_DIR, pdfFilename);

    // Build PDF data JSON following mentorship follow-up structure
    const sections: any[] = [];

    // 1. Session Recording
    const recordingBlocks: any[] = [];
    const hoursLabel = client.hours_purchased
      ? `Session ${session.session_number} of ${client.hours_purchased} hours purchased`
      : `Session ${session.session_number}`;
    const s = session as any;
    recordingBlocks.push({
      type: "paragraph",
      text: `Duration: ${s.duration_minutes || s.actual_duration_minutes || "?"} minutes | ${hoursLabel}`,
    });
    if (s.zoom_recording_url_with_pwd) {
      recordingBlocks.push({
        type: "link",
        title: "View Recording (password auto-filled)",
        url: s.zoom_recording_url_with_pwd,
      });
    }
    if (s.zoom_recording_password) {
      recordingBlocks.push({
        type: "paragraph",
        text: `Recording password: ${s.zoom_recording_password}`,
      });
    }
    sections.push({ heading: "Session Recording", blocks: recordingBlocks });

    // 2. Session Summary
    if (session.ai_summary) {
      sections.push({
        heading: "Session Summary",
        blocks: [
          {
            type: "paragraph",
            text: session.ai_summary.replace(/\u2014/g, " - ").replace(/\u2013/g, " - "),
          },
        ],
      });
    }

    // 3. Client Action Items (client_follow_ups or follow_ups)
    const clientActions = session.client_follow_ups?.length
      ? session.client_follow_ups
      : session.follow_ups || [];
    if (clientActions.length > 0) {
      sections.push({
        heading: `${client.name.split(" ")[0]}'s Action Items`,
        blocks: clientActions.map((item: string) => ({
          type: "checkbox",
          text: item.replace(/\u2014/g, " - ").replace(/\u2013/g, " - "),
        })),
      });
    }

    // 4. Joe's Action Items
    if (session.joe_follow_ups && session.joe_follow_ups.length > 0) {
      sections.push({
        heading: "Joe's Action Items",
        blocks: session.joe_follow_ups.map((item: string) => ({
          type: "checkbox",
          text: item.replace(/\u2014/g, " - ").replace(/\u2013/g, " - "),
        })),
      });
    }

    // 5. Key Discussion Points
    if (session.key_points && session.key_points.length > 0) {
      sections.push({
        heading: "Key Discussion Points",
        blocks: session.key_points.map((item: string) => ({
          type: "numbered",
          text: item.replace(/\u2014/g, " - ").replace(/\u2013/g, " - "),
        })),
      });
    }

    // 6. Full Session Transcript (split into ~400 char chunks)
    if (session.transcript_raw) {
      const raw = session.transcript_raw
        .replace(/\u2014/g, " - ")
        .replace(/\u2013/g, " - ")
        .replace(/\n/g, " ");
      const words = raw.split(/\s+/);
      const chunks: string[] = [];
      let current: string[] = [];
      let currentLen = 0;
      for (const word of words) {
        const wl = word.length + 1;
        if (currentLen + wl > 400 && current.length > 0) {
          chunks.push(current.join(" "));
          current = [word];
          currentLen = wl;
        } else {
          current.push(word);
          currentLen += wl;
        }
      }
      if (current.length > 0) chunks.push(current.join(" "));

      const transcriptBlocks: any[] = [
        {
          type: "paragraph",
          text: `${client.name} - Session ${session.session_number} | ${formatDate(session.date)}`,
        },
        { type: "paragraph", text: "Full transcript included below." },
        ...chunks.map((c) => ({ type: "paragraph", text: c })),
      ];
      sections.push({
        heading: "Full Session Transcript",
        blocks: transcriptBlocks,
      });
    }

    const dateFormatted = formatDate(session.date);
    const pdfData = {
      title: client.name,
      subtitle: `Mentorship  \u00b7  Follow-Up  \u00b7  Session ${session.session_number}  \u00b7  ${dateFormatted}`,
      output_path: pdfPath,
      cover: {
        tagline: "Session wrap-up, key takeaways, and next steps",
        date: dateFormatted,
      },
      sections,
      back_page: {
        text: "Questions between sessions? Reach out anytime.",
        cta_url: "https://mastermindshq.business",
      },
    };

    // Write temp JSON for the template
    const tmpJson = `/tmp/mentorship-session-${sessionId}.json`;
    await fs.writeFile(tmpJson, JSON.stringify(pdfData, null, 2), "utf-8");

    const templateScript = path.join(WS, "templates/pdf/branded_template.py");

    await execFileAsync("python3", [templateScript, "--json", tmpJson], {
      env: { ...process.env },
      timeout: 60_000,
    });

    // Verify PDF was created at output_path
    try {
      await fs.access(pdfPath);
    } catch {
      return NextResponse.json(
        { error: "PDF generation completed but output file not found" },
        { status: 500 }
      );
    }

    // Clean up temp JSON
    try {
      await fs.unlink(tmpJson);
    } catch {
      // Ignore cleanup errors
    }

    // Update session in DB
    db.sessions[sessionIdx].pdf_path = pdfPath;
    db.sessions[sessionIdx].updated_at = nowISO();
    await writeDB(db);

    return NextResponse.json({
      ok: true,
      pdf_path: pdfPath,
      session: db.sessions[sessionIdx],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
