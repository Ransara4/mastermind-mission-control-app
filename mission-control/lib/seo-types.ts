// Shared SEO types used by API routes and UI components

export interface PageScan {
  url: string;
  title: string;
  metaDesc: string;
  h1: string;
  h1Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  hasCanonical: boolean;
  status: number;
  score: number;
  issues: string[];
}

export interface CrawlResult {
  pages: PageScan[];
  sitemapUrl: string;
  totalFound: number;
  scanned: number;
}

export interface RankResult {
  keyword: string;
  position: number;
  found: boolean;
  url?: string;
  checkedAt: string;
}

export interface AuditIssue {
  severity: "critical" | "warning" | "info" | "pass";
  message: string;
}

export interface TechIssue {
  severity: string;
  message: string;
}

export interface FixQueueItem {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  page: string;
  fixType: "auto" | "claude" | "manual";
  fixAction?: string;
  fixParams?: Record<string, any>;
  claudeCommand?: string;
  steps?: string[];
  status: "pending" | "fixed" | "dismissed";
}

export interface AutopilotResult {
  domain: string;
  runAt: string;
  durationMs: number;
  summary: {
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    pagesScanned: number;
    critical: number;
    warnings: number;
    autoFixable: number;
    claudeFixable: number;
    manualItems: number;
  };
  phases: {
    crawl: { ok: boolean; pagesFound: number; worstPages: PageScan[] };
    audit: { ok: boolean; score: number; grade: string; issues: AuditIssue[] };
    technical: { ok: boolean; issues: TechIssue[] };
    schema: { ok: boolean; existing: string[]; suggestions: string[] };
    rankings: { ok: boolean; checked: number; results: RankResult[] };
  };
  fixQueue: FixQueueItem[];
  crux?: CruxResult | null;
}

export interface CruxMetric {
  p75: number;
  histogram: Array<{ start: number; end?: number; density: number }>;
}

export interface CruxResult {
  url: string;
  dataSource: "url" | "origin" | "not_found";
  lcp?: CruxMetric;   // Largest Contentful Paint (ms)
  inp?: CruxMetric;   // Interaction to Next Paint (ms)
  cls?: CruxMetric;   // Cumulative Layout Shift (score x100 for display)
  fcp?: CruxMetric;   // First Contentful Paint (ms)
  ttfb?: CruxMetric;  // Time to First Byte (ms)
  collectionPeriod?: { firstDate: string; lastDate: string };
  fetchedAt: string;
}

export interface BingQueryStat {
  query: string;
  clicks: number;
  impressions: number;
  avgClickPosition: number;
  avgImpressionPosition: number;
  date: string; // parsed from /Date(ms)/ format
}

export interface BingPageStat {
  url: string;
  clicks: number;
  impressions: number;
  avgClickPosition: number;
  avgImpressionPosition: number;
  date: string;
}

export interface BingStats {
  domain: string;
  queryStats: BingQueryStat[];
  pageStats: BingPageStat[];
  dailyStats: Array<{ date: string; clicks: number; impressions: number }>;
  quota?: { daily: number; monthly: number };
  fetchedAt: string;
}

export type GscIndexingState =
  | "INDEXING_STATE_UNSPECIFIED"
  | "SUBMITTED_AND_INDEXED"
  | "DUPLICATE_WITHOUT_CANONICAL"
  | "DUPLICATE_WITH_PROPER_CANONICAL"
  | "FILTERED_OTHER"
  | "URL_IS_UNKNOWN_TO_GOOGLE"
  | "URL_IS_NOT_ON_GOOGLE"
  | "BLOCKED"
  | "BLOCKED_DUE_TO_UNAUTHORIZED_REQUEST"
  | "BLOCKED_DUE_TO_NOINDEX";

export interface GscInspectionResult {
  url: string;
  indexingState: GscIndexingState;
  googleCanonical?: string;
  userDeclaredCanonical?: string;
  robotsTxtState?: string;
  lastCrawlTime?: string;
  richResultsStatus?: string;
  verdict?: string;
  inspectedAt: string;
  rawResponse?: any;
}

export interface BrokenLink {
  url: string;
  foundOn: string;
  statusCode: number;
  linkText?: string;
  isInternal: boolean;
  isExternal: boolean;
}

export interface RedirectChain {
  url: string;
  chain: Array<{ url: string; statusCode: number }>;
  finalUrl: string;
  hops: number;
  foundOn: string;
}

export interface BrokenLinksResult {
  domain: string;
  scanned: number;
  linksChecked: number;
  broken: BrokenLink[];
  redirectChains: RedirectChain[];
  fetchedAt: string;
}

export interface BlogSection {
  heading: string;   // H2 or H3
  level: 2 | 3;
  description: string; // what to cover in this section
  wordCount: number;   // target word count for this section
}

export interface BlogBrief {
  keyword: string;
  domain: string;
  title: string;           // suggested H1/title tag (50-60 chars)
  metaDescription: string; // 150-160 chars
  slug: string;            // URL-friendly slug
  intent: "informational" | "commercial" | "transactional" | "navigational";
  outline: BlogSection[];
  wordCount: number;       // recommended total word count
  targetAudience: string;
  tone: string;
  internalLinks: string[]; // suggested pages on the site to link to
  faqQuestions: string[];  // 3-5 FAQ questions to answer in the post
  generatedAt: string;
}

export interface SchemaTestResult {
  url: string;
  schemasFound: Array<{
    type: string;          // e.g. "Organization", "FAQPage"
    valid: boolean;
    issues: string[];      // any errors/warnings
    richResultEligible: boolean;
  }>;
  totalSchemas: number;
  hasErrors: boolean;
  testedAt: string;
}

export interface InternalLinkMap {
  domain: string;
  pages: Array<{
    url: string;
    title: string;
    inboundLinks: number;    // how many other pages link to this
    outboundLinks: number;   // how many links this page has
    isOrphan: boolean;       // inboundLinks === 0
  }>;
  orphans: string[];         // URLs with zero inbound links
  analyzedAt: string;
}

export interface DuplicateContentResult {
  domain: string;
  duplicateTitles: Array<{ title: string; urls: string[] }>;
  duplicateDescriptions: Array<{ description: string; urls: string[] }>;
  missingTitles: string[];
  missingDescriptions: string[];
  analyzedAt: string;
}

export interface Competitor {
  domain: string;
  name: string;          // extracted from title tag
  description: string;   // meta description or Claude summary
  h1: string;
  techHints: string[];   // e.g. ["Wix", "WordPress", "React"] from headers/HTML
  topKeywords: string[]; // from meta keywords or title analysis
  strengths: string[];   // Claude analysis
  contentGaps: string[]; // things they rank for that user's site doesn't cover
  discoveredAt: string;  // ISO date
  source: "tavily" | "profile" | "manual";
}

export interface CompetitorDatabase {
  domain: string;
  competitors: Competitor[];
  lastUpdated: string;
  status: "fresh" | "stale" | "empty";
}

export function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
