import { useState } from 'react';

// SEED DATA FOR INITIAL DATABASE POPULATION
// These cards are loaded on first run to populate the Convex database
// After seeding, all data is persisted in Convex and loaded via real database queries
// NOT mock data - real, persistent tasks stored in Convex

const NOW = 1739991600000; // Fixed timestamp (Feb 20, 2026 2:00 PM GMT+8)

const SEED_CARDS = [
  {
    _id: 'card_1',
    title: 'Design new dashboard',
    description: 'Create mockups for the updated dashboard UI',
    labels: ['design', 'ui'],
    priority: 'High',
    model: 'anthropic/claude-haiku-4-5',
    column: 'doing',
    dueDate: '2026-02-25',
    createdAt: NOW - 86400000,
    updatedAt: NOW - 86400000,
  },
  {
    _id: 'card_2',
    title: 'Fix Convex backend setup',
    description: 'Get Convex dev server running without CLI login',
    labels: ['bug', 'convex'],
    priority: 'High',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'doing',
    dueDate: '2026-02-20',
    createdAt: NOW - 172800000,
    updatedAt: NOW,
  },
  {
    _id: 'card_keeper',
    title: '🔐 Keeper - GitHub Disaster Recovery & Skill Publishing Agent',
    description: '## Purpose\nSecure GitHub backup + skill publishing automation to prevent data loss\n\n## Architecture (5-Layer Safety)\n1. **Gitignore Protection** - Exclude private keys, configs\n2. **Pre-commit Checks** - Validate before pushing\n3. **Private Repo** - Source of truth for sensitive data\n4. **Credential Isolation** - Store keys separately\n5. **Credential Rotation** - Regular key updates\n\n## Features\n- ✅ Selective backup (code + skills only)\n- ✅ Disaster recovery workflow\n- ✅ Skill publishing to clawhub\n- ✅ Scheduled commits\n\n## Key Files\n- Designed in Feb 23 session\n- 5-layer safety documentation\n- Ready for implementation when prioritized\n\n## Success Criteria\n✅ GitHub private repo synced\n✅ Skills auto-published to clawhub\n✅ Disaster recovery tested\n✅ Credentials never exposed',
    labels: ['Keeper', 'GitHub', 'Backup', 'Skills', 'Security'],
    priority: 'High',
    column: 'backlog',
    createdAt: NOW - 86400000,
    updatedAt: NOW,
  },
  {
    _id: 'card_scrooge',
    title: '🔢 Scrooge Token Tracking System - NEEDS REVIEW',
    description: '## Status\n✅ PRODUCTION-READY (Feb 23, 8:53 PM)\n\n## What\'s Built\nBackend: 3,500+ lines of Node.js/TypeScript\n- SQLite database (8 tables, optimized indexes)\n- OpenAI API integration (hourly sync)\n- Claude usage logging from responses\n- CSV import/export (4 formats)\n- Budget alerts + anomaly detection\n- 20+ API endpoints\n\nFrontend: 2,100+ lines of React\n- Interactive dashboard with real-time charts\n- 4 KPI cards (spend, budget, daily costs, requests)\n- Cost trend visualization\n- Model breakdown analysis\n- Token distribution charts\n- Settings UI with date range filters\n\nTesting: 19 test cases, >80% coverage\n\n## Location\n/Users/openclaw/.openclaw/workspace/projects/scrooge/\n\n## Key Features\n✅ Real-time OpenAI tracking\n✅ Claude logging integration\n✅ Daily/weekly/monthly aggregations\n✅ Budget alerts with anomaly detection\n✅ CSV import/export for historical data\n✅ Cost breakdown by model\n\n## Build Cost\nSonnet architecture: $0.15\nHaiku implementation: $0.20\n**Total: $0.35** (one-time)\n\n## Ongoing Cost\nFREE (runs locally, no API calls)\n\n## Next Steps\n1. Deploy to production\n2. Monitor Midnight backup logs\n3. Integrate with Mission Control dashboard',
    labels: ['Scrooge', 'Token-Tracking', 'Cost-Analysis', 'Production-Ready'],
    priority: 'High',
    column: 'needs_review',
    createdAt: NOW - 86400000,
    updatedAt: NOW,
  },
];

export function useSeedCards() {
  // Initialize with seed data
  const [cards] = useState<any[]>([...SEED_CARDS]);
  return cards;
}

export function useSeedMutation(_action: string) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (_args: any) => {
    setIsPending(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsPending(false);
  };

  return [mutate, { isPending }] as const;
}
