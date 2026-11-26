import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ configured: false, ok: false, error: "TELEGRAM_BOT_TOKEN is missing" }, { status: 503 });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json();

    if (!response.ok || !payload?.ok || !payload?.result?.is_bot) {
      return NextResponse.json({
        configured: true,
        ok: false,
        error: "Telegram rejected the configured token",
        telegramErrorCode: payload?.error_code ?? response.status,
      }, { status: 502 });
    }

    return NextResponse.json({
      configured: true,
      ok: true,
      botId: payload.result.id,
      username: payload.result.username ?? null,
      expectedUsername: "giftoriarobot",
      matchesExpectedBot: String(payload.result.username ?? "").toLowerCase() === "giftoriarobot",
    });
  } catch {
    return NextResponse.json({
      configured: true,
      ok: false,
      error: "Could not reach Telegram Bot API",
    }, { status: 502 });
  }
}
