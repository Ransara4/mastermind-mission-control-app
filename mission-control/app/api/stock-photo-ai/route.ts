import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { StockPhotoStats } from "@/lib/stock-photo-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

function generateMockData(): StockPhotoStats {
  const now = new Date();
  const styles = ["Photorealistic", "Minimalist", "Abstract", "Flat Lay", "Aerial", "Macro", "Cinematic", "Editorial"];
  const categories = [
    "Business & Office", "Nature & Landscape", "Technology", "Food & Drink",
    "People & Lifestyle", "Architecture", "Travel", "Health & Wellness",
    "Finance", "Education", "Pets & Animals", "Fashion",
  ];
  const platformNames = ["Shutterstock", "Adobe Stock", "Getty Images", "iStock", "Gumroad"];
  const platformColors = ["#EE2A24", "#FF0000", "#006B3F", "#1A1A2E", "#FF90E8"];
  const resolutions = ["4096x4096", "3840x2160", "2048x2048", "1920x1080"];

  // Generate daily data for last 30 days
  const dailyGenerations = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const date = d.toISOString().split("T")[0];
    const count = Math.floor(Math.random() * 18) + 2;
    const revenue = parseFloat((count * (Math.random() * 1.5 + 0.3)).toFixed(2));
    return { date, count, revenue };
  });

  // Recent images
  const gradients = [
    "from-violet-400 to-purple-600",
    "from-blue-400 to-cyan-600",
    "from-emerald-400 to-teal-600",
    "from-amber-400 to-orange-600",
    "from-rose-400 to-pink-600",
    "from-indigo-400 to-blue-600",
    "from-lime-400 to-green-600",
    "from-fuchsia-400 to-purple-600",
  ];

  const prompts = [
    "Modern open-plan office with natural light and green plants",
    "Aerial view of tropical coastline at golden hour",
    "Fresh organic vegetables on rustic wooden table",
    "Abstract geometric pattern in pastel colors",
    "Professional woman working on laptop in coffee shop",
    "Minimalist home workspace with white desk",
    "Close-up of dewdrops on green leaf macro",
    "City skyline at sunset with dramatic clouds",
    "Hands typing on mechanical keyboard, soft bokeh",
    "Stack of books with reading glasses and coffee cup",
    "Mountain lake reflection at dawn, misty",
    "Team meeting in modern conference room",
  ];

  const recentImages = prompts.map((prompt, i) => ({
    id: `img-${1000 + i}`,
    prompt,
    style: styles[i % styles.length],
    resolution: resolutions[i % resolutions.length],
    status: (i === 0 ? "processing" : i < 3 ? "completed" : "completed") as "completed" | "processing",
    platform: platformNames.slice(0, Math.floor(Math.random() * 3) + 1),
    downloads: Math.floor(Math.random() * 200) + 5,
    revenue: parseFloat((Math.random() * 45 + 2).toFixed(2)),
    createdAt: new Date(now.getTime() - i * 3600000 * (Math.random() * 4 + 1)).toISOString(),
    thumbnailColor: gradients[i % gradients.length],
  }));

  // Platforms
  const platforms = platformNames.map((name, i) => ({
    name,
    listed: Math.floor(Math.random() * 300) + 50,
    downloads: Math.floor(Math.random() * 2000) + 100,
    revenue: parseFloat((Math.random() * 800 + 50).toFixed(2)),
    color: platformColors[i],
  }));

  // Queue
  const queue = [
    { id: "q-1", prompt: "Cozy reading nook with warm lighting", style: "Photorealistic", status: "processing" as const, startedAt: new Date(now.getTime() - 120000).toISOString() },
    { id: "q-2", prompt: "Abstract watercolor splash background", style: "Abstract", status: "queued" as const, position: 1 },
    { id: "q-3", prompt: "Fresh sushi platter on dark slate", style: "Flat Lay", status: "queued" as const, position: 2 },
  ];

  const topCategories = categories.slice(0, 8).map((name) => ({
    name,
    count: Math.floor(Math.random() * 150) + 20,
  })).sort((a, b) => b.count - a.count);

  const topStyles = styles.slice(0, 6).map((name) => ({
    name,
    count: Math.floor(Math.random() * 120) + 15,
  })).sort((a, b) => b.count - a.count);

  const totalImages = dailyGenerations.reduce((s, d) => s + d.count, 0) + 847;
  const totalRevenue = platforms.reduce((s, p) => s + p.revenue, 0);
  const totalDownloads = platforms.reduce((s, p) => s + p.downloads, 0);

  return {
    totalImages,
    todayImages: dailyGenerations[dailyGenerations.length - 1]?.count || 0,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalDownloads,
    avgRating: 4.6,
    platformsListed: platforms.length,
    dailyGenerations,
    recentImages,
    platforms,
    queue,
    topCategories,
    topStyles,
  };
}

export async function GET() {
  try {
    const statsPath = path.join(WS, "projects/stock-photo-ai/data/stats.json");

    // If real stats exist, use them; otherwise use realistic mock data
    if (fs.existsSync(statsPath)) {
      const fileContent = fs.readFileSync(statsPath, "utf-8").trim();
      if (fileContent.length > 2) {
        const raw = JSON.parse(fileContent);
        // If it has the new format, return directly
        if (raw.recentImages) {
          return NextResponse.json(raw);
        }
      }
    }

    // Return mock data for demo / development
    const stats = generateMockData();
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
