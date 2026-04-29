/**
 * API Route: Update backup description
 * POST /api/backups/update-description
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const BACKUPS_DIR = path.join(WS, "backups");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { backupId, description } = body;

    if (!backupId || !description) {
      return NextResponse.json(
        { success: false, error: 'Backup ID and description are required' },
        { status: 400 }
      );
    }

    const filename = backupId.endsWith('.tar.gz') ? backupId : `${backupId}.tar.gz`;
    const filepath = path.join(BACKUPS_DIR, filename);
    const metaPath = filepath + '.meta.json';

    // Read existing metadata or create new
    let metadata: any = {};
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      metadata = JSON.parse(metaContent);
    } catch {
      // No existing metadata
    }

    // Update description
    metadata.description = description;
    metadata.updatedAt = Date.now();

    // Write metadata
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/backups/update-description] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update description',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
