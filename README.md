# Matimato

A fresh Next.js + Phaser + MongoDB implementation of Matimato.

Current release: `2.1.0`.

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
```

`NEXT_PUBLIC_MATIMATO_ONBOARDING=false` disables automatic first-run tutorial entry while keeping normal solo and battle actions available.

`NEXT_PUBLIC_MATIMATO_LOBBY_V2=false` restores the direct battle create/join flow for new client sessions. Existing lobby snapshots remain readable and recoverable through `/play/[id]`.

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
