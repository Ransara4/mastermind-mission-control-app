import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execFileAsync = promisify(execFile);


const PEXEL_BIN = path.join(WS, "agents/pexel/src/index.js");
const UNSPLASH_BIN = path.join(WS, "agents/unsplash/src/search.js");
const WEB_BIN = path.join(WS, "agents/web-images/src/search.js");

type Photo = {
  id?: string;
  photographer: string;
  url: string;
  thumb: string;
  alt: string;
};

async function searchPexels(
  effectiveQ: string,
  count: string,
  orientation: string,
  q: string | null
): Promise<NextResponse> {
  const { stdout } = await execFileAsync(
    "node",
    [PEXEL_BIN, "search", effectiveQ, `--count=${count}`, `--orientation=${orientation}`],
    { timeout: 20000 }
  );

  const photos: Photo[] = [];
  let current: Record<string, string> = {};

  for (const line of stdout.split("\n")) {
    const urlMatch = line.match(/URL:\s+(.+)/);
    const thumbMatch = line.match(/Thumb(?:nail)?:\s+(.+)/);
    const altMatch = line.match(/Alt:\s+(.+)/);
    const idMatch = line.match(/ID:\s+(\d+)/);
    const photoMatch = line.match(/^\[\d+\]\s+(.+)/);

    if (photoMatch) {
      if (current.photographer) photos.push(current as Photo);
      current = { photographer: photoMatch[1].trim() };
    } else if (idMatch) current.id = idMatch[1].trim();
    else if (urlMatch) current.url = urlMatch[1].trim();
    else if (thumbMatch) current.thumb = thumbMatch[1].trim();
    else if (altMatch) current.alt = altMatch[1].trim();
  }
  if (current.photographer) photos.push(current as Photo);

  return NextResponse.json({ photos, query: q });
}

async function searchUnsplash(
  effectiveQ: string,
  count: string,
  q: string | null
): Promise<NextResponse> {
  const { stdout } = await execFileAsync(
    "node",
    [UNSPLASH_BIN, effectiveQ, `--count=${count}`],
    { timeout: 20000 }
  );

  const parsed = JSON.parse(stdout.trim());
  const raw: {
    url: string;
    photographer: string;
    alt: string;
    width?: number;
    height?: number;
    source?: string;
  }[] = parsed.photos || [];

  const photos: Photo[] = raw.map((p) => ({
    url: p.url,
    thumb: p.url,
    photographer: p.photographer,
    alt: p.alt || "",
  }));

  return NextResponse.json({ photos, query: q });
}

async function searchWeb(
  effectiveQ: string,
  count: string,
  q: string | null
): Promise<NextResponse> {
  const { stdout } = await execFileAsync(
    "node",
    [WEB_BIN, effectiveQ, `--count=${count}`],
    { timeout: 20000 }
  );

  const parsed = JSON.parse(stdout.trim());
  const raw: {
    url: string;
    thumbnailUrl?: string;
    photographer?: string;
    alt?: string;
    source?: string;
  }[] = parsed.photos || [];

  const photos: Photo[] = raw.map((p) => ({
    url: p.url,
    thumb: p.thumbnailUrl || p.url,
    photographer: p.photographer || p.source || "Web",
    alt: p.alt || "",
  }));

  return NextResponse.json({ photos, query: q });
}

async function generateHuggingFace(
  effectiveQ: string,
  q: string | null
): Promise<NextResponse> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "HUGGINGFACE_API_KEY not set" }, { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `${effectiveQ}, high quality photorealistic background`,
          parameters: { num_inference_steps: 4 },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `HuggingFace API error: ${errText}` },
        { status: 500 }
      );
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const photos: Photo[] = [
      {
        url: dataUrl,
        thumb: dataUrl,
        photographer: "AI Generated (FLUX)",
        alt: effectiveQ,
      },
    ];

    return NextResponse.json({ photos, query: q });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const mode = searchParams.get("mode"); // panoramic | null
  const source = searchParams.get("source") || "pexels"; // pexels | unsplash | web | huggingface
  const generate = searchParams.get("generate") === "true";

  const isPanoramic = mode === "panoramic";

  // panoramic mode overrides orientation and count, and biases the query
  const count = isPanoramic ? "6" : searchParams.get("count") || "6";
  const orientation = isPanoramic ? "landscape" : searchParams.get("orientation") || "square";
  const effectiveQ = isPanoramic && q ? `${q} wide landscape panoramic` : q;

  if (!effectiveQ) return NextResponse.json({ error: "q is required" }, { status: 400 });

  try {
    if (source === "huggingface" || generate) {
      return await generateHuggingFace(effectiveQ, q);
    } else if (source === "unsplash") {
      return await searchUnsplash(effectiveQ, count, q);
    } else if (source === "web") {
      return await searchWeb(effectiveQ, count, q);
    } else {
      // default: pexels
      return await searchPexels(effectiveQ, count, orientation, q);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
