import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'lib', 'prompt-packs.json');

interface Pack {
  id: string;
  name: string;
  profession: string;
  promptCount: number;
  sections: string[];
  price: number;
  status: string;
  gumroadUrl: string | null;
  sales: number;
  revenue: number;
  rating: number | null;
  reviews: number;
  filePath: string;
  createdAt: number;
}

interface Bundle {
  id: string;
  name: string;
  price: number;
  sales: number;
  revenue: number;
  gumroadUrl: string | null;
}

interface Feedback {
  id: string;
  packId: string;
  rating: number;
  comment: string;
  createdAt: number;
}

interface PromptPacksDB {
  packs: Pack[];
  bundles: Bundle[];
  feedback: Feedback[];
  newPackIdeas: string[];
  lastUpdated: number;
}

async function readData(): Promise<PromptPacksDB> {
  try {
    const content = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { packs: [], bundles: [], feedback: [], newPackIdeas: [], lastUpdated: Date.now() };
  }
}

async function writeData(data: PromptPacksDB): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  const data = await readData();

  const totalSales = data.packs.reduce((s, p) => s + p.sales, 0) +
    data.bundles.reduce((s, b) => s + b.sales, 0);
  const totalRevenue = data.packs.reduce((s, p) => s + p.revenue, 0) +
    data.bundles.reduce((s, b) => s + b.revenue, 0);
  const avgRating = data.feedback.length > 0
    ? data.feedback.reduce((s, f) => s + f.rating, 0) / data.feedback.length
    : null;

  return NextResponse.json({
    ...data,
    stats: { totalSales, totalRevenue, avgRating, feedbackCount: data.feedback.length },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await readData();

  switch (body.action) {
    case 'update-pack': {
      const idx = data.packs.findIndex(p => p.id === body.id);
      if (idx === -1) return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
      data.packs[idx] = { ...data.packs[idx], ...body.updates };
      break;
    }
    case 'add-feedback': {
      data.feedback.push({
        id: `fb_${Date.now()}`,
        packId: body.packId,
        rating: body.rating,
        comment: body.comment,
        createdAt: Date.now(),
      });
      break;
    }
    case 'add-idea': {
      if (body.idea && !data.newPackIdeas.includes(body.idea)) {
        data.newPackIdeas.push(body.idea);
      }
      break;
    }
    case 'update-sales': {
      const pack = data.packs.find(p => p.id === body.packId);
      if (pack) {
        pack.sales = body.sales ?? pack.sales;
        pack.revenue = body.revenue ?? pack.revenue;
      }
      const bundle = data.bundles.find(b => b.id === body.bundleId);
      if (bundle) {
        bundle.sales = body.sales ?? bundle.sales;
        bundle.revenue = body.revenue ?? bundle.revenue;
      }
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  data.lastUpdated = Date.now();
  await writeData(data);
  return NextResponse.json({ success: true });
}
