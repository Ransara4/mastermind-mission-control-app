"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Database,
  FileText,
  GitBranch,
  Mail,
  Search,
  Target,
  Terminal,
  Upload,
  Users,
  Zap,
} from "lucide-react";

const STAGE_ROW_1 = [
  { stage: "1", name: "Scout Discovery", desc: "Tavily web search across ICP niches", icon: Search },
  { stage: "2", name: "Signal Scoring", desc: "Score on service fit, audience, pain, content", icon: Zap },
  { stage: "3", name: "Qualification", desc: "ICP rules, track assignment, dedup", icon: CheckCircle },
  { stage: "4", name: "Email Waterfall", desc: "Hunter find, pattern guess, Bouncer verify", icon: Mail },
  { stage: "5", name: "Hook Writing", desc: "Opus writes personalized hooks per prospect", icon: FileText },
];

const STAGE_ROW_2 = [
  { stage: "6", name: "Hook Rating", desc: "Rate open likelihood + response chance", icon: Target },
  { stage: "7", name: "Sheet Export", desc: "21-column append with conditional formatting", icon: Database },
  { stage: "8", name: "Validation", desc: "Pre/post-upload integrity checks", icon: AlertCircle },
  { stage: "9", name: "Instantly Upload", desc: "Send=Yes rows pushed to campaigns", icon: Upload },
  { stage: "H", name: "Human Review", desc: "Manual review before any email goes out", icon: Users },
];

const SHEET_COLUMNS = [
  "#", "First Name", "Last Name", "Subject Line", "Hook",
  "Open Rating", "Prospect Profile", "Niche/Focus", "Notes",
  "Email", "Website", "LinkedIn", "Score", "Tier", "Send?",
  "Track", "Response Likelihood", "Warm-Up Status",
  "Uploaded to Instantly", "ICP Tag", "Date Added",
];

function StageCard({ stage, name, desc, icon: Icon, isLast }: {
  stage: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  isLast: boolean;
}) {
  return (
    <div className="relative">
      <div className="border rounded-xl p-3 bg-dark-panel2 border-dark-border text-dark-text h-full">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] font-bold opacity-60">
            {stage === "H" ? "GATE" : `STAGE ${stage}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <Icon size={14} />
          <h4 className="font-semibold text-xs">{name}</h4>
        </div>
        <p className="text-[11px] opacity-80">{desc}</p>
      </div>
      {!isLast && (
        <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-dark-muted">
          <ArrowRight size={14} />
        </div>
      )}
    </div>
  );
}

export function PipelineBackend() {
  return (
    <div className="space-y-6">
      {/* 1. Pipeline Architecture */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
          <GitBranch size={18} className="text-cm-purple" />
          Pipeline Architecture
        </h3>
        <p className="text-sm text-dark-muted mb-6">
          End-to-end flow from prospect discovery to email delivery. Each stage gates the next &mdash; prospects only advance if they pass all checks.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {STAGE_ROW_1.map((s, i) => (
            <StageCard key={s.stage} {...s} isLast={i === STAGE_ROW_1.length - 1} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STAGE_ROW_2.map((s, i) => (
            <StageCard key={s.stage} {...s} isLast={i === STAGE_ROW_2.length - 1} />
          ))}
        </div>
      </div>

      {/* 2. Scout Module (Stages 1-4) */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
          <Search size={18} className="text-cm-purple" />
          Scout Module (Stages 1-4)
        </h3>
        <div className="space-y-4">
          {/* Discovery */}
          <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-cm-purple">STAGE 1</span>
              <h4 className="font-semibold text-sm text-dark-text">Discovery</h4>
            </div>
            <div className="text-xs text-dark-text space-y-1.5">
              <p>Uses <span className="font-mono bg-cm-purple/20 px-1 rounded">Tavily API</span> (basic search depth, max 5 results per query) to find prospect websites.</p>
              <p>For each niche in the ICP, two queries are generated: <span className="font-mono text-[11px]">&quot;&#123;niche&#125; online coach website&quot;</span> and <span className="font-mono text-[11px]">&quot;&#123;niche&#125; coaching program community membership&quot;</span>.</p>
              <p>Searches run until <span className="font-semibold">3x the target count</span> is reached (buffer for filtering). Known non-prospect domains are auto-skipped (LinkedIn, YouTube, Medium, Udemy, etc. &mdash; 30+ excluded domains).</p>
              <p>Each unique domain is captured with its page title, snippet (first 500 chars), niche tag, and source URL.</p>
            </div>
          </div>

          {/* Signal Scoring */}
          <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-cm-purple">STAGE 2</span>
              <h4 className="font-semibold text-sm text-dark-text">Signal Scoring</h4>
            </div>
            <div className="text-xs text-dark-text space-y-1.5">
              <p>Every prospect is scored 0-100 based on six signal categories. Threshold to proceed: <span className="font-mono font-bold">25+</span>.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                  <p className="font-semibold text-cm-purple">Service Keywords (0-25)</p>
                  <p className="text-[11px]">coach, consultant, mentor, program, course, membership, community, workshop, clients &mdash; 5 pts each, capped at 25</p>
                </div>
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                  <p className="font-semibold text-cm-purple">Individual Person (0-20)</p>
                  <p className="text-[11px]">&quot;I&quot;, &quot;my story&quot;, &quot;about me&quot; signals vs. &quot;our team&quot;, &quot;our agency&quot; signals. Solo = +20, likely individual = +10</p>
                </div>
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                  <p className="font-semibold text-cm-purple">Audience Match (0-20)</p>
                  <p className="text-[11px]">solopreneur, freelancer, entrepreneur, small business owner, service provider &mdash; 5 pts each, capped at 20</p>
                </div>
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                  <p className="font-semibold text-cm-purple">Pain Indicators (0-15)</p>
                  <p className="text-[11px]">overwhelm, too busy, burnout, juggling, automat*, streamline &mdash; 5 pts each, capped at 15</p>
                </div>
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                  <p className="font-semibold text-cm-purple">Content Presence (0-10)</p>
                  <p className="text-[11px]">blog, podcast, newsletter, YouTube, book, author &mdash; 3 pts each, capped at 10</p>
                </div>
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                  <p className="font-semibold text-cm-purple">Disqualification (-20 each)</p>
                  <p className="text-[11px]">automation consultant, AI consultant, SaaS, software company, SEO agency, digital marketing agency</p>
                </div>
              </div>
              <p className="mt-1">Bonus: +10 if a person name is successfully extracted from the page title/snippet/domain.</p>
            </div>
          </div>

          {/* Qualification */}
          <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-dark-success">STAGE 3</span>
              <h4 className="font-semibold text-sm text-dark-text">Qualification</h4>
            </div>
            <div className="text-xs text-dark-text space-y-1.5">
              <p>Applies ICP rules from <span className="font-mono bg-dark-panel2 px-1 rounded">icps/&#123;icp_id&#125;/icp.json</span> and deduplicates against all existing leads.</p>
              <p><span className="font-semibold">Dedup checks:</span> Name match against spreadsheet + all prior scout batches + batch tracker. Domain match against the same. Both intra-batch and cross-batch dedup.</p>
              <p><span className="font-semibold">Must have:</span> An extractable person name (first + last). Prospects without names are rejected.</p>
              <p><span className="font-semibold">Disqualify if:</span> ICP <span className="font-mono text-[11px]">disqualify_if</span> rules (keyword matching against snippet, 50% keyword overlap threshold).</p>
              <p><span className="font-semibold">Track assignment:</span></p>
              <div className="flex gap-3 mt-1">
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border flex-1">
                  <p className="font-semibold text-dark-success">Collab (default)</p>
                  <p className="text-[11px]">Prospect has clients, community, membership, students, audience. Offer = free mastermind for their group, explore revenue share.</p>
                </div>
                <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border flex-1">
                  <p className="font-semibold text-dark-success">Direct</p>
                  <p className="text-[11px]">Solo practitioner, freelancer, independent. Offer = &quot;would learning about AI tools be useful for you?&quot;</p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Waterfall */}
          <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-cm-purple">STAGE 4</span>
              <h4 className="font-semibold text-sm text-dark-text">Email Waterfall</h4>
            </div>
            <div className="text-xs text-dark-text space-y-1.5">
              <p>Three-step fallback chain to find a verified email for each qualified prospect:</p>
              <div className="space-y-1 mt-1">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-cm-purple font-bold text-[11px] mt-0.5">1.</span>
                  <p><span className="font-semibold">Hunter.io Email Finder</span> &mdash; name + domain lookup. Accepted if confidence score is 70+.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-cm-purple font-bold text-[11px] mt-0.5">2.</span>
                  <p><span className="font-semibold">Hunter.io Domain Search</span> &mdash; returns all known emails at the domain. First tries name-matching, then falls back to the first &quot;personal&quot; type email found.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-cm-purple font-bold text-[11px] mt-0.5">3.</span>
                  <p><span className="font-semibold">Pattern Guess + Verify</span> &mdash; generates <span className="font-mono text-[11px]">first@domain</span>, <span className="font-mono text-[11px]">first.last@domain</span>, <span className="font-mono text-[11px]">flast@domain</span>, <span className="font-mono text-[11px]">hello@</span>, <span className="font-mono text-[11px]">info@</span>, <span className="font-mono text-[11px]">contact@</span>. Each pattern verified via Hunter Email Verifier &mdash; accepted if status is &quot;valid&quot; or &quot;accept_all&quot;.</p>
                </div>
              </div>
              <p className="mt-1">Optional: <span className="font-mono bg-dark-panel2 px-1 rounded">Bouncer API</span> as secondary verification if configured. Rate-limited at 0.5s between lookups.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Hook Writer */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
          <FileText size={18} className="text-cm-purple" />
          Hook Writer (Stage 5)
        </h3>
        <p className="text-sm text-dark-muted mb-4">
          Each hook is written by <span className="font-semibold">Opus</span> (Claude&apos;s most capable model). This is where tone and nuance matter &mdash; the difference between &quot;sounds like a person&quot; and &quot;sounds like a marketer.&quot; Everything else in the pipeline runs on faster models.
        </p>

        <div className="space-y-3">
          <div className="border border-cm-purple/20 rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Research Profile Input</h4>
            <p className="text-xs text-dark-muted">
              Each hook is personalized using the prospect&apos;s research profile with four sections: <span className="font-semibold">WHO</span> (background, career arc, origin story), <span className="font-semibold">WHAT</span> (programs, products, communities), <span className="font-semibold">WHY</span> (turning point, mission), <span className="font-semibold">AUDIENCE</span> (who they serve, pain points). The hook writer can only write once all four sections have specifics &mdash; not generalities.
            </p>
          </div>

          <div className="border border-cm-purple/20 rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Credibility Block Injection</h4>
            <p className="text-xs text-dark-muted">
              Every hook must naturally weave in sender credibility. Configure the credibility block in ICP settings to specify what background, achievements, or expertise should be naturally mentioned. This is never listed like a resume - it appears conversational and woven into the hook text.
            </p>
          </div>

          <div className="border border-cm-purple/20 rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Track-Specific Angle</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-dark-muted">
              <div className="bg-dark-success/10 rounded p-2">
                <p className="font-semibold text-dark-success">Collab Track</p>
                <p>Customizable pitch for prospects with audiences/communities. Could offer value to their people or group. Configure the specific offer in ICP settings.</p>
              </div>
              <div className="bg-cm-purple/10 rounded p-2">
                <p className="font-semibold text-cm-purple">Direct Track</p>
                <p>Customizable pitch for solo practitioners and independent professionals. Configure the specific question or offer in ICP settings.</p>
              </div>
            </div>
          </div>

          <div className="border border-cm-purple/20 rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Hook Structure (4 Parts)</h4>
            <div className="text-xs text-dark-muted space-y-1">
              <p><span className="font-semibold">1. Warm Opener</span> (1-2 sentences) - Something specific from their site. Must ONLY apply to this person. Fun and genuine, never generic.</p>
              <p><span className="font-semibold">2. Credibility</span> (1-2 sentences) - Sender background woven naturally. Configure in ICP credibility block settings.</p>
              <p><span className="font-semibold">3. Offer/Bridge</span> (1-2 sentences) - Track-specific pitch from ICP settings. Should feel like a natural fit for their profile.</p>
              <p><span className="font-semibold">4. Easy Close</span> (1 sentence) - Low-pressure, answerable in under 5 seconds. &quot;Let me know if this sounds interesting.&quot;</p>
            </div>
          </div>

          <div className="border border-cm-purple/20 rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Subject Line Formula</h4>
            <p className="text-xs text-dark-muted">
              3-7 words. Must reference something specific they built, said, or achieved. Formulas: [Their program] + a question, [Their claim] + a question, [Their brand] + a thought. No exclamation marks, no all-caps, no spam words, no em dashes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-dark-border bg-dark-panel2 rounded-lg p-3">
              <h4 className="font-semibold text-xs text-dark-danger mb-1">Banned Words/Phrases</h4>
              <p className="text-[11px] text-dark-muted leading-relaxed">
                innovative, revolutionary, game-changing, cutting-edge, leverage, synergy, alignment, scalable, scale, scaling, excited, partnership opportunity, &quot;I wanted to reach out&quot;, &quot;I hope this finds you well&quot;, &quot;I would love to connect&quot;, &quot;We help X do Y&quot;, genuinely, honestly, straightforward
              </p>
            </div>
            <div className="border border-cm-purple/20 rounded-lg p-3">
              <h4 className="font-semibold text-xs text-cm-purple mb-1">Format Rules</h4>
              <div className="text-[11px] text-dark-muted space-y-0.5">
                <p>75-125 words (sweet spot: 90-110)</p>
                <p>Must start with &quot;Hey [name],&quot;</p>
                <p>First person perspective (&quot;I&quot; not &quot;we&quot;)</p>
                <p>Conversational tone - coffee shop test</p>
                <p>No em dashes (use &quot; - &quot; with spaces)</p>
                <p>Max 1 exclamation mark per hook</p>
                <p>Soft CTA, no hard sales pitch</p>
              </div>
            </div>
          </div>

          <div className="border border-cm-purple/20 rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Quality Validation (Before Acceptance)</h4>
            <p className="text-xs text-dark-muted">
              Each hook is checked against all rules before it is accepted: opener references something specific from their site, correct angle chosen, credibility appears naturally, close is easy and low-pressure, word count in range, no banned phrases, written in first person. Hooks that fail any check are rewritten.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Hook Rater */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
          <Target size={18} className="text-cm-purple" />
          Hook Rater (Stage 6)
        </h3>
        <p className="text-sm text-dark-muted mb-4">
          Each hook is evaluated <span className="font-semibold">as if you are the recipient</span>. Two independent scores determine whether the hook ships or gets rewritten.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-dark-text mb-2">Open Rating (1-10)</h4>
            <p className="text-xs text-dark-text mb-2">Would this subject line + opening make the prospect open the email?</p>
            <div className="text-[11px] text-dark-muted space-y-0.5">
              <p><span className="font-semibold text-dark-success">8-10:</span> Ships as-is. Subject is specific, opener hooks attention.</p>
              <p><span className="font-semibold text-dark-warn">6-7:</span> Yellow flag. Cell gets highlighted in the sheet for manual review.</p>
              <p><span className="font-semibold text-dark-danger">Below 8:</span> Hook gets rewritten. Iterates until it hits 8+.</p>
            </div>
          </div>
          <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-dark-text mb-2">Response Likelihood (1-10)</h4>
            <p className="text-xs text-dark-text mb-2">Would the prospect actually reply to this email?</p>
            <div className="text-[11px] text-dark-muted space-y-0.5">
              <p><span className="font-semibold text-dark-success">8-10:</span> High likelihood. Prioritize for sending.</p>
              <p><span className="font-semibold text-dark-warn">6-7:</span> Moderate. Good but not exceptional. Yellow cell in Yes rows.</p>
              <p><span className="font-semibold text-dark-danger">1-5:</span> Consider rewriting or deprioritizing.</p>
            </div>
          </div>
        </div>

        <div className="border border-dark-border rounded-lg p-3">
          <h4 className="font-semibold text-xs text-cm-purple mb-1">Factors Evaluated</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-dark-muted">
            {[
              "Subject specificity (mentions their exact program/achievement)",
              "Personalization depth (opener could only be about this person)",
              "Value clarity (is the offer obvious and relevant?)",
              "Spam feel (would a human suspect this is automated?)",
              "Length and punchiness (under 90 words scores higher)",
              "Personal touches (humor, relatable details, partner mention)",
            ].map((factor) => (
              <div key={factor} className="flex items-start gap-1.5">
                <CheckCircle size={12} className="text-dark-success mt-0.5 shrink-0" />
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 bg-dark-panel border border-dark-border rounded-lg p-3 text-xs text-dark-muted">
          <span className="font-bold">Hard Rule:</span> Open Rating must be 8+ or the hook gets rewritten. Rewrites iterate until they hit the threshold. This ensures no weak hooks make it to the sheet.
        </div>
      </div>

      {/* 5. Sheet Export */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
          <Database size={18} className="text-cm-purple" />
          Sheet Export &amp; Formatting (Stage 7)
        </h3>
        <p className="text-sm text-dark-muted mb-4">
          Prospects are appended to the &quot;All Prospects&quot; Google Sheet with a 21-column structure. The spreadsheet is the source of truth &mdash; manual edits survive every future pipeline run.
        </p>

        <div className="mb-4">
          <h4 className="font-semibold text-xs text-dark-text mb-2">21-Column Structure</h4>
          <div className="bg-dark-bg rounded-lg p-3 overflow-x-auto">
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {SHEET_COLUMNS.map((col, i) => (
                <span key={i} className="bg-dark-panel border border-dark-border px-2 py-0.5 rounded font-mono">
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 border border-dark-border bg-dark-panel2 rounded-lg p-2.5">
            <div className="w-4 h-4 rounded bg-dark-success shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-dark-success">Green Row</p>
              <p className="text-dark-success">Send = Yes (score 95+)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-dark-border bg-dark-panel2 rounded-lg p-2.5">
            <div className="w-4 h-4 rounded bg-dark-warn shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-cm-purple">Amber Row</p>
              <p className="text-dark-warn">Send = Qualify (score 80-94)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-dark-border bg-dark-panel2 rounded-lg p-2.5">
            <div className="w-4 h-4 rounded bg-dark-danger shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-dark-danger">Red Row</p>
              <p className="text-dark-danger">Send = No (score below 80)</p>
            </div>
          </div>
        </div>

        <div className="border border-dark-border bg-dark-panel2 rounded-lg p-3 text-xs text-dark-muted">
          <span className="font-bold text-cm-purple">Yellow Cell Override:</span> Within green (Send=Yes) rows only, the Open Rating cell or Response Likelihood cell turns yellow if its value is 7 or below. This flags hooks that shipped but may need attention &mdash; the row is green but the individual rating is soft.
        </div>

        <div className="mt-3 text-xs text-dark-muted space-y-1">
          <p><span className="font-semibold">IDs:</span> Sequential, continuing from the last row in the sheet. Never resets.</p>
          <p><span className="font-semibold">Date Added:</span> Tracks when each lead was added (YYYY-MM-DD format).</p>
          <p><span className="font-semibold">Append-only:</span> Existing rows are never modified by the pipeline. Dedup runs against all existing rows before appending.</p>
        </div>
      </div>

      {/* 6. Validation */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
          <AlertCircle size={18} className="text-cm-purple" />
          Validation (Stage 8)
        </h3>
        <p className="text-sm text-dark-muted mb-4">
          Three validation passes prevent data corruption. The validator exists because commas in hook text can scatter one row across dozens of cells if uploaded incorrectly.
        </p>

        <div className="space-y-3">
          <div className="border border-dark-border rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Pre-Upload Validation</h4>
            <div className="text-xs text-dark-muted space-y-0.5">
              <p>Validates column count (must be exactly 21), ID sequencing (must be continuous from last row), email format (regex), URL format (must start with https://), enum values (Send must be Yes/Qualify/No, Track must be Direct/Collab), no pipe characters in any field, Date Added format (YYYY-MM-DD).</p>
            </div>
          </div>
          <div className="border border-dark-border rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Upload Method</h4>
            <p className="text-xs text-dark-muted">
              Always uses <span className="font-mono bg-dark-panel2 px-1 rounded">--values-json</span> (never pipe-separated) to prevent the comma-delimiter bug. Data is passed as structured JSON arrays, not CSV strings.
            </p>
          </div>
          <div className="border border-dark-border rounded-lg p-3">
            <h4 className="font-semibold text-xs text-cm-purple mb-1">Post-Upload Validation</h4>
            <div className="text-xs text-dark-muted space-y-0.5">
              <p>Cell-by-cell comparison of what was uploaded vs. what the sheet now contains. Checks for: row explosion (one logical row scattered across multiple sheet rows), missing required fields (First Name, Last Name, Email, Score, Send, Track, ICP Tag), column count mismatch.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. CLI Reference */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
          <Terminal size={18} className="text-dark-muted" />
          CLI Reference
        </h3>
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 font-mono text-sm space-y-3">
          <div>
            <span className="text-dark-muted"># ── Scout Module ──────────────────────────────</span>
          </div>
          <div>
            <span className="text-dark-muted"># Basic run — find 12 prospects for ICP v1</span>
            <div className="text-dark-success">python3 scout.py --icp icp_v1 --target 12</div>
          </div>
          <div>
            <span className="text-dark-muted"># Test mode — no email credits spent</span>
            <div className="text-dark-success">python3 scout.py --icp icp_v1 --target 12 --test-mode</div>
          </div>
          <div>
            <span className="text-dark-muted"># Skip email lookup — discovery + qualify only</span>
            <div className="text-dark-success">python3 scout.py --icp icp_v1 --target 12 --skip-email</div>
          </div>
          <div>
            <span className="text-dark-muted"># Target specific niches</span>
            <div className="text-dark-success">python3 scout.py --icp icp_v1 --niches &quot;burnout coaches,grief coaches&quot; --target 5</div>
          </div>
          <div className="pt-2">
            <span className="text-dark-muted"># ── Validate &amp; Merge ────────────────────────</span>
          </div>
          <div>
            <span className="text-dark-muted"># Full merge — append new prospects to spreadsheet</span>
            <div className="text-dark-success">python3 validate_and_merge.py</div>
          </div>
          <div>
            <span className="text-dark-muted"># Skip Hunter credit check</span>
            <div className="text-dark-success">python3 validate_and_merge.py --skip-credit-check</div>
          </div>
          <div>
            <span className="text-dark-muted"># Audit spreadsheet only — no changes</span>
            <div className="text-dark-success">python3 validate_and_merge.py --validate-only</div>
          </div>
          <div className="pt-2">
            <span className="text-dark-muted"># ── Sheet Upload Validator ────────────────────</span>
          </div>
          <div>
            <span className="text-dark-muted"># Pre-check before uploading</span>
            <div className="text-dark-success">python3 validate_sheet_upload.py pre-check batch.json</div>
          </div>
          <div>
            <span className="text-dark-muted"># Upload with built-in validation</span>
            <div className="text-dark-success">python3 validate_sheet_upload.py upload batch.json</div>
          </div>
          <div>
            <span className="text-dark-muted"># Post-upload verification</span>
            <div className="text-dark-success">python3 validate_sheet_upload.py post-check batch.json --expected-start-row 85</div>
          </div>
        </div>
      </div>
    </div>
  );
}
