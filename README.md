# GIFTORIA

**A NEW WORLD OF DIGITAL GIFTS.**

Telegram-first digital gift companion built with Next.js 15, React 19 and the Telegram Mini Apps platform.

## Included
- Minimal mobile-first Mini App interface (Home, Catalog, Collection, Profile).
- Live gift catalog fetched from Telegram Bot API `getAvailableGifts` (never fabricated catalog entries).
- Server-side Telegram Mini App `initData` HMAC verification with freshness validation.
- Optional Supabase environment placeholders for future persistence.

## Run locally
1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env.local`.
3. Set `TELEGRAM_BOT_TOKEN` from a bot you control.
4. Run `npm install` and `npm run dev`.

Without a bot token the UI runs in preview mode and clearly indicates that the live catalog is not connected.

## Deploy
Deploy the repository to Vercel as a Next.js app. Add `TELEGRAM_BOT_TOKEN` as a server-only environment variable, then configure the Mini App URL with BotFather.

## Security and scope
- Never expose the bot token to client code.
- All Telegram identity must be verified on the server; do not trust a client-supplied user object.
- Digital goods inside Telegram must follow Telegram's Stars payment requirements.
- This initial version does not implement chance-based drops, cash-out balances, referral-locked withdrawals, or pretend ownership of collectible gifts.
- The Collection screen is intentionally honest until a supported, authenticated ownership source is connected.

## Official references
- https://core.telegram.org/bots/webapps
- https://core.telegram.org/bots/api#getavailablegifts
- https://core.telegram.org/bots/payments-stars