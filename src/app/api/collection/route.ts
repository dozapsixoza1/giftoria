import { NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function authenticate(initData: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { error: "Telegram bot is not configured", status: 503 as const };
  const user = verifyTelegramInitData(initData, token);
  if (!user) return { error: "Invalid or expired Telegram session", status: 401 as const };
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase persistence is not configured", status: 503 as const };
  return { user, supabase };
}

export async function GET(request: Request) {
  const initData = new URL(request.url).searchParams.get("initData") || "";
  const auth = await authenticate(initData);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase.from("saved_gifts")
    .select("gift_id,gift_name,gift_emoji,created_at")
    .eq("telegram_id", auth.user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load saved gifts" }, { status: 503 });
  return NextResponse.json({ gifts: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const auth = await authenticate(String(body.initData || ""));
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const giftId = String(body.giftId || "").trim();
  if (!giftId || giftId.length > 128) return NextResponse.json({ error: "A valid giftId is required" }, { status: 400 });

  const { error } = await auth.supabase.from("saved_gifts").upsert({
    telegram_id: auth.user.id,
    gift_id: giftId,
    gift_name: typeof body.giftName === "string" ? body.giftName.slice(0, 120) : null,
    gift_emoji: typeof body.giftEmoji === "string" ? body.giftEmoji.slice(0, 16) : null,
  }, { onConflict: "telegram_id,gift_id" });
  if (error) return NextResponse.json({ error: "Could not save this gift" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const auth = await authenticate(String(body.initData || ""));
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const giftId = String(body.giftId || "").trim();
  if (!giftId) return NextResponse.json({ error: "giftId is required" }, { status: 400 });
  const { error } = await auth.supabase.from("saved_gifts")
    .delete().eq("telegram_id", auth.user.id).eq("gift_id", giftId);
  if (error) return NextResponse.json({ error: "Could not remove this gift" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
