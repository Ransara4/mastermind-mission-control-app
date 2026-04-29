import { NextResponse } from "next/server";

export async function GET() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  return NextResponse.json({
    date: dateStr,
    generatedAt: new Date().toISOString(),
    accomplishments: {
      narrative: [
        "Deployed landing page redesign to production (Vercel)",
        "Processed 12 customer support tickets via WhatsApp automation",
        "Published 2 blog posts via PostPilot (SEO-optimized)",
        "Updated pricing page based on A/B test results",
        "Automated invoice reminders sent to 3 overdue clients",
      ],
      sessionCount: 8,
      gitCommits: 14,
      tasksCompleted: 6,
    },
    todaysFocus: {
      items: [
        { title: "Review Q1 revenue report and adjust pricing", project: "Revenue", priority: "High", source: "Trello" },
        { title: "Finalize partnership proposal for Acme Corp", project: "Partnerships", priority: "High", source: "Trello" },
        { title: "Approve new blog content calendar for April", project: "Content", priority: "Medium", source: "MC Tasks" },
        { title: "Follow up with 2 warm leads from LinkedIn outreach", project: "Sales", priority: "Medium", source: "MC Tasks" },
      ],
    },
    revenue: {
      stripe: { total: 2847.50, charges: 18, currency: "usd" },
      gumroad: { total: 394.00, sales: 8 },
      grandTotal: 3241.50,
    },
    suggestedTasks: [
      { title: "Send follow-up to trial users expiring this week", reason: "7 trial subscriptions expire in 3 days" },
      { title: "Review and respond to 2 partnership inquiries", reason: "Sitting in inbox for 48+ hours" },
      { title: "Update affiliate link on blog post #47", reason: "Link returning 404 since yesterday" },
    ],
    santaReport: {
      ran: true,
      summary: "Optimized 3 API routes reducing average response time by 40ms. Added error boundary to the dashboard page. Discovered and fixed a memory leak in the polling hook (was creating new intervals without clearing old ones). Installed 1 new skill: revenue-pulse.",
      reportPath: null,
    },
    importantMessages: [
      { source: "Email", summary: "Invoice #1042 payment received from Acme Corp ($4,500)", priority: "medium", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { source: "WhatsApp", summary: "Client asking about custom enterprise pricing", priority: "high", timestamp: new Date(Date.now() - 7200000).toISOString() },
      { source: "Slack", summary: "Team standup notes posted in #daily-updates", priority: "low", timestamp: new Date(Date.now() - 10800000).toISOString() },
    ],
    humanTaskFailures: [],
    topPassiveIdea: {
      title: "Notion Template Marketplace",
      description: "Create and sell premium Notion templates for small business operations. Low maintenance after creation, high margins, growing market of 30M+ Notion users.",
      potentialIncome: "$500-2,000/month",
      difficulty: "Low",
    },
  });
}
