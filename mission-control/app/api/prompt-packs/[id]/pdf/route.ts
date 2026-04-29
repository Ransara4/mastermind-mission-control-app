import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const PDFS_DIR = `${WS}/prompt-packs/pdfs`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdfPath = path.join(PDFS_DIR, `${id}-prompt-pack.pdf`);

  try {
    const buffer = await fs.readFile(pdfPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}-prompt-pack.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }
}
