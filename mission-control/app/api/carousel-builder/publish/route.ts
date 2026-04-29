import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execFileAsync = promisify(execFile);
const CAROUSEL_BASE = path.join(WS, "data/carousel-builder/carousels");
const LINKEDIN_TOKEN_PATH = path.join(WS, "linkedin-mcp/data/oauth_token.json");
const IG_AGENT = path.join(WS, "agents/instagram/src/main.py");
const CREATE_PDF_SCRIPT = path.join(WS, "data/carousel-builder/create-pdf.py");

// ── LinkedIn helpers ───────────────────────────────────────────────────

function readLinkedInToken(): { access_token: string; expires_at: number } | null {
  try {
    return JSON.parse(fs.readFileSync(LINKEDIN_TOKEN_PATH, "utf-8"));
  } catch {
    return null;
  }
}

async function liApi(token: string, method: string, url: string, body?: object): Promise<Response> {
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getLinkedInPersonUrn(token: string): Promise<string> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Could not fetch LinkedIn profile: ${res.status}`);
  const data = await res.json();
  // sub is the person numeric ID
  return `urn:li:person:${data.sub}`;
}

async function publishLinkedIn(
  carouselId: string,
  caption: string,
  title: string
): Promise<{ postUrl: string }> {
  const tokenData = readLinkedInToken();
  if (!tokenData?.access_token) throw new Error("LinkedIn not connected. Go to Settings > LinkedIn to authenticate.");

  const now = Date.now() / 1000;
  if (tokenData.expires_at && tokenData.expires_at < now) {
    throw new Error("LinkedIn token expired. Go to Settings > LinkedIn to re-authenticate.");
  }

  const token = tokenData.access_token;
  const carouselDir = path.join(CAROUSEL_BASE, carouselId);

  // Generate PDF from PNGs
  const pdfPath = path.join(carouselDir, "carousel.pdf");
  const slidesDir = path.join(carouselDir, "slides");
  const pngFiles = fs.readdirSync(slidesDir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(slidesDir, f));

  if (pngFiles.length === 0) throw new Error("No PNG slides found. Export the carousel first.");

  // Generate PDF
  await execFileAsync("python3", [CREATE_PDF_SCRIPT, "--output", pdfPath, "--images", ...pngFiles], {
    timeout: 30000,
  });

  if (!fs.existsSync(pdfPath)) throw new Error("PDF generation failed.");

  // Get person URN
  const personUrn = await getLinkedInPersonUrn(token);

  // Initialize document upload
  const initRes = await liApi(token, "POST", "https://api.linkedin.com/rest/documents?action=initializeUpload", {
    initializeUploadRequest: { owner: personUrn },
  });
  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`LinkedIn upload init failed (${initRes.status}): ${errText}`);
  }
  const initData = await initRes.json();
  const uploadUrl: string = initData.value?.uploadUrl;
  const documentUrn: string = initData.value?.document;
  if (!uploadUrl || !documentUrn) throw new Error("LinkedIn did not return upload URL.");

  // Upload PDF binary
  const pdfBuffer = fs.readFileSync(pdfPath);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: pdfBuffer,
  });
  if (!uploadRes.ok) throw new Error(`PDF upload failed: ${uploadRes.status}`);

  // Create post
  const postRes = await liApi(token, "POST", "https://api.linkedin.com/rest/posts", {
    author: personUrn,
    commentary: caption,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        document: documentUrn,
        title: title || "Carousel",
      },
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`LinkedIn post creation failed (${postRes.status}): ${errText}`);
  }

  const postId = postRes.headers.get("x-linkedin-id") || "";
  const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : "https://www.linkedin.com/feed";

  return { postUrl };
}

// ── Instagram helpers ──────────────────────────────────────────────────

async function publishInstagram(
  carouselId: string,
  caption: string
): Promise<{ mediaId: string }> {
  const carouselDir = path.join(CAROUSEL_BASE, carouselId);
  const slidesDir = path.join(carouselDir, "slides");

  const pngFiles = fs.readdirSync(slidesDir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(slidesDir, f));

  if (pngFiles.length === 0) throw new Error("No PNG slides found. Export the carousel first.");

  // Instagram carousels need 2-10 images
  const images = pngFiles.slice(0, 10);

  const { stdout, stderr } = await execFileAsync(
    "python3",
    [IG_AGENT, "post-carousel", "--paths", ...images, "--caption", caption],
    { timeout: 120000 }
  );

  const mediaIdMatch = (stdout + stderr).match(/Media ID:\s*(\S+)/);
  const mediaId = mediaIdMatch?.[1] || "unknown";

  return { mediaId };
}

// ── Route handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { carouselId, platform, caption, title } = await req.json();

    if (!carouselId) return NextResponse.json({ error: "carouselId required" }, { status: 400 });
    if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

    const carouselDir = path.join(CAROUSEL_BASE, carouselId);
    if (!fs.existsSync(carouselDir)) {
      return NextResponse.json({ error: "Carousel not found. Export first." }, { status: 404 });
    }

    if (platform === "linkedin") {
      const result = await publishLinkedIn(carouselId, caption || "", title || "Carousel");
      return NextResponse.json({ ok: true, platform: "linkedin", ...result });
    }

    if (platform === "instagram") {
      const result = await publishInstagram(carouselId, caption || "");
      return NextResponse.json({ ok: true, platform: "instagram", ...result });
    }

    return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
