# Project board review and manual movement / Scrum journal

Reviewed: 2026-11-15 UTC. Repository: moldovancsaba/matimato.

Canonical board: [Project 30](https://github.com/users/moldovancsaba/projects/30). **The board is the owner's source of truth and is read-only. Never create, move, remove or reorder cards or edit project fields.** This file records evidence and conditional proposals for manual owner action.

## Coverage and limits

- Read the complete issue collection: 70 results, including 66 issues and four pull requests. Seven issues are open.
- Read all 40 board items and the board field definitions. The board has 35 Done, four Backlog (SOONER) and one Roadmap (LATER) item.
- No issue-state/Done mismatch was found among linked issue cards. No exact title-and-body duplicate was found in the 66 issues.
- Open issues #69 and #70 were not present on this board. This does not authorize adding cards or establish whether another board contains them.
- Source inspected: [README](../README.md), [package manifest](../package.json), [leaderboard route](../app/api/leaderboard/route.ts), [server store](../lib/server/store.ts), [season definition](../lib/game/seasons.ts), [progression route](../app/api/progression/route.ts).
- No board/issue access error occurred for this repository. No runtime suite, live match, Atlas write, mobile simulator, signing operation or production acceptance was run. Source presence and previous Done state are not fresh acceptance evidence.
- No product code, dependency, issue closure, player data or board state was changed. The only changes are this document and its README link.

## Current open work

| Issue | Cluster / evidence-based disposition |
| --- | --- |
| [#37](https://github.com/moldovancsaba/matimato/issues/37) Ranks: Competitive tiers - weekly leaderboard filters and fair scoring | Keep open. A weekly daily leaderboard exists in lib/server/store.ts, but the general leaderboard route still exposes getLeaderboard without mode/window parameters. Rebaseline the residual fair-scoring, filters, player-rank and tiers requirements; do not treat the daily feature as full completion. |
| [#43](https://github.com/moldovancsaba/matimato/issues/43) Maintenance: Major dependency compatibility lane - Next 16 Phaser 4 TypeScript 6 | Keep the compatibility lane open. Current package.json still uses Next 15, Phaser 3 and TypeScript 5. Historical outdated/audit output is not a current vulnerability assessment. Refresh official compatibility and security evidence before any upgrade; no dependency was changed. |
| [#62](https://github.com/moldovancsaba/matimato/issues/62) TestFlight upload blocked by Apple signing prerequisites | Retain the recorded Apple signing/Xcode prerequisites as an external blocker. This Linux review cannot prove TestFlight upload readiness; no signing credentials or Apple submission were accessed. |
| [#66](https://github.com/moldovancsaba/matimato/issues/66) Competition: Arena tournaments - scheduled tables and ranked event flow | Retain pending ranked-event work; acceptance depends on the #37 rank contract and tournament entry, scoring, permissions, cancellation and recovery evidence. |
| [#68](https://github.com/moldovancsaba/matimato/issues/68) LiveOps: Season calendar configuration - safe event rollout and recovery controls | Retain the calendar work. lib/game/seasons.ts still defines DEFAULT_SEASON and returns that static definition; a configurable event calendar is not established by existing seasonal progress. |
| [#69](https://github.com/moldovancsaba/matimato/issues/69) Async Play: Friend challenge queue - turn-based resume and nudge contracts | Retain async challenge outcome. Existing battle/solo/daily/blitz and lobby state are not proof of a pending-turn queue or nudge contract. This issue is absent from this board snapshot; record that fact, do not add a card. |
| [#70](https://github.com/moldovancsaba/matimato/issues/70) Integrity: Fair-play event ledger - rank tournament and gift abuse controls | Retain fair-play ledger and reconciliation requirements. Existing idempotent gifts or daily results do not prove a unified integrity boundary. This issue is absent from this board snapshot; record that fact, do not add a card. |

Technology changes are not a reason to discard the product goals. The current Phaser renderer, deterministic rules, MongoDB persistence and Capacitor wrapper remain the inspected implementation. #43 already owns compatibility upgrades; assess its major-version clusters separately rather than starting another rewrite. No new technology was selected or installed in this review.

## Per-card movement register

All destinations below are **remain / no move proposed**: the verified board has no issue-state mismatch, and open items still need their own acceptance evidence. “Not on this board” is a recorded membership observation, never an instruction to create a card. Historical Done rows remain historical.

| Issue / card | Issue state | Observed board column | Proposed destination | Reason / next condition | Owner decision / manual execution |
| --- | --- | --- | --- | --- | --- |
| [#29](https://github.com/moldovancsaba/matimato/issues/29) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#30](https://github.com/moldovancsaba/matimato/issues/30) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#31](https://github.com/moldovancsaba/matimato/issues/31) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#32](https://github.com/moldovancsaba/matimato/issues/32) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#33](https://github.com/moldovancsaba/matimato/issues/33) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#34](https://github.com/moldovancsaba/matimato/issues/34) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#35](https://github.com/moldovancsaba/matimato/issues/35) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#36](https://github.com/moldovancsaba/matimato/issues/36) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#37](https://github.com/moldovancsaba/matimato/issues/37) | open | Backlog (SOONER) | Remain | Keep open. A weekly daily leaderboard exists in lib/server/store.ts, but the general leaderboard route still exposes getLeaderboard without mode/window parameters. Rebaseline the residual fair-scoring, filters, player-rank and tiers requirements; do not treat the daily feature as full completion. | Pending / not executed |
| [#38](https://github.com/moldovancsaba/matimato/issues/38) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#39](https://github.com/moldovancsaba/matimato/issues/39) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#41](https://github.com/moldovancsaba/matimato/issues/41) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#42](https://github.com/moldovancsaba/matimato/issues/42) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#40](https://github.com/moldovancsaba/matimato/issues/40) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#43](https://github.com/moldovancsaba/matimato/issues/43) | open | Backlog (SOONER) | Remain | Keep the compatibility lane open. Current package.json still uses Next 15, Phaser 3 and TypeScript 5. Historical outdated/audit output is not a current vulnerability assessment. Refresh official compatibility and security evidence before any upgrade; no dependency was changed. | Pending / not executed |
| [#44](https://github.com/moldovancsaba/matimato/issues/44) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#45](https://github.com/moldovancsaba/matimato/issues/45) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#46](https://github.com/moldovancsaba/matimato/issues/46) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#47](https://github.com/moldovancsaba/matimato/issues/47) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#48](https://github.com/moldovancsaba/matimato/issues/48) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#49](https://github.com/moldovancsaba/matimato/issues/49) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#50](https://github.com/moldovancsaba/matimato/issues/50) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#51](https://github.com/moldovancsaba/matimato/issues/51) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#52](https://github.com/moldovancsaba/matimato/issues/52) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#53](https://github.com/moldovancsaba/matimato/issues/53) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#54](https://github.com/moldovancsaba/matimato/issues/54) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#55](https://github.com/moldovancsaba/matimato/issues/55) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#56](https://github.com/moldovancsaba/matimato/issues/56) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#57](https://github.com/moldovancsaba/matimato/issues/57) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#58](https://github.com/moldovancsaba/matimato/issues/58) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#59](https://github.com/moldovancsaba/matimato/issues/59) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#60](https://github.com/moldovancsaba/matimato/issues/60) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#61](https://github.com/moldovancsaba/matimato/issues/61) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#62](https://github.com/moldovancsaba/matimato/issues/62) | open | Roadmap (LATER) | Remain | Retain the recorded Apple signing/Xcode prerequisites as an external blocker. This Linux review cannot prove TestFlight upload readiness; no signing credentials or Apple submission were accessed. | Pending / not executed |
| [#63](https://github.com/moldovancsaba/matimato/issues/63) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#64](https://github.com/moldovancsaba/matimato/issues/64) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#65](https://github.com/moldovancsaba/matimato/issues/65) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#66](https://github.com/moldovancsaba/matimato/issues/66) | open | Backlog (SOONER) | Remain | Retain pending ranked-event work; acceptance depends on the #37 rank contract and tournament entry, scoring, permissions, cancellation and recovery evidence. | Pending / not executed |
| [#67](https://github.com/moldovancsaba/matimato/issues/67) | closed | Done | Remain | Preserve recorded closure and board history; no fresh completion claim. | Pending / not executed |
| [#68](https://github.com/moldovancsaba/matimato/issues/68) | open | Backlog (SOONER) | Remain | Retain the calendar work. lib/game/seasons.ts still defines DEFAULT_SEASON and returns that static definition; a configurable event calendar is not established by existing seasonal progress. | Pending / not executed |
| [#70](https://github.com/moldovancsaba/matimato/issues/70) | open | Not on this board | No card change | Retain fair-play ledger and reconciliation requirements. Existing idempotent gifts or daily results do not prove a unified integrity boundary. This issue is absent from this board snapshot; record that fact, do not add a card. | Pending / not executed |
| [#69](https://github.com/moldovancsaba/matimato/issues/69) | open | Not on this board | No card change | Retain async challenge outcome. Existing battle/solo/daily/blitz and lobby state are not proof of a pending-turn queue or nudge contract. This issue is absent from this board snapshot; record that fact, do not add a card. | Pending / not executed |

## Append-only Scrum / manual movement notes

| Date / Scrum reference | Issue / board item | Verified current column | Proposed destination | Acceptance evidence | Blocker / condition | Owner decision | Manual execution / person | Verified new column | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD / meeting link | Issue URL | Exact observed value | Exact proposed value or remain | Evidence link | Dependency or none | Pending | Not executed | Not verified | — |

Read issue and board again before writing a new observation. Preserve prior rows when plans change. Only record a move as executed after the owner has performed it and its result has been read back. Rollback of this review is a documentation revert; product and board state need no rollback.
