import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI ??
  "http://localhost:3000/api/mcp/auth/github/callback";

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) return NextResponse.json({ error: "GITHUB_CLIENT_ID not set" }, { status: 500 });
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "";
  const state = encodeURIComponent(projectId);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: "repo read:user", // adjust scopes as needed
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
} 