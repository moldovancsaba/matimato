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
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveScreen, type GameScreen, type SetupScreen } from "@/lib/game/screen-state";
import type { PublicGameDto } from "@/lib/game/types";
import { trackEvent } from "@/lib/client/analytics";

type ApiState = {
  loading: boolean;
  error?: string;
};

const BOARD_SIZE = 9;

export default function GameClient({ initialGameId }: { initialGameId?: string }) {
  const [mode, setMode] = useState<"pvp" | "ai">("pvp");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [screen, setScreen] = useState<SetupScreen>(initialGameId ? "setup" : "home");
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
        body: JSON.stringify({ mode, boardSize: BOARD_SIZE, displayName: displayName.trim() || undefined, difficulty: "standard" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not create game.");
      setGame(payload.game);
      trackEvent({ action: "create_game", category: "game", label: mode, value: BOARD_SIZE });
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
  const currentScreen = resolveScreen(game, screen);

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
    <main className={`app-stage screen-${currentScreen}`}>
      <div className={`game-shell ${game ? "is-playing" : "is-setup"}`}>
        <section className="game-panel" aria-label="Game controls">
          <Stack gap="sm">
            <Group className="game-header" justify="space-between" align="center">
              <Group gap="sm">
                <div className="brand-mark" aria-hidden="true">M</div>
                <div>
                  <PageTitle>Matimato</PageTitle>
                  <BodyText>Number duel arena</BodyText>
                </div>
              </Group>
              <StatusBadge status={game?.status === "active" ? "success" : game?.status === "finished" ? "neutral" : "warning"}>
                {game?.status ?? "ready"}
              </StatusBadge>
            </Group>

            <VisuallyHidden aria-live="polite">
              {screenAnnouncement(currentScreen, game)}
            </VisuallyHidden>

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

            {currentScreen === "home" ? (
              <div className="welcome-screen">
                <div className="hero-kicker">9x9 score chase</div>
                <h1>Own the grid.</h1>
                <p>
                  Pick bright cells, dodge shadow traps, and force the next move on your terms.
                </p>
                <div className="hero-actions">
                  <Button onClick={() => setScreen("setup")}>Play now</Button>
                  <Button variant="subtle" onClick={() => setScreen("setup")}>Enter code</Button>
                </div>
              </div>
            ) : null}

            {currentScreen === "setup" ? (
              <Stack gap="sm">
                <div className="setup-title">
                  <h2>Choose mode</h2>
                  <p>Lock in your player tag and jump into the 9x9 arena.</p>
                </div>
                <TextInput
                  label="Player tag"
                  placeholder="Enter your tag"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.currentTarget.value)}
                />
                <div className="mode-grid" role="group" aria-label="Game mode">
                  <ChoiceChip label="BATTLE" active={mode === "pvp"} onClick={() => setMode("pvp")} />
                  <ChoiceChip label="SOLO" active={mode === "ai"} onClick={() => setMode("ai")} />
                </div>
                <Button onClick={createGame} loading={api.loading}>Start match</Button>
                <TextInput label="Battle code" value={joinCode} onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase())} />
                <Button variant="secondary" onClick={() => joinGame()} disabled={!joinCode || api.loading}>Join battle</Button>
              </Stack>
            ) : null}

            {currentScreen === "battleLobby" && game ? (
              <Stack gap="sm">
                <div className="setup-title">
                  <h2>{game.viewer ? "Battle lobby" : "Join battle"}</h2>
                  <p>{game.viewer ? "Share the code and wait for your rival." : "Enter your tag and step into the arena."}</p>
                </div>

                {!game.viewer ? (
                  <>
                    <TextInput
                      label="Player tag"
                      placeholder="Enter your tag"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.currentTarget.value)}
                    />
                    <Button onClick={() => joinGame(game.code)} loading={api.loading}>
                      Join battle
                    </Button>
                  </>
                ) : null}

                {game.viewer ? (
                  <>
                    <TextInput readOnly label="Battle code" value={game.code} />
                    <TextInput readOnly label="Invite link" value={inviteUrl} />
                    <Button variant="secondary" onClick={copyInviteLink}>
                      Copy battle link
                    </Button>
                  </>
                ) : null}

                <Button
                  variant="subtle"
                  onClick={() => {
                    setGame(null);
                    setScreen("home");
                    window.history.replaceState(null, "", "/");
                  }}
                >
                  Leave lobby
                </Button>
              </Stack>
            ) : null}

            {currentScreen === "match" && game ? (
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

                <Group className="action-dock" gap="xs">
                  <Button
                    aria-label="Start new game"
                    variant="secondary"
                    onClick={() => {
                      setGame(null);
                      window.history.replaceState(null, "", "/");
                    }}
                  >
                    <IconPlus aria-hidden="true" className="dock-icon" size={20} stroke={2.4} />
                    <span className="dock-label">New</span>
                    <VisuallyHidden>Start new game</VisuallyHidden>
                  </Button>
                  <Button aria-label="Refresh game" variant="subtle" onClick={() => fetchGame(game.id)} disabled={api.loading}>
                    <IconRefresh aria-hidden="true" className="dock-icon" size={20} stroke={2.4} />
                    <span className="dock-label">Refresh</span>
                    <VisuallyHidden>Refresh game</VisuallyHidden>
                  </Button>
                </Group>
              </div>
            ) : null}

            {currentScreen === "result" && game ? (
              <div className="result-screen">
                <div className="hero-kicker">{resultTitle(game)}</div>
                <h1>{resultHeadline(game)}</h1>
                <div className="score-grid" aria-label="Final score">
                  {game.players.map((player) => (
                    <div className="score-card" key={player.playerId}>
                      <BodyText>{player.displayName}</BodyText>
                      <div className="score-meta">
                        <span className="score-value">{player.score}</span>
                        <Badge>{player.side}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Group className="result-actions" gap="xs">
                  <Button
                    onClick={() => {
                      setGame(null);
                      setScreen("setup");
                      window.history.replaceState(null, "", "/");
                    }}
                  >
                    Run it back
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setGame(null);
                      setScreen("home");
                      window.history.replaceState(null, "", "/");
                    }}
                  >
                    Home
                  </Button>
                </Group>
              </div>
            ) : null}
          </Stack>
        </section>

        {currentScreen === "match" || currentScreen === "home" || currentScreen === "setup" ? (
          <section className="board-panel" aria-label="Matimato board">
            {currentScreen === "match" && game ? (
            <>
              <VisuallyHidden aria-live="polite">
                {turnTitle(game)}. {turnMessage(game)}
              </VisuallyHidden>
              <div
                className="board-grid"
                style={{
                  "--board-size": game.boardSize,
                  gridTemplateColumns: `repeat(${game.boardSize}, minmax(0, 1fr))`
                } as CSSProperties}
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
                        {value === null ? "x" : Math.abs(value)}
                      </button>
                    );
                  })
                )}
              </div>
            </>
            ) : (
              <div className="preview-board" aria-hidden="true">
              {[8, -2, 4, -7, 1, 3, -5, 9, 6, -1, 7, 2, -8, 5, 4, -3, 8, 1, -6, 9, 2, -4, 7, 3, -9].map((value, index) => (
                <span key={index} data-sign={value > 0 ? "positive" : "negative"}>{Math.abs(value)}</span>
              ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function screenAnnouncement(screen: GameScreen, game: PublicGameDto | null) {
  if (screen === "home") return "Home screen.";
  if (screen === "setup") return "Choose game mode screen.";
  if (screen === "battleLobby") return "Battle lobby. Waiting for rival.";
  if (screen === "result") return game ? `${resultTitle(game)}. ${resultHeadline(game)}.` : "Result screen.";
  return game ? `${turnTitle(game)}. ${turnMessage(game)}` : "Match screen.";
}

function turnTitle(game: PublicGameDto) {
  if (game.status === "waiting") return "Waiting for rival";
  if (game.status === "finished") {
    if (game.terminal?.draw) return "Draw";
    return game.winnerPlayerId === game.viewer?.playerId ? "Victory" : "Match over";
  }
  if (game.viewer?.canMove) return "Your move";
  return `${game.turnDisplayName ?? "Opponent"} to move`;
}

function turnMessage(game: PublicGameDto) {
  if (game.status === "waiting") return `Share battle code ${game.code}.`;
  if (game.status === "finished") return "Run it back when you are ready.";
  if (!game.constraintView) return "Claim any open tile.";
  return `Claim ${game.constraintView.axis} ${game.constraintView.index + 1}.`;
}

function cellLabel(value: number | null, row: number, col: number, legal: boolean, last: boolean) {
  const state = value === null ? "claimed" : `${value > 0 ? "positive" : "negative"} ${Math.abs(value)}`;
  return `Row ${row + 1}, column ${col + 1}, ${state}${legal ? ", legal move" : ""}${last ? ", last move" : ""}`;
}

function resultTitle(game: PublicGameDto) {
  if (game.terminal?.draw) return "Draw";
  if (!game.viewer) return "Match over";
  return game.winnerPlayerId === game.viewer.playerId ? "Victory" : "Defeat";
}

function resultHeadline(game: PublicGameDto) {
  if (game.terminal?.draw) return "Both sides held the grid.";
  if (!game.viewer) return "The board is closed.";
  return game.winnerPlayerId === game.viewer.playerId ? "You owned the grid." : "Your rival took the grid.";
}
