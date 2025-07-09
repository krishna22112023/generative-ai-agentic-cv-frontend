import { NextRequest, NextResponse } from "next/server";
import { query } from "~/lib/db";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/mcp/auth/google/callback";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const projectId = url.searchParams.get("state");
  if (!code || !projectId) {
    return NextResponse.json({ error: "missing code/state" }, { status: 400 });
  }
  // exchange code for tokens
  const params = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error(err);
    return NextResponse.json({ error: "token exchange failed" }, { status: 500 });
  }
  const tokenJson = await tokenRes.json();
  // persist into mcp_configs
  try {
    const { rows } = await query(
      `SELECT mcp_configs FROM projects WHERE id=$1 LIMIT 1`,
      [projectId],
    );
    const cfg: Record<string, unknown> = (rows[0] as any).mcp_configs ?? {};
    cfg["drive"] = tokenJson;
    await query(`UPDATE projects SET mcp_configs=$1 WHERE id=$2`, [cfg, projectId]);
  } catch (err) {
    console.error(err);
  }
  // redirect back to app with success (absolute URL required by Next)
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = process.env.APP_BASE_URL ?? `${proto}://${host}`;
  return NextResponse.redirect(`${origin}/?projectId=${projectId}`, 302);
} 