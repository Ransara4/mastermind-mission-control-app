import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const PACKS_DIR = `${WS}/prompt-packs`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filePath = path.join(PACKS_DIR, id, 'prompts.txt');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json({ id, content });
  } catch {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filePath = path.join(PACKS_DIR, id, 'prompts.txt');
  const { content } = await req.json();

  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
  }

  try {
    await fs.access(path.join(PACKS_DIR, id));
    await fs.writeFile(filePath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Pack directory not found' }, { status: 404 });
  }
}
