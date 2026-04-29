import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import os from "os";

const HOME = os.homedir();

const GMAIL_CLEANUP_SCRIPT = path.join(
  process.env.HOME || '',
  '.openclaw',
  'workspace',
  'bin',
  'gmail-cleanup'
);

let isRunning = false;

export async function GET() {
  return NextResponse.json({ running: isRunning });
}

export async function POST() {
  if (isRunning) {
    return NextResponse.json(
      { error: 'Emmy is already running' },
      { status: 409 }
    );
  }

  isRunning = true;

  try {
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(
        `bash "${GMAIL_CLEANUP_SCRIPT}"`,
        { timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject({ error, stdout, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
    });

    isRunning = false;

    return NextResponse.json({
      success: true,
      output: result.stdout.slice(-2000),
    });
  } catch (err: any) {
    isRunning = false;

    return NextResponse.json(
      {
        success: false,
        error: err.error?.message || 'Script execution failed',
        output: (err.stdout || '').slice(-2000),
        stderr: (err.stderr || '').slice(-1000),
      },
      { status: 500 }
    );
  }
}
