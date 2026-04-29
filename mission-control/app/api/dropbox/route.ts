import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const AGENT_DIR = path.join(WS, "agents/dropbox");
const ENV_PATH = path.join(WS, ".env");

function readJSON(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function loadEnvVar(name: string): string | null {
  try {
    const content = fs.readFileSync(ENV_PATH, "utf-8");
    const match = content.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

async function fetchDropboxAccount(accessToken: string) {
  const res = await fetch(
    "https://api.dropboxapi.com/2/users/get_current_account",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function fetchDropboxSpaceUsage(accessToken: string) {
  const res = await fetch(
    "https://api.dropboxapi.com/2/users/get_space_usage",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function fetchDropboxFolder(accessToken: string, folderPath: string = "") {
  const res = await fetch(
    "https://api.dropboxapi.com/2/files/list_folder",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: folderPath,
        recursive: false,
        include_media_info: false,
        include_deleted: false,
        limit: 100,
      }),
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function fetchDropboxTempLink(accessToken: string, filePath: string) {
  const res = await fetch(
    "https://api.dropboxapi.com/2/files/get_temporary_link",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: filePath }),
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function getAccessToken(): Promise<string | null> {
  const refreshToken = loadEnvVar("DROPBOX_REFRESH_TOKEN");
  const appKey = loadEnvVar("DROPBOX_APP_KEY");
  const appSecret = loadEnvVar("DROPBOX_APP_SECRET");

  if (!refreshToken || !appKey) return null;

  // Try refreshing
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const authHeader = appSecret
    ? "Basic " + Buffer.from(`${appKey}:${appSecret}`).toString("base64")
    : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else {
    params.set("client_id", appKey);
  }

  try {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers,
      body: params.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const browsePath = searchParams.get("path");

  // Action: get temporary download/preview link for a file
  if (action === "link" && browsePath) {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      const result = await fetchDropboxTempLink(accessToken, browsePath);
      if (!result) {
        return NextResponse.json({ error: "Failed to get link" }, { status: 500 });
      }
      return NextResponse.json({
        link: result.link,
        metadata: {
          name: result.metadata?.name,
          size: result.metadata?.size ?? null,
          modified: result.metadata?.server_modified || result.metadata?.client_modified || null,
        },
      });
    } catch {
      return NextResponse.json({ error: "Failed to get file link" }, { status: 500 });
    }
  }

  // Action: browse a specific folder
  if (action === "browse") {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      const files = await fetchDropboxFolder(accessToken, browsePath || "");
      if (!files?.entries) {
        return NextResponse.json({ entries: [] });
      }
      const entries = files.entries.map(
        (e: {
          ".tag": string;
          name: string;
          path_display: string;
          size?: number;
          client_modified?: string;
          server_modified?: string;
        }) => ({
          name: e.name,
          path: e.path_display,
          type: e[".tag"] === "folder" ? "folder" : "file",
          size: e.size ?? null,
          modified: e.server_modified || e.client_modified || null,
        })
      );
      // Sort: folders first, then by name
      entries.sort((a: { type: string; name: string }, b: { type: string; name: string }) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });
      return NextResponse.json({ entries });
    } catch {
      return NextResponse.json({ error: "Failed to browse folder" }, { status: 500 });
    }
  }

  try {
    // Read local agent files
    const status = readJSON(path.join(AGENT_DIR, "status.json")) || {
      agentId: "dropbox",
      status: "unknown",
      lastRun: null,
      lastResult: null,
      lastMessage: "No status yet",
      errorCount: 0,
    };

    const config = readJSON(path.join(AGENT_DIR, "config", "config.json")) || {
      enabled: true,
      syncPairs: [],
      watchDirectories: [],
      shareDefaults: { requestedVisibility: "public" },
      activityLogMax: 200,
    };

    const activity =
      readJSON(path.join(AGENT_DIR, "data", "activity.json")) || [];

    // Check env vars
    const hasRefreshToken = !!loadEnvVar("DROPBOX_REFRESH_TOKEN");
    const hasAppKey = !!loadEnvVar("DROPBOX_APP_KEY");

    // Compute stats from activity
    const syncCount = activity.filter(
      (a: { action: string; result: string }) =>
        a.action === "sync" && (a.result === "success" || a.result === "partial")
    ).length;
    const shareCount = activity.filter(
      (a: { action: string; result: string }) =>
        a.action === "share" && a.result === "success"
    ).length;
    const totalFilesSynced = activity
      .filter(
        (a: { action: string; result: string }) =>
          a.action === "sync" &&
          (a.result === "success" || a.result === "partial")
      )
      .reduce(
        (sum: number, a: { files?: string[] }) =>
          sum + (a.files?.length || 0),
        0
      );

    // Try to fetch live Dropbox data
    let account = null;
    let spaceUsage = null;
    let recentFiles: Array<{
      name: string;
      path: string;
      type: string;
      size: number | null;
      modified: string | null;
    }> = [];
    let liveConnected = false;

    const accessToken = await getAccessToken();
    if (accessToken) {
      try {
        const [acct, space, files] = await Promise.all([
          fetchDropboxAccount(accessToken),
          fetchDropboxSpaceUsage(accessToken),
          fetchDropboxFolder(accessToken, ""),
        ]);

        if (acct) {
          liveConnected = true;
          account = {
            name: acct.name?.display_name || "Unknown",
            email: acct.email || "",
            accountType: acct.account_type?.[".tag"] || "unknown",
            profilePhotoUrl: acct.profile_photo_url || null,
          };
        }

        if (space) {
          const used = space.used || 0;
          const allocated =
            space.allocation?.allocated || space.allocation?.individual?.allocated || 0;
          spaceUsage = {
            used,
            allocated,
            percentUsed: allocated > 0 ? Math.round((used / allocated) * 1000) / 10 : 0,
          };
        }

        if (files?.entries) {
          recentFiles = files.entries.map(
            (e: {
              ".tag": string;
              name: string;
              path_display: string;
              size?: number;
              client_modified?: string;
              server_modified?: string;
            }) => ({
              name: e.name,
              path: e.path_display,
              type: e[".tag"] === "folder" ? "folder" : "file",
              size: e.size ?? null,
              modified: e.server_modified || e.client_modified || null,
            })
          );
        }
      } catch {
        // Live fetch failed — continue with local data
      }
    }

    return NextResponse.json({
      status,
      config,
      activity: activity.slice(-50).reverse(),
      stats: {
        totalSyncs: syncCount,
        totalFilesSynced,
        sharedLinks: shareCount,
        totalActivities: activity.length,
      },
      auth: {
        hasRefreshToken,
        hasAppKey,
        connected: liveConnected || status.lastResult === "success" || hasRefreshToken,
      },
      account,
      spaceUsage,
      recentFiles,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load Dropbox agent data" },
      { status: 500 }
    );
  }
}
