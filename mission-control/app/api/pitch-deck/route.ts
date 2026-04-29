import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const DATA_PATH = join(WS, "data/pitch-decks.json");

async function loadDecks(): Promise<any[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveDecks(decks: any[]) {
  await writeFile(DATA_PATH, JSON.stringify(decks, null, 2) + "\n");
}

export async function GET(request: NextRequest) {
  try {
    const decks = await loadDecks();
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const deck = decks.find((d) => d.id === id);
      if (!deck) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }
      return NextResponse.json({ deck });
    }
    return NextResponse.json({ decks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load decks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const decks = await loadDecks();
    const now = new Date().toISOString();

    if (body.id) {
      const idx = decks.findIndex((d) => d.id === body.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }
      decks[idx] = { ...decks[idx], ...body, updatedAt: now };
      await saveDecks(decks);
      return NextResponse.json({ deck: decks[idx] });
    }

    const deck = {
      id: "deck_" + randomBytes(6).toString("hex"),
      title: body.title?.trim() || body.businessName?.trim() || "Untitled Deck",
      businessName: body.businessName?.trim() || "",
      tagline: body.tagline?.trim() || "",
      problem: body.problem?.trim() || "",
      solution: body.solution?.trim() || "",
      marketSize: body.marketSize?.trim() || "",
      marketValue: body.marketValue?.trim() || "",
      businessModel: body.businessModel?.trim() || "",
      revenueStreams: body.revenueStreams || [],
      traction: body.traction?.trim() || "",
      tractionPoints: body.tractionPoints || [],
      team: body.team || [],
      askAmount: body.askAmount?.trim() || "",
      useOfFunds: body.useOfFunds || [],
      contactEmail: body.contactEmail?.trim() || "",
      contactName: body.contactName?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };

    decks.push(deck);
    await saveDecks(decks);
    return NextResponse.json({ deck }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save deck" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const decks = await loadDecks();
    const filtered = decks.filter((d) => d.id !== body.id);
    if (filtered.length === decks.length) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    await saveDecks(filtered);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete deck" }, { status: 500 });
  }
}
