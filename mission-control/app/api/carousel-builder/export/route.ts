import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const CAROUSEL_BASE = path.join(WS, "data/carousel-builder/carousels");
const TEMPLATES_DIR = path.join(WS, "data/carousel-builder/templates");

// ── Palette ────────────────────────────────────────────────────────────

const PALETTES: Record<string, { overlay: [number, number, number]; alpha: number; accent: string; text: string }> = {
  ocean:    { overlay: [10,  37,  64],  alpha: 0.62, accent: "#00D4AA", text: "#ffffff" },
  sunset:   { overlay: [26,  26,  46],  alpha: 0.62, accent: "#E94560", text: "#ffffff" },
  forest:   { overlay: [27,  45,  27],  alpha: 0.62, accent: "#4CAF50", text: "#ffffff" },
  royal:    { overlay: [26,  0,   51],  alpha: 0.62, accent: "#BB86FC", text: "#ffffff" },
  minimal:  { overlay: [15,  15,  15],  alpha: 0.72, accent: "#ffffff", text: "#ffffff" },
  gold:     { overlay: [26,  16,  0],   alpha: 0.68, accent: "#F5C518", text: "#ffffff" },
  midnight: { overlay: [4,   11,  20],  alpha: 0.72, accent: "#38BDF8", text: "#ffffff" },
  ruby:     { overlay: [40,  3,   8],   alpha: 0.65, accent: "#FF4D6D", text: "#ffffff" },
  ember:    { overlay: [28,  8,   0],   alpha: 0.68, accent: "#FF6B35", text: "#ffffff" },
  arctic:   { overlay: [10,  21,  32],  alpha: 0.60, accent: "#A8DAFF", text: "#ffffff" },
  jade:     { overlay: [2,   26,  20],  alpha: 0.68, accent: "#00BFA5", text: "#ffffff" },
  plum:     { overlay: [26,  13,  46],  alpha: 0.65, accent: "#D4A5F5", text: "#ffffff" },
  neon:     { overlay: [5,   5,   5],   alpha: 0.75, accent: "#39FF14", text: "#ffffff" },
  coral:    { overlay: [26,  10,  10],  alpha: 0.65, accent: "#FF6B6B", text: "#ffffff" },
  slate:    { overlay: [15,  24,  32],  alpha: 0.70, accent: "#94A3B8", text: "#ffffff" },
};

// ── Text helpers ───────────────────────────────────────────────────────

function charWidth(c: string): number {
  if ("iIl|!.,;:()[]{}'\"`ft ".includes(c)) return 0.38;
  if ("mwMW".includes(c)) return 0.88;
  return 0.60;
}

function textPxWidth(text: string, fs: number): number {
  return text.split("").reduce((a, c) => a + charWidth(c) * fs, 0);
}

function wrapText(text: string, maxPx: number, fontSize: number): string[] {
  if (!text?.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textPxWidth(candidate, fontSize) <= maxPx) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      // word itself wider than max → force it anyway
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── SVG overlay builder ────────────────────────────────────────────────

interface SlideData {
  type: "cover" | "content" | "cta";
  heading: string;
  body: string;
  bullets?: string[];
}

function buildOverlaySvg(
  slide: SlideData,
  palette: string,
  w: number,
  h: number,
  num: number,
  total: number,
  customPaletteOverride?: { overlay: [number, number, number]; alpha: number; accent: string }
): Buffer {
  const pal = (palette === "custom" && customPaletteOverride)
    ? { ...customPaletteOverride, text: "#ffffff" }
    : (PALETTES[palette] || PALETTES.royal);
  const [r, g, b] = pal.overlay;
  const overlayFill = `rgba(${r},${g},${b},${pal.alpha})`;

  const pad = 80;
  const textW = w - pad * 2;

  const hFS = slide.type === "cover" ? 72 : 60;
  const bFS = 36;
  const bulletFS = 34;
  const hLH = hFS * 1.22;
  const bLH = bFS * 1.45;
  const bltLH = bulletFS * 1.45;

  const headingLines = wrapText(slide.heading, textW, hFS);
  const bodyLines = wrapText(slide.body, textW, bFS);
  const bulletLines = (slide.bullets || []).flatMap((b) => wrapText(b, textW - 36, bulletFS).map((l, i) => ({ text: l, first: i === 0 })));

  const totalH =
    headingLines.length * hLH +
    (bodyLines.length > 0 ? 28 + bodyLines.length * bLH : 0) +
    (bulletLines.length > 0 ? 28 + bulletLines.length * bltLH : 0);

  let y = Math.max(pad + hFS, (h - totalH) / 2 + hFS);

  const rows: string[] = [];

  // Heading
  for (const line of headingLines) {
    rows.push(
      `<text x="${pad}" y="${Math.round(y)}" font-family="'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif" font-size="${hFS}" font-weight="700" fill="${pal.text}" filter="url(#sh)">${escXml(line)}</text>`
    );
    y += hLH;
  }

  // Body
  if (bodyLines.length > 0) {
    y += 28;
    for (const line of bodyLines) {
      rows.push(
        `<text x="${pad}" y="${Math.round(y)}" font-family="'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif" font-size="${bFS}" font-weight="400" fill="${pal.text}" opacity="0.88" filter="url(#sh)">${escXml(line)}</text>`
      );
      y += bLH;
    }
  }

  // Bullets
  if (bulletLines.length > 0) {
    y += 28;
    for (const { text, first } of bulletLines) {
      if (first) {
        rows.push(
          `<text x="${pad}" y="${Math.round(y)}" font-family="'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif" font-size="${bulletFS}" font-weight="700" fill="${pal.accent}" filter="url(#sh)">•</text>`
        );
      }
      rows.push(
        `<text x="${pad + (first ? 36 : 36)}" y="${Math.round(y)}" font-family="'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif" font-size="${bulletFS}" font-weight="400" fill="${pal.text}" opacity="0.88" filter="url(#sh)">${escXml(text)}</text>`
      );
      y += bltLH;
    }
  }

  // Slide counter (bottom right, except cover)
  let counter = "";
  if (slide.type !== "cover") {
    counter = `<text x="${w - pad}" y="${h - 48}" text-anchor="end" font-family="'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif" font-size="24" font-weight="500" fill="${pal.text}" opacity="0.45">${num} / ${total}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <filter id="sh" x="-5%" y="-5%" width="115%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="${overlayFill}"/>
  ${rows.join("\n  ")}
  ${counter}
</svg>`;

  return Buffer.from(svg);
}

// ── Background helpers ─────────────────────────────────────────────────

async function solidBackground(r: number, g: number, b: number, w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer();
}

async function imageBackground(source: string, w: number, h: number): Promise<Buffer> {
  if (source.startsWith("data:")) {
    const base64Data = source.split(",")[1];
    const buf = Buffer.from(base64Data, "base64");
    return sharp(buf).resize(w, h, { fit: "cover", position: "centre" }).jpeg({ quality: 92 }).toBuffer();
  }
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return sharp(buf).resize(w, h, { fit: "cover", position: "centre" }).jpeg({ quality: 92 }).toBuffer();
  }
  // Local file path
  if (fs.existsSync(source)) {
    return sharp(source).resize(w, h, { fit: "cover", position: "centre" }).jpeg({ quality: 92 }).toBuffer();
  }
  throw new Error(`Image source not found: ${source}`);
}

// ── Slug helper ─────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

// ── Main export handler ────────────────────────────────────────────────

interface SlideImage {
  url: string;
  isTemplate?: boolean;
  templateId?: string;
}

interface ExportBody {
  title: string;
  slides: SlideData[];
  slideImages: Record<string, SlideImage>;
  platform: string; // "Instagram" | "LinkedIn"
  palette: string;
  panoramic?: boolean;
  panoramicImageUrl?: string;
  customPalette?: { overlay: [number, number, number]; alpha: number; accent: string };
}

// ── Panoramic helpers ──────────────────────────────────────────────────

async function buildPanoramaStrip(
  panoramicImageUrl: string,
  w: number,
  targetHeight: number,
  slideCount: number
): Promise<Buffer> {
  const res = await fetch(panoramicImageUrl);
  if (!res.ok) throw new Error(`Failed to fetch panoramic image: ${res.status}`);
  const srcBuf = Buffer.from(await res.arrayBuffer());

  const { width: srcWidth, height: srcHeight } = await sharp(srcBuf).metadata();
  if (!srcWidth || !srcHeight) throw new Error("Could not read panoramic image dimensions");

  // Scale to targetHeight, preserving aspect ratio
  let scaledWidth = Math.round(srcWidth * (targetHeight / srcHeight));
  // Ensure strip is wide enough to cover all slides
  scaledWidth = Math.max(scaledWidth, w * slideCount);

  const panoramaBuf = await sharp(srcBuf)
    .resize(scaledWidth, targetHeight, { fit: "fill" })
    .jpeg({ quality: 92 })
    .toBuffer();

  return panoramaBuf;
}

async function cropPanoramaSlide(
  panoramaBuf: Buffer,
  slideIndex: number,
  slideCount: number,
  w: number,
  targetHeight: number
): Promise<Buffer> {
  const { width: stripWidth } = await sharp(panoramaBuf).metadata();
  if (!stripWidth) throw new Error("Could not read panorama strip width");

  // Pan smoothly from left edge (slide 0) to right edge (last slide)
  const cropX = Math.round(slideIndex * (stripWidth - w) / Math.max(slideCount - 1, 1));

  return sharp(panoramaBuf)
    .extract({ left: cropX, top: 0, width: w, height: targetHeight })
    .jpeg({ quality: 92 })
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportBody = await req.json();
    const { title, slides, slideImages, platform, palette, panoramic, panoramicImageUrl, customPalette } = body;

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: "slides required" }, { status: 400 });
    }

    if (panoramic && !panoramicImageUrl) {
      return NextResponse.json({ error: "panoramicImageUrl required when panoramic is true" }, { status: 400 });
    }

    const isLinkedIn = platform?.toLowerCase() === "linkedin";
    const w = 1080;
    const h = isLinkedIn ? 1350 : 1080;

    // Create carousel folder
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const slug = slugify(title || "carousel");
    const carouselId = `${dateStr}-${slug}-${Date.now().toString(36)}`;
    const carouselDir = path.join(CAROUSEL_BASE, carouselId);
    const slidesDir = path.join(carouselDir, "slides");
    fs.mkdirSync(slidesDir, { recursive: true });

    const pal = (palette === "custom" && customPalette)
      ? { overlay: customPalette.overlay, alpha: customPalette.alpha, accent: customPalette.accent, text: "#ffffff" }
      : (PALETTES[palette] || PALETTES.royal);
    const pngPaths: string[] = [];
    const servePaths: string[] = [];
    const total = slides.length;

    // Pre-build panorama strip if needed
    let panoramaBuf: Buffer | null = null;
    if (panoramic && panoramicImageUrl) {
      panoramaBuf = await buildPanoramaStrip(panoramicImageUrl, w, h, slides.length);
      // Save full panorama for reference
      fs.writeFileSync(path.join(carouselDir, "panorama.jpg"), panoramaBuf);
    }

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const imgData = slideImages[String(i)];

      // Get background buffer
      let bgBuffer: Buffer;
      try {
        if (panoramaBuf) {
          // Panoramic mode: crop the strip for this slide
          bgBuffer = await cropPanoramaSlide(panoramaBuf, i, slides.length, w, h);
        } else if (imgData?.isTemplate && imgData.templateId) {
          const templatePath = path.join(TEMPLATES_DIR, path.basename(imgData.templateId));
          bgBuffer = await imageBackground(templatePath, w, h);
        } else if (imgData?.url) {
          bgBuffer = await imageBackground(imgData.url, w, h);
        } else {
          bgBuffer = await solidBackground(pal.overlay[0], pal.overlay[1], pal.overlay[2], w, h);
        }
      } catch {
        bgBuffer = await solidBackground(pal.overlay[0], pal.overlay[1], pal.overlay[2], w, h);
      }

      // Build SVG overlay
      const overlayBuf = buildOverlaySvg(slide, palette, w, h, i + 1, total, customPalette);

      // Composite
      const filename = `slide-${String(i + 1).padStart(2, "0")}.png`;
      const outPath = path.join(slidesDir, filename);

      await sharp(bgBuffer)
        .composite([{ input: overlayBuf, top: 0, left: 0 }])
        .png()
        .toFile(outPath);

      const relPath = `slides/${filename}`;
      pngPaths.push(relPath);
      servePaths.push(`/api/carousel-builder/serve?id=${carouselId}&file=${encodeURIComponent(relPath)}`);
    }

    // Write metadata
    const metadata = {
      id: carouselId,
      title: title || "Untitled Carousel",
      platform,
      palette,
      panoramic: panoramic === true,
      slideCount: slides.length,
      createdAt: new Date().toISOString(),
      folder: carouselDir,
    };
    fs.writeFileSync(path.join(carouselDir, "metadata.json"), JSON.stringify(metadata, null, 2));

    return NextResponse.json({ ok: true, carouselId, folder: carouselDir, pngs: pngPaths, servePaths });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
