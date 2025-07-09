import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const REDIRECT_URI = process.env.SLACK_REDIRECT_URI ??
  "http://localhost:3000/api/mcp/auth/slack/callback";

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) return NextResponse.json({ error: "SLACK_CLIENT_ID not set" }, { status: 500 });
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "";
  const state = encodeURIComponent(projectId);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: "channels:read,files:read", // minimal scopes
  });
  return NextResponse.redirect(`https://slack.com/oauth/v2/authorize?${params}`, 302);
} 