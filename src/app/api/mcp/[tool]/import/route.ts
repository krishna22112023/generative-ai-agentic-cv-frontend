import { NextRequest, NextResponse } from "next/server";
import { query } from "~/lib/db";
// @ts-ignore
import { Client } from "minio";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function sanitize(name: string): string {
  return name
    .trim()
    .replace(/[\t\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\/\[\]#~*]+/g, "-")
    .replace(/[|'"`]+/g, "")
    .replace(/\s+/g, "-");
}

async function refreshGoogleToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error("token refresh failed");
  return res.json();
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  try {
    const { tool } = await params;
    if (tool !== "drive") return NextResponse.json({ error: "Unsupported" }, { status: 400 });
    const { projectId, folderId } = await req.json();
    if (!projectId || !folderId) {
      return NextResponse.json({ error: "projectId and folderId required" }, { status: 400 });
    }

    // Fetch project and drive config
    const { rows } = await query(`SELECT * FROM projects WHERE id=$1 LIMIT 1`, [projectId]);
    if (rows.length === 0) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const project = rows[0] as any;
    const cfg: Record<string, any> = project.mcp_configs ?? {};
    const driveCfg = cfg["drive"];
    if (!driveCfg) return NextResponse.json({ error: "Drive not connected" }, { status: 400 });

    let accessToken: string | undefined = driveCfg.access_token;
    const refreshToken: string | undefined = driveCfg.refresh_token;

    const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

    async function ensureAccessToken() {
      if (!accessToken && refreshToken) {
        const refreshed = await refreshGoogleToken(refreshToken);
        driveCfg.access_token = refreshed.access_token;
        driveCfg.expires_in = refreshed.expires_in;
        await query(`UPDATE projects SET mcp_configs=$1 WHERE id=$2`, [cfg, projectId]);
        accessToken = refreshed.access_token;
      }
    }

    await ensureAccessToken();
    if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 500 });

    // List files in folder (non-recursive)
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType)&pageSize=1000`,
      { headers: authHeader() },
    );
    if (!listRes.ok) {
      const err = await listRes.text();
      console.error("Drive list", err);
      return NextResponse.json({ error: "Failed to list folder" }, { status: 500 });
    }
    const { files } = await listRes.json();
    const fileList: Array<{ id: string; name: string; mimeType: string }> = files ?? [];
    if (fileList.length === 0) return NextResponse.json({ success: true, imported: 0 });

    // Prepare MinIO client
    if (project.object_storage !== "minio") {
      return NextResponse.json({ error: "Project not configured for MinIO" }, { status: 400 });
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
    const prefix = `${project.project_name}/raw/`;
    let imported = 0;
    const extSet: Set<string> = new Set(project.extensions ?? []);

    for (const f of fileList) {
      if (f.mimeType === "application/vnd.google-apps.folder") continue; // skip subfolders
      // Download file content
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
        { headers: authHeader() },
      );
      if (!downloadRes.ok) {
        console.error("Failed download", f.id, await downloadRes.text());
        continue;
      }
      const arrayBuffer = await downloadRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = sanitize(f.name);
      const extMatch = safeName.match(/\.[^\.]+$/);
      if (extMatch) extSet.add(extMatch[0]);
      await client.putObject(project.bucket_name, `${prefix}${safeName}`, buffer, buffer.length);
      imported += 1;
    }

    // Update DB counts & extensions
    await query(
      `UPDATE projects SET number_of_files = COALESCE(number_of_files,0)+$1, extensions=$2 WHERE id=$3`,
      [imported, Array.from(extSet), projectId],
    );

    // Record dataset version
    await query(
      `INSERT INTO project_versions (project_id, trigger, bucket_name, path) VALUES ($1,$2,$3,$4)`,
      [projectId, "drive_import", project.bucket_name, `${project.project_name}/raw/`],
    );

    return NextResponse.json({ success: true, imported });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
} 