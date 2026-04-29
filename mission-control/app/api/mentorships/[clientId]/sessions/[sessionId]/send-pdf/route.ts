import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { readDB, writeDB, nowISO } from "@/lib/mentorships-db";

interface RouteContext {
  params: Promise<{ clientId: string; sessionId: string }>;
}

// POST /api/mentorships/[clientId]/sessions/[sessionId]/send-pdf
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { clientId, sessionId } = await context.params;
    const db = await readDB();

    const client = db.clients.find((c) => c.id === clientId);
    if (!client) {
      return NextResponse.json(
        { error: `Client "${clientId}" not found` },
        { status: 404 }
      );
    }

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

    if (!session.pdf_path) {
      return NextResponse.json(
        { error: "No PDF generated for this session yet" },
        { status: 400 }
      );
    }

    const firstName = client.name.split(" ")[0];
    const dateStr = new Date(session.date + "T00:00:00").toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric" }
    );

    // Build recording link
    const sessionAny = session as unknown as Record<string, string | null>;
    const recordingUrl = sessionAny.zoom_recording_url_with_pwd || sessionAny.zoom_recording_url || null;
    const recordingLine = recordingUrl
      ? `\n\nRecording: ${recordingUrl}`
      : "";

    // Results tracking
    let wa_sent = false;
    let email_sent = false;
    let wa_error: string | undefined;
    let email_error: string | undefined;

    // 1. Try WhatsApp
    const jid = client.whatsapp_jid;
    if (jid) {
      try {
        const caption = `Hi ${firstName}! Here is your session wrap-up from our call on ${dateStr}. Key takeaways and your action items are all in here. Let me know if you have any questions!${recordingLine} \u2014 Sent from Joe's Agent Uni \ud83e\udd84`;
        const pdfFilename = `Session ${session.session_number} Wrap-up - ${client.name}.pdf`;
        execSync(
          `wacli send file --to "${jid}" --file "${session.pdf_path}" --filename "${pdfFilename}" --caption "${caption.replace(/"/g, '\\"')}"`,
          { timeout: 60000, stdio: "pipe" }
        );
        wa_sent = true;
      } catch (cmdErr) {
        wa_error = cmdErr instanceof Error ? cmdErr.message : String(cmdErr);
      }
    } else {
      wa_error = "No WhatsApp JID configured";
    }

    // 2. Try email via gog CLI
    const clientEmail = client.email;
    if (clientEmail) {
      try {
        const subject = `Session ${session.session_number} Follow-Up \u2014 ${client.name}`;
        const body = `Hi ${firstName},\n\nYour session wrap-up from ${dateStr} is attached. It includes your action items, key takeaways, and the recording link.\n\nLet me know if you have any questions!\n\nJoe`;
        execSync(
          `gog send --account newyork1@gmail.com --to "${clientEmail}" --subject "${subject.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}" --attach "${session.pdf_path}" --force --no-input`,
          { timeout: 60000, stdio: "pipe" }
        );
        email_sent = true;
      } catch (cmdErr) {
        email_error = cmdErr instanceof Error ? cmdErr.message : String(cmdErr);
      }
    } else {
      email_error = "No email address configured";
    }

    // Overall success if at least one channel worked
    const success = wa_sent || email_sent;

    if (success) {
      // Update session in DB
      db.sessions[sessionIdx].whatsapp_sent = wa_sent || db.sessions[sessionIdx].whatsapp_sent;
      db.sessions[sessionIdx].pdf_sent = true;
      db.sessions[sessionIdx].pipeline_status = {
        ...db.sessions[sessionIdx].pipeline_status,
        step_8_pdf_approved: true,
        step_9_pdf_sent: true,
      };
      db.sessions[sessionIdx].updated_at = nowISO();
      await writeDB(db);
    }

    return NextResponse.json({
      success,
      wa_sent,
      email_sent,
      ...(wa_error ? { wa_error } : {}),
      ...(email_error ? { email_error } : {}),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
