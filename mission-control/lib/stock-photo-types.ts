export interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  resolution: string;
  status: "completed" | "processing" | "queued" | "failed";
  platform: string[];
  downloads: number;
  revenue: number;
  createdAt: string;
  thumbnailColor: string;
}

export interface PlatformStats {
  name: string;
  listed: number;
  downloads: number;
  revenue: number;
  color: string;
}

export interface DailyGeneration {
  date: string;
  count: number;
  revenue: number;
}

export interface QueueItem {
  id: string;
  prompt: string;
  style: string;
  status: "processing" | "queued";
  position?: number;
  startedAt?: string;
}

export interface CategoryBreakdown {
  name: string;
  count: number;
}

export interface StockPhotoStats {
  totalImages: number;
  todayImages: number;
  totalRevenue: number;
  totalDownloads: number;
  avgRating: number;
  platformsListed: number;
  dailyGenerations: DailyGeneration[];
  recentImages: GeneratedImage[];
  platforms: PlatformStats[];
  queue: QueueItem[];
  topCategories: CategoryBreakdown[];
  topStyles: CategoryBreakdown[];
}
