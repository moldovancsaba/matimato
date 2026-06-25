# Matimato

A fresh Next.js + Phaser + MongoDB implementation of Matimato.

Current release: `2.5.0`.

## Commands

```bash
npm install
npm run lint
npm run dev
npm run test
npm run build
npm run verify
npm run assets:ios
npm run mobile:smoke
npm run ios:sync
npm run ios:build
npm audit --omit=dev
```

## Stack

- Next.js App Router
- Sovereign Squad General Design System `@doneisbetter/gds` 3.5.0 for React UI controls and theme bootstrap
- Phaser 3 for the game board
- MongoDB Atlas for persistence
- Vitest for rules tests
- Capacitor 8 for the iOS WKWebView wrapper
- Playwright for mobile viewport smoke checks

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
NEXT_PUBLIC_MATIMATO_BLITZ_MODE=true
NEXT_PUBLIC_MATIMATO_TELEMETRY=true
NEXT_PUBLIC_MATIMATO_TRAINING_CHOICE=true
NEXT_PUBLIC_MATIMATO_COACH_BUBBLES=true
NEXT_PUBLIC_MATIMATO_BOARD_JOURNEY=true
NEXT_PUBLIC_MATIMATO_SERVICE_WORKER=true
NEXT_PUBLIC_MATIMATO_APP_VERSION=2.5.0
NEXT_PUBLIC_MATIMATO_IOS_BUILD_NUMBER=web
MATIMATO_BLITZ_ENABLED=true
MATIMATO_EVENTS_ENABLED=true
MATIMATO_BOARD_JOURNEY_ENABLED=true
CAPACITOR_SERVER_URL=https://matimato.vercel.app
CAPACITOR_BUILD_NUMBER=local
```

`NEXT_PUBLIC_MATIMATO_ONBOARDING=false` disables automatic first-run tutorial entry while keeping normal solo and battle actions available.

`NEXT_PUBLIC_MATIMATO_LOBBY_V2=false` restores the direct battle create/join flow for new client sessions. Existing lobby snapshots remain readable and recoverable through `/play/[id]`.

`NEXT_PUBLIC_MATIMATO_DAILY_V2=false` hides daily challenge entry on the Quests screen without affecting solo, battle, or existing daily snapshots.

`NEXT_PUBLIC_MATIMATO_BLITZ_MODE=false` hides Blitz entry points. `MATIMATO_BLITZ_ENABLED=false` rejects new Blitz creation server-side while keeping existing saved snapshots readable.

`NEXT_PUBLIC_MATIMATO_TELEMETRY=false` disables the client event emitter. `MATIMATO_EVENTS_ENABLED=false` keeps `/api/events` accepting payloads but marks ingestion degraded and skips event storage.

`NEXT_PUBLIC_MATIMATO_TRAINING_CHOICE=false` restores the previous automatic onboarding behavior. `NEXT_PUBLIC_MATIMATO_COACH_BUBBLES=false` hides contextual tutorial explanations. `NEXT_PUBLIC_MATIMATO_BOARD_JOURNEY=false` hides the board journey UI. `MATIMATO_BOARD_JOURNEY_ENABLED=false` rejects new board purchases and active-board changes server-side while keeping stored wallet/unlock data readable.

`NEXT_PUBLIC_MATIMATO_SERVICE_WORKER=false` stops registering the offline shell worker for new sessions. `CAPACITOR_SERVER_URL` controls the iOS wrapper target and must stay on HTTPS for production.

## iOS mobile app

Matimato now has a production iOS delivery lane documented in [`docs/ios-mobile.md`](/Users/Shared/Projects/matimato/docs/ios-mobile.md). The chosen architecture is an installable iOS PWA plus a Capacitor WKWebView wrapper around the existing GDS/Phaser web runtime.

Key commands:

```bash
npm run assets:ios
npm run ios:sync
npm run ios:build
MATIMATO_SMOKE_URL=https://matimato.vercel.app npm run mobile:smoke
```

The local machine currently has Command Line Tools selected instead of full Xcode, so `ios:build` is expected to fail until Xcode is installed/selected. Apple signing, App Store Connect app creation, and TestFlight upload require external Apple Developer credentials and are intentionally not stored in this repository.

## Board progression

Players now start on a 5x5 board for solo and Blitz. The Journey screen shows lifetime XP, spendable XP, unlocked boards, next-board cost, active board selection, and start actions. Bigger boards are unlocked sequentially:

| Board | Cost |
| --- | ---: |
| 5x5 | Free |
| 6x6 | 120 XP |
| 7x7 | 260 XP |
| 8x8 | 520 XP |
| 9x9 | 900 XP |

Match rewards increase both lifetime XP and spendable XP. Purchases reduce spendable XP only; lifetime XP remains the ranking/progression total. Existing profiles without a wallet split are normalized by treating current XP as both lifetime and spendable XP.

Progression APIs:

```ts
GET /api/progression?playerId=...

POST /api/progression
{ "type": "purchaseBoard", "playerId": "...", "boardSize": 6, "actionId": "uuid" }

POST /api/progression
{ "type": "selectBoard", "playerId": "...", "boardSize": 6 }
```

Purchases are server-validated by sequence and spendable balance, idempotent by action id or board size, and never trust client-supplied costs or final balances. Solo and Blitz creation accepts an unlocked `boardSize`; battle and daily remain on the current safe 9x9 behavior.

## Blitz mode

Blitz is a turn-based quick-play mode with a server-authored per-turn clock. The client displays the countdown and can request timeout resolution, but the server decides whether the deadline expired.

```ts
POST /api/games
{ "type": "create", "mode": "blitz", "playerId": "...", "playerTag": "...", "clock": { "turnLimitMs": 30000 } }

POST /api/games
{ "type": "timeout", "matchId": "...", "playerId": "...", "deadlineVersion": 4 }
```

Existing solo, battle, and daily snapshots may omit `clock`; clients treat omitted clocks as untimed. Timeout requests are idempotent by match, side, and deadline version. Repeated Blitz timeouts use the documented forfeit policy.

## Match recap

Completed matches transition to a GDS-owned recap screen with final score, outcome reason, move replay, share action, ranks navigation, and rematch. Game snapshots now keep an optional `moveLog` so recap can replay claimed tiles and timeout resolutions without reading Phaser state.

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

Tracked product events cover optional training choice, coach bubbles, board journey purchases/selection, onboarding, battle lobby, daily challenge, Blitz clocks/rematches, recap/share actions, weekly/rank views, match completion, Phaser lifecycle, sync errors, iOS runtime mode, offline retry/recovery, and recovery surfaces. `/api/health` returns release version plus database connectivity checks for deployment verification.

## Core guarantee

The active board is rendered only by Phaser. There is no legacy React board fallback.

## Guided onboarding

First-run players see a GDS-owned choice screen that explains Matimato and lets them choose `Learn the game` or `Play now`. The training path uses a guided match with coach bubbles; the play-now path reaches Home immediately and starts at the active board size. The tutorial uses the same legal-target rules to teach:

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

POST /api/progression
{ "type": "onboarding", "playerId": "...", "trainingChoice": "learn" }
```

Returning players can replay the tutorial from Profile without clearing completion state.

## Progression release QA

Before promoting a progression release, verify:

- Clean first-run profile shows the Learn/Play choice and does not repeat after selection.
- Learn path shows coach bubbles, supports keyboard-only tile selection, and can be skipped.
- Play-now path reaches Home without starting training.
- Journey shows 5x5 through 9x9, lifetime/spendable XP, disabled reasons, and active board state.
- Insufficient XP cannot purchase the next board and exposes a readable reason.
- Successful 6x6 purchase reduces spendable XP, preserves lifetime XP, and selects 6x6.
- Duplicate purchase retry does not double-spend XP.
- Solo and Blitz start with the selected unlocked board size.
- Mobile viewports 320x568, 390x844, and 430x932 keep controls visible.
- Rollback flags hide client entry points and reject server board mutations.

## iOS release QA

Before promoting an iOS app release, verify:

- Manifest icons render in Safari and installed PWA mode.
- Service worker cache opens the shell after one successful online load.
- Offline unsafe writes are blocked and Retry recovers through `/api/health`.
- `ios_runtime_detected`, offline retry/recovery, and wrapper error telemetry are accepted by `/api/events`.
- `npm run mobile:smoke` passes at 320x568, 390x844, and 430x932.
- `npx cap sync ios` succeeds.
- `npm run ios:build` succeeds on a full-Xcode machine, or the Xcode/Apple credential blocker is recorded in the release issue.

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
