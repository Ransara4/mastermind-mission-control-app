import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WHITELIST_PATH = path.join(process.cwd(), 'lib', 'emmie-whitelist.json');

interface WhitelistEntry {
  id: string;
  email: string;
  name: string;
  reason: string;
  pattern: 'exact' | 'domain' | 'pattern';
  addedAt: number;
}

async function readWhitelist(): Promise<WhitelistEntry[]> {
  try {
    const content = await fs.readFile(WHITELIST_PATH, 'utf-8');
    const data = JSON.parse(content);
    return data.whitelist || [];
  } catch {
    return [];
  }
}

async function writeWhitelist(entries: WhitelistEntry[]): Promise<void> {
  await fs.writeFile(WHITELIST_PATH, JSON.stringify({ whitelist: entries }, null, 2));
}

// GET - List all whitelist entries
export async function GET() {
  try {
    const whitelist = await readWhitelist();
    return NextResponse.json({ success: true, whitelist });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to read whitelist' },
      { status: 500 }
    );
  }
}

// POST - Add new whitelist entry
export async function POST(request: NextRequest) {
  try {
    const { email, name, reason, pattern } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const whitelist = await readWhitelist();
    const newEntry: WhitelistEntry = {
      id: `whitelist_${Date.now()}`,
      email,
      name,
      reason,
      pattern: pattern || 'exact',
      addedAt: Date.now(),
    };

    whitelist.push(newEntry);
    await writeWhitelist(whitelist);

    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to add whitelist entry' },
      { status: 500 }
    );
  }
}

// DELETE - Remove whitelist entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    let whitelist = await readWhitelist();
    const initial = whitelist.length;
    whitelist = whitelist.filter(e => e.id !== id);

    if (whitelist.length === initial) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    await writeWhitelist(whitelist);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete whitelist entry' },
      { status: 500 }
    );
  }
}

// PUT - Update whitelist entry
export async function PUT(request: NextRequest) {
  try {
    const { id, email, name, reason, pattern } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    let whitelist = await readWhitelist();
    const index = whitelist.findIndex(e => e.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    whitelist[index] = {
      ...whitelist[index],
      email: email || whitelist[index].email,
      name: name || whitelist[index].name,
      reason: reason || whitelist[index].reason,
      pattern: pattern || whitelist[index].pattern,
    };

    await writeWhitelist(whitelist);
    return NextResponse.json({ success: true, entry: whitelist[index] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update whitelist entry' },
      { status: 500 }
    );
  }
}
