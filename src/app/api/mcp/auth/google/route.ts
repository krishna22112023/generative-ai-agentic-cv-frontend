import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/mcp/auth/google/callback";
const SCOPE =
  "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly";

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID not set" },
      { status: 500 },
    );
  }
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "";
  const state = encodeURIComponent(projectId);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    state,
    prompt: "consent",
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    302,
  );
} 