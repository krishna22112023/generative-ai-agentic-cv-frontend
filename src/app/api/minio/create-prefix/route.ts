import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// @ts-ignore
import { Client } from "minio";
import { query } from "~/lib/db";

const bodySchema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { projectId } = parsed.data;

    const { rows } = await query(
      `SELECT project_name, minio_endpoint_url, minio_access_key, minio_secret_key, bucket_name, object_storage FROM projects WHERE id = $1 LIMIT 1`,
      [projectId],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const project = rows[0] as any;
    if (project.object_storage !== "minio") {
      return NextResponse.json({ error: "Only minio storage supported" }, { status: 400 });
    }

    const url = new URL(project.minio_endpoint_url);
    const useSSL = url.protocol === "https:";
    const port = url.port ? parseInt(url.port) : useSSL ? 443 : 80;
    const client = new Client({
      endPoint: url.hostname,
      port,
      useSSL,
      accessKey: project.minio_access_key,
      secretKey: project.minio_secret_key,
    });

    const prefix = `${project.project_name}/`;
    // create empty object to represent folder if not exists
    await client.putObject(project.bucket_name, prefix, Buffer.alloc(0));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create prefix" }, { status: 500 });
  }
}
