import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from "os";

const HOME = os.homedir();

const GMAIL_CLEANUP_SCRIPT = path.join(
  process.env.HOME || '',
  '.openclaw',
  'workspace',
  'bin',
  'gmail-cleanup'
);

const RULES_FILE = path.join(process.cwd(), 'lib/emmie-filing-rules.json');

interface Rule {
  _id: string;
  name: string;
  query: string;
  description: string;
  enabled: boolean;
  priority: number;
  type?: string;
  action?: string;
  condition?: string;
  targetLabel?: string;
  ageThresholdDays?: number;
  maxPerRun?: number;
}

interface RulesFile {
  filingRules: unknown[];
  autoTrashSenders: string[];
  autoTrashRules: unknown[];
  customRules: Rule[];
}

async function readRulesFile(): Promise<RulesFile> {
  const content = await fs.readFile(RULES_FILE, 'utf-8');
  return JSON.parse(content);
}

async function writeRulesFile(data: RulesFile): Promise<void> {
  await fs.writeFile(RULES_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    // Check if script exists
    try {
      await fs.access(GMAIL_CLEANUP_SCRIPT);
    } catch {
      return NextResponse.json({
        rules: [],
        account: '',
        message: 'Gmail cleanup script not found'
      });
    }

    // Read the script
    const content = await fs.readFile(GMAIL_CLEANUP_SCRIPT, 'utf-8');
    const lines = content.split('\n');

    // Extract account
    let account = '';
    const accountMatch = content.match(/ACCOUNT="([^"]+)"/);
    if (accountMatch) {
      account = accountMatch[1];
    }

    // Extract rules from search_and_trash calls
    const scriptRules: Rule[] = [];
    let priority = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for search_and_trash function calls
      if (line.startsWith('search_and_trash')) {
        // Extract query and description
        const match = line.match(/search_and_trash\s+"([^"]+)"\s+"([^"]+)"/);
        if (match) {
          const [, query, description] = match;

          // Check if this rule is commented out (disabled)
          const enabled = !line.startsWith('#');

          scriptRules.push({
            _id: `rule_${priority}`,
            name: description,
            query: query,
            description: `Gmail query: ${query}`,
            enabled,
            priority
          });

          priority++;
        }
      }
    }

    // Load custom rules from JSON store
    let customRules: Rule[] = [];
    try {
      const data = await readRulesFile();
      customRules = data.customRules || [];
    } catch {
      // JSON file unreadable — proceed with empty custom rules
    }

    const allRules = [...scriptRules, ...customRules];

    // If no rules found, provide default info
    if (allRules.length === 0) {
      return NextResponse.json({
        rules: [
          {
            _id: 'rule_default',
            name: 'No rules configured yet',
            query: '',
            description: 'Add search_and_trash calls to gmail-cleanup script',
            enabled: false,
            priority: 1
          }
        ],
        account,
        message: 'No active cleanup rules found in script'
      });
    }

    return NextResponse.json({
      rules: allRules,
      account,
      totalRules: allRules.length,
      activeRules: allRules.filter(r => r.enabled).length
    });
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json(
      { error: 'Failed to read configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, type, action, condition, targetLabel, ageThresholdDays, enabled, priority, maxPerRun } = body;

    if (!name || !condition) {
      return NextResponse.json(
        { error: 'name and condition are required' },
        { status: 400 }
      );
    }

    const newRule: Rule = {
      _id: randomUUID(),
      name,
      description: description || '',
      query: condition,
      condition,
      type: type || 'custom',
      action: action || 'delete',
      targetLabel: targetLabel || '',
      ageThresholdDays: ageThresholdDays ?? 30,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority ?? 5,
      maxPerRun: maxPerRun ?? 100,
    };

    const data = await readRulesFile();
    data.customRules = data.customRules || [];
    data.customRules.push(newRule);
    await writeRulesFile(data);

    return NextResponse.json({ rule: newRule }, { status: 201 });
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, type, action, condition, targetLabel, ageThresholdDays, enabled, priority, maxPerRun } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const data = await readRulesFile();
    data.customRules = data.customRules || [];

    const idx = data.customRules.findIndex(r => r._id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const existing = data.customRules[idx];
    const updated: Rule = {
      ...existing,
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(action !== undefined && { action }),
      ...(condition !== undefined && { condition, query: condition }),
      ...(targetLabel !== undefined && { targetLabel }),
      ...(ageThresholdDays !== undefined && { ageThresholdDays }),
      ...(enabled !== undefined && { enabled }),
      ...(priority !== undefined && { priority }),
      ...(maxPerRun !== undefined && { maxPerRun }),
    };

    data.customRules[idx] = updated;
    await writeRulesFile(data);

    return NextResponse.json({ rule: updated });
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    const data = await readRulesFile();
    data.customRules = data.customRules || [];

    const idx = data.customRules.findIndex(r => r._id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    data.customRules.splice(idx, 1);
    await writeRulesFile(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const data = await readRulesFile();
    data.customRules = data.customRules || [];

    const idx = data.customRules.findIndex(r => r._id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    data.customRules[idx] = {
      ...data.customRules[idx],
      enabled: !data.customRules[idx].enabled,
    };
    await writeRulesFile(data);

    return NextResponse.json({ rule: data.customRules[idx] });
  } catch (error) {
    console.error('Error toggling rule:', error);
    return NextResponse.json(
      { error: 'Failed to toggle rule' },
      { status: 500 }
    );
  }
}
