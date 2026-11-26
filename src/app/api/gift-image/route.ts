import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileId = new URL(request.url).searchParams.get("fileId");
  if (!token || !fileId || fileId.length > 1024) {
    return NextResponse.json({ error: "Gift artwork unavailable" }, { status: 400 });
  }

  try {
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { next: { revalidate: 3600 } }
    );
    const info = await infoResponse.json();
    if (!infoResponse.ok || !info.ok || !info.result?.file_path) {
      return NextResponse.json({ error: "Gift artwork unavailable" }, { status: 404 });
    }

    const imageResponse = await fetch(
      `https://api.telegram.org/file/bot${token}/${info.result.file_path}`,
      { next: { revalidate: 3600 } }
    );
    if (!imageResponse.ok || !imageResponse.body) {
      return NextResponse.json({ error: "Gift artwork unavailable" }, { status: 404 });
    }

    return new Response(imageResponse.body, {
      headers: {
        "Content-Type": imageResponse.headers.get("content-type") || "image/webp",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ error: "Gift artwork unavailable" }, { status: 502 });
  }
}
