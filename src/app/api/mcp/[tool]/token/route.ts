import { NextRequest, NextResponse } from "next/server";
import { query } from "~/lib/db";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  try {
    const { tool } = await params;
    if (tool !== "drive") return NextResponse.json({ error: "Unsupported" }, { status: 400 });
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId missing" }, { status: 400 });

    const { rows } = await query(`SELECT mcp_configs FROM projects WHERE id=$1 LIMIT 1`, [projectId]);
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const cfg: Record<string, any> = (rows[0] as any).mcp_configs ?? {};
    const driveCfg = cfg["drive"];
    if (!driveCfg) return NextResponse.json({ error: "Drive not connected" }, { status: 400 });

    let accessToken: string | undefined = driveCfg.access_token;
    const refreshToken: string | undefined = driveCfg.refresh_token;

    // Optionally: we could check expiry here; for simplicity we attempt refresh only if token missing.
    if (!accessToken && refreshToken) {
      try {
        const refreshed = await refreshGoogleToken(refreshToken);
        driveCfg.access_token = refreshed.access_token;
        driveCfg.expires_in = refreshed.expires_in;
        await query(`UPDATE projects SET mcp_configs=$1 WHERE id=$2`, [cfg, projectId]);
        accessToken = refreshed.access_token;
      } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "refresh failed" }, { status: 500 });
      }
    }

    if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 500 });

    return NextResponse.json({ access_token: accessToken });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
} 