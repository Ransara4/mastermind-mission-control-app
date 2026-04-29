import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "child_process";
import os from "os";

const HOME = os.homedir();

interface CarouselSlide {
  heading: string;
  body: string;
  bullets: string[] | null;
}

interface CarouselCta {
  heading: string;
  body: string;
  button: string;
}

interface CarouselOutput {
  title: string;
  subtitle: string;
  author: string;
  palette: string;
  slides: CarouselSlide[];
  cta: CarouselCta;
}

type Framework = "aida" | "pas" | "story" | "tips" | "listicle";
type Tone = "bold" | "casual" | "professional" | "nurturing";
type Platform = "instagram" | "linkedin";
type Palette = "ocean" | "sunset" | "forest" | "royal" | "minimal";
type PricePoint = "low" | "mid" | "high" | "";

interface RequestBody {
  mode: "create" | "recreate";
  product: string;
  pricePoint: PricePoint;
  cta: string;
  slideCount: number;
  audience: string;
  painPoints: string;
  transformation: string;
  framework: Framework;
  tone: Tone;
  platform: Platform;
  palette: Palette;
  recreateUrl?: string;
}

const FRAMEWORK_INSTRUCTIONS: Record<Framework, string> = {
  aida: `Use the AIDA framework across the slides: open with Attention (hook that grabs them), build Interest (why this matters), create Desire (paint the transformation), close toward Action. Distribute these phases naturally across the ${0} content slides.`,
  pas: `Use the PAS framework: start with Problem (name the pain clearly), escalate with Agitation (make them feel the cost of staying stuck), then pivot to Solution (introduce the product/offer as the answer). Distribute across the content slides.`,
  story: `Use a Story arc: Hook slide (grabs attention with a relatable scenario), Conflict slides (the struggle the audience faces), Resolution slides (how the product solves it), leading to a CTA. Make it feel human and narrative.`,
  tips: `Structure as a numbered tips list. Each slide = one actionable tip. Number them clearly (Tip 1, Tip 2, etc.). Each tip should be self-contained, practical, and directly address the audience's pain points.`,
  listicle: `Structure as a listicle (e.g., "7 reasons why...", "5 things that..."). Each slide presents one item on the list with a punchy heading and short supporting body copy. Keep it scannable and shareable.`,
};

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  bold: "Write in a bold, direct, no-fluff voice. Short punchy sentences. Use power words. Cut everything that doesn't hit hard.",
  casual: "Write in a casual, conversational voice. Like a knowledgeable friend talking. Contractions welcome. Warm and relatable.",
  professional: "Write in a polished, professional voice. Credible and authoritative but not stiff. Clear and concise.",
  nurturing: "Write in a warm, empathetic, nurturing voice. Meet the reader where they are. Validate their struggle before offering hope.",
};

const PRICE_CONTEXT: Record<string, string> = {
  low: "This is a low-ticket offer (under $100). Keep it accessible and low-barrier.",
  mid: "This is a mid-ticket offer ($100-$1000). Emphasize value and transformation.",
  high: "This is a high-ticket offer ($1000+). Focus on transformation, exclusivity, and ROI.",
  "": "",
};

const PLATFORM_NOTES: Record<Platform, string> = {
  instagram: "Optimized for Instagram carousels: short punchy lines, swipe-worthy hooks, mobile-first reading.",
  linkedin: "Optimized for LinkedIn carousels: slightly more professional framing, thought-leadership feel, business context.",
};

function buildPrompt(body: RequestBody): string {
  const {
    product,
    pricePoint,
    cta,
    slideCount,
    audience,
    painPoints,
    transformation,
    framework,
    tone,
    platform,
    palette,
  } = body;

  const frameworkBase = FRAMEWORK_INSTRUCTIONS[framework].replace("${0}", String(slideCount));
  const toneInstruction = TONE_INSTRUCTIONS[tone];
  const priceContext = PRICE_CONTEXT[pricePoint] || "";
  const platformNote = PLATFORM_NOTES[platform];

  return `You are a world-class carousel copywriter. Generate a complete carousel slide deck for a social media post.

PRODUCT / OFFER:
${product}
${priceContext ? `\nPRICE POINT: ${priceContext}` : ""}

TARGET AUDIENCE:
${audience}

PAIN POINTS:
${painPoints}

DESIRED TRANSFORMATION / OUTCOME:
${transformation}

DESIRED CTA:
${cta}

PLATFORM:
${platformNote}

TONE:
${toneInstruction}

FRAMEWORK:
${frameworkBase}

SLIDE COUNT:
Generate exactly ${slideCount} content slides (not counting the cover or CTA slide). The cover is the title/subtitle. The CTA is the final closing slide. So total slides in the output array should be exactly ${slideCount}.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure. No markdown fences, no explanation, no text before or after the JSON:

{
  "title": "Cover headline (punchy, hooks the audience immediately)",
  "subtitle": "Cover subheadline (1 short line expanding on the hook)",
  "author": "",
  "palette": "${palette}",
  "slides": [
    {
      "heading": "Slide headline (short, punchy)",
      "body": "2-4 sentences of supporting copy. Paste-ready for Canva. Clear and scannable.",
      "bullets": null
    }
  ],
  "cta": {
    "heading": "Closing CTA headline",
    "body": "1-2 lines supporting the CTA, reinforcing the transformation",
    "button": "${cta}"
  }
}

RULES:
- slides array must have exactly ${slideCount} items
- Use bullets (string array) only for tips/listicle slides where a bullet list makes sense. Otherwise set bullets to null.
- Headings: short and punchy (under 8 words ideally)
- Body copy: clear, paste-ready for Canva, no filler
- No em dashes in any text. Use commas, colons, or rewrite instead.
- Return ONLY the JSON object. Nothing else.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    const {
      product,
      slideCount,
      audience,
      framework,
      tone,
      platform,
      palette,
    } = body;

    if (!product || !audience || !framework || !tone || !platform || !palette) {
      return NextResponse.json(
        { error: "Missing required fields: product, audience, framework, tone, platform, palette" },
        { status: 400 }
      );
    }

    const count = Math.max(5, Math.min(15, Number(slideCount) || 7));
    const normalizedBody = { ...body, slideCount: count };
    const prompt = buildPrompt(normalizedBody);

    let text: string;
        const claudeEnv = { ...process.env };
    delete claudeEnv.ANTHROPIC_API_KEY;
    claudeEnv.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`;
    claudeEnv.HOME = HOME;

    const proc = spawnSync(
      "/opt/homebrew/bin/claude",
      ["-p", "--model", "sonnet", "--output-format", "text"],
      {
        input: prompt,
        encoding: "utf-8",
        timeout: 60000,
        env: claudeEnv,
      }
    );
    if (proc.status !== 0 || proc.error) {
      const msg = proc.error?.message ?? (proc.stderr as string) ?? "Unknown error";
      return NextResponse.json({ error: `claude CLI error: ${msg}` }, { status: 502 });
    }
    text = (proc.stdout as string).trim();

    let slides: CarouselOutput;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "Could not extract JSON from Claude response", raw: text },
          { status: 502 }
        );
      }
      slides = JSON.parse(jsonMatch[0]) as CarouselOutput;
    } catch {
      return NextResponse.json(
        { error: "JSON parse failed", raw: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, slides });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
