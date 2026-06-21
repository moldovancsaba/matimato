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
import { IconBolt, IconCrown, IconHistory, IconHome, IconPlus, IconRefresh, IconSwords, IconUserCircle } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  destinationToScreen,
  resolveScreen,
  screenToDestination,
  shouldShowAppNav,
  type AppDestination,
  type GameScreen,
  type SetupScreen
} from "@/lib/game/screen-state";
import { addToast, dismissToast, type GameToast, type GameToastTone } from "@/lib/game/toasts";
import { toResultView } from "@/lib/game/result-view";
import type { PublicGameDto } from "@/lib/game/types";
import { trackEvent } from "@/lib/client/analytics";
import type { PublicProfile } from "@/lib/profile/types";
import type { HistoryItem, HistoryModeFilter } from "@/lib/history/history-model";

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
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyMode, setHistoryMode] = useState<HistoryModeFilter>("all");
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncFailures, setSyncFailures] = useState(0);
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const toastTimers = useRef<number[]>([]);
  const lastSyncToastAt = useRef(0);
  const trackedResultGameId = useRef<string | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => dismissToast(current, id));
  }, []);

  const pushToast = useCallback((toast: Omit<GameToast, "id" | "ttlMs"> & { ttlMs?: number }) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const nextToast: GameToast = { ...toast, id, ttlMs: toast.ttlMs ?? 2800 };
    setToasts((current) => addToast(current, nextToast));
    const timer = window.setTimeout(() => dismiss(id), nextToast.ttlMs);
    toastTimers.current.push(timer);
  }, [dismiss]);

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
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (initialGameId) {
      fetchGame(initialGameId).catch((error) => {
        const message = error instanceof Error ? error.message : "Could not load battle.";
        setApi({ loading: false, error: message });
        pushToast({ tone: "error", title: "Battle load failed", message });
      });
    }
  }, [fetchGame, initialGameId, pushToast]);

  useEffect(() => {
    if (!game || game.status === "finished" || game.status === "expired") return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchGame(game.id, true).catch(() => {
        setSyncFailures((value) => value + 1);
        const now = Date.now();
        if (now - lastSyncToastAt.current > 10_000) {
          lastSyncToastAt.current = now;
          pushToast({
            tone: "warning",
            title: "Reconnecting",
            message: "Live updates are retrying. Moves pause until sync returns.",
            ttlMs: 4200
          });
        }
      });
    }, 2200);
    return () => window.clearInterval(interval);
  }, [fetchGame, game, pushToast]);

  async function createGame() {
    setApi({ loading: true });
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
      const message = error instanceof Error ? error.message : "Could not create game.";
      setApi({ loading: false, error: message });
      pushToast({ tone: "error", title: "Match start failed", message });
    }
  }

  async function joinGame(code = joinCode) {
    setApi({ loading: true });
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
      const message = error instanceof Error ? error.message : "Could not join game.";
      setApi({ loading: false, error: message });
      pushToast({ tone: "error", title: "Join failed", message });
    }
  }

  async function submitMove(viewRow: number, viewCol: number) {
    if (!game?.viewer?.canMove) return;
    setApi({ loading: true });
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
      const message = error instanceof Error ? error.message : "Move failed.";
      setApi({ loading: false, error: message });
      pushToast({ tone: "error", title: "Move rejected", message: "The board was refreshed. Try the highlighted legal tile." });
    }
  }

  const legalKey = useMemo(() => new Set(game?.legalCellsView.map((cell) => `${cell.viewRow}:${cell.viewCol}`) ?? []), [game]);
  const inviteUrl = game && typeof window !== "undefined" ? `${window.location.origin}/play/${game.id}` : "";
  const currentScreen = resolveScreen(game, screen);
  const activeDestination = screenToDestination(currentScreen);
  const showAppNav = shouldShowAppNav(currentScreen);
  const resultView = game ? toResultView(game) : null;

  function navigate(destination: AppDestination) {
    if (currentScreen === "match") return;
    setGame(null);
    setScreen(destinationToScreen(destination));
    window.history.replaceState(null, "", "/");
    trackEvent({ action: "navigate", category: "app_shell", label: destination });
  }

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not load profile.");
      setProfile(payload.profile);
      setProfileDraft(payload.profile.displayTag);
      setProfileLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load profile.";
      setProfileLoading(false);
      pushToast({ tone: "error", title: "Profile unavailable", message });
    }
  }, [pushToast]);

  const saveProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayTag: profileDraft })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not save profile.");
      setProfile(payload.profile);
      setProfileDraft(payload.profile.displayTag);
      setProfileLoading(false);
      pushToast({ tone: "success", title: "Profile saved", message: "Your player card is updated." });
      trackEvent({ action: "save_profile", category: "profile" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save profile.";
      setProfileLoading(false);
      pushToast({ tone: "error", title: "Save failed", message });
    }
  }, [profileDraft, pushToast]);

  const loadHistory = useCallback(async (mode: HistoryModeFilter, cursor?: string | null) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ mode, limit: "10" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/history?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not load history.");
      setHistoryItems((current) => cursor ? [...current, ...payload.items] : payload.items);
      setHistoryCursor(payload.nextCursor);
      setHistoryLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load history.";
      setHistoryLoading(false);
      pushToast({ tone: "error", title: "History unavailable", message });
    }
  }, [pushToast]);

  function changeHistoryMode(mode: HistoryModeFilter) {
    setHistoryMode(mode);
    setHistoryItems([]);
    setHistoryCursor(null);
    void loadHistory(mode);
  }

  useEffect(() => {
    if (currentScreen !== "result" || !game || !resultView || trackedResultGameId.current === game.id) return;
    trackedResultGameId.current = game.id;
    trackEvent({ action: "match_finished", category: "game", label: `${game.mode}:${resultView.outcome}`, value: game.boardSize });
  }, [currentScreen, game, resultView]);

  useEffect(() => {
    if (currentScreen === "profile" && !profile && !profileLoading) {
      void loadProfile();
    }
  }, [currentScreen, profile, profileLoading, loadProfile]);

  useEffect(() => {
    if (currentScreen === "history" && historyItems.length === 0 && !historyLoading) {
      void loadHistory(historyMode);
    }
  }, [currentScreen, historyItems.length, historyLoading, historyMode, loadHistory]);

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard?.writeText(inviteUrl);
      pushToast({ tone: "success", title: "Battle link copied", message: "Send it to your rival." });
      trackEvent({ action: "copy_invite_link", category: "sharing", label: game?.mode });
    } catch {
      pushToast({ tone: "error", title: "Copy blocked", message: "Select the invite link and copy it manually." });
    }
  }

  async function leaveLobby() {
    if (!game) return;
    if (!game.viewer) {
      setGame(null);
      setScreen("home");
      window.history.replaceState(null, "", "/");
      return;
    }

    setApi({ loading: true });
    try {
      const response = await fetch(`/api/games/${game.id}/forfeit`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not leave lobby.");
      setGame(null);
      setScreen("home");
      window.history.replaceState(null, "", "/");
      setApi({ loading: false });
      pushToast({ tone: "info", title: "Lobby closed", message: "The battle invite is no longer active." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not leave lobby.";
      setApi({ loading: false, error: message });
      pushToast({ tone: "error", title: "Leave failed", message });
    }
  }

  async function shareResult() {
    if (!game) return;
    const view = toResultView(game);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Matimato ${view.title}`, text: view.shareText });
      } else {
        await navigator.clipboard?.writeText(view.shareText);
      }
      pushToast({ tone: "success", title: "Result ready to share", message: "Your match summary is copied." });
      trackEvent({ action: "share_result", category: "sharing", label: game.mode });
    } catch {
      pushToast({ tone: "error", title: "Share blocked", message: "Copy or share was cancelled by the browser." });
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

            {isFeatureScreen(currentScreen) ? (
              <FeaturePlaceholder screen={currentScreen} onPlay={() => navigate("battle")} />
            ) : null}

            {currentScreen === "history" ? (
              <HistoryScreen
                items={historyItems}
                mode={historyMode}
                cursor={historyCursor}
                loading={historyLoading}
                onModeChange={changeHistoryMode}
                onLoadMore={() => loadHistory(historyMode, historyCursor)}
                onRetry={() => loadHistory(historyMode)}
              />
            ) : null}

            {currentScreen === "profile" ? (
              <ProfileScreen
                profile={profile}
                draft={profileDraft}
                loading={profileLoading}
                onDraftChange={setProfileDraft}
                onSave={saveProfile}
                onRefresh={loadProfile}
              />
            ) : null}

            {currentScreen === "battleLobby" && game ? (
              <Stack gap="sm">
                <div className="setup-title">
                  <h2>{game.viewer ? "Battle lobby" : "Join battle"}</h2>
                  <p>{game.viewer ? "Share the code and wait for your rival." : "Enter your tag and step into the arena."}</p>
                </div>

                <div className="lobby-pulse" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
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
                  onClick={leaveLobby}
                  disabled={api.loading}
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

            {currentScreen === "result" && game && resultView ? (
              <div className="result-screen">
                <div className="hero-kicker">{resultView.title}</div>
                <h1>{resultView.headline}</h1>
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
                      setMode(game.mode);
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
                  <Button variant="subtle" onClick={shareResult}>
                    Share result
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
      {showAppNav ? <AppNav activeDestination={activeDestination} onNavigate={navigate} /> : null}
      <GameToastLayer toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

const NAV_ITEMS: Array<{
  destination: AppDestination;
  label: string;
  icon: typeof IconHome;
}> = [
  { destination: "home", label: "Home", icon: IconHome },
  { destination: "battle", label: "Battle", icon: IconSwords },
  { destination: "challenges", label: "Quests", icon: IconBolt },
  { destination: "leaderboard", label: "Ranks", icon: IconCrown },
  { destination: "history", label: "History", icon: IconHistory },
  { destination: "profile", label: "Profile", icon: IconUserCircle }
];

function AppNav({ activeDestination, onNavigate }: { activeDestination: AppDestination | null; onNavigate: (destination: AppDestination) => void }) {
  return (
    <nav className="app-bottom-nav" aria-label="Game navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeDestination === item.destination;
        return (
          <button
            key={item.destination}
            type="button"
            className="app-nav-button"
            data-active={active}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.destination)}
          >
            <Icon aria-hidden="true" size={20} stroke={2.25} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function isFeatureScreen(screen: GameScreen): screen is "challenges" | "leaderboard" {
  return screen === "challenges" || screen === "leaderboard";
}

function FeaturePlaceholder({ screen, onPlay }: { screen: "challenges" | "leaderboard"; onPlay: () => void }) {
  const content = featureContent(screen);

  return (
    <div className="feature-screen">
      <div className="hero-kicker">{content.kicker}</div>
      <h1>{content.title}</h1>
      <p>{content.body}</p>
      <div className="feature-card-grid" aria-label={`${content.title} preview`}>
        {content.cards.map((card) => (
          <div className="feature-card" key={card.title}>
            <Badge>{card.badge}</Badge>
            <strong>{card.title}</strong>
            <span>{card.copy}</span>
          </div>
        ))}
      </div>
      <Button onClick={onPlay}>Play a 9x9 battle</Button>
    </div>
  );
}

function featureContent(screen: "challenges" | "leaderboard") {
  const content = {
    challenges: {
      kicker: "Daily quests",
      title: "Fresh grid rituals.",
      body: "Daily challenge boards, streak missions, and reward claims will live here without interrupting active matches.",
      cards: [
        { badge: "Daily", title: "Sunset run", copy: "One shared 9x9 seed for every player." },
        { badge: "Streak", title: "Keep heat", copy: "Finish matches to keep your return loop alive." }
      ]
    },
    leaderboard: {
      kicker: "Rank board",
      title: "Climb the arena.",
      body: "Weekly, all-time, SOLO, and BATTLE rankings get a dedicated screen instead of crowding the board.",
      cards: [
        { badge: "Weekly", title: "Pulse ladder", copy: "A clean competitive reset window." },
        { badge: "Pinned", title: "Your rank", copy: "Your position stays visible even outside the top rows." }
      ]
    }
  } satisfies Record<typeof screen, {
    kicker: string;
    title: string;
    body: string;
    cards: Array<{ badge: string; title: string; copy: string }>;
  }>;

  return content[screen];
}

function HistoryScreen({
  items,
  mode,
  cursor,
  loading,
  onModeChange,
  onLoadMore,
  onRetry
}: {
  items: HistoryItem[];
  mode: HistoryModeFilter;
  cursor: string | null;
  loading: boolean;
  onModeChange: (mode: HistoryModeFilter) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="history-screen">
      <div className="hero-kicker">Match memory</div>
      <h1>Review every duel.</h1>
      <div className="history-tabs" role="tablist" aria-label="History filter">
        {(["all", "solo", "battle"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={mode === item} data-active={mode === item} onClick={() => onModeChange(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="history-list" aria-live="polite">
        {items.length === 0 && !loading ? (
          <div className="history-empty">
            <strong>No matches yet.</strong>
            <span>Finish a SOLO or BATTLE match and it will appear here.</span>
            <Button variant="secondary" onClick={onRetry}>Refresh history</Button>
          </div>
        ) : null}
        {items.map((item) => (
          <article className="history-card" key={item.gameId}>
            <Badge>{item.mode}</Badge>
            <strong>{historyResultLabel(item.result)}</strong>
            <span>{item.rivalName ? `vs ${item.rivalName}` : "Solo run"}</span>
            <div className="history-meta">
              <span>{item.playerScore}{item.rivalScore !== undefined ? ` / ${item.rivalScore}` : ""}</span>
              <time dateTime={item.completedAt}>{new Date(item.completedAt).toLocaleDateString()}</time>
            </div>
          </article>
        ))}
      </div>
      {cursor ? (
        <Button variant="secondary" onClick={onLoadMore} loading={loading}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}

function historyResultLabel(result: HistoryItem["result"]) {
  if (result === "win") return "Victory";
  if (result === "loss") return "Defeat";
  return "Draw";
}

function ProfileScreen({
  profile,
  draft,
  loading,
  onDraftChange,
  onSave,
  onRefresh
}: {
  profile: PublicProfile | null;
  draft: string;
  loading: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="profile-screen">
      <div className="profile-hero">
        <div className="profile-avatar" aria-hidden="true" style={{ "--profile-color": profile?.avatarColor ?? "#ff6b3d" } as CSSProperties}>
          {(profile?.displayTag ?? "M").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="hero-kicker">Player card</div>
          <h1>{profile?.displayTag ?? "Loading profile"}</h1>
          <p>Track your level, streak, form, and best score across the 9x9 arena.</p>
        </div>
      </div>

      <TextInput
        label="Player tag"
        placeholder="Your player tag"
        value={draft}
        onChange={(event) => onDraftChange(event.currentTarget.value)}
      />

      <div className="profile-stats" aria-label="Profile stats">
        <StatTile label="Level" value={profile?.level ?? 1} />
        <StatTile label="XP" value={profile?.xp ?? 0} />
        <StatTile label="Matches" value={profile?.stats.matches ?? 0} />
        <StatTile label="Wins" value={profile?.stats.wins ?? 0} />
        <StatTile label="Draws" value={profile?.stats.draws ?? 0} />
        <StatTile label="Best" value={profile?.stats.bestScore ?? 0} />
      </div>

      <Group className="result-actions" gap="xs">
        <Button onClick={onSave} loading={loading} disabled={!draft.trim()}>
          Save profile
        </Button>
        <Button variant="secondary" onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
      </Group>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function screenAnnouncement(screen: GameScreen, game: PublicGameDto | null) {
  if (screen === "home") return "Home screen.";
  if (screen === "setup") return "Choose game mode screen.";
  if (screen === "challenges") return "Challenges screen.";
  if (screen === "leaderboard") return "Leaderboard screen.";
  if (screen === "history") return "History screen.";
  if (screen === "profile") return "Profile screen.";
  if (screen === "battleLobby") return "Battle lobby. Waiting for rival.";
  if (screen === "result") {
    const result = game ? toResultView(game) : null;
    return result ? `${result.title}. ${result.headline}.` : "Result screen.";
  }
  return game ? `${turnTitle(game)}. ${turnMessage(game)}` : "Match screen.";
}

function GameToastLayer({ toasts, onDismiss }: { toasts: GameToast[]; onDismiss: (id: string) => void }) {
  const latest = toasts[0];

  return (
    <div className="game-toast-layer" aria-label="Game notifications">
      <VisuallyHidden aria-live="polite">
        {latest ? `${latest.title}${latest.message ? `. ${latest.message}` : ""}` : ""}
      </VisuallyHidden>
      {toasts.map((toast) => (
        <div className="game-toast" data-tone={toast.tone} key={toast.id}>
          <InlineAlert severity={toastSeverity(toast.tone)} title={toast.title} message={toast.message ?? ""} />
          <Button variant="subtle" onClick={() => onDismiss(toast.id)} aria-label={`Dismiss ${toast.title}`}>
            Dismiss
          </Button>
        </div>
      ))}
    </div>
  );
}

function toastSeverity(tone: GameToastTone): "success" | "info" | "warning" | "error" {
  return tone;
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
