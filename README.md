# Matimato

A fresh Next.js + Phaser + MongoDB implementation of Matimato.

Current release: `2.2.0`.

## Commands

```bash
npm install
npm run lint
npm run dev
npm run test
npm run build
npm run verify
npm audit --omit=dev
```

## Stack

- Next.js App Router
- Sovereign Squad General Design System `@doneisbetter/gds` 3.5.0 for React UI controls and theme bootstrap
- Phaser 3 for the game board
- MongoDB Atlas for persistence
- Vitest for rules tests

## Required environment

Keep `.env` / `.env.*` local and set:

```bash
MONGODB_URI="mongodb+srv://..."
MONGODB_DB="matimato"
```

## Feature flags

These flags default to enabled. Set either value to `false` for rollback.

```bash
NEXT_PUBLIC_MATIMATO_ONBOARDING=true
NEXT_PUBLIC_MATIMATO_LOBBY_V2=true
NEXT_PUBLIC_MATIMATO_DAILY_V2=true
NEXT_PUBLIC_MATIMATO_TELEMETRY=true
MATIMATO_EVENTS_ENABLED=true
```

`NEXT_PUBLIC_MATIMATO_ONBOARDING=false` disables automatic first-run tutorial entry while keeping normal solo and battle actions available.

`NEXT_PUBLIC_MATIMATO_LOBBY_V2=false` restores the direct battle create/join flow for new client sessions. Existing lobby snapshots remain readable and recoverable through `/play/[id]`.

`NEXT_PUBLIC_MATIMATO_DAILY_V2=false` hides daily challenge entry on the Quests screen without affecting solo, battle, or existing daily snapshots.

`NEXT_PUBLIC_MATIMATO_TELEMETRY=false` disables the client event emitter. `MATIMATO_EVENTS_ENABLED=false` keeps `/api/events` accepting payloads but marks ingestion degraded and skips event storage.

## Daily challenge

The Quests screen now exposes one deterministic UTC challenge per day using seed `daily:{yyyy-mm-dd}`. `POST /api/games` creates or resumes the active daily for the same player:

```ts
{ "type": "create", "mode": "daily", "playerId": "...", "playerTag": "...", "dailyId": "2026-06-24" }
```

`GET /api/progression?playerId=...` returns the current daily, completed result when present, streak state, quest progress, and the weekly daily leaderboard. Daily completions are idempotent per `challengeId:playerId`; weekly ranking sorts by score descending, completed time ascending, attempts ascending, then stable player hash.

## Telemetry and health

Client telemetry is privacy-safe and allowlisted. Events use hashed player/session/match identifiers, bounded property keys, and invite/secret redaction before storage. The ingestion endpoint accepts up to 50 events or 32 KB:

```ts
POST /api/events
{ "events": [{ "name": "daily_started", "version": 1, "occurredAt": "...", "sessionHash": "...", "properties": {} }] }
```

Tracked product events cover onboarding, battle lobby, daily challenge, weekly/rank views, match completion, Phaser lifecycle, sync errors, and recovery surfaces. `/api/health` returns release version plus database connectivity checks for deployment verification.

## Core guarantee

The active board is rendered only by Phaser. There is no legacy React board fallback.

## Guided onboarding

First-run players enter a GDS-owned guided match before normal home actions when onboarding has not been completed or dismissed. The tutorial uses the same 9x9 board and legal-target rules to teach:

- any first tile
- column targeting
- row targeting
- positive score
- negative risk
- Matimato AI handoff

Progress is saved locally immediately and synced through `/api/progression` when a profile exists:

```ts
POST /api/progression
{ "type": "onboarding", "playerId": "...", "step": "column-target", "completed": false }
```

Returning players can replay the tutorial from Profile without clearing completion state.

## Battle lobby

Battle creation uses a V2 lobby when enabled. The creator shares an invite code/link, both seats mark ready, and the client enters Phaser only after the server returns an active snapshot.

Lobby actions use `/api/games`:

```ts
{ "type": "lobbyStatus", "matchId": "...", "playerId": "..." }
{ "type": "ready", "matchId": "...", "playerId": "...", "actionId": "..." }
{ "type": "leave", "matchId": "...", "playerId": "...", "actionId": "..." }
{ "type": "cancel", "matchId": "...", "playerId": "...", "actionId": "..." }
```

Polling is bounded, stops on unmount/screen exit, and terminal expired/cancelled states remain recoverable from the lobby screen.
