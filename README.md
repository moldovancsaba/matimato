

# Matimato

Matimato is a signed-number strategy board game rebuilt for Vercel, MongoDB, and player-to-player multiplayer.

## Features

- Next.js App Router runtime for Vercel.
- MongoDB-backed canonical game state with in-memory local fallback.
- Player-to-player games with invite codes.
- Player-relative board perspective: each side sees the board from their own table side.
- Positive and negative random board values.
- Server-side move validation, score calculation, turn constraints, and terminal-state detection.
- GDS-only UI through `@doneisbetter/gds`.
- Accessibility states for turn changes, legal cells, reconnecting, and results.

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

## Verification

```bash
npm run gds:check
npm test
npm run build
npm run verify
```

## Architecture

See `docs/ARCHITECTURE.md`.
