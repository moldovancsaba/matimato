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

## Operational Behavior

- `GET /api/health` reports runtime readiness without exposing secrets.
- `MONGODB_URI` enables MongoDB persistence.
- `MATIMATO_USE_MEMORY_STORE=1` enables local/dev fallback.
- Move writes use version checks and return `409 VERSION_CONFLICT` for stale clients.
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
- The mobile game view is a fixed game canvas: compact title/status HUD at the top, a direct full-width board panel in the center, and fixed bottom actions.
- The visual direction is based on the supplied references and the GDS `sunset` dark preset: soft raised Sudoku-board cells, separated onboarding/setup/game states, sunset-pulse dark surfaces, compact HUD modules, and animated screen transitions.
- Board cells render unsigned digits for visual clarity; positive and negative values are communicated through the GDS sunset color roles and accessible cell labels.
- Document scrolling is disabled for the app shell. Overflow belongs inside explicit setup/control regions only.

## Rollback

Use Vercel deployment rollback to restore a previous production deployment. MongoDB changes are additive game documents and indexes; no destructive migration is required for the current MVP.
