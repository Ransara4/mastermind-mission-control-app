import { NextResponse } from "next/server";
import { getBlogEnabledWebsites, ensureBlogColumns } from "@/lib/websites-db";

export async function GET() {
  try {
    ensureBlogColumns();
    const websites = getBlogEnabledWebsites();
    return NextResponse.json({ websites });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", websites: [] },
      { status: 500 }
    );
  }
}
