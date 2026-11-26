import { NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const user = verifyTelegramInitData(String(body.initData || ""), token);
  if (!user) return NextResponse.json({ error: "Invalid or expired Telegram session" }, { status: 401 });
  return NextResponse.json({ user });
}