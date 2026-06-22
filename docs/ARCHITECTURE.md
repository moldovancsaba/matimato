# Matimato Architecture

Matimato has been rebuilt from zero.

## Runtime split

- Next.js owns routing, PWA metadata, product screens, and API routes.
- Phaser owns the active game board, tiles, blob, input lock, animation order, and result overlay.
- MongoDB owns games, profiles, history, and leaderboard data.

## No legacy surface

There is no React/SVG/CSS board implementation in this baseline. React mounts Phaser and listens for high-level events only.

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
