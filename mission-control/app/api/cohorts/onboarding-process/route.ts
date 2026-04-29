import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const CRON_JOBS_PATH = path.join(
  HOME,
  ".openclaw/cron/jobs.json"
);

interface CronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule?: { kind: string; expr: string; tz?: string };
  payload?: { kind?: string; type?: string; command?: string; text?: string };
  sessionTarget?: string;
  state?: {
    lastRunAtMs?: number;
    lastRunStatus?: string;
    lastStatus?: string;
    lastError?: string;
    nextRunAtMs?: number;
    consecutiveErrors?: number;
  };
}

function loadCronJob(id: string): CronJob | null {
  try {
    const data = JSON.parse(readFileSync(CRON_JOBS_PATH, "utf8"));
    const jobs: CronJob[] = data.jobs || [];
    return jobs.find((j) => j.id === id) || null;
  } catch {
    return null;
  }
}

function formatMs(ms: number | undefined): string | null {
  if (!ms) return null;
  return new Date(ms).toISOString();
}

export async function GET() {
  const syncJob = loadCronJob("mastermind-participants-sync");
  const intakeJob = loadCronJob("mastermind-intake-poller");

  const steps = [
    {
      number: 1,
      name: "Check Payment",
      description:
        "Verify that the participant has paid. Check Stripe first; if no record is found, check for external payments (Wise, Revolut, bank transfer).",
      trigger: "Manual — first step when a new participant is identified",
      automation: "none",
      scripts: [],
      status: "manual",
      details:
        "Payment must be confirmed before any onboarding steps can proceed. The participant detail view has a built-in Stripe lookup and manual payment entry.",
      subSteps: [
        {
          id: "1a",
          name: "Check Stripe",
          description:
            "Look up the participant's email in Stripe. If a subscription or charge is found, pull in: payment date, plan name, amount, billing cycle, next billing date, and package duration.",
          details:
            "Payment links: Starter ($999/mo, month-to-month), Growth ($699/mo, 6-month package), Leader ($499/mo, 12-month package). One-time payments of any amount also accepted. Click 'Check Stripe' in the participant's detail view to run this lookup.",
        },
        {
          id: "1b",
          name: "Manual / External Payment",
          description:
            "If no Stripe payment is found, check whether the participant paid via Wise, Revolut, bank transfer, or another method. Record the payment method, amount, and any notes in the participant's detail view using the 'Paid Externally' checkbox.",
          details:
            "Future project: Set up Wise and Revolut API integrations for automatic payment detection. For now, this is a manual process — check your Wise/Revolut dashboard and record the payment in Mission Control.",
        },
      ],
    },
    {
      number: 2,
      name: "Airtable Sync",
      description:
        "Pulls new participants from the Airtable Client Intake form into the local SQLite database. Downloads photos and checks Stripe for payment status.",
      trigger: "Cron — every 12 hours (6 AM & 6 PM WITA)",
      automation: "cron",
      cronJobId: "mastermind-participants-sync",
      scripts: [
        "~/.openclaw/workspace/agents/mastermind-participants/sync.js",
      ],
      status: syncJob?.state?.lastRunStatus === "ok" ? "healthy" : syncJob?.state?.lastRunStatus || "unknown",
      lastRun: formatMs(syncJob?.state?.lastRunAtMs),
      nextRun: formatMs(syncJob?.state?.nextRunAtMs),
      lastError: syncJob?.state?.lastError || null,
      enabled: syncJob?.enabled ?? false,
      schedule: syncJob?.schedule?.expr || null,
    },
    {
      number: 3,
      name: "Payment Email",
      description:
        "If a new Airtable submission has no Stripe customer, an automated welcome email is sent with the payment link and any personal promo code.",
      trigger: "Automatic — runs as part of Airtable Sync (step 2)",
      automation: "automatic",
      scripts: [
        "~/.openclaw/workspace/agents/mastermind-participants/sync.js (sendPaymentEmail)",
      ],
      status: syncJob?.state?.lastRunStatus === "ok" ? "healthy" : syncJob?.state?.lastRunStatus || "unknown",
      details:
        "Uses Google agent to send Gmail. Checks for existing promo codes matching the participant's first name.",
    },
    {
      number: 4,
      name: "Intake Form Sent",
      description:
        "The Airtable intake form link is recorded as sent. Participant fills out bio, photo, social links, business details.",
      trigger: "Automatic — recorded during sync when intake record is created",
      automation: "automatic",
      scripts: [],
      status: "healthy",
      details:
        "Form URL: https://airtable.com/appYNF8Zkzpd7FmZ1/pagSmsaRwBS0IHmk2/form",
    },
    {
      number: 5,
      name: "Intake Form Processing",
      description:
        "When participant submits the Airtable form, the intake poller detects it and begins the onboarding pipeline: bio refinement, Wix import, calendar add.",
      trigger: "Cron — every hour",
      automation: "cron",
      cronJobId: "mastermind-intake-poller",
      scripts: [
        "~/.openclaw/workspace/projects/mastermind/scripts/process-intake.js",
      ],
      status: intakeJob?.state?.lastRunStatus === "ok" ? "healthy" : intakeJob?.state?.lastRunStatus || "unknown",
      lastRun: formatMs(intakeJob?.state?.lastRunAtMs),
      nextRun: formatMs(intakeJob?.state?.nextRunAtMs),
      lastError: intakeJob?.state?.lastError || null,
      enabled: intakeJob?.enabled ?? false,
      schedule: intakeJob?.schedule?.expr || null,
    },
    {
      number: 6,
      name: "Bio Refinement",
      description:
        "Raw bio from Airtable is refined into a professional 1-2 sentence version using Claude Haiku. Stored in the intake table.",
      trigger: "Automatic — runs as part of Intake Processing (step 5)",
      automation: "automatic",
      scripts: [
        "process-intake.js → refineBio()",
      ],
      status: intakeJob?.state?.lastRunStatus === "ok" ? "healthy" : intakeJob?.state?.lastRunStatus || "unknown",
      details:
        "Model: claude-haiku-4-5. Falls back to truncating first 2 sentences if CLI fails.",
    },
    {
      number: 7,
      name: "Wix CMS Entry",
      description:
        "Photo is imported to Wix Media Manager, then a CMS entry is created in the BizAutoMastermindParticipants collection with name, bio, and photo.",
      trigger: "Automatic — runs as part of Intake Processing (step 5)",
      automation: "automatic",
      scripts: [
        "process-intake.js → importPhotoToWix() + createWixEntry()",
      ],
      status: intakeJob?.state?.lastRunStatus === "ok" ? "healthy" : intakeJob?.state?.lastRunStatus || "unknown",
      details:
        "Wix collection: BizAutoMastermindParticipants. Photo uploaded via Wix Media Manager API.",
    },
    {
      number: 8,
      name: "Google Calendar",
      description:
        "Participant's email is added as an attendee to the recurring weekly mastermind session on Google Calendar (all future instances).",
      trigger: "Automatic — runs as part of Intake Processing (step 5)",
      automation: "automatic",
      scripts: [
        "process-intake.js → addToCalendar()",
      ],
      status: intakeJob?.state?.lastRunStatus === "ok" ? "healthy" : intakeJob?.state?.lastRunStatus || "unknown",
      details:
        "Uses gog CLI to update the recurring calendar event. Adds attendee to all instances.",
    },
    {
      number: 9,
      name: "WhatsApp Group",
      description:
        "Participant is manually added to the WhatsApp group. Toggled via the Pipeline tab in Mission Control.",
      trigger: "Manual — click 'Pending' button in Pipeline tab",
      automation: "manual",
      scripts: [],
      status: "manual",
      details:
        "This step is done manually because WhatsApp group invites require a human to send.",
    },
    {
      number: 10,
      name: "Mark Complete",
      description:
        "Once all automated steps finish, the intake status is set to 'complete'. The participant shows as fully onboarded in the Pipeline tab.",
      trigger: "Automatic — final step of Intake Processing (step 5)",
      automation: "automatic",
      scripts: [
        "process-intake.js (final UPDATE)",
      ],
      status: intakeJob?.state?.lastRunStatus === "ok" ? "healthy" : intakeJob?.state?.lastRunStatus || "unknown",
    },
  ];

  // Load cohorts
  let cohorts: any[] = [];
  try {
    const cohortsPath = path.join(WS, "projects/mastermind/cohorts.json");
    const cohortsData = JSON.parse(readFileSync(cohortsPath, "utf8"));
    cohorts = cohortsData.cohorts || [];
  } catch {
    cohorts = [];
  }

  // Load email templates
  let templates: any[] = [];
  try {
    const templatesDir = path.join(WS, "projects/mastermind/templates");
    const files = readdirSync(templatesDir).filter((f) => f.endsWith(".md"));
    templates = files.map((filename) => {
      const raw = readFileSync(path.join(templatesDir, filename), "utf8");
      const parts = raw.split("---");
      // parts[0] is empty (before first ---), parts[1] is frontmatter, parts[2+] is body
      const frontmatter = parts[1] || "";
      const body = parts.slice(2).join("---").trim();

      // Parse YAML frontmatter manually
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      const triggerMatch = frontmatter.match(/^trigger:\s*(.+)$/m);
      const subjectMatch = frontmatter.match(/^subject:\s*"?(.+?)"?\s*$/m);

      // Parse variables array
      const variables: string[] = [];
      const varSection = frontmatter.match(/variables:\n((?:\s+-\s*.+\n?)*)/);
      if (varSection) {
        const varLines = varSection[1].match(/^\s+-\s*"?(.+?)"?\s*$/gm);
        if (varLines) {
          for (const line of varLines) {
            const m = line.match(/^\s+-\s*"?(.+?)"?\s*$/);
            if (m) variables.push(m[1]);
          }
        }
      }

      return {
        filename,
        name: nameMatch ? nameMatch[1] : filename,
        trigger: triggerMatch ? triggerMatch[1] : "",
        subject: subjectMatch ? subjectMatch[1] : "",
        variables,
        body,
      };
    });
  } catch {
    templates = [];
  }

  const futureNotes = [
    "Set up Wise and Revolut API integrations for automatic payment tracking from alternative platforms.",
  ];

  return NextResponse.json({ steps, cohorts, templates, futureNotes });
}
