import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';

const RESTORE_STATUS = '/tmp/openclaw-restore-status.json';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operationId');

    if (!operationId) {
      return NextResponse.json(
        { error: 'operationId parameter is required' },
        { status: 400 }
      );
    }

    // Read status from the file written by the restore script
    if (fs.existsSync(RESTORE_STATUS)) {
      try {
        const raw = fs.readFileSync(RESTORE_STATUS, 'utf-8');
        const status = JSON.parse(raw);
        return NextResponse.json({
          operationId,
          status: status.status || 'running',
          progressPercent: status.percent || 0,
          currentStep: status.step || 'Processing...',
        });
      } catch {
        // File exists but can't parse — restore is in progress
        return NextResponse.json({
          operationId,
          status: 'running',
          progressPercent: 50,
          currentStep: 'Restoring...',
        });
      }
    }

    // No status file — restore hasn't started or already cleaned up
    return NextResponse.json({
      operationId,
      status: 'completed',
      progressPercent: 100,
      currentStep: 'Restore complete!',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check progress' },
      { status: 500 }
    );
  }
}
