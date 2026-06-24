# Matimato Architecture

Matimato has been rebuilt from zero.

## Runtime split

- Next.js owns routing, PWA metadata, product screens, and API routes.
- Sovereign Squad General Design System owns React UI controls, theme bootstrap, accessibility patterns, and form/button primitives.
- Phaser owns the active game board, tiles, blob, input lock, animation order, and result overlay.
- MongoDB owns games, profiles, history, and leaderboard data.

## No legacy surface

There is no React/SVG/CSS board implementation in this baseline. React mounts Phaser and listens for high-level events only.

## GDS adoption

Matimato imports `@doneisbetter/gds-theme/styles.css` once at the app entry and wraps the app with `GdsProvider`. Product screens compose controls from `@doneisbetter/gds`; Phaser remains the exception surface for the active game renderer, with GDS-derived shell styling and DOM live-region support around it.

Current consumed GDS version: `3.5.0`.

## Guided onboarding

Onboarding is stored under the existing profile/progression boundary instead of a separate persistence silo:

```ts
type TutorialStepId = 'first-pick' | 'column-target' | 'row-target' | 'negative-risk' | 'ai-turn' | 'finish';
type OnboardingState = {
  playerId: string;
  completedAt?: string;
  lastStep?: TutorialStepId;
  dismissedAt?: string;
  updatedAt: string;
};
```

The first-run tutorial uses a deterministic fixture seed (`matimato-guided-first-match-v1`) and the same 9x9 legal-target rules. Local storage records progress immediately; `/api/progression` idempotently upserts profile-backed progress when the network is available. Rollback is `NEXT_PUBLIC_MATIMATO_ONBOARDING=false`.

## Battle lobby

Battle lobby state is embedded on battle snapshots when V2 is requested:

```ts
type LobbyState = {
  matchId: string;
  inviteCode: string;
  status: 'waiting' | 'ready' | 'active' | 'expired' | 'cancelled';
  ready: Partial<Record<PlayerSide, boolean>>;
  expiresAt: string;
  cancelledAt?: string;
  lastSeenAt: Partial<Record<PlayerSide, string>>;
};
```

The legacy battle create/join request shape still works for rollback. V2 lobbies activate only after both known seats mark ready. Polling is client-owned, bounded, aborts on screen exit, and never starts Phaser until `/api/games` returns an active server snapshot. Rollback is `NEXT_PUBLIC_MATIMATO_LOBBY_V2=false`.

## Action order

1. Player selects a legal tile.
2. ActionMachine locks input.
3. NetworkBridge submits a versioned move.
4. Server returns ordered frames.
5. Blob collapses to selected tile.
6. Tile disappears.
7. Blob grows to next legal row or column.
8. Snapshot commits.
9. Input unlocks if the game is still active.

## Board rules

- Only 9x9 games exist.
- First move can select any open tile.
- A move from an open/row target creates a column target.
- A move from a column target creates a row target.
- Positive values render green, negative values render red, and stored values remain signed.

## Environment

Required production variable:

- `MONGODB_URI`

Optional:

- `MONGODB_DB`
- `NEXT_PUBLIC_MATIMATO_ONBOARDING`
- `NEXT_PUBLIC_MATIMATO_LOBBY_V2`

## Verification

Release checks:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify`
- `npm audit --omit=dev`
