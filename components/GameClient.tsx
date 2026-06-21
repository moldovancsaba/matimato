"use client";

import {
  Badge,
  BodyText,
  Button,
  ChoiceChip,
  Group,
  InlineAlert,
  PageTitle,
  Stack,
  StatusBadge,
  TextInput,
  VisuallyHidden
} from "@doneisbetter/gds/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicGameDto } from "@/lib/game/types";
import { trackEvent } from "@/lib/client/analytics";

type ApiState = {
  loading: boolean;
  error?: string;
};

type ScreenState = "welcome" | "setup";

export default function GameClient({ initialGameId }: { initialGameId?: string }) {
  const [mode, setMode] = useState<"pvp" | "ai">("pvp");
  const [boardSize, setBoardSize] = useState(5);
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [screen, setScreen] = useState<ScreenState>(initialGameId ? "setup" : "welcome");
  const [game, setGame] = useState<PublicGameDto | null>(null);
  const [api, setApi] = useState<ApiState>({ loading: false });
  const [syncFailures, setSyncFailures] = useState(0);
  const [notice, setNotice] = useState<string | undefined>();

  const fetchGame = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setApi({ loading: true });
    const response = await fetch(`/api/games/${id}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? "Could not load game.");
    setGame(payload.game);
    setApi({ loading: false });
    setSyncFailures(0);
  }, []);

  useEffect(() => {
    if (initialGameId) {
      fetchGame(initialGameId).catch((error) => setApi({ loading: false, error: error.message }));
    }
  }, [fetchGame, initialGameId]);

  useEffect(() => {
    if (!game || game.status === "finished" || game.status === "expired") return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchGame(game.id, true).catch(() => setSyncFailures((value) => value + 1));
    }, 2200);
    return () => window.clearInterval(interval);
  }, [fetchGame, game]);

  async function createGame() {
    setApi({ loading: true });
    setNotice(undefined);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, boardSize, displayName: displayName.trim() || undefined, difficulty: "standard" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not create game.");
      setGame(payload.game);
      trackEvent({ action: "create_game", category: "game", label: mode, value: boardSize });
      window.history.replaceState(null, "", `/play/${payload.game.id}`);
      setApi({ loading: false });
    } catch (error) {
      setApi({ loading: false, error: error instanceof Error ? error.message : "Could not create game." });
    }
  }

  async function joinGame(code = joinCode) {
    setApi({ loading: true });
    setNotice(undefined);
    try {
      const response = await fetch("/api/games/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, displayName: displayName.trim() || undefined })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not join game.");
      setGame(payload.game);
      trackEvent({ action: "join_game", category: "game", label: "pvp" });
      window.history.replaceState(null, "", `/play/${payload.game.id}`);
      setApi({ loading: false });
    } catch (error) {
      setApi({ loading: false, error: error instanceof Error ? error.message : "Could not join game." });
    }
  }

  async function submitMove(viewRow: number, viewCol: number) {
    if (!game?.viewer?.canMove) return;
    setApi({ loading: true });
    setNotice(undefined);
    try {
      const response = await fetch(`/api/games/${game.id}/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewRow, viewCol, version: game.version })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Move failed.");
      setGame(payload.game);
      trackEvent({ action: "submit_move", category: "game", label: game.mode, value: game.boardSize });
      setApi({ loading: false });
    } catch (error) {
      await fetchGame(game.id, true).catch(() => undefined);
      setApi({ loading: false, error: error instanceof Error ? error.message : "Move failed." });
    }
  }

  const legalKey = useMemo(() => new Set(game?.legalCellsView.map((cell) => `${cell.viewRow}:${cell.viewCol}`) ?? []), [game]);
  const inviteUrl = game && typeof window !== "undefined" ? `${window.location.origin}/play/${game.id}` : "";
  const surfaceState = game ? "game" : screen;

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard?.writeText(inviteUrl);
      setNotice("Invite link copied.");
      trackEvent({ action: "copy_invite_link", category: "sharing", label: game?.mode });
    } catch {
      setNotice("Copy failed. Select and copy the invite link manually.");
    }
  }

  return (
    <main className={`app-stage screen-${surfaceState}`}>
      <div className={`game-shell ${game ? "is-playing" : "is-setup"}`}>
        <section className="game-panel" aria-label="Game controls">
          <Stack gap="sm">
            <Group className="game-header" justify="space-between" align="center">
              <Group gap="sm">
                <div className="brand-mark" aria-hidden="true">M</div>
                <div>
                  <PageTitle>Matimato</PageTitle>
                  <BodyText>Signed strategy table</BodyText>
                </div>
              </Group>
              <StatusBadge status={game?.status === "active" ? "success" : game?.status === "finished" ? "neutral" : "warning"}>
                {game?.status ?? "ready"}
              </StatusBadge>
            </Group>

            {api.error ? (
              <InlineAlert severity="error" title="Action failed" message={api.error} />
            ) : null}

            {syncFailures > 0 ? (
              <InlineAlert
                severity="warning"
                title="Reconnecting"
                message="Live updates are retrying. Moves are disabled until the next successful sync."
              />
            ) : null}

            {notice ? (
              <InlineAlert severity="success" title="Notice" message={notice} />
            ) : null}

            {!game && screen === "welcome" ? (
              <div className="welcome-screen">
                <div className="hero-kicker">Signed number tactics</div>
                <h1>Make every column count.</h1>
                <p>
                  A compact board game with positive rewards, negative traps, and player-to-player tables.
                </p>
                <div className="hero-actions">
                  <Button onClick={() => setScreen("setup")}>Get started</Button>
                  <Button variant="subtle" onClick={() => setScreen("setup")}>Join table</Button>
                </div>
              </div>
            ) : null}

            {!game && screen === "setup" ? (
              <Stack gap="sm">
                <div className="setup-title">
                  <h2>Choose table</h2>
                  <p>Setup stays here. The game screen stays focused.</p>
                </div>
                <TextInput
                  label="Display name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.currentTarget.value)}
                />
                <div className="mode-grid" role="group" aria-label="Game mode">
                  <ChoiceChip label="Player to player" active={mode === "pvp"} onClick={() => setMode("pvp")} />
                  <ChoiceChip label="Solo AI" active={mode === "ai"} onClick={() => setMode("ai")} />
                </div>
                <Group className="size-row" gap="xs" aria-label="Board size">
                  {[4, 5, 6, 7, 8, 9].map((size) => (
                    <ChoiceChip key={size} label={`${size}x${size}`} active={boardSize === size} onClick={() => setBoardSize(size)} />
                  ))}
                </Group>
                <Button onClick={createGame} loading={api.loading}>Create game</Button>
                <TextInput label="Invite code" value={joinCode} onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase())} />
                <Button variant="secondary" onClick={() => joinGame()} disabled={!joinCode || api.loading}>Join game</Button>
              </Stack>
            ) : null}

            {game ? (
              <div className="play-controls">
                <div className="play-hud" aria-live="polite">
                  <div className="turn-strip" data-active={game.viewer?.canMove ? "true" : "false"} role="status">
                    <strong>{turnTitle(game)}</strong>
                    <span>{turnMessage(game)}</span>
                  </div>
                  <div className="score-grid" aria-label="Score board">
                    {game.players.map((player) => (
                      <div className="score-card" key={player.playerId} aria-current={game.turnPlayerId === player.playerId ? "step" : undefined}>
                        <BodyText>{player.displayName}</BodyText>
                        <div className="score-meta">
                          <span className="score-value">{player.score}</span>
                          <Badge>{player.side}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {!game.viewer && game.status === "waiting" ? (
                  <Stack gap="sm">
                    <InlineAlert
                      severity="info"
                      title="Join this table"
                      message="Enter your player name and join from this invite link."
                    />
                    <TextInput
                      label="Display name"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.currentTarget.value)}
                    />
                    <Button onClick={() => joinGame(game.code)} loading={api.loading}>
                      Join this game
                    </Button>
                  </Stack>
                ) : null}

                {game.mode === "pvp" && game.status === "waiting" ? (
                  <Stack gap="xs">
                    <TextInput readOnly label="Invite code" value={game.code} />
                    <TextInput readOnly label="Invite link" value={inviteUrl} />
                    <Button variant="secondary" onClick={copyInviteLink}>
                      Copy invite link
                    </Button>
                  </Stack>
                ) : null}

                <Group className="action-dock" gap="xs">
                  <Button
                    aria-label="Start new game"
                    variant="secondary"
                    onClick={() => {
                      setGame(null);
                      window.history.replaceState(null, "", "/");
                    }}
                  >
                    <span aria-hidden="true">＋</span>
                    <span className="dock-label">New</span>
                    <VisuallyHidden>Start new game</VisuallyHidden>
                  </Button>
                  <Button aria-label="Refresh game" variant="subtle" onClick={() => fetchGame(game.id)} disabled={api.loading}>
                    <span aria-hidden="true">⟳</span>
                    <span className="dock-label">Refresh</span>
                    <VisuallyHidden>Refresh game</VisuallyHidden>
                  </Button>
                </Group>
              </div>
            ) : null}
          </Stack>
        </section>

        <section className="board-panel" aria-label="Matimato board">
          {game ? (
            <Stack gap="md">
              <VisuallyHidden aria-live="polite">
                {turnTitle(game)}. {turnMessage(game)}
              </VisuallyHidden>
              <div
                className="board-grid"
                style={{ gridTemplateColumns: `repeat(${game.boardSize}, minmax(0, 1fr))` }}
                role="grid"
                aria-label={`Matimato ${game.boardSize} by ${game.boardSize} board`}
              >
                {game.boardView.map((row, rowIndex) =>
                  row.map((value, colIndex) => {
                    const key = `${rowIndex}:${colIndex}`;
                    const legal = legalKey.has(key);
                    const last = game.lastMoveView?.viewRow === rowIndex && game.lastMoveView?.viewCol === colIndex;
                    const claimed = value === null;
                    return (
                      <button
                        key={key}
                        className="cell-button"
                        role="gridcell"
                        type="button"
                        data-legal={legal}
                        data-claimed={claimed}
                        data-last={last}
                        data-sign={value === null ? "claimed" : value > 0 ? "positive" : "negative"}
                        disabled={!game.viewer?.canMove || !legal || claimed || api.loading || syncFailures > 0}
                        aria-label={cellLabel(value, rowIndex, colIndex, legal, last)}
                        onClick={() => submitMove(rowIndex, colIndex)}
                      >
                        {value === null ? "x" : value > 0 ? `+${value}` : value}
                      </button>
                    );
                  })
                )}
              </div>
            </Stack>
          ) : (
            <div className="preview-board" aria-hidden="true">
              {[8, -2, 4, -7, 1, 3, -5, 9, 6, -1, 7, 2, -8, 5, 4, -3, 8, 1, -6, 9, 2, -4, 7, 3, -9].map((value, index) => (
                <span key={index} data-sign={value > 0 ? "positive" : "negative"}>{value > 0 ? `+${value}` : value}</span>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function turnTitle(game: PublicGameDto) {
  if (game.status === "waiting") return "Waiting for opponent";
  if (game.status === "finished") {
    if (game.terminal?.draw) return "Draw";
    return game.winnerPlayerId === game.viewer?.playerId ? "You won" : "Game finished";
  }
  if (game.viewer?.canMove) return "Your turn";
  return `${game.turnDisplayName ?? "Opponent"} to move`;
}

function turnMessage(game: PublicGameDto) {
  if (game.status === "waiting") return `Share code ${game.code} with another player.`;
  if (game.status === "finished") return "Start a new game when you are ready.";
  if (!game.constraintView) return "Select any open cell.";
  return `Select from ${game.constraintView.axis} ${game.constraintView.index + 1}.`;
}

function cellLabel(value: number | null, row: number, col: number, legal: boolean, last: boolean) {
  const state = value === null ? "claimed" : `${value > 0 ? "positive" : "negative"} ${Math.abs(value)}`;
  return `Row ${row + 1}, column ${col + 1}, ${state}${legal ? ", legal move" : ""}${last ? ", last move" : ""}`;
}
