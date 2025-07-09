import { NextRequest, NextResponse } from "next/server";
import { query } from "~/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await query(`SELECT mcp_configs FROM projects WHERE id=$1 LIMIT 1`, [id]);
    if (rows.length === 0) return NextResponse.json({}, { status: 404 });
    const cfg = (rows[0] as any).mcp_configs ?? {};
    return NextResponse.json(cfg);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await params;
    await query(`UPDATE projects SET mcp_configs=$1 WHERE id=$2`, [body, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const tool = url.searchParams.get("tool");
    if (!tool) return NextResponse.json({ error: "tool param missing" }, { status: 400 });
    const { rows } = await query(`SELECT mcp_configs FROM projects WHERE id=$1 LIMIT 1`, [id]);
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const cfg: Record<string, unknown> = (rows[0] as any).mcp_configs ?? {};
    delete cfg[tool];
    await query(`UPDATE projects SET mcp_configs=$1 WHERE id=$2`, [cfg, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
} 