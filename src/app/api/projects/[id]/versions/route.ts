import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "~/lib/db";

const createVersionSchema = z.object({
  trigger: z.enum(["upload", "manual"]),
  bucket_name: z.string(),
  path: z.string(),
});

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;
    const { rows } = await query(
      `SELECT * FROM project_versions WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;
    const json = await req.json();
    const parsed = createVersionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { trigger, bucket_name, path } = parsed.data;
    const { rows } = await query(
      `INSERT INTO project_versions (project_id, trigger, bucket_name, path) VALUES ($1,$2,$3,$4) RETURNING *`,
      [projectId, trigger, bucket_name, path],
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create version" }, { status: 500 });
  }
} 