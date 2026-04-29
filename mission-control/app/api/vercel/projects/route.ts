import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return NextResponse.json({ error: "VERCEL_TOKEN not set" }, { status: 401 });
  const res = await fetch("https://api.vercel.com/v9/projects", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
