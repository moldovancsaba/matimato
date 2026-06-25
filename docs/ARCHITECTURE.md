# Matimato Architecture

Matimato has been rebuilt from zero.

## Runtime split

- Next.js owns routing, PWA metadata, product screens, and API routes.
- Sovereign Squad General Design System owns React UI controls, theme bootstrap, accessibility patterns, and form/button primitives.
- Phaser owns the active game board, tiles, blob, input lock, animation order, and result overlay.
- MongoDB owns games, profiles, history, and leaderboard data.

## No legacy surface

There is no React/SVG/CSS board implementation in this baseline. React mounts Phaser and listens for high-level events only.

The Phaser boot boundary validates boot payloads, clears the mount host before creating a new game, and clears it again on destroy so React remounts cannot leave duplicate canvases. NetworkBridge owns abortable fetches and cancels pending reads/writes on scene teardown.

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

## Daily challenge loop

Daily challenges live inside the existing game and progression boundaries. The challenge id is the UTC date (`yyyy-mm-dd`) and the board seed is `daily:{yyyy-mm-dd}`, so every player receives the same 9x9 board for the current UTC day. `POST /api/games` with `mode: "daily"` validates the supplied `dailyId`, resumes an active daily for that player when one exists, and otherwise creates a normal AI-backed snapshot with `dailyId` attached.

Daily completion writes one result per `challengeId:playerId` into `dailyResults` and updates the profile streak once. The weekly leaderboard is derived from current-week daily results with deterministic ordering: score descending, completed time ascending, attempts ascending, then stable hashed player id. Rollback is `NEXT_PUBLIC_MATIMATO_DAILY_V2=false`, which disables new daily entry from the client while keeping stored snapshots readable.

## Blitz mode and clock authority

Blitz is an optional `GameMode` that adds a `ClockState` to snapshots:

```ts
type ClockState = {
  enabled: boolean;
  serverNow: string;
  activeSide: PlayerSide;
  deadlineAt?: string;
  deadlineVersion?: number;
  timeoutCount: Record<PlayerSide, number>;
  config: { mode: 'perTurn'; turnLimitMs: number; graceMs: number; timeoutPolicy: 'forfeit-on-repeat' };
};
```

The server creates deadlines, rejects expired move submissions, and resolves timeout requests by `deadlineVersion`. The browser may render countdowns and request timeout resolution, but it cannot advance gameplay without a confirmed server snapshot. Repeated timeouts trigger the configured forfeit policy. Rollback is two-layered: `NEXT_PUBLIC_MATIMATO_BLITZ_MODE=false` hides entry points and `MATIMATO_BLITZ_ENABLED=false` rejects new Blitz creation.

## Match recap

Game snapshots append accepted moves and timeout resolutions to optional `moveLog`. Completed matches transition from Phaser into a GDS-owned recap screen with final score, outcome reason, step-through replay, share action, ranks navigation, and rematch. Daily rematch routes to solo to avoid replaying a completed daily; Blitz rematch creates a fresh timed match with the default clock.

## Telemetry and health

Telemetry is an allowlisted product-event stream, not raw analytics capture. The client hashes session, player, and match identifiers before enqueueing events and redacts invite-like codes from string properties. `/api/events` accepts `{ events }` payloads capped at 50 events and 32 KB; invalid events are rejected individually, valid events fail open with `degraded: true` when storage is disabled or temporarily unavailable. Rollback controls are `NEXT_PUBLIC_MATIMATO_TELEMETRY=false` for the browser emitter and `MATIMATO_EVENTS_ENABLED=false` for server-side storage.

`/api/health` reports release version, database status, and named check latencies so deploy verification can distinguish app boot from persistence availability.

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

For Blitz, a timeout request follows the same server-frame path. Timeout frames do not animate tile removal; they announce the resolution, update the clock, and commit the returned snapshot.

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
- `NEXT_PUBLIC_MATIMATO_DAILY_V2`
- `NEXT_PUBLIC_MATIMATO_BLITZ_MODE`
- `NEXT_PUBLIC_MATIMATO_TELEMETRY`
- `MATIMATO_BLITZ_ENABLED`
- `MATIMATO_EVENTS_ENABLED`

## Verification

Release checks:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify`
- `npm audit --omit=dev`
