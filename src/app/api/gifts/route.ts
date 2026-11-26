import { NextResponse } from "next/server";

export const revalidate = 300;
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ gifts: [], configured: false, message: "Connect a Telegram bot to load the live gift catalog." });
  const response = await fetch(`https://api.telegram.org/bot${token}/getAvailableGifts`, { next: { revalidate: 300 } });
  const data = await response.json();
  if (!response.ok || !data.ok) return NextResponse.json({ gifts: [], configured: true, error: "Telegram gift catalog is temporarily unavailable." }, { status: 502 });
  return NextResponse.json({ gifts: data.result?.gifts ?? [], configured: true });
}