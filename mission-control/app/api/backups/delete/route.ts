/**
 * API Route: Delete a backup
 * POST /api/backups/delete
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
    const { backupId } = body;

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: 'Backup ID is required' },
        { status: 400 }
      );
    }

    const filename = backupId.endsWith('.tar.gz') ? backupId : `${backupId}.tar.gz`;
    const filepath = path.join(BACKUPS_DIR, filename);
    const metaPath = filepath + '.meta.json';

    // Delete backup file
    try {
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Error deleting backup file:', error);
    }

    // Delete metadata file
    try {
      await fs.unlink(metaPath);
    } catch (error) {
      // Metadata file may not exist
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/backups/delete] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete backup',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
