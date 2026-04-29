/**
 * Mock data hook for Memory Bank
 * Replaces Convex queries with static mock data
 */

import { useMemo, useState, useCallback } from "react";

export interface Memory {
  _id: string;
  key: string;
  title: string;
  content: string;
  tags: string[];
  category?: string;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

// Shared state for pinned IDs (using a simple approach)
let globalPinnedIds = new Set<string>(["mem-mission-control-mvp", "mem-team-structure"]);

/**
 * Base memory data (without pin state)
 */
function getBaseMemories(): Omit<Memory, 'isPinned'>[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      _id: "mem-mission-control-mvp",
      key: "mission-control-mvp",
      title: "Mission Control MVP Complete",
      content: `# Mission Control MVP

**Status:** ✅ Complete

## Overview
Built the foundational Mission Control dashboard - a real-time command center for managing AI agents and tracking team activities.

## Key Features
- Agent status monitoring with live heartbeats
- Task tracking and assignment
- Team roster with roles and skills
- Activity timeline
- Office Space metrics dashboard

## Tech Stack
- Next.js 14 with App Router
- React Server Components
- Convex for backend (transitioning to mock data)
- TailwindCSS for styling
- Lucide icons

## Achievements
- Clean, intuitive UI design
- Real-time updates and state management
- Modular component architecture
- Responsive layout

## Next Steps
- Add notification system
- Implement task dependencies
- Enhanced analytics
- Integration with external tools (Trello, WhatsApp)`,
      tags: ["project", "milestone", "mission-control", "mvp"],
      category: "Project",
      createdAt: now - 7 * day,
      updatedAt: now - 1 * day,
    },
    {
      _id: "mem-team-structure",
      key: "team-structure",
      title: "Team: Joe (Main), Uni (Dev), Emmy (Executor)",
      content: `# Team Structure

## Core Team Members

### Joe - Main Orchestrator 🦞
- **Role:** Primary decision maker and project coordinator
- **Responsibilities:**
  - Strategic planning
  - Priority setting
  - Task delegation
  - Progress review
- **Skills:** Strategy, coordination, leadership

### Uni - Developer 🦄
- **Role:** AI assistant that builds features and solves problems
- **Reports to:** Joe
- **Responsibilities:**
  - Architecture design
  - Feature development
  - Code review and debugging
  - Technical problem solving
- **Skills:** Full-stack development, automation, system design

### Emmy - Executor 📧
- **Role:** Specialized automation agent
- **Reports to:** Joe
- **Responsibilities:**
  - Email automation and filtering
  - Data processing
  - Rule-based task execution
  - Scheduled automation
- **Skills:** Email management, rule engines, workflow automation

## Team Dynamics
- Joe sets direction and priorities
- Uni handles technical implementation
- Emmy manages routine automation tasks
- Clear reporting structure ensures coordination`,
      tags: ["team", "structure", "roles", "reference"],
      category: "Team",
      createdAt: now - 10 * day,
      updatedAt: now - 2 * day,
    },
    {
      _id: "mem-emmie-email-cleanup",
      key: "emmie-email-cleanup",
      title: "Emmie Email Cleanup Module",
      content: `# Emmie Email Cleanup Module

## Overview
Built automated email cleanup and categorization system for Emmy agent.

## Features
1. **Smart Filtering**
   - Promotional emails → Archive
   - Newsletters → Label and archive
   - Priority detection for important senders
   - Spam/phishing detection

2. **Rule Engine**
   - Pattern matching on subject/sender
   - Action triggers (archive, label, flag)
   - Scheduled execution (daily 3 AM)

3. **Reporting**
   - Daily summary of processed emails
   - Flagged items for manual review
   - Statistics and trends

## Implementation Notes
- Uses Gmail API for access
- State stored in local SQLite
- Error handling for API rate limits
- Backup before bulk operations

## Results
- Inbox reduced from 500+ to ~20 active emails
- 95% accuracy on categorization
- 30 minutes saved daily on email management`,
      tags: ["email", "automation", "emmy", "feature"],
      category: "Feature",
      createdAt: now - 14 * day,
      updatedAt: now - 14 * day,
    },
    {
      _id: "mem-playwright-headless",
      key: "playwright-headless-limitations",
      title: "Playwright Headless Rendering Limitations",
      content: `# Playwright Headless Mode Limitations

## Issue
Encountered rendering issues with certain SPAs (Single Page Apps) in headless mode.

## Root Cause
- Some sites detect headless browsers and block content
- CSS/JS animations may not trigger properly
- Canvas rendering can behave differently

## Solutions
1. **User-Agent Spoofing**
   \`\`\`javascript
   await page.setUserAgent('Mozilla/5.0 ...');
   \`\`\`

2. **Extra HTTP Headers**
   \`\`\`javascript
   await page.setExtraHTTPHeaders({
     'Accept-Language': 'en-US,en;q=0.9'
   });
   \`\`\`

3. **Wait for Network Idle**
   \`\`\`javascript
   await page.goto(url, { waitUntil: 'networkidle' });
   \`\`\`

4. **Fallback to Headed Mode**
   - Use \`headless: false\` for problematic sites
   - Run in virtual framebuffer (Xvfb) on servers

## Lessons Learned
- Always test both headed and headless
- Have fallback strategies
- Monitor for detection patterns`,
      tags: ["technical", "playwright", "automation", "debugging"],
      category: "Technical",
      createdAt: now - 20 * day,
      updatedAt: now - 20 * day,
    },
    {
      _id: "mem-convex-api-structure",
      key: "convex-api-reference",
      title: "Convex API Reference Structure",
      content: `# Convex API Structure

## Overview
Understanding Convex's file-based API system.

## Key Concepts

### 1. File Structure
\`\`\`
convex/
├── _generated/        # Auto-generated API types
├── schema.ts          # Database schema
├── queries.ts         # Read operations
├── mutations.ts       # Write operations
└── functions.ts       # Internal functions
\`\`\`

### 2. Queries (Read-only)
\`\`\`typescript
export const listItems = query({
  handler: async (ctx) => {
    return await ctx.db.query("items").collect();
  }
});
\`\`\`

### 3. Mutations (Write operations)
\`\`\`typescript
export const addItem = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("items", { text: args.text });
  }
});
\`\`\`

### 4. Client Usage
\`\`\`typescript
const items = useQuery(api.queries.listItems);
const addItem = useMutation(api.mutations.addItem);
\`\`\`

## Benefits
- Type-safe API
- Real-time subscriptions
- Automatic reactivity
- No REST boilerplate

## Gotchas
- Can't call mutations from queries
- Schema changes need deployment
- Local dev requires Convex CLI`,
      tags: ["technical", "convex", "api", "reference"],
      category: "Technical",
      createdAt: now - 18 * day,
      updatedAt: now - 18 * day,
    },
    {
      _id: "mem-online-program-cold-email",
      key: "online-program-cold-email-project",
      title: "Online Program Cold Email Campaign",
      content: `# Online Program Cold Email Campaign

## Project Goal
Automate personalized cold email outreach for Online Program groups.

## Strategy
1. **Lead Research**
   - Scrape LinkedIn profiles
   - Identify decision makers
   - Gather company context

2. **Email Personalization**
   - GPT-4 generates custom intro
   - References recent company news
   - Tailored value proposition

3. **Send & Track**
   - Gmail API for sending
   - Track opens/clicks
   - Automated follow-ups

## Results (Initial Test)
- 100 emails sent
- 38% open rate
- 12% reply rate
- 3 qualified meetings booked

## Key Learnings
- Personalization is crucial
- Timing matters (Tue-Thu, 10 AM)
- Follow-up sequence increases replies by 40%
- Avoid spam triggers (no links in first email)

## Next Steps
- Scale to 500 emails/week
- A/B test subject lines
- Build reply classifier
- Integrate with CRM`,
      tags: ["project", "cold-email", "automation", "marketing"],
      category: "Project",
      createdAt: now - 25 * day,
      updatedAt: now - 15 * day,
    },
    {
      _id: "mem-react-patterns",
      key: "react-patterns-best-practices",
      title: "React Patterns & Best Practices",
      content: `# React Patterns & Best Practices

## 1. Component Composition
**Bad:**
\`\`\`jsx
<Button color="blue" size="lg" icon="save" />
\`\`\`

**Good:**
\`\`\`jsx
<Button variant="primary" size="lg">
  <Icon name="save" />
  Save
</Button>
\`\`\`

## 2. Custom Hooks
Extract reusable logic:
\`\`\`typescript
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);
  
  return { data, loading };
}
\`\`\`

## 3. Render Props & Children as Function
\`\`\`jsx
<DataFetcher url="/api/users">
  {({ data, loading }) => (
    loading ? <Spinner /> : <UserList users={data} />
  )}
</DataFetcher>
\`\`\`

## 4. Error Boundaries
\`\`\`jsx
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
\`\`\`

## 5. Memoization
Use \`useMemo\` and \`useCallback\` wisely:
- For expensive calculations
- To prevent re-renders
- When passing callbacks to memoized children

## 6. Avoid Prop Drilling
Use Context or state management:
\`\`\`typescript
const ThemeContext = createContext<Theme>('light');
\`\`\``,
      tags: ["technical", "react", "patterns", "best-practices"],
      category: "Technical",
      createdAt: now - 30 * day,
      updatedAt: now - 30 * day,
    },
    {
      _id: "mem-trello-integration-decision",
      key: "trello-integration-decision",
      title: "Decision: Use Trello for Task Management",
      content: `# Decision: Trello Integration

## Context
Needed a task management solution that:
- Joe can access from mobile
- Integrates with automation
- Has a good API
- Free tier sufficient

## Options Evaluated
1. **Notion** - Too complex, slow API
2. **Linear** - Great but overkill for our use case
3. **Trello** - Simple, fast, excellent API
4. **Custom DB** - Too much maintenance

## Decision: Trello ✅

### Reasons
- Simple board/card model matches our workflow
- Fast and reliable API
- Mobile app is excellent
- Webhooks for real-time updates
- Free tier = unlimited cards

### Implementation
- Board: "Right Hands" (58ef9727b09801ee65f818e2)
- Lists: Backlog → In Progress → Done
- Automation via API + webhooks
- Priority: Joe/Ronnie/Made → top (pos=0)

### Trade-offs
- Less powerful than Linear
- No built-in time tracking
- Limited reporting

But simplicity wins for our use case.`,
      tags: ["decision", "tools", "trello", "task-management"],
      category: "Decision",
      createdAt: now - 35 * day,
      updatedAt: now - 35 * day,
    },
    {
      _id: "mem-whatsapp-contacts-db",
      key: "whatsapp-contacts-unified-db",
      title: "WhatsApp Contacts Unified Database",
      content: `# WhatsApp Contacts Database

## Overview
Created unified contacts.db for WhatsApp integration.

## Structure
\`\`\`sql
CREATE TABLE contacts (
  jid TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  is_group INTEGER,
  created_at TIMESTAMP
);
\`\`\`

## Location
\`${process.env.HOME}/.attache/workspace/Integrations/WhatsApp/contacts.db\`

## Key Contacts
- **Joe (Main):** 6281337352665@s.whatsapp.net
- **Team Group:** 120363402678443931@g.us

## CLI Usage
\`\`\`bash
wacli send text --to "6281337352665@s.whatsapp.net" --message "Hello"
\`\`\`

## Integration Points
- Used by Emmy for notifications
- Task assignments from Trello
- Daily summaries
- Alerts and reminders

## Future Enhancements
- Contact sync from phone
- Group management
- Message templates
- Scheduled messages`,
      tags: ["whatsapp", "integration", "contacts", "database"],
      category: "Technical",
      createdAt: now - 28 * day,
      updatedAt: now - 10 * day,
    },
    {
      _id: "mem-google-places-home",
      key: "google-places-home-location",
      title: "Google Places: Home Location Setup",
      content: `# Google Places Configuration

## Home Base
**Location:** Happy Days Villa 1, Bali  
**Coordinates:** -8.65, 115.21

## Use Cases
1. **Local Search**
   - "Find coffee shops near me"
   - "Restaurants within 5km"
   
2. **Time Zone**
   - Asia/Singapore (UTC+8)
   - For scheduling and timestamps

3. **Location-Based Automation**
   - Morning briefing at 7 AM local
   - Evening summary at 8 PM local

## API Integration
\`\`\`javascript
const HOME_LAT = -8.65;
const HOME_LNG = 115.21;

const nearbyPlaces = await places.searchNearby({
  location: { lat: HOME_LAT, lng: HOME_LNG },
  radius: 5000,
  type: 'restaurant'
});
\`\`\`

## Privacy Note
- Home coordinates approximate (within 1km)
- Not shared in external APIs
- Used only for local context`,
      tags: ["location", "google-places", "config", "reference"],
      category: "Configuration",
      createdAt: now - 40 * day,
      updatedAt: now - 40 * day,
    },
    {
      _id: "mem-hunter-api-email-verification",
      key: "hunter-api-email-verification",
      title: "Hunter.io Email Verification Integration",
      content: `# Hunter.io Email Verification

## Purpose
Verify email addresses before sending cold emails to reduce bounce rate.

## API Key
Stored in \`.env\` as \`HUNTER_API_KEY\`

## Usage
\`\`\`javascript
const response = await fetch(
  \`https://api.hunter.io/v2/email-verifier?email=\${email}&api_key=\${apiKey}\`
);

const { result, score } = await response.json();
// result: "deliverable" | "undeliverable" | "risky"
// score: 0-100
\`\`\`

## Decision Logic
- score >= 70 → Safe to send
- score 50-69 → Manual review
- score < 50 → Skip

## Results
- Reduced bounce rate from 12% to 3%
- Improved sender reputation
- Saved ~$50/month in wasted sends

## Limits
- Free tier: 50 verifications/month
- Paid: $49/month for 1,000 verifications

## Alternative
- ZeroBounce (more expensive but more accurate)
- NeverBounce (bulk verification)`,
      tags: ["email", "verification", "hunter-io", "cold-email"],
      category: "Integration",
      createdAt: now - 32 * day,
      updatedAt: now - 32 * day,
    },
    {
      _id: "mem-nvidia-kimi-api",
      key: "nvidia-kimi-api-setup",
      title: "Nvidia Kimi API Setup",
      content: `# Nvidia Kimi API

## Overview
Using Nvidia's Kimi model for specific AI tasks.

## API Key
\`NVIDIA_API_KEY\` in .env

## Model Specs
- Context window: 128k tokens
- Fast inference (< 2s for most queries)
- Good at code generation and analysis

## Use Cases
1. Code review and suggestions
2. Technical documentation generation
3. Summarization of long documents
4. Translation

## Example
\`\`\`javascript
const response = await fetch('https://api.nvidia.com/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.NVIDIA_API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'kimi',
    messages: [{ role: 'user', content: 'Explain React hooks' }]
  })
});
\`\`\`

## Comparison to GPT-4
- Faster response time
- Better at technical tasks
- Weaker at creative writing
- More cost-effective for bulk operations

## Cost
- $0.002 per 1k tokens (5x cheaper than GPT-4)`,
      tags: ["ai", "nvidia", "kimi", "api", "llm"],
      category: "Integration",
      createdAt: now - 22 * day,
      updatedAt: now - 22 * day,
    },
    {
      _id: "mem-telegram-bot-setup",
      key: "telegram-bot-attaché",
      title: "Telegram Bot: @openclawjoeunibot",
      content: `# Telegram Bot Setup

## Bot Details
- **Username:** @openclawjoeunibot
- **Token:** \`TELEGRAM_BOT_TOKEN\` in .env

## Features
1. **Task Notifications**
   - New task assigned
   - Task completed
   - Deadline approaching

2. **Commands**
   - \`/status\` - Get current tasks
   - \`/summary\` - Daily summary
   - \`/help\` - Command list

3. **Inline Queries**
   - Search memories
   - Quick task creation

## Setup
\`\`\`bash
# Set webhook
curl -X POST \\
  https://api.telegram.org/bot$TOKEN/setWebhook \\
  -d "url=https://mission-control.attache.ai/api/telegram"
\`\`\`

## Implementation
- Next.js API route handles webhooks
- Message queue for reliability
- Rate limiting: 30 messages/second

## Privacy
- Only responds to whitelisted user IDs
- No message logging
- E2E encryption for sensitive data

## Future Ideas
- Voice message transcription
- Image recognition for screenshots
- Inline keyboard for quick actions`,
      tags: ["telegram", "bot", "notifications", "integration"],
      category: "Integration",
      createdAt: now - 45 * day,
      updatedAt: now - 12 * day,
    },
    {
      _id: "mem-openai-api-usage",
      key: "openai-api-key-usage",
      title: "OpenAI API Key & Usage",
      content: `# OpenAI API Configuration

## API Key
\`OPENAI_API_KEY\` stored in .env

## Models Used
1. **GPT-4 Turbo** - Primary model
   - Complex reasoning
   - Code generation
   - Strategic decisions
   
2. **GPT-3.5 Turbo** - Secondary
   - Simple queries
   - Fast responses
   - Cost optimization

3. **Text-Embedding-3-Large**
   - Memory search
   - Semantic similarity

## Cost Management
- Average: $50/month
- Peak: $120/month (during development)
- Optimization:
  - Cache common responses
  - Use GPT-3.5 where possible
  - Truncate long context

## Best Practices
- System prompt in separate file
- Temperature: 0.7 for creative, 0.2 for factual
- Max tokens: 1000 default, 4000 for code
- Streaming for better UX

## Rate Limits
- Tier 1: 3,500 RPM, 90,000 TPM
- Monitor via usage dashboard
- Implement exponential backoff

## Safety
- Content filtering enabled
- No PII in prompts
- Audit logs for sensitive queries`,
      tags: ["openai", "gpt", "api", "config", "ai"],
      category: "Configuration",
      createdAt: now - 50 * day,
      updatedAt: now - 8 * day,
    },
    {
      _id: "mem-daily-routine-automation",
      key: "daily-routine-automation",
      title: "Daily Routine Automation Flow",
      content: `# Daily Automation Routine

## Morning (7 AM SGT)
1. **Emmy:** Email Cleanup
   - Archive old newsletters
   - Flag urgent emails
   - Categorize inbox

2. **Uni:** System Health Check
   - API status verification
   - Database backup
   - Error log review

3. **Joe:** Daily Briefing
   - Yesterday's accomplishments
   - Today's priorities
   - Blockers and risks

## Midday (12 PM SGT)
- Progress check-in
- Trello sync
- Respond to urgent items

## Evening (8 PM SGT)
1. **Emmy:** Email Summary
   - Important emails (requires response)
   - FYI items
   - Tomorrow's scheduled sends

2. **Uni:** Code Commit & Deploy
   - Push day's work
   - Run tests
   - Deploy to staging

3. **Joe:** EOD Summary
   - Tasks completed
   - Tasks carried over
   - Notes for tomorrow

## Weekend
- Light monitoring only
- Critical alerts only
- Full backup on Sunday 2 AM

## Implementation
- Cron jobs on server
- Telegram notifications
- Failure alerts to Joe

## Metrics
- Automation saves ~2 hours/day
- 95% reliability
- 0 missed critical tasks in 30 days`,
      tags: ["automation", "routine", "workflow", "productivity"],
      category: "Process",
      createdAt: now - 42 * day,
      updatedAt: now - 5 * day,
    },
    {
      _id: "mem-mission-control-architecture",
      key: "mission-control-architecture",
      title: "Mission Control Architecture Overview",
      content: `# Mission Control Architecture

## Tech Stack
- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** TailwindCSS
- **Backend:** Convex (transitioning to mock data)
- **Deployment:** Vercel
- **Database:** Convex DB → Future: PostgreSQL

## Project Structure
\`\`\`
mission-control/
├── app/                 # Next.js app directory
│   ├── app/            # Main app pages
│   │   ├── dashboard/  # Dashboard page
│   │   ├── team/       # Team space
│   │   ├── office/     # Office space
│   │   ├── memory/     # Memory bank
│   │   └── layout.tsx  # App layout
│   └── layout.tsx      # Root layout
├── components/         # Reusable components
│   ├── Sidebar.tsx
│   ├── Navbar.tsx
│   └── ...
├── hooks/             # Custom React hooks
│   ├── useMockTeam.ts
│   ├── useMockMemory.ts
│   └── ...
├── convex/           # Convex backend (being phased out)
└── public/           # Static assets
\`\`\`

## Key Design Decisions
1. **Server Components by Default**
   - Faster initial page load
   - Smaller client bundle
   - Use 'use client' only when needed

2. **Mock Data Phase**
   - Rapid prototyping
   - No backend dependency
   - Easy to demo

3. **Modular Architecture**
   - Each page is self-contained
   - Shared components in /components
   - Hooks for data logic

## Performance
- Lighthouse score: 95+
- First Contentful Paint: < 1s
- Time to Interactive: < 2s

## Future Scaling
- Move to PostgreSQL for production
- Add Redis for caching
- Implement proper authentication
- Microservices for heavy tasks`,
      tags: ["architecture", "mission-control", "technical", "overview"],
      category: "Technical",
      createdAt: now - 15 * day,
      updatedAt: now - 3 * day,
    },
  ];
}

/**
 * Returns mock memories with realistic content and pin state
 */
export function useMockMemories(): Memory[] {
  const [pinnedIds] = useState<Set<string>>(globalPinnedIds);

  // Sync with global state
  const memories = useMemo(() => {
    const base = getBaseMemories();
    return base.map(mem => ({
      ...mem,
      isPinned: pinnedIds.has(mem._id)
    }));
  }, [pinnedIds]);

  return memories;
}

/**
 * Hook to toggle pin status (local state only)
 */
export function useTogglePin() {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(globalPinnedIds);

  const togglePin = useCallback((memoryId: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(memoryId)) {
        next.delete(memoryId);
      } else {
        next.add(memoryId);
      }
      globalPinnedIds = next; // Update global state
      return next;
    });
  }, []);

  return { pinnedIds, togglePin };
}
