import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const DATA_PATH = join(WS, "data/venues.json");
const ENV_PATH = join(WS, ".env");

function getApiKey(): string | null {
  try {
    if (!existsSync(ENV_PATH)) return null;
    const env = readFileSync(ENV_PATH, "utf8");
    const match = env.match(/^GOOGLE_PLACES_API_KEY=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function readVenues(): Venue[] {
  try {
    if (!existsSync(DATA_PATH)) return [];
    return JSON.parse(readFileSync(DATA_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeVenues(venues: Venue[]) {
  writeFileSync(DATA_PATH, JSON.stringify(venues, null, 2), "utf8");
}

interface Venue {
  id: string;
  name: string;
  address: string;
  placeId: string;
  rating: number;
  priceLevel: number;
  phone: string;
  website: string;
  photos: string[];
  openHours: string[];
  capacity: number | null;
  notes: string;
  status: "found" | "contacted" | "visited" | "booked" | "rejected";
  tags: string[];
  savedAt: string;
}

export async function GET(req: NextRequest) {
  try {
    const venues = readVenues();
    const status = req.nextUrl.searchParams.get("status");
    const filtered = status ? venues.filter((v) => v.status === status) : venues;
    return NextResponse.json({ venues: filtered });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "search") {
      const { query, location, type } = body;
      const apiKey = getApiKey();
      if (!apiKey) {
        return NextResponse.json(
          { error: "GOOGLE_PLACES_API_KEY not found in .env" },
          { status: 500 }
        );
      }

      const searchQuery = [type, query, location].filter(Boolean).join(" ");
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return NextResponse.json(
          { error: `Google Places API error: ${data.status} — ${data.error_message || ""}` },
          { status: 502 }
        );
      }

      const results = (data.results || []).map((p: Record<string, unknown>) => ({
        placeId: p.place_id || "",
        name: p.name || "",
        address: p.formatted_address || "",
        rating: p.rating || 0,
        priceLevel: p.price_level ?? -1,
        phone: "",
        website: "",
        photos: Array.isArray(p.photos)
          ? (p.photos as { photo_reference: string }[]).slice(0, 3).map(
              (ph) =>
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ph.photo_reference}&key=${apiKey}`
            )
          : [],
        openHours: (p.opening_hours as { weekday_text?: string[] })?.weekday_text || [],
      }));

      return NextResponse.json({ results });
    }

    if (action === "save") {
      const venues = readVenues();
      const venue: Venue = {
        id: randomUUID(),
        name: body.venue.name || "",
        address: body.venue.address || "",
        placeId: body.venue.placeId || "",
        rating: body.venue.rating || 0,
        priceLevel: body.venue.priceLevel ?? -1,
        phone: body.venue.phone || "",
        website: body.venue.website || "",
        photos: body.venue.photos || [],
        openHours: body.venue.openHours || [],
        capacity: body.venue.capacity || null,
        notes: body.venue.notes || "",
        status: "found",
        tags: body.venue.tags || [],
        savedAt: new Date().toISOString(),
      };
      venues.push(venue);
      writeVenues(venues);
      return NextResponse.json({ venue });
    }

    if (action === "update") {
      const venues = readVenues();
      const idx = venues.findIndex((v) => v.id === body.venue.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Venue not found" }, { status: 404 });
      }
      venues[idx] = { ...venues[idx], ...body.venue };
      writeVenues(venues);
      return NextResponse.json({ venue: venues[idx] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const venues = readVenues();
    const filtered = venues.filter((v) => v.id !== body.id);
    if (filtered.length === venues.length) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }
    writeVenues(filtered);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
