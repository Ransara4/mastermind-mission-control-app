// X (Twitter) Agent Types

export interface XDashboard {
  auth: AuthStatus;
  feed: CuratedFeedData;
  queue: PostQueue;
  analytics: XAnalytics;
  topics: TrackedTopic[];
  postingRules: PostingRules;
}

export interface AuthStatus {
  connected: boolean;
  username?: string;
  lastChecked?: string;
}

// Curated Feed
export interface CuratedFeedData {
  lastUpdated: string | null;
  items: FeedItem[];
  topicBreakdown: { topicId: string; topicName: string; count: number }[];
}

export interface FeedItem {
  id: string;
  topicId: string;
  topicName: string;
  author: {
    handle: string;
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  content: string;
  url: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  postedAt: string;
  relevanceScore: number; // 0-100
  tags: string[];
}

// Post Queue & Composer
export interface PostQueue {
  drafts: PostDraft[];
  scheduled: PostDraft[];
  posted: PostDraft[];
}

export interface PostDraft {
  id: string;
  content: string;
  type: "tweet" | "thread" | "reply" | "quote";
  threadParts?: string[];
  mediaUrls?: string[];
  scheduledFor?: string;
  postedAt?: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  ruleViolations?: string[];
  analytics?: PostAnalytics;
  createdAt: string;
}

export interface PostAnalytics {
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  profileVisits: number;
  linkClicks: number;
}

// Analytics
export interface XAnalytics {
  overview: {
    totalPosts: number;
    totalImpressions: number;
    totalEngagements: number;
    engagementRate: number;
    followersGained: number;
  };
  recentPerformance: {
    date: string;
    impressions: number;
    engagements: number;
    posts: number;
  }[];
  topPosts: PostDraft[];
}

// Topics
export interface TrackedTopic {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  accounts: string[];
  priority: "high" | "medium" | "low";
  enabled: boolean;
  itemCount?: number;
}

// Posting Rules
export interface PostingRules {
  voice: {
    tone: string;
    avoid: string[];
    personality: string;
  };
  frequency: {
    maxPerDay: number;
    minHoursBetween: number;
    optimalTimes: string[];
    timezone: string;
  };
  contentMix: {
    valueInsights: number;
    engagementReplies: number;
    personalBuilds: number;
  };
  formatting: {
    maxHashtags: number;
    maxThreadLength: number;
    tweetsMustStandAlone: boolean;
  };
}

export type FeedFilter = "all" | "ai-money" | "openclaw-claude" | "ai-news" | "agent-ecosystem" | "ai-business" | "ai-coding";
