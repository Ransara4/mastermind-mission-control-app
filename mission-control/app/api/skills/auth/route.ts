import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SKILLS_AUTH_DIR = path.join(WS, "skills/.auth");

async function ensureAuthDir() {
  try {
    await fs.mkdir(SKILLS_AUTH_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, credentials } = body as {
      slug: string;
      credentials: Record<string, string>;
    };

    if (!slug || !credentials || typeof credentials !== "object") {
      return NextResponse.json(
        {
          error:
            "Missing required fields: slug (string), credentials (object)",
        },
        { status: 400 }
      );
    }

    await ensureAuthDir();

    const authFile = path.join(SKILLS_AUTH_DIR, `${slug}.json`);
    await fs.writeFile(
      authFile,
      JSON.stringify(
        {
          slug,
          credentials,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf-8"
    );

    // Set restrictive permissions
    await fs.chmod(authFile, 0o600);

    return NextResponse.json({
      slug,
      configured: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save auth credentials", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Missing slug parameter" },
        { status: 400 }
      );
    }

    const authFile = path.join(SKILLS_AUTH_DIR, `${slug}.json`);
    try {
      await fs.unlink(authFile);
      return NextResponse.json({ slug, cleared: true });
    } catch {
      return NextResponse.json({ slug, cleared: false, message: "No credentials found" });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to clear credentials", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Missing slug parameter" },
        { status: 400 }
      );
    }

    const authFile = path.join(SKILLS_AUTH_DIR, `${slug}.json`);
    try {
      const raw = await fs.readFile(authFile, "utf-8");
      const data = JSON.parse(raw);
      // Return field keys that are configured but mask values
      const configuredKeys = Object.keys(data.credentials || {});
      return NextResponse.json({
        slug,
        configured: true,
        configuredKeys,
        updatedAt: data.updatedAt || null,
      });
    } catch {
      return NextResponse.json({
        slug,
        configured: false,
        configuredKeys: [],
        updatedAt: null,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to check auth status", detail: String(err) },
      { status: 500 }
    );
  }
}
