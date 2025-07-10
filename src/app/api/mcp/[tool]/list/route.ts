import { NextRequest, NextResponse } from "next/server";
import { query } from "~/lib/db";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Utility to refresh Google access token using refresh_token
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
  if (!res.ok) {
    throw new Error("Failed to refresh Google token");
  }
  return res.json();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  try {
    const { tool } = await params;
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId missing" }, { status: 400 });
    }

    // Fetch stored connector configuration
    const { rows } = await query(`SELECT mcp_configs FROM projects WHERE id=$1 LIMIT 1`, [projectId]);
    if (rows.length === 0) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const cfg: Record<string, any> = (rows[0] as any).mcp_configs ?? {};

    switch (tool) {
      case "drive": {
        const driveCfg = cfg["drive"];
        if (!driveCfg) return NextResponse.json({ error: "Drive not connected" }, { status: 400 });

        let accessToken: string | undefined = driveCfg.access_token;
        const refreshToken: string | undefined = driveCfg.refresh_token;

        // Attempt to list files helper function
        const listFiles = async (token: string) => {
          const listRes = await fetch(
            "https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id%2Cname%2CmimeType)",
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          return listRes;
        };

        let res: Response | undefined;
        if (accessToken) {
          res = await listFiles(accessToken);
        }

        // If unauthorized, try refreshing
        if (res && res.status === 401 && refreshToken) {
          try {
            const newTokenJson = await refreshGoogleToken(refreshToken);
            // Persist new access token in db
            driveCfg.access_token = newTokenJson.access_token;
            driveCfg.expires_in = newTokenJson.expires_in;
            await query(`UPDATE projects SET mcp_configs=$1 WHERE id=$2`, [cfg, projectId]);
            accessToken = newTokenJson.access_token;
            res = await listFiles(accessToken as string);
          } catch (err) {
            console.error("Token refresh failed", err);
          }
        }

        if (!res || !res.ok) {
          const txt = await res?.text();
          console.error("Drive list error", res?.status, txt);
          return NextResponse.json({ error: "Failed to list drive files" }, { status: 500 });
        }
        const json = await res.json();
        return NextResponse.json(json.files ?? []);
      }
      default:
        return NextResponse.json({ error: "Unsupported connector" }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 