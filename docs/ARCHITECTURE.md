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

## Data Contract

Game state is canonical in server coordinates. Player `north` sees the board directly. Player `south` receives a 180-degree rotated board and submits view coordinates, which the server converts back to canonical coordinates before validation.

## Operational Behavior

- `GET /api/health` reports runtime readiness without exposing secrets.
- `MONGODB_URI` enables MongoDB persistence.
- `MATIMATO_USE_MEMORY_STORE=1` enables local/dev fallback.
- Move writes use version checks and return `409 VERSION_CONFLICT` for stale clients.

## Rollback

The legacy static files remain in the repository as a temporary fallback while the Next/Vercel path is hardened. Vercel deployment rollback can restore the previous deployment. MongoDB changes are additive game documents and indexes.
