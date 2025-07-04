import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { Client } from "minio";
import { query } from "~/lib/db";

// Sanitise filename per rules
function sanitize(name: string): string {
  return name
    .trim() // a
    .replace(/[\t\n\r]+/g, " ") // b (convert newline & tab to space)
    .replace(/\s+/g, " ") // collapse double spaces
    .replace(/[./\[\]#~*]+/g, "-") // d (replace . [ ] # ~ * / with dash)
    .replace(/[|'"`]+/g, "") // e remove | ' "
    .replace(/\s+/g, "-"); // convert spaces to dash (keep previous spaces after collapse)
}

export async function POST(req: NextRequest) {
  // Expect multipart/form-data with fields: projectId, files[]
  const formData = await req.formData();
  const projectId = formData.get("projectId");
  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId missing" }, { status: 400 });
  }
  const files = formData.getAll("files");
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Pull project record + MinIO creds
  const { rows } = await query(
    `SELECT project_name, minio_endpoint_url, minio_access_key, minio_secret_key, bucket_name, object_storage, number_of_files, extensions FROM projects WHERE id=$1 LIMIT 1`,
    [projectId],
  );
  if (rows.length === 0) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const project = rows[0] as any;
  if (project.object_storage !== "minio") return NextResponse.json({ error: "Storage type unsupported" }, { status: 400 });

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
  let uploaded = 0;
  const extSet: Set<string> = new Set(project.extensions ?? []);

  for (const fileItem of files) {
    if (!(fileItem instanceof File)) continue;
    const buffer = Buffer.from(await fileItem.arrayBuffer());
    const safeName = sanitize(fileItem.name);
    const extMatch = safeName.match(/\.[^\.]+$/);
    if (extMatch) extSet.add(extMatch[0]);
    await client.putObject(project.bucket_name, `${prefix}${safeName}`, buffer, buffer.length, {
      "Content-Type": fileItem.type || undefined,
    });
    uploaded += 1;
  }

  // update DB counts
  await query(
    `UPDATE projects SET number_of_files = COALESCE(number_of_files,0)+$1, extensions=$2 WHERE id=$3`,
    [uploaded, Array.from(extSet), projectId],
  );

  return NextResponse.json({ success: true, uploaded });
} 