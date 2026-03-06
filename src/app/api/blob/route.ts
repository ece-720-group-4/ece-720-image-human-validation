import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl } from "@vercel/blob";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const downloadUrl = await getDownloadUrl(url);
    const res = await fetch(downloadUrl);
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch blob" }, { status: 500 });
  }
}
