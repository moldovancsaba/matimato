# Matimato

A fresh Next.js + Phaser + MongoDB implementation of Matimato.

## Commands

```bash
npm install
npm run dev
npm run test
npm run build
```

## Stack

- Next.js App Router
- Phaser 3 for the game board
- MongoDB Atlas for persistence
- Vitest for rules tests

## Required environment

Keep `.env` / `.env.*` local and set:

```bash
MONGODB_URI="mongodb+srv://..."
MONGODB_DB="matimato"
```

## Core guarantee

The active board is rendered only by Phaser. There is no legacy React board fallback.
