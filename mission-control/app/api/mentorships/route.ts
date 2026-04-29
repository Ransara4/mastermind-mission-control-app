import { NextRequest, NextResponse } from "next/server";
import {
  readDB,
  writeDB,
  slugify,
  nowISO,
  computeClientStats,
  Client,
} from "@/lib/mentorships-db";

// GET /api/mentorships - Return all clients with computed stats
export async function GET() {
  try {
    const db = await readDB();
    const enriched = db.clients.map((c) => {
      const stats = computeClientStats(c, db.sessions, db.payments);
      const clientSessions = db.sessions
        .filter((s) => s.client_id === c.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        ...stats,
        last_session_date: clientSessions[0]?.date || null,
      };
    });
    return NextResponse.json({ clients: enriched });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/mentorships - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const db = await readDB();
    const id = slugify(body.name);

    if (db.clients.find((c) => c.id === id)) {
      return NextResponse.json(
        { error: `Client with id "${id}" already exists` },
        { status: 409 }
      );
    }

    const now = nowISO();
    const newClient: Client = {
      id,
      name: body.name,
      email: body.email || "",
      phone: body.phone || "",
      photo_url: body.photo_url || null,
      linkedin_url: body.linkedin_url || "",
      website: body.website || "",
      linkedin_data: body.linkedin_data || null,
      bio: body.bio || "",
      focus_areas: body.focus_areas || [],
      zoom_meeting_id: body.zoom_meeting_id || "",
      stripe_customer_id: body.stripe_customer_id || null,
      stripe_payment_ids: [],
      hourly_rate: body.hourly_rate || db.settings.default_hourly_rate,
      hours_purchased: 0,
      hours_used: 0,
      hours_remaining: 0,
      total_paid: 0,
      status: "active",
      start_date: body.start_date || new Date().toISOString().split("T")[0],
      notes: body.notes || "",
      tags: body.tags || [],
      created_at: now,
      updated_at: now,
    };

    db.clients.push(newClient);
    await writeDB(db);

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
