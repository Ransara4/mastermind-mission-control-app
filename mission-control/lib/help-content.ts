// Help content for every Mission Control page.
// Each entry is keyed by the page's pathname.
// Descriptions use inline HTML: wrap key terms in <span class="hl"> for purple highlighting.

export interface HelpEntry {
  title: string;
  description: string;
  advanced: string;
}

const DEFAULT_HELP: HelpEntry = {
  title: "Page Help",
  description: "Help content for this page hasn't been added yet. Check back soon.",
  advanced: "",
};

const HELP_CONTENT: Record<string, HelpEntry> = {
  "/app": {
    title: "Dashboard",
    description:
      '<p>Your <span class="hl">home dashboard</span> with at-a-glance system health. See disk usage, recent cleanup stats, <span class="hl">active agent count</span>, warnings, and human tasks needing attention.</p>' +
      '<p>Quick links to key sections and a <span class="hl">recent activity feed</span> keep you oriented.</p>',
    advanced:
      "The dashboard aggregates data from multiple API endpoints. Widgets are independent components that fetch their own data on mount.",
  },
  "/app/tasks": {
    title: "Task Board",
    description:
      '<p>A <span class="hl">kanban-style task board</span> where you organize work across customizable columns. Create, edit, and move cards between columns like Backlog, In Progress, Done, and more. Cards can have <span class="hl">titles, descriptions, labels, priorities, and due dates</span>.</p>' +
      '<p><span class="hl">Drag cards</span> between columns to change their status. <span class="hl">Double-click</span> any card to edit its title, description, project, or priority. Search across all cards or filter by project to stay focused.</p>' +
      '<p><span class="hl">AI (Auto Execute)</span> is a special column: the Paperclip agent monitors it and automatically picks up tasks to run on a schedule. Drop a card there and the AI handles it.</p>' +
      '<p><span class="hl">Human Must Do</span> is where the AI places tasks it cannot handle alone. These need your personal action: approvals, phone calls, recordings, or decisions.</p>' +
      '<p><span class="hl">Projects</span> let you group related cards. Use the project dropdown at the top to filter the board. Manage projects in the Projects tab.</p>',
    advanced: "TASKS_ADVANCED",
  },
  "/app/tasks/projects": {
    title: "Project Management",
    description:
      '<p>A high-level overview of all active and completed projects with detailed metadata. View projects in a table with <span class="hl">monetization levels, time-to-income horizons, and time-saved estimates</span>. Each project shows its status (Active, Completed, Hidden), monthly income projection, and due date.</p>' +
      '<p>Create new projects or edit existing ones via modal dialogs. Projects support <span class="hl">multiple metadata fields</span> including description, monetization level, horizon, time saved category, and estimated monthly income.</p>' +
      '<p>Projects serve as containers for tasks on the main task board, allowing you to <span class="hl">organize work by initiative</span> or business area. Drag rows to reorder priorities.</p>',
    advanced:
      "Projects are managed through the /api/db endpoint. Project metadata is stored separately in a projectMeta record keyed by project name. Create projects via POST /api/db with action='createProject'. The page uses useDatabase hook for all project operations.",
  },
  "/app/projects": {
    title: "File Browser",
    description:
      '<p>A full-featured <span class="hl">file tree navigator</span> for exploring your workspace files. Browse folders and view file contents in a split-pane layout with a resizable sidebar.</p>' +
      '<p>Click any file to see its content rendered inline: <span class="hl">markdown displays formatted, code syntax-highlights, images and videos embed</span>, and CSV data displays as a sortable table.</p>' +
      '<p><span class="hl">Edit text files directly</span> in a built-in editor and save changes. Files are color-coded by type: code files in green, JSON in amber, documents in white. Search files by name or content, and filter by type (code, docs, images, data, video, audio, PDF).</p>',
    advanced:
      "The file tree is fetched from /api/repo/tree which reads the workspace directory. File contents are loaded on demand via /api/repo/file. Text files are displayed directly with syntax highlighting. Images, videos, and PDFs render via HTML5 elements. CSV files are parsed client-side and rendered as HTML tables. Edit operations save via the backend endpoint.",
  },
  "/app/office": {
    title: "Agent Office Space",
    description:
      '<p>Real-time monitoring dashboard for all <span class="hl">agents in the network</span> showing live status, current task, activity level, and productivity metrics. Each agent appears as a <span class="hl">desk card</span> with avatar, name, status badge (Working, Idle, Blocked, Done), and current task description.</p>' +
      '<p>View aggregate stats: total agents, number working, blocked, tasks completed today, average task time, and total <span class="hl">achievements earned</span>. A sidebar lists working agents separately from idle agents for quick scanning.</p>' +
      '<p>Track productivity per agent including tasks completed, average duration, and last heartbeat time. <span class="hl">Pulse indicators</span> show when agents are actively running. Stale agents (no heartbeat in 60+ seconds) show a red indicator.</p>',
    advanced:
      "Agent status comes from /api/office/agents which reads agent-registry.json. Agent avatars are derived from agentId mappings. Real-time status uses heartbeat timestamps from agent pings. Current task, progress, and activity level are set by agents reporting to the system. All data is live-polled on a refresh interval.",
  },
  "/app/email-cleanup": {
    title: "Email Cleanup Manager",
    description:
      '<p>Manage email cleanup rules and whitelists for automated inbox management. The <span class="hl">Rules section</span> shows active cleanup rules with their search queries, priority levels, and enable/disable toggles.</p>' +
      '<p>Add entries to a <span class="hl">Whitelist</span> to protect important senders from automatic deletion. Whitelist by name, email address, domain pattern, or wildcard. View <span class="hl">Uncertain Emails</span> that need manual review before deletion.</p>' +
      '<p>Review <span class="hl">Execution Logs</span> showing each cleanup run with total emails processed, trashed, and failed. Run the cleanup agent with the "Run Emmy" button, or let it run on its scheduled cron.</p>',
    advanced:
      "Rules and configuration are fetched from /api/emmie/config. Whitelist entries are stored in a database and managed via /api/emmie/whitelist (GET, POST, DELETE). Metrics are loaded from /api/emmie/metrics reading emmie-metrics.csv. Execution logs come from /api/emmie/logs. The cleanup process is triggered via POST /api/emmie/run.",
  },
  "/app/calendar": {
    title: "Scheduled Jobs",
    description:
      '<p>View all <span class="hl">cron jobs and scheduled tasks</span> across the system with their execution status, schedule, and countdown to next run. A <span class="hl">7-day calendar grid</span> shows which jobs run each day.</p>' +
      '<p>See stats at a glance: total jobs, scheduled count, running count, and jobs completed today. A countdown card shows the <span class="hl">next scheduled job</span> with real-time updates.</p>' +
      '<p>Each job displays its agent, schedule in both cron format and human-readable text, timezone, last run time, and execution count. <span class="hl">Trigger jobs manually</span> with the play button to run them immediately.</p>',
    advanced:
      "Jobs are fetched from /api/cron/list which reads jobs.json and system crontab. The useRealJobs hook polls this endpoint at configurable intervals. Next run times are calculated from cron expressions. The calendar groups jobs by day and consolidates high-frequency interval jobs into summary rows per agent.",
  },
  "/app/daily-summary": {
    title: "Daily Activity Summary",
    description:
      '<p>An AI-generated <span class="hl">daily journal of system activity</span> showing everything that happened in a 24-hour period. Navigate between dates with previous/next buttons.</p>' +
      '<p>View <span class="hl">quick stats</span> including sessions, messages, skills installed, Telegram messages, task executor runs, git commits, and tasks completed. Read <span class="hl">rich markdown narratives</span> that describe your day\'s work in readable format.</p>' +
      '<p>View individual session summaries with user messages, assistant output, and tools used. Review task executor logs showing what automated processes ran. An <span class="hl">all-time stats panel</span> shows totals across all days tracked.</p>',
    advanced:
      "Daily summaries are fetched from /api/daily-summary and read from daily notes (YYYY-MM-DD.md files). Each summary includes narrative markdown, quick stats aggregated from logs, session data, and task executor logs. All-time stats are computed by iterating all available summary files. Markdown rendering uses react-markdown with GitHub-flavored syntax.",
  },
  "/app/cohorts": {
    title: "Online Program HQ",
    description:
      '<p>The <span class="hl">dashboard</span> for your online program gives you an at-a-glance view of your content pipeline, business goals, and strategy. See pending reviews, items in queue, posts published this week, and average quality scores.</p>' +
      '<p>The <span class="hl">Content Strategy</span> section lets you define your target audience, create content pillars, and add competitor tools to exclude from mentions. Save your strategy to configure how the content generator behaves.</p>' +
      '<p>Recent activity shows your last 5 posts with status, quality scores, and pillar tags. Click <span class="hl">"Generate Posts"</span> to trigger new content creation, or "Review Posts" to see the full blog list.</p>',
    advanced:
      "Data is stored in SQLite at data/mastermind-blog.db. The page uses /api/cohorts/blog for blog posts, /api/cohorts/settings for content strategy storage (target_audience, content_pillars, competitor_exclusions). Content generation is triggered via the backend service; posts are marked with status (needs_review, queued, published, rejected) and include quality_score (1-10 scale).",
  },
  "/app/cohorts/participants": {
    title: "Program Participants",
    description:
      '<p>View all participants in your online program as an <span class="hl">interactive roster</span>. Each card shows name, photo, cohort, location, timezone, business description, and social links (Instagram, LinkedIn, Facebook).</p>' +
      '<p><span class="hl">Search by name</span>, filter by location or cohort, sort by name or cohort, and expand each card to see full details including offers they provide to other members.</p>' +
      '<p>The page calculates <span class="hl">timezone offsets</span> so you can quickly see who is ahead or behind. Track attendance rates for each session and view engagement levels at a glance.</p>',
    advanced:
      "Participants are stored in SQLite (data/mastermind-participants.db, participants table). The page queries /api/cohorts/participants for the roster. Tables auto-create on first access with CREATE TABLE IF NOT EXISTS. Profile photos use picsum.photos placeholder URLs. Timezone offsets are calculated client-side.",
  },
  "/app/cohorts/blog": {
    title: "Blog Posts Manager",
    description:
      '<p>Manage all <span class="hl">auto-generated blog posts</span> from your content pipeline. Use the <span class="hl">website switcher</span> at the top to select which site you are publishing to. Search by title, filter by status (needs review, queued, published, rejected) and content pillar, and sort by publication date.</p>' +
      '<p>Click any post to open the <span class="hl">preview modal</span> where you can read the full markdown content, view or edit SEO metadata (title, description, keywords), and manage cover images. Approve posts, reject with a reason, publish directly, or queue for later.</p>' +
      '<p>Posts flow through a pipeline: generated to needs_review, then queued, then published. Each post tracks <span class="hl">word count, content pillar, quality score</span>, and validation status. Blog Settings are accessible via the collapsible panel at the top of the page.</p>',
    advanced:
      "Blog posts are stored in SQLite (data/mastermind-blog.db, blog_posts table). API endpoints: /api/cohorts/blog (list/create), /api/cohorts/blog/set-cover (update cover image), /api/cohorts/blog/regenerate-image (get new image options). Posts are generated by a backend agent and validated before appearing in needs_review status. The website switcher persists the selected domain to localStorage and passes site_domain to all fetch calls.",
  },
  "/app/cohorts/discoveries": {
    title: "Source Discoveries",
    description:
      '<p>Track high-signal <span class="hl">content sources</span> discovered across platforms (Reddit, X, Instagram, TikTok, YouTube, Website). Each discovery shows source name, platform badge, description, audience relevance score, and confidence score (1-10 scale).</p>' +
      '<p>Manage <span class="hl">research keywords</span> that guide the discovery agent. Click "Keywords" to add, view, or remove keywords with signal strength indicators. Click "Instructions" to edit the discovery agent\'s prompt.</p>' +
      '<p>Click <span class="hl">"Run Discovery"</span> to trigger a full search across all configured platforms and keywords. Selected discoveries feed directly into the blog generation pipeline.</p>',
    advanced:
      "Data is stored in SQLite (data/mastermind-blog.db, discoveries and research_keywords tables). The page queries /api/cohorts/discoveries to list/delete discoveries and manage keywords. Discovery runs via POST /api/cohorts/discover. Keywords are indexed with signal_strength (1-10), status (active/archived), and times_used counter.",
  },
  "/app/cohorts/cold-outreach": {
    title: "Cold Outreach Pipeline",
    description:
      '<p>Build and manage <span class="hl">outreach campaigns</span> targeting specific customer segments. The dashboard displays key metrics: total contacts, leads found, qualified prospects, and disqualified prospects.</p>' +
      '<p>Select an <span class="hl">ICP (Ideal Customer Profile)</span> from the left panel to view and edit targeting: description, niche categories, qualifications, and disqualification rules. Configure <span class="hl">sales hooks</span> with credibility blocks, banned words, prompt templates, and subject line formulas.</p>' +
      '<p>View <span class="hl">batch history</span> with completed outreach runs showing candidates searched, emails verified, and qualified leads. Upload batches to your email platform with one click. Connect your Google Sheet in Settings.</p>',
    advanced:
      "Data is stored in SQLite (data/cold-outreach.db) with tables for icps, batches, and pipeline_runs. API endpoints: /api/cold-outreach/icps (CRUD), /api/cold-outreach/pipeline (trigger runs), /api/cold-outreach/settings (save Google Sheet URL, targets). Each batch stores candidate metrics and track_a/track_b counts for A/B testing.",
  },
  "/app/cohorts/wrap-up": {
    title: "Session Wrap-Up Pipeline",
    description:
      '<p>Manage the complete post-session workflow for recorded meetings. Create new sessions with titles, dates, and video call details, then track progress through a <span class="hl">multi-stage pipeline</span> with 16 workflow stages.</p>' +
      '<p>Stages move from capturing raw video to publishing content: <span class="hl">video download, transcription, AI summary, follow-up emails, and action items</span>. Each stage shows its current status and can be expanded to view details or re-run.</p>' +
      '<p>Use inline forms to <span class="hl">upload files, paste transcripts</span>, save unanswered questions to the database, and prepare content for member follow-up emails and distribution.</p>',
    advanced:
      "Session data stored in SQLite with fields for session_number, cohort, title, date, zoom_meeting_id, youtube_id, transcript summary, and pipeline_status JSON tracking 16 completion flags. The /api/cohorts/wrap-up endpoint handles GET, POST, PATCH. The /run endpoint executes pipeline steps by number. Some steps integrate with Zoom API for recordings and YouTube Data API.",
  },
  "/app/cohorts/questions": {
    title: "Unanswered Questions",
    description:
      '<p>Collect, organize, and answer questions from session participants. Add questions manually, then use the <span class="hl">AI question generator</span> to automatically create answers for all unanswered questions at once.</p>' +
      '<p>View a searchable, sortable table with columns for question text, answer, who asked, answered status, sent status, and date. Click any row to <span class="hl">edit the question</span>, refine the answer, or regenerate with AI.</p>' +
      '<p>Use the bulk <span class="hl">"Generate Answers"</span> button to process all unanswered questions. Mark questions as answered and sent individually using checkbox toggles.</p>',
    advanced:
      "Questions stored in SQLite (data/mastermind-participants.db) with fields for question text, answer, asked_by, answered flag, sent_to_participant flag, and timestamps. The /api/cohorts/questions endpoint handles CRUD. The /generate-answers endpoint processes all unanswered questions via AI. Tables auto-create on first access.",
  },
  "/app/cohorts/onboarding": {
    title: "Onboarding Process",
    description:
      '<p>Configure and monitor the automated intake workflow for new participants. View all <span class="hl">process steps</span> that handle registration, payment verification, billing setup, email delivery, and calendar invitations.</p>' +
      '<p>Each step shows its automation type (automatic, manual, cron-scheduled), last run time, next scheduled run, and recent errors. Expand any step to see <span class="hl">substeps, email templates</span>, and detailed status logs.</p>' +
      '<p>Filter participants by cohort, intake status, payment status, and billing state. Use quick filters to find <span class="hl">past-due subscriptions</span>, pending intakes, or successfully onboarded members.</p>',
    advanced:
      "Intake data stored in SQLite (data/mastermind-participants.db). The /api/cohorts/intake endpoint returns step definitions and status. Email templates stored as files with Handlebars syntax for variable substitution. Tables auto-create on first access with demo data seeding.",
  },
  "/app/cohorts/favor-bank": {
    title: "Favor Bank",
    description:
      '<p>Track scholarship deals and <span class="hl">value exchanges</span> with participants. Each discounted participant receives a trade-in deal: store credit, hours of service time, or physical items in exchange for their participation.</p>' +
      '<p>For <span class="hl">store credit deals</span>, record spending to deduct from available balance. For time-based deals, log hours worked. For item deals, mark items as received. Expand any row to see <span class="hl">transaction history</span> with debits, credits, and receipts.</p>' +
      '<p>Top cards show key metrics: total outstanding credit, total hours available, and pending item deliveries.</p>',
    advanced:
      "Deals stored in SQLite (data/mastermind-participants.db) with tables for favor_deals and favor_ledger. Each deal tracks deal_type (store_credit, time_hours, item), monthly values, and quantities. Ledger tracks transactions with entry_type, amounts, and timestamps. The /api/cohorts/favor-bank endpoint handles GET, POST, and special actions. Tables auto-create on first access.",
  },
  "/app/seo": {
    title: "SEO Command Center",
    description:
      '<p>Manage SEO for multiple websites from a centralized dashboard. Add websites, run the <span class="hl">SEO Autopilot</span> to analyze technical issues, and track fixes in a fix queue. The autopilot scans for broken links, schema errors, mobile issues, and performance problems.</p>' +
      '<p>Navigate between tabs: Overview (fix queue, core web vitals, audit history), <span class="hl">Keyword Rankings</span> (track targets, generate blog briefs), Tools (SERP preview, schema validation, internal links), Competitors, and Information.</p>' +
      '<p>For each site, view hosting provider, assigned agent, recent audits, and business metadata. Track <span class="hl">fix completion</span> with badges showing pending, fixed, and dismissed items. The GSC dashboard displays Google Search Console data.</p>',
    advanced:
      "Site configurations stored in SQLite with domain, hosting provider, agent assignment, and profile JSON. Autopilot runs via POST /api/seo/autopilot returning FixQueueItem[] with status and fix instructions. Keywords tracked in a separate table with search volume, ranking, and last checked date. Integration points: Google Search Console API, PageSpeed Insights API.",
  },
  "/app/stripe": {
    title: "Stripe Dashboard",
    description:
      '<p>View payment volume, revenue trends, and payment operations. Select a time range (Today, 7 days, 30 days, 90 days, All time) to filter <span class="hl">revenue charts</span>, charges, and payout reports.</p>' +
      '<p>Browse recent charges showing customer name, amount, card type, status, and date. View payout reports with pending and completed payouts. Manage <span class="hl">coupons and promo codes</span> with creation, activation, and discount tracking.</p>' +
      '<p>The <span class="hl">revenue chart</span> displays daily revenue as a line graph. Click any charge to see full details including customer metadata and payment method. Requires a Stripe API key configured in Settings.</p>',
    advanced:
      "All Stripe data fetched via /api/stripe/dashboard which queries the Stripe API. Revenue trends calculated by summing successful charges grouped by date. Coupon manager POSTs to /api/stripe/coupons. Promo code manager POSTs to /api/stripe/promotions. Payment links data from Stripe Payment Links API. Requires STRIPE_SECRET_KEY in .env.",
  },
  "/app/whatsapp": {
    title: "WhatsApp",
    description:
      '<p>Send and manage WhatsApp messages through a unified dashboard. The <span class="hl">Compose tab</span> lets you draft text messages or files with autocomplete contact lookup. The <span class="hl">Chats tab</span> displays your conversation history.</p>' +
      '<p>Search through past contacts, browse message history, and view statistics including total messages sent and files transferred. Customize your communications with <span class="hl">message signatures</span> and reusable templates in the Settings tab.</p>' +
      '<p>The History tab shows your <span class="hl">top contacts</span> and overall activity metrics, helping you track engagement patterns at a glance.</p>',
    advanced:
      "The backend reads from the wacli database (.wacli/wacli.db) to fetch contacts, chats, and messages. Configuration is stored in lib/whatsapp-config.json including signature text, template library, and send statistics. File uploads handled via /api/whatsapp/upload. API routes execute wacli CLI commands to send messages and retrieve data.",
  },
  "/app/linkedin": {
    title: "LinkedIn",
    description:
      '<p>Manage your LinkedIn content pipeline from ideation to publication. Use the <span class="hl">Pipeline view</span> to organize posts across stages like Idea, Draft, Scheduled, and Published.</p>' +
      '<p>Plan your content calendar with the <span class="hl">Calendar view</span> to see posts scheduled by date, and review performance metrics in the Analytics view. The <span class="hl">Writers view</span> lets you maintain a team roster with writing profiles.</p>' +
      '<p>Create new content or <span class="hl">import bulk ideas</span> from existing lists, then drag items between pipeline columns to track progress.</p>',
    advanced:
      "Data is managed via the useLinkedInData hook. The dashboard tracks content items with statuses, creation dates, and metadata. LinkedIn OAuth authentication status is displayed with token expiration times. The system supports hashtag sets, content pillars, and writer profiles for multi-author workflows.",
  },
  "/app/guard-dog": {
    title: "Guard Dog",
    description:
      '<p>Automated security scanner that monitors your projects for vulnerabilities and threats. Guard Dog runs <span class="hl">nightly scans</span> across all projects, checking against NVD, CISA KEV, GitHub Advisory, and OSV databases.</p>' +
      '<p>View recent threat detections in the <span class="hl">Threat Feed</span> and drill into specific vulnerabilities. Run quick manual scans on demand, and visualize threat trends over time.</p>' +
      '<p>The dashboard shows <span class="hl">vulnerability breakdowns</span> by type and trusted provider configuration for allowlisting known-safe dependencies.</p>',
    advanced:
      "Scan results stored and retrieved via /api/guard-dog/dashboard. Daily trend data shows vulnerability patterns over time. Manual scans triggered via /api/guard-dog/manual-scan. The scanner runs as a launchd daemon on a nightly cron schedule, checking against multiple CVE feeds.",
  },
  "/app/claude-terminal": {
    title: "The Genie",
    description:
      '<p><span class="hl">The Genie</span> is your magic wand for the app. Tell it what you want in plain English and it makes it happen — build a website, create a Stripe promo code, add someone to a table, change the navigation, swap the color theme, answer a question. Anything is possible.</p>' +
      '<p>Type your wish and press Enter. The Genie reads and edits files, runs commands, and reports exactly what it did. Choose your <span class="hl">model</span> (Haiku for quick tasks, Sonnet for most work, Opus for complex changes) and <span class="hl">effort level</span> to control how deeply it thinks.</p>' +
      '<p>You can run <span class="hl">two Genies at once</span> — open Genie 2 to run a second session in parallel. The <span class="hl">context meter</span> tracks memory usage — when it fills up, the Genie auto-saves its progress and continues in a fresh session seamlessly.</p>',
    advanced:
      'The Genie is a browser interface for the <span class="hl">Claude Code CLI</span> — a full AI coding agent running directly on this server. It has the same power as a developer with SSH access: it can read and write any file the server user has permission to, run shell commands (npm, git, curl, database queries, restart services), install packages, and make network requests to external APIs. It is not limited to the app folder — it can navigate anywhere on the filesystem.\n\n' +
      'Constraints: non-interactive (anything requiring a live TTY or interactive prompt — like a password prompt — will hang); no browser automation by default (cannot click web UIs or fill forms); context window limits mean very long sessions need multiple runs; every token costs money (a complex Opus session can run $0.50–$5+); it runs as the OS user the server process runs as, so it respects that user\'s filesystem permissions.\n\n' +
      'Under the hood: spawns the claude CLI with --print --output-format stream-json --verbose, streaming NDJSON via Server-Sent Events. A module-level Map<A|B, ChildProcess> caps concurrent sessions at two. Git stash before each run enables one-click undo. Marathon handoff at ~/.marathon/handoff.md auto-resumes interrupted sessions via the PreCompact hook.',
  },
  "/app/backups": {
    title: "Backups",
    description:
      '<p>Create and manage workspace backups with automatic versioning and restore capability. <span class="hl">Auto-generated descriptions</span> suggest contextual backup labels, and you can add tags for organization.</p>' +
      '<p>View all backups in a searchable table showing size, creation date, and validation status. <span class="hl">Restore</span> from any previous backup with a safety-backup-first option. Download individual backups, edit descriptions, or delete old ones.</p>' +
      '<p><span class="hl">Search and filter</span> by description, tag, or backup type (manual or automatic). Real-time progress tracking shows restore status as it runs.</p>',
    advanced:
      "Backups are stored as .tar.gz archives in the backups directory and indexed as Backup documents. Each backup tracks metadata including filename, size, compression format, validation status, and checksum. The /api/backups/list endpoint returns filtered/sorted results. Restore operations tracked via /api/backups/restore/progress with operation IDs.",
  },
  "/app/settings": {
    title: "Settings",
    description:
      '<p>Centralized dashboard to configure API keys and authentication for <span class="hl">45+ integrations</span> including Anthropic, OpenAI, Stripe, LinkedIn, Telegram, and more. Each card shows setup status with color-coded badges.</p>' +
      '<p>Expand any card to see numbered <span class="hl">setup instructions</span> and paste your API key directly into the form. Pricing notes appear for services with special requirements, and helper text links to official signup pages.</p>' +
      '<p>The page displays <span class="hl">integration stats</span> showing total, installed, and missing services. Search to filter integrations quickly. Sensitive values are masked after saving.</p>',
    advanced:
      "API keys are saved to the workspace .env file and are not visible in the UI after saving. The /api/env/inject endpoint checks which environment variables are configured and writes new keys. Integration documentation stored in lib/api-key-docs with setup instructions, field definitions, and signup URLs. Agents must restart after key updates.",
  },
  "/app/memory": {
    title: "Memory",
    description:
      '<p>Search and browse your long-term <span class="hl">memory bank</span> of stored knowledge. Use fuzzy search to find memories across title, content, and tags, then filter by tags and categories to narrow results.</p>' +
      '<p>Sort by newest, oldest, or alphabetical. Apply date range filters to find memories from specific periods. Click any memory to view its <span class="hl">full content</span> in a detail panel.</p>' +
      '<p><span class="hl">Pin important memories</span> to keep them at the top. Export individual memories or the entire filtered set as JSON for backup or sharing.</p>',
    advanced:
      "Memories are loaded via the useMockMemories hook. Each memory has an ID, key, title, content, tags, optional category, and timestamps. Pin state managed via useTogglePin. The page supports fuzzy matching for flexible search.",
  },
  "/app/machine-learning": {
    title: "Machine Learning",
    description:
      '<p>Monitor your AI system\'s self-improving machine learning engine. View <span class="hl">feedback loops</span> tracking model refinement, knowledge base entries from learning events, and predictor status showing forecast accuracy.</p>' +
      '<p>The <span class="hl">Personality Radar</span> visualizes your AI\'s personality dimensions as it evolves. Track error clusters to identify patterns in failed tasks.</p>' +
      '<p>Review <span class="hl">genes</span> (capability traits), candidates (experimental improvements), and the memory graph tracking semantic connections. Control daemon settings and view the <span class="hl">evolution timeline</span> with detailed metrics.</p>',
    advanced:
      "Data files stored in skills/capability-evolver/assets/gep/ (genes.json, capsules.json, events.jsonl) and memory/evolution/ (personality_state.json, memory_graph.jsonl). The /api/machine-learning/dashboard endpoint aggregates all ML state including feedback entries, knowledge lessons, predictor statistics, and error clusters.",
  },
  "/app/logs": {
    title: "Agent Logs",
    description:
      '<p>Track <span class="hl">agent execution history</span> with detailed logs of every run, including success rate, failure count, and total cost. View token usage per agent over the last 7 days.</p>' +
      '<p>Click any log entry to see the full summary, error details, and resource metrics. <span class="hl">Filter by agent</span> to focus on specific ones.</p>' +
      '<p>Stats cards at the top show overall <span class="hl">success rate, failures, total cost, and token count</span>. Recent runs are sorted by most recent first, showing duration, cost in USD, and status.</p>',
    advanced:
      "Agent logs stored as JSON in logs/agent-runs.json. The API computes a 7-day token summary by agent, aggregating tokens and costs. Most recent 1000 entries retained; older runs dropped. POST endpoint allows agents to log new runs with status, duration, tokens used, and cost data.",
  },
  "/app/paperclip": {
    title: "Paperclip",
    description:
      '<p><span class="hl">Paperclip</span> is an autonomous task executor that runs in the background. This page shows whether the service is running and displays any companies you have created (each company acts like a business with multiple agents).</p>' +
      '<p>The status card shows the Paperclip endpoint, current <span class="hl">database type</span>, and endpoint health. If the service is up, click "Open Dashboard" to access the full Paperclip UI.</p>',
    advanced:
      "Paperclip is a separate service running on port 3200 exposing a /api/health endpoint. Companies listed from /api/companies. Data persists in an embedded PostgreSQL database.",
  },
  "/app/system": {
    title: "System Overview",
    description:
      '<p>A high-level dashboard showing what your <span class="hl">AI system</span> can do. Lists all 65+ agents running in the background with their key capabilities: conversational AI, autonomous agents, trading, email, calendar, and security scanning.</p>' +
      '<p>Shows <span class="hl">open ports</span> for Mission Control, backend services, and the gateway. Lists key system paths including workspace location, agent directory, daily notes, and backup location.</p>' +
      '<p>Includes honest <span class="hl">limitations</span>: agents need triggers to run, no voice interface, and memory is file-based. Quick links let you open any service by port.</p>',
    advanced:
      "This is a static informational page with hardcoded agent and capability data. No database backend. Ports are local services on the host machine. Agents run via launchd daemons. This page has no API route.",
  },
  "/app/mc-settings": {
    title: "Mission Control Settings",
    description:
      '<p>Customize your workspace appearance, behavior, and agent settings. Configure <span class="hl">theme</span>, app name, logo, display density, and date/time formats.</p>' +
      '<p>Set <span class="hl">timezone</span>, LLM cost tier (conservative, balanced, aggressive), and daily budget cap. Manage notifications, quiet hours, auto-archiving, and keyboard shortcuts.</p>' +
      '<p><span class="hl">Export settings</span> as JSON to back up your configuration, or import to restore. Reset all settings to defaults with one click.</p>',
    advanced:
      "Settings stored in data/mc-settings.json. POST endpoint saves validated settings, applying defaults for missing values. Theme, agentExecutionMode, and timeFormat are enum-validated. Logo upload handles file storage and returns the new path. Changes persist immediately.",
  },
  "/app/bank-accounts": {
    title: "Bank Accounts",
    description:
      '<p>Manage multiple <span class="hl">bank accounts</span> across different banks and currencies. View account numbers (masked by default; click the eye icon to reveal), routing numbers, SWIFT codes, and account types.</p>' +
      '<p>Switch between <span class="hl">table view</span> and grouped-by-bank view. Filter by bank name, entity, or account name. View closed accounts in a collapsed section.</p>' +
      '<p>Also displays <span class="hl">payment methods</span> (credit cards, PayPal, etc.) with their identifiers and notes.</p>',
    advanced:
      "Account data stored in SQLite at data/bank-accounts.db. Two tables: accounts (bank_name, account_number, routing_number, swift_code, currency, entity, status, notes) and payment_methods. API returns read-only view. Account numbers masked on display; visibility toggle is client-side only.",
  },
  "/app/affiliate-links": {
    title: "Affiliate Links",
    description:
      '<p>Track all your <span class="hl">affiliate programs</span> and referral links in one place. Add new links with program name, referral URL, code, category, commission details, and status.</p>' +
      '<p><span class="hl">Copy links</span> to clipboard with one click. Group by category or view as a table. Search and filter by program name, category, or notes.</p>' +
      '<p>Each entry shows <span class="hl">status badge</span> (green for active, yellow for pending), commission info, and creation date. Edit or delete existing links.</p>',
    advanced:
      "Affiliate links stored in SQLite at data/affiliate-links.db, table affiliates with columns: program_name, referral_link, referral_code, category, commission_info, status, notes, timestamps. API supports GET, POST, PUT, DELETE. Links auto-sorted by category then program name.",
  },
  "/app/human-tasks": {
    title: "Human Task Auto-Handler",
    description:
      '<p>Track <span class="hl">human-must-do tasks</span> that the system attempts to automate. Each card shows attempt count (0/3 max), status (pending, completed, partial, blocked), labels, and priority.</p>' +
      '<p>Build <span class="hl">playbooks</span> documenting how to solve each task type so the system learns the pattern. View total cards, attempts, maxed-out tasks, and playbook count.</p>' +
      '<p>Last run summary shows completed, partial, and blocked counts. <span class="hl">Recent logs</span> show agent execution details for debugging.</p>',
    advanced:
      "Human task data pulls from the task database filtering cards in the human-must-do column. Attempt tracking stored in agents/human-task-handler/data/attempts.json. Playbooks are markdown files in agents/human-task-handler/playbooks/. Each card gets 3 attempts before being marked maxed out.",
  },
  "/app/zoom": {
    title: "Zoom Agent",
    description:
      '<p>Auto-rename Zoom recordings and queue them for <span class="hl">Descript import</span>. The agent watches your recordings folder, detects new files, renames them with a clean pattern (date, time, meeting name), and queues them for processing.</p>' +
      '<p>See <span class="hl">total processed</span> recordings, pending queue count, storage size, and watcher status (running/stopped). View recent recordings with original and renamed filenames.</p>' +
      '<p>Collapsible configuration shows <span class="hl">recording directory</span>, naming pattern tokens, watched extensions, and error count.</p>',
    advanced:
      "Zoom agent watches a directory via fswatch process. Status in agents/zoom/status.json, config in agents/zoom/config/config.json (recordingsDir, renamingPattern, watchExtensions). Processed list in data/processed.json, queue in data/ready-queue.json. API checks for active fswatch process.",
  },
  "/app/form-builder": {
    title: "Form Builder",
    description:
      '<p>Create <span class="hl">surveys and forms</span> with multiple question types: short text, long text, multiple choice, rating (1-5), and yes/no. Design your form with a live preview, reorder questions by dragging, and mark questions as required.</p>' +
      '<p>Published forms generate a <span class="hl">standalone HTML page</span> you can share with anyone. Responses are collected automatically and displayed with per-question analytics: bar charts for multiple choice, averages for ratings, and yes/no breakdowns.</p>' +
      '<p>Manage forms as <span class="hl">draft, active, or closed</span>. The list view shows stats across all forms including total responses and averages.</p>',
    advanced:
      "Form data is stored in data/forms.json. Published forms are written as static HTML files to public/forms/<id>.html, which submit responses back to the /api/form-builder endpoint. The API supports create-form, update-form, submit-response actions via POST, plus GET for listing and DELETE for removal. No external dependencies.",
  },
  "/app/websites": {
    title: "Websites",
    description:
      '<p>A centralized dashboard for managing all your <span class="hl">websites and web properties</span>. View sites in a table with name, domain, hosting provider, status, and Search Console connection. Click any row to expand and see <span class="hl">credentials</span> (masked by default with eye toggle) and connected integrations.</p>' +
      '<p>Add new websites with domain, name, hosting provider, base URL, and key-value credential pairs. Track which sites are active, what hosting they use (Wix, WordPress, Vercel, Shopify), and when they were added.</p>' +
      '<p>Stats at the top show total sites, active count, and breakdown by hosting provider. Search by name or domain to quickly find a site.</p>',
    advanced:
      "Website data is stored in SQLite via /api/websites. Each record includes domain (primary key), name, hosting, status, base_url, and JSON fields for hosting_credentials, search_console, bing_webmaster, analytics, cdn, dns, and tokens. The useWebsites hook handles CRUD operations. The WebsiteSwitcher component is reused across pages (e.g., Blog) to scope actions to a specific site.",
  },
  "/app/bookkeeping": {
    title: "Bookkeeping",
    description:
      '<p><span class="hl">Bookkeeping</span> parses your bank statement CSVs or PDFs, classifies each transaction using customizable rules, and outputs organized journal entries to a Google Sheet for review.</p>' +
      '<p>Select your <span class="hl">accounting software</span> (QuickBooks, Xero, or Zoho Books) and import entries directly via API, or download a formatted CSV for manual upload.</p>' +
      '<p>The system <span class="hl">learns from corrections</span>: when you fix a classification in the Google Sheet, it automatically updates its rules for future runs.</p>',
    advanced:
      "The bookkeeping agent lives at agents/bookkeeping/ with config (config.json, rules.json, chart-of-accounts.csv), parsers (CSV + PDF), a 4-tier classification engine, and integration adapters for QuickBooks, Xero, and Zoho Books in src/integrations/. Output goes to Google Sheets via the gog CLI. The API route at /api/bookkeeping supports GET (data), POST (run/import/test-connection/export-csv), and PATCH (config updates). Example files in agents/bookkeeping/examples/ demonstrate supported formats.",
  },
  "/app/airtable": {
    title: "Airtable",
    description:
      '<p>Browse and inspect your <span class="hl">Airtable bases, tables, and records</span> directly from Mission Control. Select a base and table to view records in a paginated data grid showing up to five fields at a time.</p>' +
      '<p>Use the <span class="hl">search and refresh</span> controls to find specific records or reload data.</p>',
    advanced:
      "Data is fetched via the useAirtableData hook which calls the /api/airtable endpoints. Records are loaded on demand when a table is selected. The page requires an AIRTABLE API key configured in .env.",
  },
  "/app/apollo": {
    title: "Apollo",
    description:
      '<p>Dashboard for the <span class="hl">Apollo lead generation agent</span>. View agent status and explore capabilities including <span class="hl">people search, company search, contact enrichment, and lead export</span>.</p>' +
      '<p>Each capability shows the CLI command syntax so you can run searches by job title, company, location, or enrich contacts by email.</p>',
    advanced:
      "Agent status is fetched from /api/apollo/status which reads from the agent registry. The API key (APOLLO_API_KEY) must be set in .env.",
  },
  "/app/backlinks": {
    title: "Backlinks",
    description:
      '<p>Tracks your <span class="hl">SEO backlink pipeline</span> from prospect discovery through outreach to live placements. View stats for total prospects, outreach sent, responses, and links placed.</p>' +
      '<p>The <span class="hl">pipeline bar</span> shows contacts at each stage. A placements section shows live links with their <span class="hl">Domain Rating (DR)</span>, dofollow status, and anchor text.</p>',
    advanced:
      "Data is fetched from /api/backlinks which returns pipeline counts, placement records, tactic breakdowns, and agent config.",
  },
  "/app/blog-service": {
    title: "Blog Service",
    description:
      '<p>Dashboard for managing an <span class="hl">automated blog writing service</span> with multiple client tiers (Starter, Growth, Agency). View active clients, their subscription status, and post delivery schedules.</p>' +
      '<p>Track <span class="hl">weekly output</span> with per-day charts, content quality scores, and revenue per client.</p>',
    advanced:
      "Data is loaded via the useBlogServiceData hook which fetches client records, post history, weekly chart data, and content quality metrics.",
  },
  "/app/business1": {
    title: "BUSINESS1",
    description:
      '<p>Hub page for <span class="hl">BUSINESS1</span>, a WhatsApp AI Copilot for SMBs. Links out to the Notion workspace, Slack channel, and sub-sections for <span class="hl">ICPs</span>, Store Leads, and WABA Setup.</p>',
    advanced:
      "This is a static navigation page with no backend data fetching. Sub-pages each have their own APIs and databases.",
  },
  "/app/business1/icps": {
    title: "Ideal Customer Profiles",
    description:
      '<p>Index of <span class="hl">Ideal Customer Profiles</span> for BUSINESS1. Each ICP card links to a dedicated research page covering pain points, messaging frameworks, and <span class="hl">outreach sequences</span>.</p>',
    advanced:
      "This is a static listing page. ICP data is defined inline as a constant array. Status badges indicate whether research has been completed or is still pending.",
  },
  "/app/business1/icps/shopify-store-owners": {
    title: "Shopify Store Owners ICP",
    description:
      '<p>Research profile for the <span class="hl">Shopify Store Owners</span> ideal customer segment. Covers e-commerce operators who manage customer conversations and support on <span class="hl">WhatsApp</span>.</p>',
    advanced:
      "Currently a placeholder page with status Research Pending. When populated, it will contain ICP interviews, pain points, messaging frameworks, and outreach sequences.",
  },
  "/app/business1/icps/smb-coaches-consultants": {
    title: "SMB Coaches & Consultants ICP",
    description:
      '<p>Research profile for <span class="hl">SMB coaches and consultants</span> who run their practice and client relationships through <span class="hl">WhatsApp</span>.</p>',
    advanced:
      "Currently a placeholder page with status Research Pending. Content will be populated as the research phase progresses.",
  },
  "/app/business1/store-leads": {
    title: "Store Leads",
    description:
      '<p>Shopify store sourcing pipeline powered by <span class="hl">StoreLeads.app</span>. Browse, filter, and qualify stores by country, revenue, WhatsApp signal, and app stack. Export qualified leads to <span class="hl">Google Sheets</span>.</p>',
    advanced:
      "The store-leads agent fetches data from the StoreLeads API, filters by configurable criteria, and stores results in a local SQLite database. Leads can be exported to Sheets.",
  },
  "/app/business1/waba-setup": {
    title: "WABA Setup Knowledge Base",
    description:
      '<p>Searchable <span class="hl">knowledge base</span> for WhatsApp Business API setup. Browse a file tree of guides organized by stage, search across all documents, and get <span class="hl">AI-powered answers</span> to setup questions.</p>',
    advanced:
      "Content is stored as Markdown files. A SQLite-backed search index supports full-text and semantic search. The AI Answer Panel uses Claude to synthesize answers from matched KB chunks. Screenshot upload enables vision-based queries.",
  },
  "/app/business2": {
    title: "BUSINESS2",
    description:
      '<p>Corporate hub for <span class="hl">BUSINESS2</span>, your holding company. Quick access to <span class="hl">corporate documents</span> in Dropbox, Zoho Books for accounting, bookkeeping tools, and investment entity links.</p>',
    advanced:
      "This is a static reference page with no live API calls. It displays company registration details, Dropbox document links, and quick-link cards.",
  },
  "/app/canva": {
    title: "Canva",
    description:
      '<p>Manage your <span class="hl">Canva integration</span> including OAuth setup status, recent designs, and available templates. The page shows whether your <span class="hl">client ID, client secret, and OAuth tokens</span> are properly configured.</p>' +
      '<p>Browse your Canva designs with creation dates and template listings.</p>',
    advanced:
      "Canva uses OAuth2 authentication. Credentials are stored in .env, and tokens are persisted locally. Data is fetched via the useCanvaData hook which calls /api/canva endpoints.",
  },
  "/app/carousel-builder": {
    title: "Carousel Builder",
    description:
      '<p>AI-powered tool for creating <span class="hl">Instagram and LinkedIn carousel posts</span>. Enter a product description, target audience, pain points, and desired CTA, then generate a multi-slide carousel.</p>' +
      '<p>Choose from <span class="hl">color palettes, frameworks, tones</span>, and slide counts. Browse background images from Pexels or upload your own.</p>',
    advanced:
      "The carousel generation calls an AI endpoint that returns structured slide data. Background images can be sourced from the Pexels API or uploaded directly. Platform selection adjusts output dimensions.",
  },
  "/app/cashclaw": {
    title: "CashClaw",
    description:
      '<p>Revenue dashboard showing <span class="hl">earnings across all services</span> with today, this week, this month, and all-time totals. Each service is listed with its enabled status and pricing tiers.</p>' +
      '<p>View <span class="hl">blog service tiers</span> with their included features and Stripe checkout links.</p>',
    advanced:
      "Data is fetched from /api/cashclaw which aggregates earnings summaries, active services with pricing, and mission records.",
  },
  "/app/clanforge": {
    title: "ClanForge",
    description:
      '<p>Dashboard for <span class="hl">ClanForge</span>, an AI-powered gaming logo and banner generator. Track <span class="hl">total orders, revenue, and style trends</span> across the platform.</p>' +
      '<p>View recent orders, monitor service configuration and status, and refresh data on demand.</p>',
    advanced:
      "Data is loaded via the useClanforgeData hook, which fetches stats, recent orders, config, and service status.",
  },
  "/app/clients": {
    title: "Clients",
    description:
      '<p>A <span class="hl">client directory</span> listing all active and inactive clients with their contact details, assigned services, and subscription plan. Filter by service type or search by name.</p>' +
      '<p>Add new clients via a modal form with fields for <span class="hl">name, email, phone, company, website, services, plan tier</span>, and notes.</p>',
    advanced:
      "Clients are stored and retrieved via /api/clients. Each client record includes an ID, contact info, services array, plan tier, status, and notes.",
  },
  "/app/content-autopilot": {
    title: "Content Autopilot",
    description:
      '<p>Generates <span class="hl">multi-platform social media posts</span> for LinkedIn, Instagram, YouTube, and TikTok from a single topic. Choose a tone and get platform-specific copy with hashtags.</p>' +
      '<p>View stats for <span class="hl">total, draft, scheduled, and posted</span> content. Each post can be edited, scheduled, or deleted.</p>',
    advanced:
      "Posts are generated via AI and stored with per-platform content. Each post has a status lifecycle: draft, scheduled, posted.",
  },
  "/app/content-creator": {
    title: "Content Creator",
    description:
      '<p>A <span class="hl">content calendar and creation studio</span> with three views: Calendar, Create, and Library. The calendar shows a weekly grid with posts color-coded by platform.</p>' +
      '<p>Create new content by selecting <span class="hl">platform, tone, content type</span>, and media type. AI generates platform-specific copy with hashtags and optimal posting times.</p>',
    advanced:
      "Content records are stored with per-platform nested data. Status transitions from draft to scheduled to posted to analyzed. Best posting times are hardcoded per platform.",
  },
  "/app/crm": {
    title: "CRM",
    description:
      '<p>A full <span class="hl">sales pipeline CRM</span> with contacts organized by stage: Lead, Qualified, Proposal, Negotiation, Won, and Lost. Each contact shows deal value, currency, and next action.</p>' +
      '<p>Add and edit contacts with <span class="hl">notes, tags, source tracking, and scheduled follow-ups</span>.</p>',
    advanced:
      "Contacts are managed via API endpoints with full CRUD support. Each contact includes stage, deal value with currency, notes, tags, source, and next action with date.",
  },
  "/app/currency": {
    title: "Currency Converter",
    description:
      '<p>A live <span class="hl">currency converter</span> with quick-access pairs for USD/IDR, EUR, SGD, and AUD. Enter an amount, pick currencies, and see the converted value instantly.</p>' +
      '<p>Browse the full list of <span class="hl">available exchange rates</span> with search filtering. Rates can be refreshed on demand.</p>',
    advanced:
      "Rates are fetched from /api/exchange-rate. A manual sync triggers /api/exchange-rate/sync (POST). Cross-currency conversion is calculated client-side by dividing through USD.",
  },
  "/app/descript": {
    title: "Descript",
    description:
      '<p>Status page for the <span class="hl">Descript video editing agent</span>. This agent imports recordings into Descript for editing, reading from the <span class="hl">Zoom agent\'s ready queue</span>.</p>' +
      '<p>View the API key configuration status and explore agent capabilities.</p>',
    advanced:
      "The Descript agent reads from the Zoom agent's output queue and launches the Descript desktop app. DESCRIPT_API_KEY is configured in .env.",
  },
  "/app/disk-cleaner": {
    title: "Disk Cleaner",
    description:
      '<p>Automated <span class="hl">disk cleanup agent</span> that identifies and removes unnecessary files like caches, logs, and build artifacts. Shows <span class="hl">disk usage stats</span>, cleanup history, and bytes freed per run.</p>',
    advanced:
      "The disk-cleaner agent runs on a schedule, scanning predefined paths. Each run logs items cleaned, bytes freed, duration, and errors. Disk stats are fetched from the system.",
  },
  "/app/dropbox": {
    title: "Dropbox",
    description:
      '<p>A <span class="hl">file browser and storage dashboard</span> for your Dropbox account. View storage usage with a visual bar, and browse files and folders in a navigable tree.</p>' +
      '<p>See file sizes, modification dates, and folder contents. The <span class="hl">storage indicator</span> changes color based on usage level.</p>',
    advanced:
      "Data is fetched via the useDropboxData and useDropboxBrowser hooks which call /api/dropbox endpoints. File browsing supports subfolder navigation with breadcrumb tracking.",
  },
  "/app/google": {
    title: "Google",
    description:
      '<p>A unified command center for <span class="hl">Google services</span> including Gmail, Google Calendar, Google Drive, and Search Console. Run quick commands to query each service.</p>' +
      '<p>Type commands in the input field or use <span class="hl">quick command buttons</span>. Results display inline with structured formatting.</p>',
    advanced:
      "Commands are sent to /api/google which routes to the appropriate Google API. Authentication uses OAuth2 with tokens stored locally.",
  },
  "/app/guard-dog/audit": {
    title: "Guard Dog: Audit Trail",
    description:
      '<p>A searchable log of every <span class="hl">npm package installation scan</span>. Each scan is classified as <span class="hl">BARK (dangerous), WHINE (suspicious), or SILENT (clean)</span>.</p>' +
      '<p>Filter by action type or search by package name and reason.</p>',
    advanced:
      "Data comes from the useGuardDogData shared hook. The audit trail supports text search and action-type filtering.",
  },
  "/app/guard-dog/projects": {
    title: "Guard Dog: Projects",
    description:
      '<p>A <span class="hl">coming soon</span> page for per-project vulnerability scanning. Planned features include <span class="hl">project risk scores, dependency trees, and health indicators</span>.</p>',
    advanced:
      "This is a placeholder page with no live data integration yet.",
  },
  "/app/guard-dog/reports": {
    title: "Guard Dog: Reports",
    description:
      '<p>Weekly and daily <span class="hl">scan reports</span> from the Guard Dog agent. View aggregated <span class="hl">BARK, WHINE, and SILENT counts</span> broken down by week.</p>' +
      '<p>Includes a <span class="hl">threat intelligence summary</span> grouped by severity level.</p>',
    advanced:
      "Data is loaded via useGuardDogData. Daily trend data is grouped into weekly summaries client-side.",
  },
  "/app/guard-dog/settings": {
    title: "Guard Dog: Settings",
    description:
      '<p>Configure the <span class="hl">Guard Dog security agent</span> and run manual scans. Adjust <span class="hl">decision thresholds</span> for malicious/suspicious vote counts, downloads, stars, and max package age.</p>' +
      '<p>Manage <span class="hl">trusted providers and namespaces</span>, toggle notifications, and trigger manual scans.</p>',
    advanced:
      "Configuration is fetched from /api/guard-dog/config. Manual scans are triggered via POST to /api/guard-dog/manual-scan.",
  },
  "/app/guard-dog/vulnerabilities": {
    title: "Guard Dog: Vulnerabilities",
    description:
      '<p>A detailed <span class="hl">vulnerability database</span> listing security issues across dependencies. Filter by <span class="hl">severity (critical, high, medium, low)</span> and status (open, reviewed, snoozed, patched).</p>' +
      '<p>Search by package name or CVE ID and expand entries to see <span class="hl">remediation steps and fix versions</span>.</p>',
    advanced:
      "Vulnerabilities are fetched from /api/guard-dog/vulnerabilities. Each entry includes packageName, cveId, severity, CVSS score, affected/fixed versions, and remediation steps.",
  },
  "/app/heliconia-cantik": {
    title: "Heliconia Cantik",
    description:
      '<p>Reference dashboard for your <span class="hl">holding company</span>. View <span class="hl">active investments</span> and quick links to accounting tools, plus Dropbox links to key legal documents.</p>',
    advanced:
      "This is a mostly static reference page with hardcoded investment data and Dropbox document URLs.",
  },
  "/app/housing-search": {
    title: "Housing Search",
    description:
      '<p>Bali <span class="hl">rental property tracker</span> with villa listings across neighborhoods like Pererenan, Canggu, and Berawa. Filter by tier, beds, pool, and status. Each listing includes <span class="hl">WhatsApp contact</span> links.</p>',
    advanced:
      "Listings are stored as a static data array. Filtering supports neighborhood, tier, bed count, pool, and availability status. No backend API.",
  },
  "/app/ig-video-transcriber": {
    title: "IG Video Transcriber",
    description:
      '<p>Transcribes <span class="hl">Instagram video and reel audio</span> into text using OpenAI Whisper. Paste a URL or run a profile sweep to batch-transcribe reels.</p>' +
      '<p>Supports <span class="hl">local file transcription</span> for .mp4 files. Browse all transcripts in the library.</p>',
    advanced:
      "The transcription agent runs Python scripts with subcommands. Agent status is tracked via /api/ig-video-transcriber. Whisper model selection affects speed vs. accuracy.",
  },
  "/app/installed-skills": {
    title: "Installed Skills",
    description:
      '<p>Browse and manage all <span class="hl">installed Claude Code skills</span> across three sources: workspace, claude, and clawhub. View <span class="hl">skill metadata, version, install date, and auth status</span>.</p>' +
      '<p>Select any skill to see its documentation and <span class="hl">authentication configuration</span>.</p>',
    advanced:
      "Skills are fetched from /api/skills with full skill objects including name, slug, description, version, enabled status, and authFields.",
  },
  "/app/investments": {
    title: "Investments",
    description:
      '<p>Overview of all <span class="hl">property and hospitality investments</span>. Each card shows key stats. Click any investment to view its <span class="hl">dedicated dashboard</span>.</p>',
    advanced:
      "This is a static index page linking to sub-routes for each investment.",
  },
  "/app/investments/bali-beach-glamping": {
    title: "Bali Beach Glamping",
    description:
      '<p>Investment dashboard for <span class="hl">Bali Beach Glamping</span>. View social links, booking platform listings, and key documents.</p>',
    advanced:
      "Static reference page with hardcoded social links, booking URLs, and Google Drive document IDs.",
  },
  "/app/investments/glamp-nusa": {
    title: "Glamp Nusa",
    description:
      '<p>Investment dashboard for <span class="hl">Glamp Nusa</span>. View social profiles, booking platforms, and key documents.</p>',
    advanced:
      "Static reference page with hardcoded links and Google Drive document IDs.",
  },
  "/app/investments/one": {
    title: "Investment One",
    description:
      '<p>Dashboard for your first <span class="hl">hospitality investment</span>. Quick access to social profiles, <span class="hl">booking platforms</span>, Google Drive documents, and Dropbox folders.</p>',
    advanced:
      "Static reference page with data defined as constant arrays. No live API calls.",
  },
  "/app/investments/ora-balangan": {
    title: "Ora Balangan",
    description:
      '<p>Investment dashboard for <span class="hl">Ora Balangan</span>, an early-stage property investment. Placeholder ready to be populated.</p>',
    advanced:
      "Static placeholder page with no API calls. Sections show dashed-border prompts to add data via CONTEXT.md.",
  },
  "/app/investments/three": {
    title: "Investment Three",
    description:
      '<p>Dashboard for your third <span class="hl">hospitality investment</span>. Links to social profiles, <span class="hl">booking platforms</span>, and Google Drive documents.</p>',
    advanced:
      "Static reference page with constant arrays for social links, booking URLs, and documents. No live API calls.",
  },
  "/app/investments/two": {
    title: "Investment Two",
    description:
      '<p>Placeholder dashboard for your second <span class="hl">hospitality investment</span>. Displays <span class="hl">empty-state prompts</span> to add details via CONTEXT.md.</p>',
    advanced:
      "Minimal static page with no data populated. All sections show placeholder cards.",
  },
  "/app/investments/vbs": {
    title: "Villa Blue Skies Too",
    description:
      '<p>Investment dashboard for <span class="hl">Villa Blue Skies Too</span>. View booking platform links, property management tools, and financial documents. A <span class="hl">P&L chart</span> shows monthly trends.</p>',
    advanced:
      "The page loads P&L data dynamically via API for a monthly chart. Booking platforms and Google Drive documents are hardcoded.",
  },
  "/app/iron-amethyst": {
    title: "Iron Amethyst Holdings",
    description:
      '<p>Corporate reference page for <span class="hl">Iron Amethyst Holdings, LLC</span>. View corporate documents, tax filings, and bank account references.</p>',
    advanced:
      "Static reference page with hardcoded Dropbox folder URLs and Google Sheets IDs.",
  },
  "/app/kling": {
    title: "Kling AI",
    description:
      '<p>Monitor your <span class="hl">Kling AI video generation</span> agent with <span class="hl">text-to-video, image-to-video, and lip-sync</span> capabilities.</p>' +
      '<p>View agent status, last operation result, and timestamp.</p>',
    advanced:
      "Agent status is fetched from /api/kling. The agent tracks operation type, result status, and metadata.",
  },
  "/app/linkedin-images": {
    title: "LinkedIn Images",
    description:
      '<p>Creates branded <span class="hl">LinkedIn post images</span> with background photos, headline text, subtitle, and CTA overlays. Choose from style presets.</p>' +
      '<p>Upload <span class="hl">background images</span>, generate composed images, and optionally publish directly to LinkedIn.</p>',
    advanced:
      "The page fetches backgrounds, outputs, and presets from /api/linkedin-images. Image composition happens server-side.",
  },
  "/app/littlebird": {
    title: "LittleBird",
    description:
      '<p>Read and manage <span class="hl">LittleBird intelligence reports</span>. Browse reports with titles, dates, and previews.</p>' +
      '<p>Check <span class="hl">sync status</span> and trigger manual syncs to pull the latest reports.</p>',
    advanced:
      "Reports are fetched from /api/littlebird. Health checks verify the connection. Sync operations pull new reports into local storage.",
  },
  "/app/manychat-giveaways": {
    title: "ManyChat Giveaways",
    description:
      '<p>Manages <span class="hl">Instagram comment-triggered giveaways</span> powered by ManyChat. Create, edit, pause, resume, or archive giveaways. Link each to a <span class="hl">ManyChat flow</span>.</p>',
    advanced:
      "Giveaways are stored in a database with CRUD support. The sync button pushes changes to ManyChat.",
  },
  "/app/manychat-sync": {
    title: "ManyChat Sync",
    description:
      '<p>Syncs <span class="hl">ManyChat subscriber data</span> into Mission Control. View leads with name, email, Instagram username, and follower count.</p>' +
      '<p>View <span class="hl">agent status</span> and run manual syncs on demand.</p>',
    advanced:
      "Fetches agent status and subscriber/contact data from /api/manychat-sync endpoints.",
  },
  "/app/cohorts/settings": {
    title: "Masterminds HQ Settings",
    description:
      '<p>Settings page for <span class="hl">Masterminds HQ</span>. Redirects to the blog section.</p>',
    advanced:
      "Redirect page using Next.js redirect() to /app/cohorts/blog.",
  },
  "/app/mc-settings/ports": {
    title: "Port Registry",
    description:
      '<p>A live registry of all <span class="hl">ports used by services</span>. Each entry shows port number, service name, description, and status category.</p>' +
      '<p>Checkable ports are pinged for <span class="hl">live status indicators</span>.</p>',
    advanced:
      "Port definitions are hardcoded with metadata for each service. Live status checks ping each checkable port on load.",
  },
  "/app/meeting-notes": {
    title: "Meeting Notes",
    description:
      '<p>Record and review <span class="hl">meeting notes</span>. Each session captures client name, date, duration, and a structured summary with <span class="hl">key decisions, action items, and follow-ups</span>.</p>',
    advanced:
      "Sessions are managed via the /api/meeting-notes endpoint with full CRUD support.",
  },
  "/app/mentorships": {
    title: "Mentorship Clients",
    description:
      '<p>CRM for managing <span class="hl">mentorship clients</span>. Each client shows status, focus areas, <span class="hl">hours remaining</span>, total paid, and last session date.</p>' +
      '<p>Add new clients and click into any for their <span class="hl">detailed profile</span>.</p>',
    advanced:
      "Client data is stored via /api/mentorships endpoints with full CRUD and inline editing.",
  },
  "/app/meta-ads": {
    title: "Meta Ads",
    description:
      '<p>A <span class="hl">Meta Ads dashboard</span> showing account metrics, campaign performance, and budget data. View <span class="hl">spend, impressions, reach, clicks, CTR, CPC, and CPM</span>.</p>',
    advanced:
      "Data is fetched from /api/meta-ads which connects to the Meta Marketing API. Credentials must be in .env.",
  },
  "/app/nightcrawler": {
    title: "Nightcrawler",
    description:
      '<p>Overnight autonomous agent that <span class="hl">discovers and installs new skills</span> while you sleep. Review nightly reports and configure <span class="hl">goals, rules, and budget limits</span>.</p>',
    advanced:
      "Nightcrawler runs via launchd. It uses Claude to research, build, and install new skills and MC pages. Settings are persisted via the API.",
  },
  "/app/online-program": {
    title: "Online Program",
    description:
      '<p>Dashboard for your <span class="hl">online mentorship program</span>. See participant stats, cohort progress, session counts, and <span class="hl">program goals</span> with status indicators.</p>',
    advanced:
      "Data is fetched via the useOnlineProgramData hook from a SQLite database. Sub-pages cover blog, outreach, connections, discoveries, and more.",
  },
  "/app/online-program/blog": {
    title: "Blog Manager",
    description:
      '<p>AI-assisted <span class="hl">blog content pipeline</span> for your mentorship program. Review, queue, publish, or reject posts. Filter by status and <span class="hl">content pillar</span>.</p>',
    advanced:
      "Blog posts are stored in SQLite with status lifecycle and quality scores. The useOnlineProgramData hook handles all CRUD operations.",
  },
  "/app/online-program/cold-outreach": {
    title: "Cold Outreach",
    description:
      '<p>Manage <span class="hl">cold outreach campaigns</span> for your mentorship program. Define ICPs, create hook templates, and measure <span class="hl">reply rates</span>.</p>',
    advanced:
      "Data is managed via the useColdOutreachData hook with ICPs, templates, and campaign stats in SQLite.",
  },
  "/app/online-program/connections": {
    title: "Connections",
    description:
      '<p>Track <span class="hl">participant connections</span> within your mentorship program. Log introductions, collaborations, referrals, and shared interests with <span class="hl">status tracking</span>.</p>',
    advanced:
      "Connections are stored in SQLite with participant references, connection types, and status. Color-coded badges per type.",
  },
  "/app/online-program/discoveries": {
    title: "Discoveries",
    description:
      '<p>Content discovery feed that surfaces relevant posts from <span class="hl">Reddit, X, Instagram, TikTok, and YouTube</span>. Each discovery includes relevance scores and <span class="hl">content opportunity</span> tags.</p>',
    advanced:
      "Discoveries are stored in SQLite with platform, URL, scores, keywords, and content_opportunity type. Keyword management with signal strength tracking.",
  },
  "/app/online-program/favor-bank": {
    title: "Favor Bank",
    description:
      '<p>Track <span class="hl">reciprocal deals</span> with participants, including store credit, time hours, and item exchanges. View balances and <span class="hl">ledger entries</span>.</p>',
    advanced:
      "The favor bank uses SQLite with deals and ledger tables. Each deal tracks type, value, and months accrued.",
  },
  "/app/online-program/onboarding": {
    title: "Onboarding",
    description:
      '<p>Track the <span class="hl">onboarding pipeline</span> for new participants. Monitor intake forms, billing, WhatsApp connection, and <span class="hl">calendar additions</span>.</p>',
    advanced:
      "Onboarding data comes from SQLite joining participants with intake records. Tracked fields include billing status and Stripe IDs.",
  },
  "/app/online-program/participants": {
    title: "Participants",
    description:
      '<p>Full directory of <span class="hl">mentorship participants</span> with bios, business descriptions, social links, and cohort info. Search, sort, tag, and add <span class="hl">notes and offers</span>.</p>',
    advanced:
      "Participant data is stored in SQLite. Fields include full profile info, AI-generated summaries, offers, attendance, and tags. Timezone offsets calculated relative to UTC+8.",
  },
  "/app/online-program/questions": {
    title: "Questions",
    description:
      '<p>Manage participant <span class="hl">questions and answers</span>. AI generates draft answers that you can review, edit, and <span class="hl">regenerate</span>.</p>',
    advanced:
      "Questions are stored in SQLite. The AI regeneration endpoint uses Claude to draft answers. Search filters by text content.",
  },
  "/app/online-program/session-prep": {
    title: "Session Prep",
    description:
      '<p>Prepare for upcoming <span class="hl">mentorship sessions</span> with attendance tracking, hot seat selection, and question review.</p>',
    advanced:
      "Session data is stored in SQLite with per-participant attendance records. Navigation arrows allow moving between sessions.",
  },
  "/app/online-program/settings": {
    title: "Settings (Redirect)",
    description:
      '<p>Redirects to the <span class="hl">Blog Manager</span> page.</p>',
    advanced:
      "Uses Next.js server-side redirect(). No rendering occurs on this route.",
  },
  "/app/online-program/wrap-up": {
    title: "Session Wrap-Up",
    description:
      '<p>Post-session processing pipeline for <span class="hl">mentorship recordings</span>. Tracks sessions through stages: Zoom recording, transcript, YouTube upload, summary, <span class="hl">WhatsApp distribution</span>, and Notion archiving.</p>',
    advanced:
      "Session data is in SQLite with pipeline status flags. Stages include automated, manual, and approval types. Reel clips and member requests are tracked per session.",
  },
  "/app/online-programs": {
    title: "Online Programs",
    description:
      '<p>Overview dashboard for <span class="hl">online courses and programs</span>. Shows total members, published sessions, and enrollments. Links to individual course pages.</p>',
    advanced:
      "Data is fetched server-side from Supabase. Tables: portal_members, sessions, enrollments, courses.",
  },
  "/app/online-programs/masterminds-hq": {
    title: "Masterminds HQ",
    description:
      '<p>Management hub for the <span class="hl">Masterminds HQ course</span>. View enrolled members and track <span class="hl">session progress</span>.</p>',
    advanced:
      "Fetches from Supabase tables with server-side rendering. Member progress is cross-referenced against published sessions.",
  },
  "/app/passive-ideas": {
    title: "Passive Income Ideas",
    description:
      '<p>A <span class="hl">ranked idea board</span> for passive income opportunities. Each idea has estimated <span class="hl">monthly income</span>, difficulty, automation rating, and realism score.</p>' +
      '<p>Filter by status, category, and difficulty. <span class="hl">Send ideas to the task board</span> to start building them.</p>',
    advanced:
      "Ideas are managed via API endpoints with CRUD support. Ideas can be promoted to tasks with one click.",
  },
  "/app/personal-info": {
    title: "Personal Info",
    description:
      '<p>Secure vault for <span class="hl">personal reference information</span> in tabs: Personal, Entities, Health, Tax IDs, and Computers.</p>' +
      '<p>Sensitive fields are <span class="hl">masked by default</span>. Click any value to copy to clipboard.</p>',
    advanced:
      "Data is fetched from /api/personal-info as markdown sections. The parser auto-detects sensitive fields via regex.",
  },
  "/app/pexel": {
    title: "Pexels",
    description:
      '<p>Search for <span class="hl">free stock photos</span> from Pexels with photographer attribution. Use the <span class="hl">Wix import</span> feature to send photos to your media library.</p>',
    advanced:
      "Search queries proxy the Pexels API via /api/pexel. The PEXELS_API_KEY must be set in .env.",
  },
  "/app/pitch-deck": {
    title: "Pitch Deck Builder",
    description:
      '<p>Create <span class="hl">investor pitch decks</span> with structured sections. Build using a <span class="hl">guided form editor</span> and export to slides.</p>',
    advanced:
      "Decks are stored via /api/pitch-deck. Export handled via POST to /api/pitch-deck/export-slides.",
  },
  "/app/porkbun": {
    title: "Porkbun",
    description:
      '<p>Manage <span class="hl">domains and DNS records</span> through the Porkbun registrar. View domains, check availability, and manage <span class="hl">DNS records</span>.</p>',
    advanced:
      "Communicates with the Porkbun API via /api/porkbun. Supports all standard DNS record types. Credentials in .env.",
  },
  "/app/postiz": {
    title: "Postiz",
    description:
      '<p>Control the <span class="hl">Postiz social media scheduling</span> Docker stack. View container status for <span class="hl">app, database, and Redis</span>. Start and stop with one click.</p>',
    advanced:
      "Runs as Docker Compose. Status polled every 30 seconds. Start/stop via docker compose up/down.",
  },
  "/app/postpilot": {
    title: "PostPilot Dashboard",
    description:
      '<p>Command center for <span class="hl">PostPilot</span>, an automated blog publishing service. View clients, posts, <span class="hl">MRR</span>, and content quality scores.</p>',
    advanced:
      "Aggregates data from /api/postpilot/dashboard with client stats, post counts, and scheduling info.",
  },
  "/app/postpilot/clients": {
    title: "PostPilot Clients",
    description:
      '<p>Manage <span class="hl">PostPilot client accounts</span> with full configuration: website, platform, tier, posts per day, and timezone.</p>',
    advanced:
      "Client data managed through /api/postpilot/clients with CRUD support.",
  },
  "/app/postpilot/posts": {
    title: "PostPilot Posts",
    description:
      '<p>Browse all <span class="hl">blog posts generated by PostPilot</span>. Filter by client or status. Each shows title, platform, status, and <span class="hl">SEO score</span>.</p>',
    advanced:
      "Posts fetched from /api/postpilot/posts with optional client and status filtering.",
  },
  "/app/prompt-packs": {
    title: "Prompt Packs",
    description:
      '<p>Manage <span class="hl">prompt pack products</span> for sale. View packs by status, track <span class="hl">revenue and sales</span>, and submit new ideas.</p>',
    advanced:
      "Data fetched via usePromptPacks hook. Statuses: ready, draft, listed, archived.",
  },
  "/app/remotion": {
    title: "Remotion",
    description:
      '<p>Dashboard for the <span class="hl">Remotion video rendering</span> engine. View render job stats and monitor individual jobs with <span class="hl">status badges and progress</span>.</p>',
    advanced:
      "Render data via useRemotionData hook. Jobs tracked with statuses: idle, rendering, error.",
  },
  "/app/rio": {
    title: "Rio Hub",
    description:
      '<p>Landing page for <span class="hl">Rio</span>, the WhatsApp AI Copilot. Navigate to <span class="hl">ICPs</span>, Store Leads, and WABA Setup sub-sections.</p>',
    advanced:
      "Static navigation page linking to sub-routes and external Notion/Slack resources.",
  },
  "/app/rio/icps": {
    title: "Rio ICPs",
    description:
      '<p>Directory of <span class="hl">Ideal Customer Profiles</span> for Rio. Each ICP links to a detailed research page.</p>',
    advanced:
      "ICPs defined as a static array. Detail pages at /app/rio/icps/[slug].",
  },
  "/app/rio/icps/shopify-store-owners": {
    title: "ICP: Shopify Store Owners",
    description:
      '<p>Research profile for <span class="hl">Shopify Store Owners</span> managing customer conversations on WhatsApp.</p>',
    advanced:
      "Static placeholder page. Content will be populated during the research phase.",
  },
  "/app/rio/icps/smb-coaches-consultants": {
    title: "ICP: SMB Coaches & Consultants",
    description:
      '<p>Research profile for <span class="hl">SMB coaches and consultants</span> running their practice through WhatsApp.</p>',
    advanced:
      "Static placeholder page. Content will be populated during the research phase.",
  },
  "/app/rio/store-leads": {
    title: "Store Leads Pipeline",
    description:
      '<p>A <span class="hl">Shopify store sourcing pipeline</span> powered by StoreLeads.app. Browse stores with <span class="hl">WhatsApp signal scores</span>, filter by criteria, and export qualified leads.</p>',
    advanced:
      "Data in local SQLite. The StoreLeads agent scores stores by WhatsApp readiness. Exports available as downloadable files.",
  },
  "/app/rio/waba-setup": {
    title: "WABA Setup Knowledge Base",
    description:
      '<p>Searchable <span class="hl">knowledge base for WhatsApp Business API setup</span>. Browse guides, search documents, and use the <span class="hl">AI Answer Panel</span>.</p>',
    advanced:
      "Backed by markdown files on disk with a SQLite search index. AI answer panel generates contextual responses.",
  },
  "/app/santa": {
    title: "Santa Claus Agent",
    description:
      '<p>Dashboard for the <span class="hl">overnight agent</span> that autonomously builds new skills while you sleep. View run history and <span class="hl">nightly reports</span>.</p>',
    advanced:
      "Runs as a scheduled agent spawning Claude Code sessions. Settings (identity, mission, budget) are persisted and editable.",
  },
  "/app/scrooge": {
    title: "Scrooge",
    description:
      '<p>AI <span class="hl">token usage and cost tracking</span> dashboard. Filter by time range and model. View cost trends, <span class="hl">model breakdowns</span>, and optimization suggestions.</p>',
    advanced:
      "Data fetched via useScroogeData from a cost-tracking database. Displays StatCards, CostTrendChart, ModelBreakdown, and ResearchSuggestions.",
  },
  "/app/skills": {
    title: "Skills Registry",
    description:
      '<p>Browse the full <span class="hl">agent and skills registry</span> with filtering by type and status. View in <span class="hl">grid or grouped layout</span>.</p>',
    advanced:
      "Skills loaded from /api/skills/registry. Supports grid and grouped views, multi-field sorting, and type + status filtering.",
  },
  "/app/slack": {
    title: "Slack",
    description:
      '<p>Manage <span class="hl">Slack automation rules</span> that control message processing. Create, edit, and delete rule files inline.</p>',
    advanced:
      "Rules managed via /api/slack/rules with CRUD support. Changes take effect immediately.",
  },
  "/app/smart-home": {
    title: "Smart Home",
    description:
      '<p>Control your <span class="hl">Philips Hue smart home</span> from Mission Control. Manage <span class="hl">lights, rooms, and scenes</span>. Toggle lights, adjust brightness.</p>',
    advanced:
      "Communicates with the smart-home agent via /api/smart-home. Status polling every 30 seconds.",
  },
  "/app/smart-sync": {
    title: "Smart Sync",
    description:
      '<p>Manages the <span class="hl">one-way sync</span> from the production codebase to the open-source build. Configure route renames, text replacements, <span class="hl">skip paths</span>, and protected files.</p>',
    advanced:
      "Reads a manifest defining source/dest, renames, replacements, and skip paths. Actions include sync preview, execute, and manifest editing.",
  },
  "/app/spotify": {
    title: "Spotify",
    description:
      '<p>Control <span class="hl">Spotify playback</span> and manage playlists. View currently playing track, use playback controls, and <span class="hl">create playlists</span> from a list of artist and song names.</p>',
    advanced:
      "Commands sent to /api/spotify/command. Spotify uses OAuth2. Playlist creator resolves tracks via Spotify search API.",
  },
  "/app/stock-photo-ai": {
    title: "Stock Photo AI",
    description:
      '<p>Dashboard for an <span class="hl">AI stock photo description service</span>. Track <span class="hl">images processed, downloads, and revenue</span>.</p>',
    advanced:
      "Data via useStockPhotoData hook from /api/stock-photo-ai.",
  },
  "/app/story-engine": {
    title: "Story Engine",
    description:
      '<p>An <span class="hl">AI children\'s story generator</span> that creates personalized stories with moral lessons. Enter name, age, interests, and theme.</p>',
    advanced:
      "Stories fetched and generated via /api/story-engine. Dashboard includes stats and config.",
  },
  "/app/tidycal": {
    title: "TidyCal",
    description:
      '<p>View <span class="hl">TidyCal booking types and appointments</span>. Browse bookings with contact info and scheduling details.</p>',
    advanced:
      "Data from /api/tidycal proxying the TidyCal API. TIDYCAL_API_KEY required in .env.",
  },
  "/app/tokopedia": {
    title: "Tokopedia",
    description:
      '<p>Search <span class="hl">Tokopedia</span> with built-in <span class="hl">trust scoring</span>. View prices in IDR and USD, seller info, ratings, and red flags.</p>',
    advanced:
      "Searches via /api/tokopedia. Trust scores computed client-side using rating, reviews, seller badges, and price anomalies.",
  },
  "/app/unsplash": {
    title: "Unsplash",
    description:
      '<p>Search for <span class="hl">free high-resolution photos</span> from Unsplash with photographer attribution and download tracking.</p>',
    advanced:
      "Proxies the Unsplash API via /api/unsplash. Downloads trigger tracking per API terms.",
  },
  "/app/venue-finder": {
    title: "Venue Finder",
    description:
      '<p>Search <span class="hl">venues via Google Places</span> and save to a shortlist with notes, tags, and status tracking. Use the <span class="hl">compare view</span> for side-by-side evaluation.</p>',
    advanced:
      "Venue search via Google Places API. Saved venues stored locally with status pipeline.",
  },
  "/app/vercel": {
    title: "Vercel",
    description:
      '<p>Manage <span class="hl">Vercel deployments and projects</span>. Deploy directories, view logs, and manage domains.</p>',
    advanced:
      "Agent uses the Vercel API with token from .env. Status from /api/vercel/status.",
  },
  "/app/video-processor": {
    title: "Video Processor",
    description:
      '<p>A <span class="hl">video processing job queue</span> for reformatting videos for social platforms. Submit jobs and monitor <span class="hl">status in real time</span>.</p>',
    advanced:
      "Jobs managed via /api/video-processor. Polls every 5 seconds. Supported platforms: instagram-reel, youtube, tiktok, square.",
  },
  "/app/villa-search": {
    title: "Villa Search",
    description:
      '<p>A <span class="hl">Bali villa rental tracker</span> with listings across neighborhoods. Filter by beds, pool, price, and status.</p>',
    advanced:
      "Listings are a static array in the component. No backend API.",
  },
  "/app/whoop": {
    title: "WHOOP",
    description:
      '<p>Health dashboard showing <span class="hl">WHOOP recovery, strain, and sleep data</span> with circular gauges. Recovery color-coded by zone.</p>',
    advanced:
      "Data via useWhoopData hook. SVG gauges with animated transitions. Sleep stages as stacked bar chart.",
  },
  "/app/x": {
    title: "X (Twitter)",
    description:
      '<p>Full <span class="hl">X content management</span> dashboard with Curated Feed, Compose, Queue, Topics, Rules, and Analytics tabs.</p>',
    advanced:
      "Data via useXData hook from /api/x endpoints. Feed is server-filtered by enabled topics.",
  },
  "/app/youtube": {
    title: "YouTube",
    description:
      '<p>Monitor <span class="hl">YouTube channels and video performance</span>. Browse videos with thumbnails, view counts, and publish dates.</p>',
    advanced:
      "Data from YouTube Data API v3 via /api/youtube. YOUTUBE_API_KEY required in .env.",
  },
  "/app/zoho-books": {
    title: "Zoho Books",
    description:
      '<p>Interface to <span class="hl">Zoho Books accounting</span> with tabs for Dashboard, Invoices, Contacts, Expenses, Bills, and more.</p>',
    advanced:
      "Commands sent to /api/zoho-books?cmd=<command> proxying the Zoho Books agent. Requires Zoho API key.",
  },
};

export function getHelpContent(pathname: string): HelpEntry {
  return HELP_CONTENT[pathname] || DEFAULT_HELP;
}
