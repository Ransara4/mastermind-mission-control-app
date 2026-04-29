import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const MC = path.join(WS, "mission-control");

export async function GET(req: NextRequest) {
  const pagePath = req.nextUrl.searchParams.get("path") || "";

  // Convert /app/tasks to app/app/tasks
  const pageDir = path.join(MC, "app", pagePath);

  const result: {
    files: { name: string; lines: number | string; modified: string }[];
    apiRoutes: string[];
    dataSource: string | null;
    lastModified: string | null;
  } = {
    files: [],
    apiRoutes: [],
    dataSource: null,
    lastModified: null,
  };

  try {
    // 1. List page files
    if (fs.existsSync(pageDir)) {
      const entries = fs.readdirSync(pageDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(pageDir, entry.name);
        if (entry.isFile()) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n").length;
          const stat = fs.statSync(fullPath);
          result.files.push({
            name: entry.name,
            lines,
            modified: stat.mtime.toISOString(),
          });
          if (!result.lastModified || stat.mtime > new Date(result.lastModified)) {
            result.lastModified = stat.mtime.toISOString();
          }

          // 2. Find API routes by grepping fetch calls
          const fetchMatches = content.match(/fetch\(["'`]\/api\/[^"'`]+/g) || [];
          for (const match of fetchMatches) {
            const route = match.replace(/fetch\(["'`]/, "");
            if (!result.apiRoutes.includes(route)) {
              result.apiRoutes.push(route);
            }
          }

          // 3. Find data sources (db files, json files)
          const dbMatches = content.match(/["'`][^"'`]*\.(db|json|sqlite)["'`]/g) || [];
          for (const match of dbMatches) {
            const cleaned = match.replace(/["'`]/g, "");
            if (cleaned.includes("/") || cleaned.endsWith(".db") || (cleaned.endsWith(".json") && !cleaned.includes("package"))) {
              result.dataSource = result.dataSource || cleaned;
            }
          }
        } else if (entry.isDirectory() && entry.name !== "node_modules") {
          // Count files in subdirectory
          try {
            const subFiles = fs.readdirSync(fullPath).filter(f => f.endsWith(".tsx") || f.endsWith(".ts"));
            result.files.push({
              name: entry.name + "/",
              lines: subFiles.length + " files",
              modified: fs.statSync(fullPath).mtime.toISOString(),
            });
          } catch {
            // skip unreadable directories
          }
        }
      }
    }

    // Also check corresponding API route
    const apiPath = pagePath.replace(/^\/app\//, "");
    const apiDir = path.join(MC, "app/api", apiPath);
    if (fs.existsSync(apiDir)) {
      const apiFiles = fs.readdirSync(apiDir, { withFileTypes: true });
      for (const f of apiFiles) {
        if (f.isFile() && (f.name.endsWith(".ts") || f.name.endsWith(".js"))) {
          const routePath = "/api/" + apiPath + (f.name === "route.ts" ? "" : "/" + f.name.replace(/\.ts$/, ""));
          if (!result.apiRoutes.includes(routePath)) {
            result.apiRoutes.push(routePath);
          }
        }
      }
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(result);
}
