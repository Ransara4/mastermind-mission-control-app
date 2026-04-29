import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const IDEAS_PATH = path.join(process.cwd(), 'lib', 'passive-ideas.json');
const DB_PATH = path.join(process.cwd(), 'lib', 'db.json');

interface PassiveIdea {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'new' | 'researching' | 'validated' | 'building' | 'live' | 'rejected';
  potentialMonthlyIncome: { low: number; high: number };
  difficulty: 'Easy' | 'Medium' | 'Hard';
  automationRating: number; // 1-10, how much Claude can automate
  manualSteps: string;
  manualTimeEstimate: string;
  realism: number; // 1-10
  source: string;
  sourceUrl?: string;
  startupCost: string;
  timeToFirstRevenue: string;
  tags: string[];
  notes: string;
  instructionsForClaude: string;
  createdAt: number;
  updatedAt: number;
}

interface IdeasDB {
  ideas: PassiveIdea[];
  sources: string[];
  lastResearchRun: number | null;
}

async function readIdeas(): Promise<IdeasDB> {
  try {
    const content = await fs.readFile(IDEAS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { ideas: [], sources: [], lastResearchRun: null };
  }
}

async function writeIdeas(db: IdeasDB): Promise<void> {
  await fs.writeFile(IDEAS_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export async function GET(req: NextRequest) {
  try {
    const db = await readIdeas();
    const { searchParams } = new URL(req.url);

    let ideas = db.ideas;

    const status = searchParams.get('status');
    if (status && status !== 'all') ideas = ideas.filter(i => i.status === status);

    const category = searchParams.get('category');
    if (category && category !== 'all') ideas = ideas.filter(i => i.category === category);

    const difficulty = searchParams.get('difficulty');
    if (difficulty && difficulty !== 'all') ideas = ideas.filter(i => i.difficulty === difficulty);

    const minAutomation = searchParams.get('minAutomation');
    if (minAutomation) ideas = ideas.filter(i => i.automationRating >= parseInt(minAutomation));

    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') || 'desc';

    ideas.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'potentialMonthlyIncome') {
        aVal = a.potentialMonthlyIncome.high;
        bVal = b.potentialMonthlyIncome.high;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return NextResponse.json({ ideas, sources: db.sources, lastResearchRun: db.lastResearchRun });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read ideas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const db = await readIdeas();

    if (action === 'create') {
      // Check for duplicate title
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingTitles = new Set(db.ideas.map(i => normalize(i.title)));
      if (existingTitles.has(normalize(body.title || ''))) {
        return NextResponse.json({ error: 'Duplicate idea title', skipped: true }, { status: 409 });
      }

      const idea: PassiveIdea = {
        _id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: body.title || '',
        description: body.description || '',
        category: body.category || 'other',
        status: body.status || 'new',
        potentialMonthlyIncome: body.potentialMonthlyIncome || { low: 0, high: 0 },
        difficulty: body.difficulty || 'Medium',
        automationRating: body.automationRating || 5,
        manualSteps: body.manualSteps || '',
        manualTimeEstimate: body.manualTimeEstimate || '',
        realism: body.realism || 5,
        source: body.source || 'claude-generated',
        sourceUrl: body.sourceUrl || '',
        startupCost: body.startupCost || '$0',
        timeToFirstRevenue: body.timeToFirstRevenue || 'Unknown',
        tags: body.tags || [],
        notes: body.notes || '',
        instructionsForClaude: body.instructionsForClaude || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      db.ideas.push(idea);
      await writeIdeas(db);
      return NextResponse.json(idea);
    }

    if (action === 'bulk-create') {
      // Build set of existing titles (normalized) for dedup
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingTitles = new Set(db.ideas.map(i => normalize(i.title)));

      const incoming = (body.ideas || []).map((i: any) => ({
        _id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: i.title || '',
        description: i.description || '',
        category: i.category || 'other',
        status: i.status || 'new',
        potentialMonthlyIncome: i.potentialMonthlyIncome || { low: 0, high: 0 },
        difficulty: i.difficulty || 'Medium',
        automationRating: i.automationRating || 5,
        manualSteps: i.manualSteps || '',
        manualTimeEstimate: i.manualTimeEstimate || '',
        realism: i.realism || 5,
        source: i.source || 'claude-generated',
        sourceUrl: i.sourceUrl || '',
        startupCost: i.startupCost || '$0',
        timeToFirstRevenue: i.timeToFirstRevenue || 'Unknown',
        tags: i.tags || [],
        notes: i.notes || '',
        instructionsForClaude: i.instructionsForClaude || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      // Filter out duplicates by normalized title
      const newIdeas: PassiveIdea[] = [];
      let skipped = 0;
      for (const idea of incoming) {
        const key = normalize(idea.title);
        if (existingTitles.has(key)) {
          skipped++;
          continue;
        }
        existingTitles.add(key);
        newIdeas.push(idea);
      }

      db.ideas.push(...newIdeas);
      if (body.updateLastRun) db.lastResearchRun = Date.now();
      await writeIdeas(db);
      return NextResponse.json({ created: newIdeas.length, skipped });
    }

    if (action === 'send-to-tasks') {
      const idea = db.ideas.find(i => i._id === body.id);
      if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });

      // Read the tasks DB and add a card to "claude-code-todo" column
      const tasksContent = await fs.readFile(DB_PATH, 'utf-8');
      const tasksDB = JSON.parse(tasksContent);

      // Bump existing card orders in the column
      tasksDB.cards = tasksDB.cards.map((c: any) =>
        c.column === 'claude-code-todo' ? { ...c, order: c.order + 1 } : c
      );

      // Build a focused task card: instructions first, then just the context needed to execute
      const sections: string[] = [];

      // The instructions ARE the task — this is what Claude will actually do
      if (idea.instructionsForClaude) {
        sections.push(idea.instructionsForClaude);
      } else {
        sections.push(`Build and deploy: ${idea.description}`);
      }

      // Only include context the executor actually needs
      sections.push(`\n---\nCONTEXT\n- Startup budget: ${idea.startupCost}\n- Manual steps (user must do): ${idea.manualSteps}\n- Source idea: ${idea._id}`);

      const newCard = {
        _id: `card_${Date.now()}`,
        title: `[Passive Income] ${idea.title}`,
        description: sections.join('\n'),
        labels: ['passive-income', idea.category],
        priority: idea.difficulty === 'Easy' ? 'Low' : idea.difficulty === 'Medium' ? 'Med' : 'High',
        column: 'claude-code-todo',
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      tasksDB.cards.push(newCard);
      await fs.writeFile(DB_PATH, JSON.stringify(tasksDB, null, 2), 'utf-8');

      // Update the idea status
      const idx = db.ideas.findIndex(i => i._id === body.id);
      db.ideas[idx].status = 'building';
      db.ideas[idx].updatedAt = Date.now();
      await writeIdeas(db);

      return NextResponse.json({ success: true, cardId: newCard._id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, updates } = await req.json();
    if (!id || !updates) return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });

    const db = await readIdeas();
    const idx = db.ideas.findIndex(i => i._id === id);
    if (idx === -1) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });

    db.ideas[idx] = { ...db.ideas[idx], ...updates, updatedAt: Date.now() };
    await writeIdeas(db);
    return NextResponse.json(db.ideas[idx]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const db = await readIdeas();
    const initialLength = db.ideas.length;
    db.ideas = db.ideas.filter(i => i._id !== id);
    if (db.ideas.length === initialLength) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await writeIdeas(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 });
  }
}
