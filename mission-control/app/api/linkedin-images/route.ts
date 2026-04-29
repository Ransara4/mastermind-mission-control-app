import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const DATA_DIR = join(WS, "data/linkedin-images");
const BG_DIR = join(DATA_DIR, "backgrounds");
const OUT_DIR = join(DATA_DIR, "outputs");
const CLI = join(HOME, "bin/linkedin-image-gen");

function ensureDirs() {
  for (const dir of [BG_DIR, OUT_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

// GET — list backgrounds, outputs, presets
export async function GET(req: NextRequest) {
  try {
    ensureDirs();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "backgrounds") {
      const files = existsSync(BG_DIR)
        ? readdirSync(BG_DIR).filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
        : [];
      return NextResponse.json({ backgrounds: files });
    }

    if (action === "outputs") {
      const files = existsSync(OUT_DIR)
        ? readdirSync(OUT_DIR)
            .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
            .sort((a, b) => {
              const sa = readFileSync(join(OUT_DIR, a));
              const sb = readFileSync(join(OUT_DIR, b));
              return sb.length - sa.length; // newest first by size as proxy
            })
        : [];
      return NextResponse.json({ outputs: files });
    }

    if (action === "presets") {
      const presetsPath = join(DATA_DIR, "presets.json");
      if (existsSync(presetsPath)) {
        const data = JSON.parse(readFileSync(presetsPath, "utf-8"));
        return NextResponse.json(data);
      }
      return NextResponse.json({ presets: {} });
    }

    // Default: return everything
    const bgFiles = existsSync(BG_DIR)
      ? readdirSync(BG_DIR).filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
      : [];
    const outFiles = existsSync(OUT_DIR)
      ? readdirSync(OUT_DIR).filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
      : [];
    const presetsPath = join(DATA_DIR, "presets.json");
    const presets = existsSync(presetsPath)
      ? JSON.parse(readFileSync(presetsPath, "utf-8")).presets
      : {};

    return NextResponse.json({ backgrounds: bgFiles, outputs: outFiles, presets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — upload background or generate image
export async function POST(req: NextRequest) {
  try {
    ensureDirs();
    const contentType = req.headers.get("content-type") || "";

    // File upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "png";
      const filename = `bg-${Date.now()}.${ext}`;
      const filepath = join(BG_DIR, filename);
      writeFileSync(filepath, buffer);

      return NextResponse.json({ success: true, filename, path: filepath });
    }

    // JSON actions
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      const { background, headline, subtitle, cta, preset } = body;
      const bgPath = join(BG_DIR, background);
      if (!existsSync(bgPath)) {
        return NextResponse.json({ error: "Background not found" }, { status: 404 });
      }

      const outputName = `linkedin-${Date.now()}.png`;
      const outputPath = join(OUT_DIR, outputName);

      const args = [
        `"${bgPath}"`,
        `--headline "${(headline || "").replace(/"/g, '\\"')}"`,
        `--subtitle "${(subtitle || "").replace(/"/g, '\\"')}"`,
        `--cta "${(cta || "").replace(/"/g, '\\"')}"`,
        `--preset "${preset || "dark-authority"}"`,
        `--output "${outputPath}"`,
      ].join(" ");

      const result = execSync(`python3 "${CLI}" ${args}`, {
        timeout: 30000,
        encoding: "utf-8",
      });

      let parsed;
      try {
        parsed = JSON.parse(result.trim());
      } catch {
        parsed = { success: true, path: outputPath };
      }

      return NextResponse.json({
        success: true,
        filename: outputName,
        path: outputPath,
        ...parsed,
      });
    }

    if (action === "delete-background") {
      const { filename } = body;
      const filepath = join(BG_DIR, filename);
      if (existsSync(filepath)) unlinkSync(filepath);
      return NextResponse.json({ success: true });
    }

    if (action === "delete-output") {
      const { filename } = body;
      const filepath = join(OUT_DIR, filename);
      if (existsSync(filepath)) unlinkSync(filepath);
      return NextResponse.json({ success: true });
    }

    if (action === "publish") {
      const { filename, postText } = body;
      const filepath = join(OUT_DIR, filename);
      if (!existsSync(filepath)) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      // Use linkedin-mcp create_image_post via CLI
      // The MCP server handles the actual LinkedIn API call
      // For now, return the image path so the user can publish via the MCP tool
      return NextResponse.json({
        success: true,
        message: "Image ready for publishing. Use linkedin-mcp create_image_post to publish.",
        imagePath: filepath,
        postText: postText || "",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
