import { NextRequest, NextResponse } from "next/server";
import { getClientConfig, updateClientConfig } from "./_db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const client = getClientConfig(clientId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const body = await req.json();
    const ok = updateClientConfig(clientId, body);
    if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
