import { NextRequest, NextResponse } from "next/server";
import { query } from "~/lib/db";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI ??
  "http://localhost:3000/api/mcp/auth/github/callback";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const projectId = url.searchParams.get("state");
  if (!code || !projectId) return NextResponse.json({ error: "missing code/state" }, { status: 400 });

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      state: projectId,
    }),
  });
  if (!tokenRes.ok) return NextResponse.json({ error: "token request failed" }, { status: 500 });
  const tokenJson = await tokenRes.json();
  try {
    const { rows } = await query(`SELECT mcp_configs FROM projects WHERE id=$1 LIMIT 1`, [projectId]);
    const cfg: Record<string, unknown> = (rows[0] as any).mcp_configs ?? {};
    cfg["github"] = tokenJson;
    await query(`UPDATE projects SET mcp_configs=$1 WHERE id=$2`, [cfg, projectId]);
  } catch (err) {
    console.error(err);
  }
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = process.env.APP_BASE_URL ?? `${proto}://${host}`;
  return NextResponse.redirect(`${origin}/?projectId=${projectId}`, 302);
} 