import { NextRequest, NextResponse } from "next/server";

interface SubmitResult {
  status: number;
  message: string;
}

interface SubmitSitemapResponse {
  google: SubmitResult;
  bing: SubmitResult;
  sitemapUrl: string;
}

async function verifySitemapExists(sitemapUrl: string): Promise<boolean> {
  try {
    const res = await fetch(sitemapUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function pingSearchEngine(
  pingUrl: string,
  engineName: string
): Promise<SubmitResult> {
  try {
    const res = await fetch(pingUrl, {
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (res.ok) {
      return {
        status: res.status,
        message: `Sitemap submitted to ${engineName} successfully`,
      };
    } else {
      const body = await res.text().catch(() => "");
      return {
        status: res.status,
        message: `${engineName} returned ${res.status}: ${body.slice(0, 200)}`,
      };
    }
  } catch (err: any) {
    return {
      status: 0,
      message: `Failed to reach ${engineName}: ${err.message || "network error"}`,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Missing required field: domain" },
        { status: 400 }
      );
    }

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const sitemapUrl = `https://${cleanDomain}/sitemap.xml`;

    // Verify sitemap exists
    const sitemapExists = await verifySitemapExists(sitemapUrl);
    if (!sitemapExists) {
      return NextResponse.json(
        {
          error: `Sitemap not found at ${sitemapUrl}`,
          sitemapUrl,
        },
        { status: 404 }
      );
    }

    const encodedSitemap = encodeURIComponent(sitemapUrl);
    const googlePingUrl = `https://www.google.com/ping?sitemap=${encodedSitemap}`;
    const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodedSitemap}`;

    // Ping both search engines in parallel
    const [google, bing] = await Promise.all([
      pingSearchEngine(googlePingUrl, "Google"),
      pingSearchEngine(bingPingUrl, "Bing"),
    ]);

    const response: SubmitSitemapResponse = {
      google,
      bing,
      sitemapUrl,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Submit sitemap error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit sitemap" },
      { status: 500 }
    );
  }
}
