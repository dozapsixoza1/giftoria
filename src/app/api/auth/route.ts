import { NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const user = verifyTelegramInitData(String(body.initData || ""), token);
  if (!user) return NextResponse.json({ error: "Invalid or expired Telegram session" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ user, persistence: "not_configured" });

  const { error } = await supabase.from("user_profiles").upsert({
    telegram_id: user.id,
    username: user.username ?? null,
    first_name: user.first_name,
    last_name: user.last_name ?? null,
    photo_url: user.photo_url ?? null,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "telegram_id" });

  if (error) {
    console.error("Supabase profile upsert failed:", error.message);
    return NextResponse.json({ error: "Could not save Telegram profile" }, { status: 503 });
  }
  return NextResponse.json({ user, persistence: "connected" });
}
