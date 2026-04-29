import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from "os";

const HOME = os.homedir();

const METRICS_PATH = path.join(
  process.env.HOME || '',
  '.openclaw',
  'workspace',
  'agents',
  'emmie',
  'emmie-metrics.csv'
);

interface MetricEntry {
  sender: string;
  date: string;
  subject: string;
  platform: string;
  opens: string;
  clicks: string;
  notes: string;
}

export async function GET() {
  try {
    // Check if metrics file exists
    try {
      await fs.access(METRICS_PATH);
    } catch {
      return NextResponse.json({
        metrics: [],
        dailyStats: [],
        platformStats: [],
        message: 'No metrics data available yet'
      });
    }

    // Read and parse CSV
    const content = await fs.readFile(METRICS_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length <= 1) {
      return NextResponse.json({
        metrics: [],
        dailyStats: [],
        platformStats: [],
        message: 'No metrics data available yet'
      });
    }

    // Parse CSV (skip header)
    const metrics: MetricEntry[] = lines.slice(1).map((line) => {
      const [sender, date, subject, platform, opens, clicks, notes] = line.split(',');
      return {
        sender: sender || '',
        date: date || '',
        subject: subject || '',
        platform: platform || '',
        opens: opens || '',
        clicks: clicks || '',
        notes: notes || ''
      };
    });

    // Calculate daily stats (emails processed per day)
    const dailyMap = new Map<string, number>();
    metrics.forEach((m) => {
      const dateOnly = m.date.split(' ')[0]; // Get just the date part
      dailyMap.set(dateOnly, (dailyMap.get(dateOnly) || 0) + 1);
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first
      .slice(0, 30); // Last 30 days

    // Calculate platform stats
    const platformMap = new Map<string, number>();
    metrics.forEach((m) => {
      if (m.platform) {
        platformMap.set(m.platform, (platformMap.get(m.platform) || 0) + 1);
      }
    });

    const platformStats = Array.from(platformMap.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      metrics: metrics.slice(0, 100), // Return latest 100 emails
      dailyStats,
      platformStats,
      totalEmails: metrics.length
    });
  } catch (error) {
    console.error('Error reading metrics:', error);
    return NextResponse.json(
      { error: 'Failed to read metrics data' },
      { status: 500 }
    );
  }
}
