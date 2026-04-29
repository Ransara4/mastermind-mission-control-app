import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const MENTORSHIPS_BASE = path.join(WS, "projects/mentorships");
const DB_PATH = path.join(MENTORSHIPS_BASE, "mentorships-db.json");

async function getClientFolder(clientId: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const db = JSON.parse(raw);
    const client = db.clients?.find((c: any) => c.id === clientId);
    if (!client) return null;
    return client.name.toUpperCase();
  } catch {
    return null;
  }
}

function humanizeFilename(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const folder = await getClientFolder(clientId);
  if (!folder) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const researchDir = path.join(MENTORSHIPS_BASE, folder, "research");

  // Ensure dir exists
  try {
    await fs.mkdir(researchDir, { recursive: true });
  } catch {
    // ignore
  }

  const fileParam = request.nextUrl.searchParams.get("file");

  // Return specific file content
  if (fileParam) {
    // Sanitize: no path traversal
    const safeFilename = path.basename(fileParam);
    const filePath = path.join(researchDir, safeFilename);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return NextResponse.json({ filename: safeFilename, content });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // List all .md files
  try {
    const entries = await fs.readdir(researchDir);
    const mdFiles = entries.filter((f) => f.endsWith(".md")).sort();

    const files = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = path.join(researchDir, filename);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const stat = await fs.stat(filePath);
          return {
            filename,
            title: humanizeFilename(filename),
            created_at: stat.birthtime.toISOString(),
            modified_at: stat.mtime.toISOString(),
            preview: content.slice(0, 200),
          };
        } catch {
          return {
            filename,
            title: humanizeFilename(filename),
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            preview: "",
          };
        }
      })
    );

    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const folder = await getClientFolder(clientId);
  if (!folder) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const researchDir = path.join(MENTORSHIPS_BASE, folder, "research");

  let body: { filename: string; content: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filename, content } = body;
  if (!filename || content === undefined) {
    return NextResponse.json({ error: "filename and content are required" }, { status: 400 });
  }

  // Sanitize filename
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".md")) {
    return NextResponse.json({ error: "Only .md files allowed" }, { status: 400 });
  }

  const filePath = path.join(researchDir, safeFilename);

  try {
    await fs.mkdir(researchDir, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return NextResponse.json({ ok: true, filename: safeFilename });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
