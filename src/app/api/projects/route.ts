import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "~/lib/db";

const createProjectSchema = z.object({
  project_name: z.string().min(1),
  tags: z.array(z.string()).default([]),
  number_of_files: z.number().optional(),
  extensions: z.array(z.string()).default([]).optional(),
  fps: z.number().nullable().optional(),
  object_storage: z.literal("minio"),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_ENDPOINT_URL: z.string(),
  bucket_name: z.string(),
});

export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, project_name, tags, number_of_files, extensions, fps, object_storage, bucket_name, created_at FROM projects ORDER BY created_at DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = createProjectSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const { rows } = await query(
      `INSERT INTO projects (project_name, tags, number_of_files, extensions, fps, object_storage, minio_access_key, minio_secret_key, minio_endpoint_url, bucket_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, project_name, tags, number_of_files, extensions, fps, object_storage, bucket_name, created_at`,
      [
        data.project_name,
        data.tags,
        data.number_of_files ?? null,
        data.extensions ?? null,
        data.fps ?? null,
        data.object_storage,
        data.MINIO_ACCESS_KEY,
        data.MINIO_SECRET_KEY,
        data.MINIO_ENDPOINT_URL,
        data.bucket_name,
      ],
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
} 