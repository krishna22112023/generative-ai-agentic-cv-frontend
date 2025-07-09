import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { tool: string } }) {
  const { tool } = params;
  let target = "https://example.com";
  switch (tool) {
    case "google":
      target = "https://accounts.google.com/";
      break;
    case "github":
      target = "https://github.com/login";
      break;
    case "slack":
      target = "https://slack.com/oauth/v2/authorize";
      break;
    default:
      return NextResponse.json({ error: "Unsupported tool" }, { status: 400 });
  }
  // TODO: replace with real OAuth initiation logic
  return NextResponse.redirect(target, { status: 302 });
} 