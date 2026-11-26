import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

type TelegramUser = { id: number; username?: string; first_name?: string; last_name?: string };
type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string }>;
  reply_to_message?: TelegramMessage;
};
type TelegramUpdate = { update_id: number; message?: TelegramMessage };

const token = () => process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
const adminIds = () =>
  new Set((process.env.ADMIN_TELEGRAM_IDS || "").split(",").map((v) => v.trim()).filter(Boolean));

async function telegram(method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    console.error("[giftoria-bot] Telegram API error", method, result?.description || response.status);
    return null;
  }
  return result.result;
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function send(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  });
}

async function broadcast(message: TelegramMessage, commandText: string) {
  const supabase = db();
  if (!supabase) return { sent: 0, failed: 0, error: "Supabase не настроен." };

  const { data, error } = await supabase
    .from("bot_users")
    .select("chat_id")
    .eq("is_muted", false)
    .limit(10000);

  if (error || !data) return { sent: 0, failed: 0, error: "Не удалось получить список пользователей. Проверь таблицу bot_users." };

  const recipients = data.map((row) => Number(row.chat_id)).filter(Number.isFinite);
  let sent = 0;
  let failed = 0;
  const text = commandText.replace(/^\/broadcast(?:@\w+)?\s*/i, "").trim();

  for (let i = 0; i < recipients.length; i += 8) {
    const batch = recipients.slice(i, i + 8);
    const results = await Promise.all(batch.map(async (chatId) => {
      let result: unknown = null;
      if (message.reply_to_message) {
        result = await telegram("copyMessage", {
          chat_id: chatId,
          from_chat_id: message.chat.id,
          message_id: message.reply_to_message.message_id,
        });
      } else if (message.photo?.length) {
        result = await telegram("sendPhoto", {
          chat_id: chatId,
          photo: message.photo[message.photo.length - 1].file_id,
          caption: text || message.caption?.replace(/^\/broadcast(?:@\w+)?\s*/i, "").trim() || undefined,
        });
      } else if (text) {
        result = await telegram("sendMessage", {
          chat_id: chatId,
          text,
          disable_web_page_preview: false,
        });
      }
      return Boolean(result);
    }));
    sent += results.filter(Boolean).length;
    failed += results.length - results.filter(Boolean).length;
  }

  return { sent, failed, total: recipients.length };
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const from = message.from;
  if (!from || message.chat.type !== "private") return;

  const supabase = db();
  if (supabase) {
    const { error } = await supabase.from("bot_users").upsert({
      chat_id: chatId,
      telegram_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? "Пользователь",
      last_name: from.last_name ?? null,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "chat_id", ignoreDuplicates: false });
    if (error) console.error("[giftoria-bot] user upsert failed:", error.message);

    await supabase.from("user_profiles").upsert({
      telegram_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? "Пользователь",
      last_name: from.last_name ?? null,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "telegram_id" });
  }

  const raw = (message.text || message.caption || "").trim();
  const command = raw.split(/\s+/)[0].split("@")[0].toLowerCase();
  const args = raw.split(/\s+/).slice(1);
  const isAdmin = adminIds().has(String(from.id));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftoria-ten.vercel.app";

  if (command === "/start") {
    await send(chatId,
      "🎁 Добро пожаловать в GIFTORIA!\n\nОткрывай каталог, собирай коллекцию и следи за обновлениями.",
      { reply_markup: { inline_keyboard: [[{ text: "Открыть GIFTORIA", web_app: { url: appUrl } }]] } }
    );
    return;
  }

  if (command === "/stop" || command === "/subscribe") {
    if (!supabase) return void await send(chatId, "Сейчас не удалось обновить настройки. Попробуй позже.");
    const { error } = await supabase.from("bot_users")
      .update({ is_muted: command === "/stop" })
      .eq("telegram_id", from.id);
    if (error) return void await send(chatId, "Не удалось обновить настройки рассылки.");
    await send(chatId, command === "/stop"
      ? "🔕 Рассылки отключены. Чтобы снова получать новости, напиши /subscribe."
      : "🔔 Рассылки снова включены.");
    return;
  }

  if (command === "/id") {
    await send(chatId, `Твой Telegram ID: ${from.id}`);
    return;
  }

  if (command === "/help" || command === "/admin") {
    const publicHelp = "/start — открыть GIFTORIA\n/id — узнать свой Telegram ID\n/help — список команд";
    const adminHelp = "\n\nАДМИН-КОМАНДЫ\n/stats — статистика\n/users — последние пользователи\n/user ID — карточка пользователя\n/mute ID — исключить из рассылок\n/unmute ID — вернуть в рассылки\n/broadcast ТЕКСТ — рассылка текста\n/broadcast в ответ на сообщение/фото — переслать его всем";
    await send(chatId, isAdmin ? publicHelp + adminHelp : publicHelp);
    return;
  }

  if (!isAdmin) return;

  if (command === "/ping") {
    await send(chatId, "🏓 GIFTORIA bot работает.");
    return;
  }

  if (command === "/stats") {
    if (!supabase) return void await send(chatId, "Supabase не настроен.");
    const { count: total, error: totalError } = await supabase.from("bot_users").select("*", { count: "exact", head: true });
    const { count: muted } = await supabase.from("bot_users").select("*", { count: "exact", head: true }).eq("is_muted", true);
    if (totalError) return void await send(chatId, "Ошибка статистики: таблица bot_users не найдена.");
    await send(chatId, `📊 GIFTORIA\nПользователей: ${total ?? 0}\nОтключили рассылку: ${muted ?? 0}\nПолучают рассылку: ${(total ?? 0) - (muted ?? 0)}`);
    return;
  }

  if (command === "/users") {
    if (!supabase) return void await send(chatId, "Supabase не настроен.");
    const { data, error } = await supabase.from("bot_users").select("telegram_id,username,first_name,created_at").order("created_at", { ascending: false }).limit(20);
    if (error) return void await send(chatId, "Не удалось получить пользователей. Проверь таблицу bot_users.");
    const lines = (data || []).map((u) => `${u.first_name || "—"} · ${u.username ? "@" + u.username : "без username"} · ID ${u.telegram_id}`);
    await send(chatId, `👥 Последние пользователи (до 20):\n\n${lines.join("\n") || "Пока пусто"}`);
    return;
  }

  if (command === "/user") {
    const id = Number(args[0]);
    if (!Number.isSafeInteger(id)) return void await send(chatId, "Использование: /user TELEGRAM_ID");
    if (!supabase) return void await send(chatId, "Supabase не настроен.");
    const { data } = await supabase.from("bot_users").select("*").eq("telegram_id", id).maybeSingle();
    if (!data) return void await send(chatId, "Пользователь не найден. Он должен хотя бы раз написать /start.");
    await send(chatId, `👤 Пользователь\nИмя: ${data.first_name}\nUsername: ${data.username ? "@" + data.username : "нет"}\nID: ${data.telegram_id}\nВ рассылке: ${data.is_muted ? "нет" : "да"}\nПоследняя активность: ${data.last_seen_at || "—"}`);
    return;
  }

  if (command === "/mute" || command === "/unmute") {
    const id = Number(args[0]);
    if (!Number.isSafeInteger(id)) return void await send(chatId, `Использование: ${command} TELEGRAM_ID`);
    if (!supabase) return void await send(chatId, "Supabase не настроен.");
    const { error } = await supabase.from("bot_users").update({ is_muted: command === "/mute" }).eq("telegram_id", id);
    await send(chatId, error ? "Не удалось обновить пользователя." : command === "/mute" ? "Пользователь исключён из рассылок." : "Пользователь снова получает рассылки.");
    return;
  }

  if (command === "/broadcast") {
    if (!raw.replace(/^\/broadcast(?:@\w+)?\s*/i, "").trim() && !message.reply_to_message && !message.photo?.length) {
      await send(chatId, "Использование:\n/broadcast Текст объявления\nИли ответь командой /broadcast на сообщение/фото, чтобы разослать его с форматированием.");
      return;
    }
    const result = await broadcast(message, raw);
    await send(chatId, result.error || `📣 Рассылка завершена\nУспешно: ${result.sent}\nОшибок: ${result.failed}\nВсего: ${result.total}`);
    return;
  }
}

export async function POST(request: NextRequest) {
  if (!token()) return NextResponse.json({ ok: false, error: "Bot token is not configured" }, { status: 503 });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await request.json().catch(() => null) as TelegramUpdate | null;
  if (update?.message) {
    try {
      await handleMessage(update.message);
    } catch (error) {
      console.error("[giftoria-bot] update failed:", error instanceof Error ? error.message : "unknown error");
    }
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "giftoria-telegram-bot" });
}
