-- GIFTORIA profile persistence, bot audience and saved gifts.
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
create table if not exists public.bot_users (
  chat_id bigint primary key,
  telegram_id bigint not null unique,
  username text,
  first_name text not null,
  last_name text,
  is_muted boolean not null default false,
  created_at timestamptz not null default now(),
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
alter table public.bot_users enable row level security;
alter table public.saved_gifts enable row level security;
create index if not exists bot_users_created_at_idx on public.bot_users (created_at desc);
create index if not exists saved_gifts_telegram_id_created_at_idx on public.saved_gifts (telegram_id, created_at desc);
notify pgrst, 'reload schema';
