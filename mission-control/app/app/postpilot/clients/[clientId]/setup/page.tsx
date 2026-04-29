"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Loader2, Save, Check, ChevronDown, ChevronUp } from "lucide-react";

const FIELD_CLS =
  "w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple";
const LABEL_CLS = "block text-sm font-medium text-dark-text mb-1";

function csvToArray(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function SetupPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showStrategy, setShowStrategy] = useState(true);

  // Basic Info
  const [formName, setFormName] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formTier, setFormTier] = useState("Starter");
  const [formPlatform, setFormPlatform] = useState("wordpress");
  const [formMonthlyFee, setFormMonthlyFee] = useState(0);
  const [formPublishStart, setFormPublishStart] = useState("06:00");
  const [formPublishEnd, setFormPublishEnd] = useState("09:00");
  const [formTimezone, setFormTimezone] = useState("America/New_York");
  const [formPostsPerDay, setFormPostsPerDay] = useState(1);
  const [formGscPropertyId, setFormGscPropertyId] = useState("");

  // Content Strategy
  const [formIcp, setFormIcp] = useState("");
  const [formGoals, setFormGoals] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("");
  const [formTone, setFormTone] = useState("");
  const [formContentPillars, setFormContentPillars] = useState("");
  const [formContentRules, setFormContentRules] = useState("");
  const [formKeywordFocus, setFormKeywordFocus] = useState("");
  const [formCompetitorExclusions, setFormCompetitorExclusions] = useState("");
  const [formCtaPrimary, setFormCtaPrimary] = useState("");
  const [formCtaSecondary, setFormCtaSecondary] = useState("");
  const [formMinWordCount, setFormMinWordCount] = useState(800);
  const [formMaxWordCount, setFormMaxWordCount] = useState(1200);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/postpilot/clients/${clientId}`);
      if (!res.ok) return;
      const d = await res.json();
      setFormName(d.name ?? "");
      setFormWebsite(d.website ?? "");
      setFormTier(d.tier ?? "Starter");
      setFormPlatform(d.platform ?? "wordpress");
      setFormMonthlyFee(d.monthlyFee ?? 0);
      setFormPublishStart(d.publishWindowStart ?? "06:00");
      setFormPublishEnd(d.publishWindowEnd ?? "09:00");
      setFormTimezone(d.timezone ?? "America/New_York");
      setFormPostsPerDay(d.postsPerDay ?? 1);
      setFormGscPropertyId(d.gscPropertyId ?? "");
      setFormIcp(d.icp ?? "");
      setFormGoals(d.goals ?? "");
      setFormTargetAudience(d.targetAudience ?? "");
      setFormTone(d.tone ?? "");
      setFormContentPillars(Array.isArray(d.contentPillars) ? d.contentPillars.join(", ") : "");
      setFormContentRules(Array.isArray(d.contentRules) ? d.contentRules.join("\n") : "");
      setFormKeywordFocus(Array.isArray(d.keywordFocus) ? d.keywordFocus.join(", ") : "");
      setFormCompetitorExclusions(Array.isArray(d.competitorExclusions) ? d.competitorExclusions.join(", ") : "");
      setFormCtaPrimary(d.ctaPrimary ?? "");
      setFormCtaSecondary(d.ctaSecondary ?? "");
      setFormMinWordCount(d.minWordCount ?? 800);
      setFormMaxWordCount(d.maxWordCount ?? 1200);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/postpilot/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          website: formWebsite.trim() || undefined,
          tier: formTier,
          platform: formPlatform,
          monthlyFee: formMonthlyFee,
          publishWindowStart: formPublishStart,
          publishWindowEnd: formPublishEnd,
          timezone: formTimezone,
          postsPerDay: formPostsPerDay,
          gscPropertyId: formGscPropertyId.trim() || undefined,
          icp: formIcp.trim() || undefined,
          goals: formGoals.trim() || undefined,
          targetAudience: formTargetAudience.trim() || undefined,
          tone: formTone.trim() || undefined,
          contentPillars: csvToArray(formContentPillars),
          contentRules: formContentRules.trim()
            ? formContentRules.split("\n").map((s) => s.trim()).filter(Boolean)
            : [],
          keywordFocus: csvToArray(formKeywordFocus),
          competitorExclusions: csvToArray(formCompetitorExclusions),
          ctaPrimary: formCtaPrimary.trim() || undefined,
          ctaSecondary: formCtaSecondary.trim() || undefined,
          minWordCount: formMinWordCount,
          maxWordCount: formMaxWordCount,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-cm-purple" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h2 className="text-sm  font-semibold tracking-tight text-dark-muted uppercase tracking-wide mb-4">
          Basic Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLS}>Name *</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="Client name" className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Website URL</label>
            <input type="url" value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)}
              placeholder="https://example.com" className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Tier</label>
            <select value={formTier} onChange={(e) => setFormTier(e.target.value)} className={FIELD_CLS}>
              <option value="Starter">Starter</option>
              <option value="Growth">Growth</option>
              <option value="Agency">Agency</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Platform</label>
            <select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value)} className={FIELD_CLS}>
              <option value="wordpress">WordPress</option>
              <option value="ghost">Ghost</option>
              <option value="wix">Wix</option>
              <option value="squarespace">Squarespace</option>
              <option value="webflow">Webflow</option>
              <option value="shopify">Shopify Blog</option>
              <option value="vercel">Vercel (MDX)</option>
              <option value="markdown">Markdown (file output)</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Monthly Fee ($)</label>
            <input type="number" value={formMonthlyFee}
              onChange={(e) => setFormMonthlyFee(parseInt(e.target.value) || 0)} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Posts Per Day</label>
            <input type="number" min={1} max={10} value={formPostsPerDay}
              onChange={(e) => setFormPostsPerDay(parseInt(e.target.value) || 1)} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Publish Window Start</label>
            <input type="time" value={formPublishStart}
              onChange={(e) => setFormPublishStart(e.target.value)} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Publish Window End</label>
            <input type="time" value={formPublishEnd}
              onChange={(e) => setFormPublishEnd(e.target.value)} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Timezone</label>
            <input type="text" value={formTimezone}
              onChange={(e) => setFormTimezone(e.target.value)}
              placeholder="America/New_York" className={FIELD_CLS} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={LABEL_CLS}>Google Search Console Property</label>
            <input type="text" value={formGscPropertyId}
              onChange={(e) => setFormGscPropertyId(e.target.value)}
              placeholder="sc-domain:example.com" className={FIELD_CLS} />
          </div>
        </div>
      </div>

      {/* Content Strategy */}
      <div className="border-t border-dark-border pt-5">
        <button
          type="button"
          onClick={() => setShowStrategy(!showStrategy)}
          className="flex items-center gap-2 text-sm font-semibold text-dark-muted uppercase tracking-wide hover:text-dark-text transition-colors mb-4"
        >
          {showStrategy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Content Strategy
        </button>

        {showStrategy && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>ICP (Ideal Customer Profile)</label>
                <textarea rows={3} value={formIcp} onChange={(e) => setFormIcp(e.target.value)}
                  placeholder="Small business coaches and consultants with 5+ years experience..."
                  className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Goals</label>
                <textarea rows={3} value={formGoals} onChange={(e) => setFormGoals(e.target.value)}
                  placeholder="Drive leads for $5k coaching program, build authority in niche..."
                  className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Target Audience</label>
                <textarea rows={3} value={formTargetAudience} onChange={(e) => setFormTargetAudience(e.target.value)}
                  placeholder="Detailed narrative about who reads this blog..."
                  className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Tone & Voice</label>
                <textarea rows={3} value={formTone} onChange={(e) => setFormTone(e.target.value)}
                  placeholder="Authoritative but approachable, peer-to-peer, avoid jargon..."
                  className={FIELD_CLS} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Content Pillars (comma-separated)</label>
                <input type="text" value={formContentPillars} onChange={(e) => setFormContentPillars(e.target.value)}
                  placeholder="Lead Generation, Systems, Mindset, AI Tools" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Keyword Focus (comma-separated)</label>
                <input type="text" value={formKeywordFocus} onChange={(e) => setFormKeywordFocus(e.target.value)}
                  placeholder="business coaching online, executive coach" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Content Rules (one per line)</label>
                <textarea rows={3} value={formContentRules} onChange={(e) => setFormContentRules(e.target.value)}
                  placeholder={"Always cite data\nNever mention Kajabi\nUse second-person voice"}
                  className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Competitor Exclusions (comma-separated)</label>
                <input type="text" value={formCompetitorExclusions} onChange={(e) => setFormCompetitorExclusions(e.target.value)}
                  placeholder="CompetitorA, CompetitorB" className={FIELD_CLS} />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={LABEL_CLS}>Primary CTA URL</label>
                <input type="text" value={formCtaPrimary} onChange={(e) => setFormCtaPrimary(e.target.value)}
                  placeholder="/book-a-call" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Secondary CTA URL</label>
                <input type="text" value={formCtaSecondary} onChange={(e) => setFormCtaSecondary(e.target.value)}
                  placeholder="/services" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Min Word Count</label>
                <input type="number" value={formMinWordCount}
                  onChange={(e) => setFormMinWordCount(parseInt(e.target.value) || 800)} className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Max Word Count</label>
                <input type="number" value={formMaxWordCount}
                  onChange={(e) => setFormMaxWordCount(parseInt(e.target.value) || 1200)} className={FIELD_CLS} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="border-t border-dark-border pt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !formName.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check size={14} /> Saved</>
          ) : (
            <><Save size={14} /> Save Changes</>
          )}
        </button>
        {saved && <span className="text-sm text-dark-success">Changes saved.</span>}
      </div>
    </div>
  );
}
