# Matimato Architecture

Matimato is now a Vercel-ready Next.js App Router application with MongoDB as the production state store and an in-memory development fallback.

## Runtime Flow

```text
Browser
  -> Next.js page / API route
  -> anonymous player session cookie
  -> game service
  -> pure game engine
  -> MongoDB or memory store
  -> perspective-safe public DTO
```

## Ownership Boundaries

- `app/`: routes, layout, and API handlers.
- `components/`: GDS-only client UI.
- `lib/game/`: deterministic rules, signed board generation, perspective transforms, and DTO conversion.
- `lib/server/`: session, persistence, HTTP errors, and service orchestration.
- `scripts/gds-check.mjs`: local GDS adoption guard.
- `next.config.ts`: security headers, CSP, and API cache-control headers.
- `app/manifest.ts` and `public/icon.svg`: installable app metadata.

## Data Contract

Game state is canonical in server coordinates. Player `north` sees the board directly. Player `south` receives a 180-degree rotated board and submits view coordinates, which the server converts back to canonical coordinates before validation.

Matimato is productized as a fixed 9x9 game. The client no longer exposes board-size selection, and the create-game API only accepts or defaults to `boardSize: 9`.

Completed games write an immutable `match_summaries` record keyed by `gameId`. Summaries store mode, fixed board size, public participants, final scores, winner/draw state, terminal reason, move count, duration, completion timestamp, and a SHA-256 board/move hash. Summary records intentionally exclude cookies, session tokens, raw credentials, and private transport details.

Anonymous profiles are stored separately from game credentials. The `matimato_profile` cookie contains a profile ID and random token, while the profile document stores only the token hash, public player card fields, aggregate stats, XP, level, and applied summary IDs for idempotency.

Game history is a public projection of `match_summaries` for the current anonymous profile. `GET /api/history` filters by current profile ID, optional SOLO/BATTLE mode, cursor, and limit, then returns result cards without opponent private profile metadata or session credentials.

Leaderboards are deterministic projections over completed `match_summaries`. Weekly boards use UTC Monday rollover. BATTLE ranking uses `wins * 100 + draws * 25 - losses * 20`; SOLO ranking uses best score with faster duration as tie-breaker. Only summaries with at least one move are counted.

## Operational Behavior

- `GET /api/health` reports runtime readiness without exposing secrets.
- `MONGODB_URI` enables MongoDB persistence.
- `MATIMATO_USE_MEMORY_STORE=1` enables local/dev fallback.
- Move writes use version checks and return `409 VERSION_CONFLICT` for stale clients.
- Waiting BATTLE lobbies can be abandoned through the credential-protected forfeit route; this closes the invite without creating a one-player victory.
- Finished games retry an idempotent `match_summaries` upsert from terminal move, forfeit, and terminal read flows. Summary write failures are sanitized in server logs and do not block returning the result screen.
- Profile stats update from match summaries after successful summary upsert. Replays are safe because each profile stores applied `gameId` values and ignores duplicates.
- API responses are `no-store` to avoid stale board/session state in browsers or PWA surfaces.
- Server logs sanitize upstream messages before writing runtime diagnostics.
- Rate limits protect create, join, move, and forfeit routes from simple abuse.
- The client polls only while visible and disables moves during reconnect failures.

## Security Contract

- Player authentication is anonymous and game-scoped.
- The cookie is HTTP-only, same-site, secure in production, bounded in size, shape-validated, and keyed by game ID to avoid cross-game credential overwrite.
- Raw MongoDB/auth/network errors are never sent to the browser.
- Public errors include stable codes and request IDs for support without leaking secrets.
- CSP allows only the app itself plus Google Analytics endpoints needed by the configured tag.
- Frame embedding is denied and browser permissions are restricted by default.

## PWA and Mobile Contract

- The app exposes installable metadata through `app/manifest.ts`.
- It intentionally does not register a service worker because game state is realtime and session-bound.
- `PwaGuard` unregisters old service workers and deletes old Matimato caches when present.
- The client resolves explicit screen states: `home`, `setup`, `battleLobby`, `match`, `result`, `challenges`, `leaderboard`, `history`, and `profile`.
- App destinations are typed as `home`, `battle`, `challenges`, `leaderboard`, `history`, and `profile`; `battle` maps to the setup screen until a game exists.
- The mobile game view is a fixed game canvas: compact title/status HUD at the top, a direct full-width board panel in the center, and fixed bottom actions.
- Lobby and result flows render as standalone screens without the board. The active match screen renders the HUD, board, and gameplay actions only.
- Result view state is derived from the public game DTO and exposes outcome copy, final scores, rematch setup, home navigation, share text, and match-finished analytics without adding persistence.
- Bottom navigation renders only outside the active match screen and reserves safe-area space so it does not cover setup, lobby, result, profile, history, leaderboard, or challenge screens. Match keeps its gameplay action dock only.
- Invite, copied-link feedback, reconnect warnings, stale move errors, profile, history, leaderboard, and challenge flows must be separate screens or non-layout-shifting overlays; they must not stack above the active board.
- Runtime feedback uses a capped local toast layer with a polite live region. Toasts are mounted outside the game shell and auto-dismiss so feedback never changes board dimensions.
- The visual direction is based on the supplied references and the GDS `sunset` dark preset: soft raised Sudoku-board cells, separated onboarding/setup/game states, sunset-pulse dark surfaces, compact HUD modules, and animated screen transitions.
- Board cells render unsigned digits for visual clarity; positive and negative values are communicated through the GDS sunset color roles and accessible cell labels.
- Document scrolling is disabled for the app shell. Overflow belongs inside explicit setup/control regions only.

## Rollback

Use Vercel deployment rollback to restore a previous production deployment. MongoDB changes are additive game documents and indexes; no destructive migration is required for the current MVP.
