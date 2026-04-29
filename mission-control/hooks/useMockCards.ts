import { useState } from 'react';

// Mock card data (using static timestamps to avoid hydration mismatch)
const NOW = 1739991600000; // Fixed timestamp (Feb 20, 2026 2:00 PM GMT+8)

const MOCK_CARDS = [
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
    _id: 'card_3',
    title: 'Implement search feature',
    description: 'Add full-text search for tasks across all columns',
    labels: ['feature', 'search'],
    priority: 'Med',
    model: 'anthropic/claude-haiku-4-5',
    column: 'backlog',
    createdAt: NOW - 259200000,
    updatedAt: NOW - 259200000,
  },
  {
    _id: 'card_4',
    title: 'Write API documentation',
    description: 'Document all Convex functions and their parameters',
    labels: ['docs'],
    priority: 'Low',
    model: 'anthropic/claude-haiku-4-5',
    column: 'backlog',
    createdAt: NOW - 345600000,
    updatedAt: NOW - 345600000,
  },
  {
    _id: 'card_5',
    title: 'Review code changes',
    description: 'PR review for mission-control updates',
    labels: ['review', 'qa'],
    priority: 'Med',
    model: 'anthropic/claude-haiku-4-5',
    column: 'review',
    createdAt: NOW - 432000000,
    updatedAt: NOW - 432000000,
  },
  {
    _id: 'card_6',
    title: 'Deploy to staging',
    description: 'Push latest build to staging environment',
    labels: ['deploy', 'staging'],
    priority: 'High',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'done',
    dueDate: '2026-02-19',
    createdAt: NOW - 518400000,
    updatedAt: NOW - 518400000,
  },
  {
    _id: 'card_7',
    title: 'Deploy Emmie Email Cleanup module',
    description: 'Build and deploy Email Cleanup dashboard with rules management, whitelist viewer, metrics tracking, and approval workflow',
    labels: ['emmie', 'module', 'deployment'],
    priority: 'High',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'done',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_8',
    title: 'Open Box: Preconfigured OpenClaw Distribution',
    description: `Build zero-friction distribution package. Three tiers:
- Pre-packaged Zip (free, self-hosted, 1GB download, works in 60s)
- Docker Compose (free, self-hosted, same experience)
- VPS One-Click ($29-49/mo, managed, cloud-hosted)
Key: User enters API keys in web UI, system works immediately.
Timeline: 3-5 days for Phase 1 (zip release)`,
    labels: ['open-box', 'distribution', 'launch'],
    priority: 'High',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_9',
    title: 'Sales Outreach Agent (High Priority)',
    description: `Build AI agent for cold outreach automation:
FEATURES:
- Import CSV of prospects
- Agent researches each (LinkedIn, Crunchbase, news)
- Generates truly personalized cold emails (not templates)
- Sends via email + LinkedIn with spacing
- Auto-follows up based on engagement (3 day delays)
- Tracks opens/clicks/responses in CRM
- Measures response rate, optimizes copy
- Dashboard with metrics & campaign management

TARGET USERS: Sales teams, SDRs, founders, consultants, agencies
REVENUE: $199-999/month SaaS
IMPLEMENTATION: Medium complexity, high ROI
LAUNCH POTENTIAL: Year 1 revenue $500K-2M`,
    labels: ['product', 'sales-automation', 'saas'],
    priority: 'High',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_10',
    title: 'Personal Brand Autopilot Agent',
    description: `Build content generation + posting agent for solopreneurs:
FEATURES:
- Monitors industry trends 24/7
- Generates relevant content daily (LinkedIn, Twitter, email)
- Posts automatically on user's schedule
- Intelligently responds to comments
- Measures engagement + ROI per post
- Learns user's voice over time (improves quality)
- Personal brand growth dashboard
- Weekly insights + trending topics

TARGET USERS: Consultants, coaches, founders, SaaS founders, thought leaders
REVENUE: $49-199/month (Tier 1), can bundle with Sales Agent
IMPLEMENTATION: Medium, leverages existing agent framework
DIFFERENTIATOR: Personal brand + thought leadership (not just content)`,
    labels: ['product', 'content-automation', 'saas'],
    priority: 'High',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_11',
    title: 'Content Calendar + Auto-Generation',
    description: `Build content planning + generation system:
FEATURES:
- Content calendar UI (topics/dates/channels)
- Agent researches each topic (web scraping)
- Generates full content (blog, LinkedIn, email, Twitter)
- Auto-creates social clips/excerpts
- Posts to all channels on schedule
- Email sequence generation
- Analytics dashboard (engagement per content piece)

TARGET USERS: Agencies (20+ clients), solopreneurs, SaaS, marketers
REVENUE: $79-399/month
IMPLEMENTATION: Medium (content generation + scheduling)
MOAT: Integration with all major platforms`,
    labels: ['product', 'content-automation', 'saas'],
    priority: 'Medium',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_12',
    title: 'Podcast/Newsletter Automation Agent',
    description: `Build content repurposing system for audio/text creators:
FEATURES:
- Upload podcast episode OR paste newsletter text
- Agent auto-transcribes (if audio)
- Generates show notes (timestamp-based)
- Creates 5-10 short social clips (video ready)
- Writes email announcement
- Generates blog post from episode
- Creates LinkedIn article version
- Posts everything on schedule

TARGET USERS: Podcast hosts, newsletter creators, YouTubers
REVENUE: $49-199/month
IMPLEMENTATION: Medium (needs audio transcription API + video clip generation)
DIFFERENTIATOR: End-to-end repurposing in one agent`,
    labels: ['product', 'content-automation', 'saas'],
    priority: 'Medium',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_13',
    title: 'Email Drip Campaign Automation',
    description: `Build email sequence automation (most profitable channel):
FEATURES:
- Define customer journey (awareness → consideration → decision)
- Agent generates email sequence (5-10 emails)
- Personalization by customer segment
- A/B testing variants (subject lines, copy, CTAs)
- Auto-tracks open rates, clicks, conversions
- Optimizes send times (per recipient timezone)
- Auto-responds to replies intelligently
- Performance analytics dashboard

TARGET USERS: E-commerce, SaaS, coaches, consultants, real estate
REVENUE: $99-499/month (tiered by email volume)
IMPLEMENTATION: Medium (email service integrations)
OPPORTUNITY: Email is most profitable but least automated channel`,
    labels: ['product', 'email-automation', 'saas'],
    priority: 'Medium',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_14',
    title: 'Client Proposal Generator (B2B Services)',
    description: `Build intelligent proposal system for service businesses:
FEATURES:
- Input: Client industry, pain points, budget, timeline
- Agent researches industry benchmarks + case studies
- Generates custom, data-backed proposal
- Multiple pricing options included
- Includes relevant case studies + testimonials
- Methodology/timeline section
- Export to PDF/Word/Google Docs
- Template library for different verticals

TARGET USERS: Agencies, consultants, freelancers, SaaS enterprise sales
REVENUE: $149-599/month (or $50-200 per proposal)
IMPLEMENTATION: Easy/Medium (mostly template + research)
DIFFERENTIATOR: Truly custom, not template-based
QUICK WIN: Can launch in 1-2 weeks`,
    labels: ['product', 'b2b-automation', 'saas'],
    priority: 'Medium',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_15',
    title: 'Content Command Center Dashboard (Meta-Product)',
    description: `Build unified dashboard for all content + outreach agents:
FEATURES:
- Single interface for all agents (personal brand, sales, content, email)
- Real-time channel view (LinkedIn, Twitter, email, website)
- Unified analytics across all channels
- Team collaboration (assign tasks to team members)
- Agent performance metrics + optimization suggestions
- Scheduling calendar for all content types
- Approval workflows before posting
- ROI tracking (leads generated, sales influenced)

TARGET USERS: Agencies, marketing teams, founders, entrepreneurs
REVENUE: $399-1999/month (premium tier)
IMPLEMENTATION: UI + agent coordination (medium)
DIFFERENTIATOR: Only platform combining all automation agents
MOAT: Network effect (more agents → more valuable dashboard)`,
    labels: ['product', 'platform', 'meta'],
    priority: 'Medium',
    model: 'anthropic/claude-sonnet-4-5',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_teddy_auth_phonecode',
    title: '🔐 Teddy: Telegram Auth - Phone Code (Retry Feb 24)',
    description: `## Status
Paused until Feb 24, 22:51+ GMT+8 (48 hour cooldown)

## What We Did (Feb 22)
- ✅ QR codes generated in <5 seconds (base64 token encoding)
- ✅ User approved 6 times in Telegram (6 active sessions visible)
- ❌ GramJS polling never detected approval (AUTH_KEY_UNREGISTERED error)
- ❌ Tried: keep-alive connections, early/late saving, fresh sessions

## Why QR Auth Failed
1. Event detection gap — GramJS doesn't receive Telegram approval events
2. Token expires 30 seconds, manual approval too slow
3. Server approves but client lib never finds out

## Earlier Phone Code Attempt
Error: 'incomplete login attempt' + 24-48 hour cooldown
Root cause: Flow abandoned partway through (code sent but signin not completed)
Solution: Complete entire flow atomically in ONE execution

## Next Steps (Feb 24+)
1. Request code via sendCodeRequest(phone)
2. User gets code in Telegram app
3. User provides code via message
4. Immediately call signIn(phone, code) — NO DELAYS
5. Save session while connected
6. Run cleanup test

## Key Files
- Memory: /Users/openclaw/.openclaw/workspace/memory/2026-02-22.md
- QR Docs: agents/teddy/QR_CODE_GENERATION_REFERENCE.md
- Cleanup: agents/teddy/teddy-delete-5-v2.js

## Research: Why Phone Code Works Better
- Different auth flow than QR
- Code entry is explicit (not polling-based)
- GramJS has better support
- Atomic execution prevents incomplete attempt errors

## Success Criteria
✅ Valid session saved to .teddy-session
✅ client.getMe() returns user info
✅ teddy-delete-5-v2.js can delete messages`,
    labels: ['Teddy', 'Telegram', 'Authentication'],
    priority: 'High',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    _id: 'card_wix_mcp_server',
    title: '🔌 Set up Wix MCP server connection',
    description: `## Objective
Establish Model Context Protocol (MCP) server connection to Wix for OpenClaw integration

## What is Wix MCP?
MCP = Model Context Protocol
- Allows Claude/agents to read/write data directly to Wix
- Enables automation of Wix sites without webhooks
- Real-time access to site content, forms, collections

## Scope (Initial)
1. Set up Wix OAuth credentials (app-key, API token)
2. Configure MCP server (local or remote)
3. Test read access (fetch pages, collections)
4. Test write access (update content, create items)
5. Document integration workflow

## Why This Matters
- Direct automation for Wix sites
- No manual API calls or custom scripts needed
- Agents can manage Wix content autonomously
- Foundation for automated site updates, form submissions, etc.

## Implementation Steps
1. Create Wix API app (wix.com/en-US/velo)
2. Get OAuth credentials
3. Set up MCP server in /opt/openclaw or local
4. Configure OpenClaw gateway to use MCP
5. Test with sample queries (read pages, collections)
6. Test with sample mutations (create/update)

## Success Criteria
✅ Can connect to Wix via MCP
✅ Can read pages & collections
✅ Can create/update content
✅ OpenClaw agents can use the connection
✅ Documented for future use`,
    labels: ['Wix', 'MCP', 'Integration'],
    priority: 'High',
    column: 'backlog',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export function useMockCards() {
  // Initialize with data immediately instead of delayed
  const [cards] = useState<any[]>([...MOCK_CARDS]);

  return cards;
}

export function useMockMutation(_action: string) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (_args: any) => {
    setIsPending(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsPending(false);
  };

  return [mutate, { isPending }] as const;
}
