# Matimato Architecture

Matimato has been rebuilt from zero.

## Runtime split

- Next.js owns routing, PWA metadata, product screens, and API routes.
- Sovereign Squad General Design System owns React UI controls, theme bootstrap, accessibility patterns, and form/button primitives.
- Phaser owns the active game board, tiles, blob, input lock, animation order, and result overlay.
- MongoDB owns games, profiles, history, and leaderboard data.
- Capacitor owns the optional iOS WKWebView wrapper and native build packaging. It does not own gameplay or visible product UI.

## No legacy surface

There is no React/SVG/CSS board implementation in this baseline. React mounts Phaser and listens for high-level events only.

The Phaser boot boundary validates boot payloads, clears the mount host before creating a new game, and clears it again on destroy so React remounts cannot leave duplicate canvases. NetworkBridge owns abortable fetches and cancels pending reads/writes on scene teardown.

## GDS adoption

Matimato imports `@doneisbetter/gds-theme/styles.css` once at the app entry and wraps the app with `GdsProvider`. Product screens compose controls from `@doneisbetter/gds`; Phaser remains the exception surface for the active game renderer, with GDS-derived shell styling and DOM live-region support around it.

Current consumed GDS version: `3.5.0`.

## iOS PWA and native wrapper

The iOS mobile strategy is PWA-first, then Capacitor for App Store packaging. The native shell is configured in `capacitor.config.ts` with bundle id `app.vercel.matimato`, app name `Matimato`, HTTPS server URL `https://matimato.vercel.app`, no webview zoom, automatic iOS content insets, and no extra plugin permissions.

The web shell remains authoritative:

```text
Capacitor WKWebView or iOS Safari
  -> https://matimato.vercel.app
  -> Next.js routes and APIs
  -> GDS screens / Phaser match renderer
```

The service worker caches only shell/static assets and never caches authoritative mutation responses. Unsafe writes are blocked while offline, and safe reads use bounded retry/timeouts. Runtime telemetry distinguishes `safari`, `standalone-pwa`, `capacitor-ios`, and desktop `browser` sessions.

Rollback is split by layer: Vercel rollback for web/PWA regressions, service-worker registration flag plus cache version bump for offline-shell regressions, and TestFlight build expiration or Capacitor config revert for native wrapper regressions.

## Guided onboarding

Onboarding is stored under the existing profile/progression boundary instead of a separate persistence silo:

```ts
type TutorialStepId = 'first-pick' | 'column-target' | 'row-target' | 'negative-risk' | 'ai-turn' | 'finish';
type OnboardingState = {
  playerId: string;
  completedAt?: string;
  lastStep?: TutorialStepId;
  dismissedAt?: string;
  trainingChoice?: 'learn' | 'play-now';
  trainingChoiceAt?: string;
  updatedAt: string;
};
```

The first-run flow is choice-first when `NEXT_PUBLIC_MATIMATO_TRAINING_CHOICE` is enabled. New players see a GDS explanation screen and choose `Learn the game` or `Play now`; direct `/play/[id]` routes bypass the choice so saved matches remain recoverable. The training path uses a deterministic fixture seed (`matimato-guided-first-match-v1`), legal-target rules, and optional coach bubbles controlled by `NEXT_PUBLIC_MATIMATO_COACH_BUBBLES`. Local storage records progress immediately; `/api/progression` idempotently upserts profile-backed progress when the network is available. Rollback controls are `NEXT_PUBLIC_MATIMATO_TRAINING_CHOICE=false`, `NEXT_PUBLIC_MATIMATO_COACH_BUBBLES=false`, and `NEXT_PUBLIC_MATIMATO_ONBOARDING=false`.

## Board progression and XP wallet

Matimato is now a progressive board-size game for solo and Blitz. Players start on 5x5 and unlock 6x6, 7x7, 8x8, then 9x9 by spending XP. Battle and daily continue to use the safe 9x9 behavior until those modes receive explicit progression work.

```ts
type BoardSize = 5 | 6 | 7 | 8 | 9;
type XpWallet = { lifetimeXp: number; spendableXp: number };
type BoardUnlockState = {
  unlockedBoardSizes: BoardSize[];
  activeBoardSize: BoardSize;
  nextUnlock?: { boardSize: BoardSize; costXp: number };
};
```

Profile `xp` remains lifetime XP. `spendableXp` is initialized from legacy `xp` when missing and increments with match rewards. Board purchases reduce only `spendableXp`; they never reduce `xp`, leaderboard rank, or level. Stored board unlocks include a purchase ledger with board size, cost, action id, and timestamp for idempotency/recovery.

Costs are deterministic:

- 6x6: 120 XP
- 7x7: 260 XP
- 8x8: 520 XP
- 9x9: 900 XP

Runtime flow:

```text
Home or Journey
  -> read /api/progression
  -> render unlocked boards and next cost
  -> purchaseBoard validates sequence + balance server-side
  -> selectBoard validates unlocked board server-side
  -> create solo/blitz game with selected boardSize
  -> Phaser derives geometry from snapshot.boardSize
```

Rollback is two-layered. `NEXT_PUBLIC_MATIMATO_BOARD_JOURNEY=false` hides the Journey UI. `MATIMATO_BOARD_JOURNEY_ENABLED=false` rejects new purchases and active-size changes and makes new solo/Blitz game creation fall back to 9x9 while preserving stored wallet/unlock data for forward recovery.

## Seasonal collection events

Seasonal events live inside the progression/profile boundary so rewards share the same XP wallet and rollback story. `GET /api/progression` returns `activeSeason`, `badgeAlbum`, and `serverNow` when events are enabled. `POST /api/progression` accepts `seasonAction` for non-match actions such as recap share and `claimSeasonReward` for idempotent claims.

Match completion, daily completion, Blitz completion, and Journey unlocks are recorded only after an authoritative server action succeeds. The season evaluator deduplicates by source, metric, and action id. Reward grants are deterministic and never use paid odds or random packs.

Rollback controls are `NEXT_PUBLIC_MATIMATO_SEASONAL_EVENTS=false` for UI and `MATIMATO_SEASONAL_EVENTS_ENABLED=false` for server evaluation. Rollback hides new progress surfaces and pauses new grants while preserving existing profile `seasonProgress` and XP data.

## Persistent rule assist

Rules help is a React/GDS overlay shared by product screens and the Phaser match host. Static topics live in `lib/game/rules-help.ts`; contextual hints are derived from public snapshot state only. The hint system can explain legal target, no-legal-cells, all-negative target, and high-value visible options, but it does not run a solver or recommend hidden future strategy.

Rollback is `NEXT_PUBLIC_MATIMATO_RULE_ASSIST=false`, which hides app-shell help buttons. The active match help button is a DOM overlay around Phaser and does not change the board renderer.

## Bot opponent profiles

Bot profiles live in `lib/game/ai.ts` and are selected through the existing game creation contract:

```ts
type BotDifficulty = 'rookie' | 'steady' | 'sharp' | 'expert';
type BotProfile = {
  profileId: string;
  difficulty: BotDifficulty;
  unlockBoardSize: 5 | 6 | 7 | 8 | 9;
  weights: { immediateScore: number; denyPlayerScore: number; trapAvoidance: number; lineControl: number; endgameMobility: number; riskTolerance: number };
};
```

The server validates profile availability against the active board size and falls back to the rookie profile when a requested profile is unavailable. AI move selection is legal-only, deterministic under snapshot/version seed, and bounded by profile decision limits. Rollback is `NEXT_PUBLIC_MATIMATO_AI_PROFILES=false`, which leaves solo mode on the rookie/default profile.

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

Progression and iOS events are allowlisted: `training_choice_shown`, `training_choice_selected`, `coach_bubble_shown`, `coach_bubble_dismissed`, `board_unlock_viewed`, `board_unlock_purchased`, `board_unlock_failed`, `board_size_selected`, `ios_runtime_detected`, `ios_offline_state_changed`, `ios_offline_retry`, `ios_offline_recovered`, and `ios_wrapper_error`. Properties are bounded to safe keys such as board size, cost, choice, step, result, error code, spendable XP bucket, runtime mode, app version, build number, network state, and service worker status.

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

- Solo and Blitz support 5x5 through 9x9 boards.
- Existing snapshots that omit `boardSize` are treated as 9x9.
- Daily and battle creation stay 9x9 for this release.
- First move can select any open tile.
- A move from an open/row target creates a column target.
- A move from a column target creates a row target.
- Positive values render green, negative values render red, and stored values remain signed.
- Phaser keeps a fixed 900x1400 world and scales cells to the active board size.

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
- `NEXT_PUBLIC_MATIMATO_TRAINING_CHOICE`
- `NEXT_PUBLIC_MATIMATO_COACH_BUBBLES`
- `NEXT_PUBLIC_MATIMATO_BOARD_JOURNEY`
- `NEXT_PUBLIC_MATIMATO_SERVICE_WORKER`
- `NEXT_PUBLIC_MATIMATO_SEASONAL_EVENTS`
- `MATIMATO_SEASONAL_EVENTS_ENABLED`
- `NEXT_PUBLIC_MATIMATO_RULE_ASSIST`
- `NEXT_PUBLIC_MATIMATO_AI_PROFILES`
- `NEXT_PUBLIC_MATIMATO_APP_VERSION`
- `NEXT_PUBLIC_MATIMATO_IOS_BUILD_NUMBER`
- `MATIMATO_BLITZ_ENABLED`
- `MATIMATO_EVENTS_ENABLED`
- `MATIMATO_BOARD_JOURNEY_ENABLED`
- `CAPACITOR_SERVER_URL`
- `CAPACITOR_BUILD_NUMBER`

## Release and rollback runbook

1. Run `npm run lint`, `npm test`, `npm run build`, `npm run verify`, and `npm audit --omit=dev`.
2. Browser-smoke first-run Learn, first-run Play-now, coach bubble dismiss, Journey insufficient-XP state, successful 6x6 purchase, board selection, solo start, and Blitz start.
3. Verify keyboard-only flow, screen-reader labels/descriptions, visible focus, disabled reasons, and reduced-motion behavior.
4. Verify mobile layouts at 320x568, 390x844, and 430x932.
5. Deploy to Vercel, check `/api/health`, and inspect deployment-window error logs.
6. Run `npm run mobile:smoke` against local production build and production alias.
7. Run `npx cap sync ios` and `npm run ios:build` on a full-Xcode machine, or record the Xcode/signing blocker.
8. If training is unsafe, set `NEXT_PUBLIC_MATIMATO_TRAINING_CHOICE=false` and/or `NEXT_PUBLIC_MATIMATO_COACH_BUBBLES=false`.
9. If board progression is unsafe, set `NEXT_PUBLIC_MATIMATO_BOARD_JOURNEY=false` and `MATIMATO_BOARD_JOURNEY_ENABLED=false`. Do not delete wallet or purchase ledger records; they are preserved for recovery.
10. If offline shell is unsafe, set `NEXT_PUBLIC_MATIMATO_SERVICE_WORKER=false`, bump the cache version after the fix, and redeploy.

## Verification

Release checks:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify`
- `npm audit --omit=dev`
- `npm run mobile:smoke`
- `npx cap sync ios`
- `npm run ios:build`
