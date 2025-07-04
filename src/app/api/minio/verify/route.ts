import { NextResponse } from "next/server";
// @ts-ignore
import { Client } from "minio";

interface VerifyBody {
  endpointURL: string;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;

    const url = new URL(body.endpointURL);
    const port = url.port ? parseInt(url.port) : body.useSSL ? 443 : 80;
    const client = new Client({
      endPoint: url.hostname,
      port,
      useSSL: body.useSSL,
      accessKey: body.accessKey,
      secretKey: body.secretKey,
    });

    const buckets = await client.listBuckets();
    const names = (buckets as any[]).map((b) => b.name as string);
    return NextResponse.json({ success: true, buckets: names });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 });
  }
} 