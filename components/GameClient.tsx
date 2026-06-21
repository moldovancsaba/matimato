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

export default function GameClient({ initialGameId }: { initialGameId?: string }) {
  const [mode, setMode] = useState<"pvp" | "ai">("pvp");
  const [boardSize, setBoardSize] = useState(5);
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
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
    <main className="app-stage">
      <div className={`game-shell ${game ? "is-playing" : "is-setup"}`}>
        <section className="game-panel" aria-label="Game controls">
          <Stack gap="md">
            <Group justify="space-between" align="center">
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

            {!game ? (
              <Stack gap="sm">
                <TextInput
                  label="Display name"
                  placeholder="Player"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.currentTarget.value)}
                />
                <div className="mode-grid" role="group" aria-label="Game mode">
                  <ChoiceChip label="Player to player" active={mode === "pvp"} onClick={() => setMode("pvp")} />
                  <ChoiceChip label="Solo AI" active={mode === "ai"} onClick={() => setMode("ai")} />
                </div>
                <Group gap="xs" aria-label="Board size">
                  {[4, 5, 6, 7, 8, 9].map((size) => (
                    <ChoiceChip key={size} label={`${size}x${size}`} active={boardSize === size} onClick={() => setBoardSize(size)} />
                  ))}
                </Group>
                <Button onClick={createGame} loading={api.loading}>Create game</Button>
                <TextInput label="Invite code" value={joinCode} onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase())} />
                <Button variant="secondary" onClick={() => joinGame()} disabled={!joinCode || api.loading}>Join game</Button>
              </Stack>
            ) : (
              <Stack gap="md">
                {!game.viewer && game.status === "waiting" ? (
                  <Stack gap="sm">
                    <InlineAlert
                      severity="info"
                      title="Join this table"
                      message="Enter your player name and join from this invite link."
                    />
                    <TextInput
                      label="Display name"
                      placeholder="Player 2"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.currentTarget.value)}
                    />
                    <Button onClick={() => joinGame(game.code)} loading={api.loading}>
                      Join this game
                    </Button>
                  </Stack>
                ) : null}

                <div className="score-grid">
                  {game.players.map((player) => (
                    <div className="score-card" key={player.playerId} aria-current={game.turnPlayerId === player.playerId ? "step" : undefined}>
                      <BodyText>{player.displayName}</BodyText>
                      <div className="score-value">{player.score}</div>
                      <Badge>{player.side}</Badge>
                    </div>
                  ))}
                </div>

                <InlineAlert severity={game.viewer?.canMove ? "success" : "info"} title={turnTitle(game)} message={turnMessage(game)} />

                {game.mode === "pvp" && game.status === "waiting" ? (
                  <Stack gap="xs">
                    <TextInput readOnly label="Invite code" value={game.code} />
                    <TextInput readOnly label="Invite link" value={inviteUrl} />
                    <Button variant="secondary" onClick={copyInviteLink}>
                      Copy invite link
                    </Button>
                  </Stack>
                ) : null}

                <Group gap="xs">
                  <Button variant="secondary" onClick={() => { setGame(null); window.history.replaceState(null, "", "/"); }}>
                    New game
                  </Button>
                  <Button variant="subtle" onClick={() => fetchGame(game.id)} disabled={api.loading}>
                    Refresh
                  </Button>
                </Group>
              </Stack>
            )}
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
            <Stack gap="sm">
              <PageTitle>Choose a table</PageTitle>
              <BodyText>Create a solo or player-to-player game. Positive cells build your score; negative cells take it away.</BodyText>
            </Stack>
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
