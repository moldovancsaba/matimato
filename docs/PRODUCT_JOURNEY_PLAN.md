# Matimato Product Journey Plan

This plan refines Matimato from MVP into a modern competitive mobile board game. The default board is always 9x9; players choose only how they want to play.

## Product Principles

- Keep the first screen playable: BATTLE, SOLO, player tag, and battle code are the only launch decisions.
- Treat the game as a session loop: start match, play, result, reward, rematch, progress.
- Make social play obvious: battle links, rival state, rematch, and leaderboards should be visible without explaining rules.
- Use GDS only for UI components and keep the sunset-pulse dark visual system.
- Preserve accessibility: every color-coded score value needs text or assistive labels.

## Journey Map

1. Launch
   Player sees Matimato, a compact animated 9x9 preview, BATTLE and SOLO modes, player tag, and battle-code join.

2. Match Setup
   BATTLE creates an inviteable match. SOLO starts against Matimato AI. No board-size selection exists.

3. In Match
   HUD shows status, turn, scores, and rival identity. The board remains the main object. Bottom controls stay icon-first.

4. Result
   Result screen shows victory, draw, or loss, score delta, best move highlight, rematch, share, and return home.

5. Progress
   Match outcome updates player profile, game history, streaks, challenge progress, and leaderboard position.

## Phase 1: Game Shell Refinement

- Replace generic setup copy with game terms: BATTLE, SOLO, player tag, battle code, start match, join battle.
- Keep 9x9 as a product rule across client, server validation, docs, analytics labels, and tests.
- Add a result screen after terminal state instead of leaving the player in the board HUD.
- Add rematch and share-result actions.
- Track analytics events for mode select, match start, match finish, rematch, and share.

## Phase 2: Player Profile

- Add anonymous profile records keyed by session, with optional display tag.
- Store created date, last active date, avatar color, total matches, wins, losses, draws, best score, current streak, and XP.
- Add profile panel with player identity, stats, rank badge, and recent form.
- Add account migration path later if real auth is introduced.

## Phase 3: Game History

- Persist completed match summaries separately from live game documents.
- Store mode, opponent label, final scores, result, moves count, duration, created date, completed date, and board seed.
- Add history screen with compact cards, filters for SOLO/BATTLE, and replay summary.
- Add privacy guard so battle history never exposes another player session credential.

## Phase 4: Leaderboards

- Add weekly, all-time, and friends-style local leaderboards.
- Ranking metrics: rating for BATTLE, best score for SOLO, weekly wins, and streak.
- Add anti-spam rules: completed matches only, minimum move count, rate-limited submissions.
- Add leaderboard states: loading, empty, player unranked, player ranked, stale sync, and retry.

## Phase 5: Gamification

- Add XP for completed matches, win bonuses, comeback bonuses, and daily first-match bonus.
- Add levels, badges, streaks, and rank tiers.
- Add daily missions: win a BATTLE, finish a SOLO, claim five shadow tiles safely, complete three matches.
- Add post-match reward animation with reduced-motion fallback.

## Phase 6: Challenges

- Add daily challenge boards with deterministic seeds.
- Add challenge result sharing with score, rank percentile, and completion time.
- Add challenge archive for previous days.
- Add operational controls to regenerate or disable a broken challenge seed.

## Phase 7: Operations And Safety

- Add indexes for profile, match summary, leaderboard windows, and challenge seeds.
- Add health checks for MongoDB collections and leaderboard freshness.
- Add data-retention policy for abandoned live games.
- Add rollback plan for each schema addition using additive collections and feature flags.
- Add automated tests for profile writes, result recording, leaderboard ranking, and challenge seed reproducibility.
