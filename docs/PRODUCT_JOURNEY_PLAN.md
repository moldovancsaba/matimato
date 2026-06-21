# Matimato Product Journey Plan

This plan refines Matimato from MVP into a modern competitive mobile board game. The default board is always 9x9; players choose only how they want to play.

## Product Principles

- Keep the first screen playable: BATTLE, SOLO, player tag, and battle code are the only launch decisions.
- Treat the game as a session loop: start match, play, result, reward, rematch, progress.
- Make social play obvious: battle links, rival state, rematch, and leaderboards should be visible without explaining rules.
- Never stack unrelated tasks on the active board. Lobby, invite, match, result, profile, history, leaderboard, and challenges are separate screens.
- Copy feedback must be immediate and visible without pushing the board: use a toast/status layer with haptic-safe timing and an accessible live region.
- Use GDS only for UI components and keep the sunset-pulse dark visual system.
- Preserve accessibility: every color-coded score value needs text or assistive labels.

## Journey Map

1. Launch
   Player sees Matimato, a compact animated 9x9 preview, BATTLE and SOLO modes, player tag, and battle-code join.

2. Match Setup
   BATTLE creates a lobby. SOLO starts directly against Matimato AI. No board-size selection exists.

3. Battle Lobby
   The host sees battle code, copy link, waiting state, cancel, and share. The board is not visible on this screen.

4. In Match
   HUD shows status, turn, scores, and rival identity. The board remains the main object. Bottom controls stay icon-first.

5. Result
   Result screen shows victory, draw, or loss, score delta, best move highlight, rematch, share, and return home.

6. Progress
   Match outcome updates player profile, game history, streaks, challenge progress, and leaderboard position.

## Screen Architecture

The app moves through explicit screen states instead of rendering everything above the same board: `home`, `setup`, `battleLobby`, `match`, and `result`. This prevents the lobby, invite form, notices, and active match HUD from pushing the board around.

### Home Screen

- Purpose: choose a play path.
- UI: Matimato title, animated 9x9 preview, player tag field, BATTLE button, SOLO button, join battle code field, bottom nav shortcut icons.
- Primary actions: start BATTLE lobby, start SOLO match, join battle.
- Empty states: player tag can default to generated guest tag, but the field should never look prefilled with uneditable copy.
- Accessibility: BATTLE/SOLO are toggle-like game style buttons with visible selected state and `aria-pressed`.

### Battle Lobby Screen

- Purpose: wait for the rival without showing the active board.
- UI: title, host tag, battle code, copy link button, copied toast, waiting animation, cancel match.
- Copy feedback: show non-layout-shifting toast such as "Battle link copied" for 2 seconds; keep screen-reader live region text.
- Error states: clipboard blocked, code expired, rival already joined, network retry.
- Operational behavior: lobby polls game status; when rival joins, transition to Match Screen.
- Current implementation: lobby is now a standalone screen and never renders the board while waiting. Copy success/failure feedback uses a non-layout-shifting toast layer. Host leave/cancel is server-backed and abandons the waiting invite safely.

### Match Screen

- Purpose: play the game.
- UI: compact title/status HUD, score row, turn strip, centered 9x9 board, icon bottom dock.
- Rules: no invite inputs, no setup fields, no large notices, no history cards on this screen.
- Feedback: moves animate on the selected tile; invalid/stale move feedback appears as a toast that does not resize the board.
- Accessibility: turn state uses polite live region; legal cells have descriptive labels; color-only polarity has accessible text in labels.
- Current implementation: active matches render only HUD, board, and gameplay actions. Reconnect and stale move feedback appears in the toast layer instead of inline panels.

### Result Screen

- Purpose: close the loop after a match.
- UI: victory/draw/loss state, final scores, XP, streak, rank delta, rematch, share result, home.
- Recovery: if result write fails, show saved-later state and retry in the background.
- Analytics: match finished, rematch tapped, result shared.
- Current implementation: terminal games resolve to a dedicated result screen with outcome, final scores, run-it-back, home, and share-result actions. Sharing uses native share when available and clipboard fallback otherwise.

### Profile Screen

- Purpose: give the player identity and progress.
- UI: avatar mark, player tag, rank, XP, level, streak, total matches, win rate, best score.
- Data: anonymous profile first, upgradeable to real account later.
- Edge cases: no history, renamed tag, stale profile sync.

### History Screen

- Purpose: review previous matches.
- UI: recent matches, SOLO/BATTLE filters, result badges, rival name, score, date, duration.
- Detail: optional match summary with final board and key moves.
- Privacy: never expose opponent session identifiers or cookies.

### Leaderboard Screen

- Purpose: compare progress.
- UI: weekly, all-time, and SOLO/BATTLE tabs; current player pinned near top or bottom.
- Ranking: BATTLE rating, SOLO best score, weekly wins, streak.
- Integrity: completed matches only; minimum-move rules; rate-limited writes.

### Challenges Screen

- Purpose: create daily return loops.
- UI: daily challenge, challenge streak, reward, archive, share score.
- Data: deterministic 9x9 board seed per day.
- Recovery: feature flag to disable or replace a broken daily seed.

### Bottom Navigation

- Home
- Battle
- Challenges
- Leaderboard
- Profile

Bottom navigation is visible on non-match screens. Match screen keeps only gameplay actions to avoid accidental navigation during a move.

## Phase 1: Game Shell Refinement

- Replace generic setup copy with game terms: BATTLE, SOLO, player tag, battle code, start match, join battle.
- Keep 9x9 as a product rule across client, server validation, docs, analytics labels, and tests.
- Split Battle Lobby from Match Screen so invite code and invite link never render above the board.
- Replace inline copy notice panels with toast feedback that overlays without layout shift.
- Add a result screen after terminal state instead of leaving the player in the board HUD.
- Add rematch and share-result actions.
- Track analytics events for mode select, match start, match finish, rematch, and share.

Acceptance criteria:

- Copying a battle link shows "Battle link copied" without moving the board.
- Waiting for rival never shows the active board.
- Active match screen has no input fields.
- Board dimensions do not change when notices, errors, or copied states appear.

## Phase 2: Player Profile

- Add anonymous profile records keyed by session, with optional display tag.
- Store created date, last active date, avatar color, total matches, wins, losses, draws, best score, current streak, and XP.
- Add profile panel with player identity, stats, rank badge, and recent form.
- Add account migration path later if real auth is introduced.

Data contract:

- `profiles`: profile ID, display tag, avatar color, created date, last active date, XP, level, streak, aggregate stats.
- `profile_sessions`: anonymous session to profile mapping with rotation-safe metadata.

Acceptance criteria:

- A first-time player gets a profile automatically.
- Profile stats update after completed SOLO and BATTLE matches.
- Profile screen works offline from cached last-known public stats without exposing secrets.

## Phase 3: Game History

- Persist completed match summaries separately from live game documents.
- Store mode, opponent label, final scores, result, moves count, duration, created date, completed date, and board seed.
- Add history screen with compact cards, filters for SOLO/BATTLE, and replay summary.
- Add privacy guard so battle history never exposes another player session credential.

Data contract:

- `match_summaries`: match ID, profile IDs, public names, mode, final scores, result, moves count, duration, board seed, completed date.

Acceptance criteria:

- Every terminal match writes exactly one summary.
- History can be loaded by profile ID with pagination.
- Failed summary writes retry without blocking the result screen.

## Phase 4: Leaderboards

- Add weekly, all-time, and friends-style local leaderboards.
- Ranking metrics: rating for BATTLE, best score for SOLO, weekly wins, and streak.
- Add anti-spam rules: completed matches only, minimum move count, rate-limited submissions.
- Add leaderboard states: loading, empty, player unranked, player ranked, stale sync, and retry.

Data contract:

- `leaderboard_entries`: period, mode, profile ID, display tag, score metric, rank value, updated date.

Acceptance criteria:

- Weekly leaderboard rolls over predictably.
- Current player is visible even outside the top ranks.
- Leaderboard write failures are observable and retryable.

## Phase 5: Gamification

- Add XP for completed matches, win bonuses, comeback bonuses, and daily first-match bonus.
- Add levels, badges, streaks, and rank tiers.
- Add daily missions: win a BATTLE, finish a SOLO, claim five shadow tiles safely, complete three matches.
- Add post-match reward animation with reduced-motion fallback.

Data contract:

- `mission_progress`: profile ID, mission ID, period, progress, completed date, claimed date.
- `badges`: badge ID, profile ID, awarded date, source match or challenge ID.

Acceptance criteria:

- Rewards are deterministic and idempotent.
- Reduced-motion users receive static reward states.
- Mission progress updates after match completion, not during every move.

## Phase 6: Challenges

- Add daily challenge boards with deterministic seeds.
- Add challenge result sharing with score, rank percentile, and completion time.
- Add challenge archive for previous days.
- Add operational controls to regenerate or disable a broken challenge seed.

Data contract:

- `daily_challenges`: challenge date, seed, board hash, status, created date.
- `challenge_attempts`: challenge ID, profile ID, score, duration, completed date, share token.

Acceptance criteria:

- All players receive the same daily board.
- Challenge attempts are ranked separately from normal SOLO matches.
- Disabled challenge seeds stop new attempts without breaking history.

## Phase 7: Operations And Safety

- Add indexes for profile, match summary, leaderboard windows, and challenge seeds.
- Add health checks for MongoDB collections and leaderboard freshness.
- Add data-retention policy for abandoned live games.
- Add rollback plan for each schema addition using additive collections and feature flags.
- Add automated tests for profile writes, result recording, leaderboard ranking, and challenge seed reproducibility.

## Implementation Order

1. Screen state refactor: Home, Battle Lobby, Match, Result.
2. Toast/live-region notification layer for copy, errors, reconnect, and stale move feedback.
3. Result recording and match summary collection.
4. Anonymous profile collection and profile screen.
5. History screen backed by match summaries.
6. Leaderboard aggregation and leaderboard screen.
7. XP, levels, streaks, badges, and mission progress.
8. Daily challenges and challenge ranking.
9. Bottom navigation and screen transition polish.
10. Observability, rate limits, indexes, and rollback toggles for each new collection.
