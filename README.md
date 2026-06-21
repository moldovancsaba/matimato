

# Matimato

Matimato is a 9x9 signed-number strategy board game rebuilt for Vercel, MongoDB, solo play, and player-to-player battle mode.

## Features

- Next.js App Router runtime for Vercel.
- Google Analytics page/event tracking with measurement ID `G-JZZ0GMDVB6`.
- MongoDB-backed canonical game state with in-memory local fallback.
- Installable PWA metadata with stale service-worker/cache cleanup.
- Player-to-player games with invite codes.
- Fixed 9x9 game board; mode selection is BATTLE or SOLO only.
- Player-relative board perspective: each side sees the board from their own table side.
- Positive and negative random board values.
- Server-side move validation, score calculation, turn constraints, and terminal-state detection.
- GDS-only UI through `@doneisbetter/gds`.
- Accessibility states for turn changes, legal cells, reconnecting, and results.
- Security headers, no-store API responses, sanitized server logs, and hardened session cookies.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Configuration

```env
MONGODB_URI=
MONGODB_DB=matimato
NEXT_PUBLIC_APP_URL=http://localhost:3000
MATIMATO_USE_MEMORY_STORE=1
MATIMATO_COOKIE_SECURE=0
```

Set `MONGODB_URI` in Vercel for production persistence. Without it, local development uses the memory store.

## Security and PWA Behavior

- API responses set `Cache-Control: no-store` so game state, player credentials, and health checks are not cached.
- Player credentials are stored in an HTTP-only, same-site cookie keyed by game ID. Cookie decoding validates shape and size and prunes old entries.
- Server errors return safe public messages with request IDs. Runtime logs redact MongoDB URIs, bearer values, tokens, and secret-like query values.
- The Next.js config applies CSP, frame denial, content-type protection, referrer policy, and restricted browser permissions.
- The app is installable through `app/manifest.ts`, but no service worker is registered. `PwaGuard` unregisters legacy workers and clears old Matimato caches to prevent stale game sessions.
- Mobile/PWA layout is treated as a locked game canvas, not a scrolling webpage. The current visual direction uses separated welcome/setup/game screens, a soft raised Sudoku-style board, compact game-dashboard HUD modules, and the GDS `sunset` dark preset as a sunset-pulse game theme.

## Verification

```bash
npm run gds:check
npm test
npm run build
npm run verify
```

`npm run verify` is the release gate and runs GDS compliance, lint, tests, and production build.

## Architecture

See `docs/ARCHITECTURE.md` and `docs/PRODUCT_JOURNEY_PLAN.md`.
