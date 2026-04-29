import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const port = req.nextUrl.searchParams.get("port");
  if (!port || isNaN(Number(port))) {
    return NextResponse.json({ error: "Invalid port" }, { status: 400 });
  }

  try {
    const res = await fetch(`http://localhost:${port}`, {
      signal: AbortSignal.timeout(1500),
    });
    return NextResponse.json({ up: res.ok || res.status < 500 });
  } catch {
    return NextResponse.json({ up: false });
  }
}
