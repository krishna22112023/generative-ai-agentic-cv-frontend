import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "~/lib/db";

const updateSchema = z.object({
  project_name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  number_of_files: z.number().optional(),
  extensions: z.array(z.string()).optional(),
  fps: z.number().nullable().optional(),
  object_storage: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_ENDPOINT_URL: z.string().optional(),
  bucket_name: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { rows } = await query(`SELECT * FROM projects WHERE id = $1 LIMIT 1`, [params.id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const json = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const keys = Object.keys(parsed.data);
    if (keys.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    const setClauses = keys.map((k, i) => `${camelToSnake(k)} = $${i + 1}`).join(", ");
    const values = keys.map((k) => (parsed.data as Record<string, unknown>)[k]);

    const { rows } = await query(
      `UPDATE projects SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, params.id],
    );
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

function camelToSnake(str: string) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
} 