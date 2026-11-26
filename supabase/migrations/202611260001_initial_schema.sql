-- GIFTORIA initial persistence schema.
-- All access is performed server-side with the Supabase service role after Telegram initData verification.
create table if not exists public.user_profiles (
  telegram_id bigint primary key,
  username text,
  first_name text not null,
  last_name text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.saved_gifts (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.user_profiles(telegram_id) on delete cascade,
  gift_id text not null,
  gift_name text,
  gift_emoji text,
  created_at timestamptz not null default now(),
  unique (telegram_id, gift_id)
);

alter table public.user_profiles enable row level security;
alter table public.saved_gifts enable row level security;

-- Intentionally no anon/authenticated policies. The application verifies Telegram initData
-- on the server and accesses these tables with SUPABASE_SERVICE_ROLE_KEY only.
create index if not exists saved_gifts_telegram_id_created_at_idx
  on public.saved_gifts (telegram_id, created_at desc);
