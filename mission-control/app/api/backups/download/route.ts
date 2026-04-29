import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import os from "os";

const HOME = os.homedir();
const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filepath = searchParams.get('path');

    if (!filepath) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    // Security: ensure path is within backups directory
    const backupsDir = path.join(WS, "backups");
    const resolvedPath = path.resolve(filepath);

    if (!resolvedPath.startsWith(backupsDir)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { error: 'Backup file not found' },
        { status: 404 }
      );
    }

    // Read file
    const fileContent = fs.readFileSync(filepath);

    // Return file with appropriate headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${path.basename(filepath)}"`,
        'Content-Length': fileContent.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to download backup',
      },
      { status: 500 }
    );
  }
}
