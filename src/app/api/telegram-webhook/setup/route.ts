import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftoria-ten.vercel.app";

  if (!token || !secret) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must be configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: `${appUrl.replace(/\/$/, "")}/api/telegram-webhook`,
      secret_token: secret,
      allowed_updates: ["message"],
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    return NextResponse.json({ ok: false, error: result.description || "Telegram setWebhook failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, description: result.description || "Webhook is set" });
}
