"use client";

import {
  Badge,
  BodyText,
  Button,
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
import type { LeaderboardEntry, LeaderboardMode, LeaderboardPeriod } from "@/lib/leaderboard/leaderboard-model";
import type { ChallengeAttempt, DailyChallenge } from "@/lib/challenges/challenge-model";

type ApiState = {
  loading: boolean;
  error?: string;
};

type BlobGeometry = {
  left: string;
  top: string;
  width: string;
  height: string;
};

type BlobAnimationState = {
  geometry: BlobGeometry;
  phase: "ready" | "collapse" | "grow";
  axis: "row" | "column" | "cell";
};

const BOARD_SIZE = 9;
const BLOB_ROW_TRAVEL_MS = 760;
const BLOB_COLUMN_TRAVEL_MS = 1120;
const PREVIEW_BOARD = [
  [8, -2, 4, -7, 1, 9, -6, 3, 5],
  [3, 5, -9, 6, -1, 8, 4, -7, 2],
  [7, 6, 1, -5, 2, 4, -9, 8, 3],
  [-2, 8, 5, 1, -6, 7, 3, 9, -4],
  [6, -4, 3, 9, 8, -2, 5, 1, 7],
  [1, 9, -7, 4, 3, 5, 8, -2, 6],
  [4, 1, 8, -3, 5, 6, 2, 7, -9],
  [-9, 7, 2, 8, 4, 1, 6, -5, 3],
  [5, 3, 6, 2, -7, 9, 1, 4, 8]
];

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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardCurrent, setLeaderboardCurrent] = useState<LeaderboardEntry | null>(null);
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>("battle");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("weekly");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [challengeAttempts, setChallengeAttempts] = useState<ChallengeAttempt[]>([]);
  const [challengeCurrent, setChallengeCurrent] = useState<ChallengeAttempt | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [syncFailures, setSyncFailures] = useState(0);
  const [ribbonSettling, setRibbonSettling] = useState(false);
  const [blobAnimation, setBlobAnimation] = useState<BlobAnimationState | null>(null);
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const toastTimers = useRef<number[]>([]);
  const boardGridRef = useRef<HTMLDivElement | null>(null);
  const selectionBlobRef = useRef<HTMLDivElement | null>(null);
  const blobAnimationRef = useRef<BlobAnimationState | null>(null);
  const blobActionRun = useRef(0);
  const lastSyncToastAt = useRef(0);
  const trackedResultGameId = useRef<string | null>(null);
  const currentGameRef = useRef<PublicGameDto | null>(null);

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

  const updateBlobAnimation = useCallback((next: BlobAnimationState | null) => {
    blobAnimationRef.current = next;
    setBlobAnimation(next);
  }, []);

  const commitGame = useCallback(async (nextGame: PublicGameDto) => {
    const previousGame = currentGameRef.current;
    const previousConstraint = previousGame?.constraintView;

    if (previousGame?.id === nextGame.id && previousGame.version === nextGame.version) {
      if (!blobAnimationRef.current && nextGame.constraintView) {
        updateBlobAnimation({
          geometry: measuredTrackGeometry(boardGridRef.current, nextGame.constraintView.axis, nextGame.constraintView.index),
          phase: "ready",
          axis: nextGame.constraintView.axis
        });
      }
      return;
    }

    if (
      !previousGame ||
      previousGame.id !== nextGame.id ||
      nextGame.status !== "active" ||
      !nextGame.constraintView ||
      !nextGame.lastMoveView
    ) {
      currentGameRef.current = nextGame;
      setGame(nextGame);
      if (nextGame.status !== "active") {
        updateBlobAnimation(null);
        setRibbonSettling(false);
      }
      return;
    }

    const run = blobActionRun.current + 1;
    blobActionRun.current = run;
    const boardElement = boardGridRef.current;
    const cell = measuredCellGeometry(boardElement, nextGame.lastMoveView.viewRow, nextGame.lastMoveView.viewCol);
    const from = previousConstraint ? measuredTrackGeometry(boardElement, previousConstraint.axis, previousConstraint.index) : cell;
    const to = measuredTrackGeometry(boardElement, nextGame.constraintView.axis, nextGame.constraintView.index);
    const collapseMs = previousConstraint ? blobDurationForAxis(previousConstraint.axis) : 0;
    const growMs = blobDurationForAxis(nextGame.constraintView.axis);

    setRibbonSettling(true);
    updateBlobAnimation({ geometry: from, phase: "collapse", axis: previousConstraint?.axis ?? "cell" });
    await nextAnimationFrame();
    if (blobActionRun.current !== run) return;

    if (collapseMs > 0) {
      await animateBlob(selectionBlobRef.current, from, cell, collapseMs);
    }
    if (blobActionRun.current !== run) return;

    updateBlobAnimation({ geometry: cell, phase: "collapse", axis: "cell" });
    currentGameRef.current = nextGame;
    setGame(nextGame);
    await nextAnimationFrame();
    if (blobActionRun.current !== run) return;

    updateBlobAnimation({ geometry: to, phase: "grow", axis: nextGame.constraintView.axis });
    await animateBlob(selectionBlobRef.current, cell, to, growMs);
    if (blobActionRun.current !== run) return;

    updateBlobAnimation({ geometry: to, phase: "ready", axis: nextGame.constraintView.axis });
    setRibbonSettling(false);
  }, [updateBlobAnimation]);

  const fetchGame = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setApi({ loading: true });
    const response = await fetch(`/api/games/${id}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? "Could not load game.");
    await commitGame(payload.game);
    setApi({ loading: false });
    setSyncFailures(0);
  }, [commitGame]);

  const commitGameFrames = useCallback(async (frames: PublicGameDto[] | undefined, fallback: PublicGameDto) => {
    const sequence = frames && frames.length > 0 ? frames : [fallback];
    for (const frame of sequence) {
      await commitGame(frame);
    }
  }, [commitGame]);

  useEffect(() => {
    currentGameRef.current = game;
  }, [game]);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      blobActionRun.current += 1;
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
      await commitGame(payload.game);
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
      await commitGame(payload.game);
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
      await commitGameFrames(payload.animationFrames ?? payload.animationGames, payload.game);
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
  const gameVersion = game?.version;
  const constraintAxis = game?.constraintView?.axis;
  const constraintIndex = game?.constraintView?.index;
  const resultView = game ? toResultView(game) : null;
  const currentBlob = blobAnimation && blobAnimation.phase !== "ready" ? blobAnimation : (
    game?.constraintView
      ? {
        geometry: trackGeometry(game.constraintView.axis, game.constraintView.index),
        phase: "ready" as const,
        axis: game.constraintView.axis
      }
      : null
  );

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
      if (!cursor) setHistoryLoaded(true);
      setHistoryLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load history.";
      if (!cursor) setHistoryLoaded(true);
      setHistoryLoading(false);
      pushToast({ tone: "error", title: "History unavailable", message });
    }
  }, [pushToast]);

  function changeHistoryMode(mode: HistoryModeFilter) {
    setHistoryMode(mode);
    setHistoryItems([]);
    setHistoryCursor(null);
    setHistoryLoaded(false);
    void loadHistory(mode);
  }

  const loadLeaderboard = useCallback(async (period: LeaderboardPeriod, mode: LeaderboardMode) => {
    setLeaderboardLoading(true);
    try {
      const params = new URLSearchParams({ period, mode });
      const response = await fetch(`/api/leaderboard?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not load leaderboard.");
      setLeaderboardEntries(payload.entries);
      setLeaderboardCurrent(payload.currentEntry);
      setLeaderboardLoaded(true);
      setLeaderboardLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load leaderboard.";
      setLeaderboardLoaded(true);
      setLeaderboardLoading(false);
      pushToast({ tone: "error", title: "Ranks unavailable", message });
    }
  }, [pushToast]);

  function changeLeaderboard(input: { period?: LeaderboardPeriod; mode?: LeaderboardMode }) {
    const nextPeriod = input.period ?? leaderboardPeriod;
    const nextMode = input.mode ?? leaderboardMode;
    setLeaderboardPeriod(nextPeriod);
    setLeaderboardMode(nextMode);
    setLeaderboardLoaded(false);
    void loadLeaderboard(nextPeriod, nextMode);
  }

  const loadChallenge = useCallback(async () => {
    setChallengeLoading(true);
    try {
      const response = await fetch("/api/challenges/today", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not load challenge.");
      setDailyChallenge(payload.challenge);
      setChallengeAttempts(payload.attempts);
      setChallengeCurrent(payload.currentAttempt);
      setChallengeLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load challenge.";
      setChallengeLoading(false);
      pushToast({ tone: "error", title: "Challenge unavailable", message });
    }
  }, [pushToast]);

  async function startChallenge() {
    if (!dailyChallenge) return;
    setChallengeLoading(true);
    try {
      const response = await fetch(`/api/challenges/${dailyChallenge.date}/start`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not start challenge.");
      await commitGame(payload.game);
      trackEvent({ action: "start_daily_challenge", category: "challenge", label: dailyChallenge.date });
      window.history.replaceState(null, "", `/play/${payload.game.id}`);
      setChallengeLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start challenge.";
      setChallengeLoading(false);
      pushToast({ tone: "error", title: "Challenge start failed", message });
    }
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
    if (currentScreen === "history" && !historyLoaded && !historyLoading) {
      void loadHistory(historyMode);
    }
  }, [currentScreen, historyLoaded, historyLoading, historyMode, loadHistory]);

  useEffect(() => {
    if (currentScreen === "leaderboard" && !leaderboardLoaded && !leaderboardLoading) {
      void loadLeaderboard(leaderboardPeriod, leaderboardMode);
    }
  }, [currentScreen, leaderboardLoaded, leaderboardLoading, leaderboardPeriod, leaderboardMode, loadLeaderboard]);

  useEffect(() => {
    if (currentScreen === "challenges" && !dailyChallenge && !challengeLoading) {
      void loadChallenge();
    }
  }, [currentScreen, dailyChallenge, challengeLoading, loadChallenge]);

  useEffect(() => {
    if (currentScreen !== "match" || !constraintAxis || constraintIndex === undefined || gameVersion === undefined) {
      blobActionRun.current += 1;
      updateBlobAnimation(null);
      setRibbonSettling(false);
      return;
    }

    if (blobAnimationRef.current?.phase === "ready") {
      updateBlobAnimation(null);
    }
  }, [currentScreen, gameVersion, constraintAxis, constraintIndex, game, updateBlobAnimation]);

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
                  <button className="mode-card" type="button" data-active={mode === "pvp"} aria-pressed={mode === "pvp"} onClick={() => setMode("pvp")}>
                    <span className="mode-card-kicker">BATTLE</span>
                    <strong>Duel a rival</strong>
                    <span>Share a code and control the 9x9 arena together.</span>
                  </button>
                  <button className="mode-card" type="button" data-active={mode === "ai"} aria-pressed={mode === "ai"} onClick={() => setMode("ai")}>
                    <span className="mode-card-kicker">SOLO</span>
                    <strong>Face Matimato AI</strong>
                    <span>Practice the row-column trap loop instantly.</span>
                  </button>
                </div>
                <Button onClick={createGame} loading={api.loading}>Start match</Button>
                <TextInput label="Battle code" value={joinCode} onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase())} />
                <Button variant="secondary" onClick={() => joinGame()} disabled={!joinCode || api.loading}>Join battle</Button>
              </Stack>
            ) : null}

            {currentScreen === "challenges" ? (
              <ChallengeScreen
                challenge={dailyChallenge}
                attempts={challengeAttempts}
                currentAttempt={challengeCurrent}
                loading={challengeLoading}
                onStart={startChallenge}
                onRetry={loadChallenge}
              />
            ) : null}

            {currentScreen === "history" ? (
              <HistoryScreen
                items={historyItems}
                mode={historyMode}
                cursor={historyCursor}
                loading={historyLoading}
                onModeChange={changeHistoryMode}
                onLoadMore={() => loadHistory(historyMode, historyCursor)}
                onRetry={() => {
                  setHistoryLoaded(false);
                  void loadHistory(historyMode);
                }}
              />
            ) : null}

            {currentScreen === "leaderboard" ? (
              <LeaderboardScreen
                entries={leaderboardEntries}
                currentEntry={leaderboardCurrent}
                period={leaderboardPeriod}
                mode={leaderboardMode}
                loading={leaderboardLoading}
                onChange={changeLeaderboard}
                onRetry={() => {
                  setLeaderboardLoaded(false);
                  void loadLeaderboard(leaderboardPeriod, leaderboardMode);
                }}
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
              <div className="result-screen" data-outcome={resultView.outcome}>
                <div className="result-animation" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
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
                {game.viewer ? (
                  <div className="reward-summary" aria-label="Reward summary">
                    <Badge>XP</Badge>
                    <strong>Progress saved</strong>
                    <span>Profile XP, streaks, missions, and badges update from this completed match.</span>
                  </div>
                ) : null}
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
                ref={boardGridRef}
                data-constraint-axis={game.constraintView?.axis ?? "free"}
                data-blob-phase={currentBlob?.phase ?? "ready"}
                style={{
                  "--board-size": game.boardSize,
                  "--constraint-index": game.constraintView?.index ?? 0,
                  gridTemplateColumns: `repeat(${game.boardSize}, minmax(0, 1fr))`
                } as CSSProperties}
                role="grid"
                aria-label={`Matimato ${game.boardSize} by ${game.boardSize} board`}
              >
                {currentBlob ? (
                  <div
                    aria-hidden="true"
                    className="selection-blob"
                    ref={selectionBlobRef}
                    key="selection-blob"
                    data-phase={currentBlob.phase}
                    data-axis={currentBlob.axis}
                    style={selectionBlobStyle(currentBlob)}
                  />
                ) : null}
                  {game.boardView.map((row, rowIndex) =>
                    row.map((value, colIndex) => {
                      const key = `${rowIndex}:${colIndex}`;
                      const legal = legalKey.has(key);
                      const hasActiveTrack = Boolean(game.constraintView);
                      const constrainedLegal = hasActiveTrack && legal;
                      const last = hasActiveTrack && game.lastMoveView?.viewRow === rowIndex && game.lastMoveView?.viewCol === colIndex;
                      const claimed = value === null;
                    return (
                      <button
                        key={key}
                        className="cell-button"
                        role="gridcell"
                        type="button"
                        data-legal={constrainedLegal}
                        data-claimed={claimed}
                        data-last={last ? "true" : undefined}
                        data-sign={value === null ? "claimed" : value > 0 ? "positive" : "negative"}
                        style={{ "--reveal-order": value === null ? 18 : value + 9 } as CSSProperties}
                        disabled={!game.viewer?.canMove || !legal || claimed || api.loading || syncFailures > 0 || ribbonSettling}
                        aria-label={cellLabel(value, rowIndex, colIndex, legal, last)}
                        onClick={() => submitMove(rowIndex, colIndex)}
                      >
                        {value === null ? "" : Math.abs(value)}
                      </button>
                    );
                  })
                )}
              </div>
            </>
            ) : (
              <div className="preview-board" aria-hidden="true">
              {PREVIEW_BOARD.flat().map((value, index) => (
                <span
                  key={index}
                  data-sign={value > 0 ? "positive" : "negative"}
                  style={{ "--reveal-order": value + 9 } as CSSProperties}
                >
                  {Math.abs(value)}
                </span>
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

function ChallengeScreen({
  challenge,
  attempts,
  currentAttempt,
  loading,
  onStart,
  onRetry
}: {
  challenge: DailyChallenge | null;
  attempts: ChallengeAttempt[];
  currentAttempt: ChallengeAttempt | null;
  loading: boolean;
  onStart: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="feature-screen">
      <div className="hero-kicker">Daily challenge</div>
      <h1>Same grid. New chase.</h1>
      <p>Every player gets the same deterministic 9x9 board for the UTC day.</p>
      <div className="challenge-card">
        <Badge>{challenge?.status ?? "loading"}</Badge>
        <strong>{challenge?.date ?? "Today"}</strong>
        <span>Board hash {challenge?.boardHash.slice(0, 10) ?? "syncing"}</span>
      </div>
      {currentAttempt ? (
        <div className="challenge-card" aria-label="Your challenge attempt">
          <Badge>Rank #{currentAttempt.rank}</Badge>
          <strong>{currentAttempt.score} points</strong>
          <span>Share token {currentAttempt.shareToken}</span>
        </div>
      ) : null}
      <div className="leaderboard-list" aria-label="Daily challenge leaderboard">
        {attempts.map((attempt) => (
          <article className="leaderboard-row" data-current={attempt.profileId === currentAttempt?.profileId} key={attempt.shareToken}>
            <Badge>#{attempt.rank}</Badge>
            <strong>{attempt.displayTag}</strong>
            <span>{Math.round(attempt.durationMs / 1000)}s</span>
            <b>{attempt.score}</b>
          </article>
        ))}
      </div>
      <Group className="result-actions" gap="xs">
        <Button onClick={onStart} loading={loading} disabled={!challenge || challenge.status !== "active"}>Start daily</Button>
        <Button variant="secondary" onClick={onRetry} loading={loading}>Refresh</Button>
      </Group>
    </div>
  );
}

function LeaderboardScreen({
  entries,
  currentEntry,
  period,
  mode,
  loading,
  onChange,
  onRetry
}: {
  entries: LeaderboardEntry[];
  currentEntry: LeaderboardEntry | null;
  period: LeaderboardPeriod;
  mode: LeaderboardMode;
  loading: boolean;
  onChange: (input: { period?: LeaderboardPeriod; mode?: LeaderboardMode }) => void;
  onRetry: () => void;
}) {
  const currentOutsideTop = currentEntry && !entries.some((entry) => entry.profileId === currentEntry.profileId);
  return (
    <div className="leaderboard-screen">
      <div className="hero-kicker">Rank board</div>
      <h1>Climb the arena.</h1>
      <div className="history-tabs" role="tablist" aria-label="Leaderboard period">
        {(["weekly", "all_time"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={period === item} data-active={period === item} onClick={() => onChange({ period: item })}>
            {item === "all_time" ? "all time" : item}
          </button>
        ))}
      </div>
      <div className="history-tabs" role="tablist" aria-label="Leaderboard mode">
        {(["battle", "solo"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={mode === item} data-active={mode === item} onClick={() => onChange({ mode: item })}>
            {item}
          </button>
        ))}
      </div>
      <div className="leaderboard-list" aria-live="polite">
        {entries.length === 0 && !loading ? (
          <div className="history-empty">
            <strong>No ranked matches yet.</strong>
            <span>Completed matches with at least one move appear here.</span>
            <Button variant="secondary" onClick={onRetry}>Refresh ranks</Button>
          </div>
        ) : null}
        {entries.map((entry) => <LeaderboardRow entry={entry} key={entry.profileId} />)}
        {currentOutsideTop ? <LeaderboardRow entry={currentEntry} pinned /> : null}
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, pinned = false }: { entry: LeaderboardEntry; pinned?: boolean }) {
  return (
    <article className="leaderboard-row" data-current={entry.current} data-pinned={pinned}>
      <Badge>{pinned ? "You" : `#${entry.rank}`}</Badge>
      <strong>{entry.displayTag}</strong>
      <span>{entry.matches} matches</span>
      <b>{entry.rankValue}</b>
    </article>
  );
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

      <div className="mission-list" aria-label="Daily missions">
        {(profile?.missions.slice(-3) ?? []).map((mission) => (
          <div className="mission-card" key={`${mission.missionId}-${mission.period}`}>
            <Badge>{mission.completedAt ? "Done" : "Daily"}</Badge>
            <strong>{mission.title}</strong>
            <span>{Math.min(mission.progress, mission.target)} / {mission.target}</span>
          </div>
        ))}
        {profile && profile.missions.length === 0 ? (
          <div className="mission-card">
            <Badge>Daily</Badge>
            <strong>Finish one match</strong>
            <span>0 / 1</span>
          </div>
        ) : null}
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

function selectionBlobStyle(blob: BlobAnimationState): CSSProperties {
  return {
    left: blob.geometry.left,
    top: blob.geometry.top,
    width: blob.geometry.width,
    height: blob.geometry.height
  } as CSSProperties;
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function animateBlob(element: HTMLElement | null, from: BlobGeometry, to: BlobGeometry, durationMs: number) {
  if (
    !element ||
    durationMs <= 0 ||
    typeof element.animate !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const animation = element.animate(
    [
      { left: from.left, top: from.top, width: from.width, height: from.height, transform: "scale(1)" },
      { left: to.left, top: to.top, width: to.width, height: to.height, transform: "scale(1)" }
    ],
    {
      duration: durationMs,
      easing: "linear",
      fill: "forwards"
    }
  );
  await animation.finished.catch(() => undefined);
  (animation as Animation & { commitStyles?: () => void }).commitStyles?.();
  animation.cancel();
}

function blobDurationForAxis(axis: "row" | "column") {
  return axis === "column" ? BLOB_COLUMN_TRAVEL_MS : BLOB_ROW_TRAVEL_MS;
}

function measuredTrackGeometry(board: HTMLElement | null, axis: "row" | "column", index: number): BlobGeometry {
  const metrics = boardMetrics(board);
  if (!metrics) return trackGeometry(axis, index);
  if (axis === "row") {
    const top = metrics.padTop + index * (metrics.cellHeight + metrics.rowGap);
    return pxGeometry(metrics.padLeft, top, metrics.innerWidth, metrics.cellHeight);
  }
  const left = metrics.padLeft + index * (metrics.cellWidth + metrics.columnGap);
  return pxGeometry(left, metrics.padTop, metrics.cellWidth, metrics.innerHeight);
}

function measuredCellGeometry(board: HTMLElement | null, row: number, col: number): BlobGeometry {
  const metrics = boardMetrics(board);
  if (!metrics) return cellGeometry(row, col);
  return pxGeometry(
    metrics.padLeft + col * (metrics.cellWidth + metrics.columnGap),
    metrics.padTop + row * (metrics.cellHeight + metrics.rowGap),
    metrics.cellWidth,
    metrics.cellHeight
  );
}

function boardMetrics(board: HTMLElement | null) {
  if (!board) return null;
  const styles = window.getComputedStyle(board);
  const padLeft = finiteCssNumber(styles.paddingLeft);
  const padRight = finiteCssNumber(styles.paddingRight);
  const padTop = finiteCssNumber(styles.paddingTop);
  const padBottom = finiteCssNumber(styles.paddingBottom);
  const columnGap = finiteCssNumber(styles.columnGap, styles.gap);
  const rowGap = finiteCssNumber(styles.rowGap, styles.gap);
  const innerWidth = board.clientWidth - padLeft - padRight;
  const innerHeight = board.clientHeight - padTop - padBottom;
  const cellWidth = (innerWidth - columnGap * (BOARD_SIZE - 1)) / BOARD_SIZE;
  const cellHeight = (innerHeight - rowGap * (BOARD_SIZE - 1)) / BOARD_SIZE;
  if (
    !Number.isFinite(cellWidth) ||
    !Number.isFinite(cellHeight) ||
    cellWidth <= 0 ||
    cellHeight <= 0 ||
    innerWidth <= 0 ||
    innerHeight <= 0
  ) {
    return null;
  }
  return { padLeft, padTop, columnGap, rowGap, innerWidth, innerHeight, cellWidth, cellHeight };
}

function finiteCssNumber(...values: string[]) {
  for (const value of values) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function pxGeometry(left: number, top: number, width: number, height: number): BlobGeometry {
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  };
}

function trackGeometry(axis: "row" | "column", index: number): BlobGeometry {
  if (axis === "row") {
    return {
      top: trackStart(index),
      left: "var(--board-pad)",
      width: "calc(100% - var(--board-pad) - var(--board-pad))",
      height: "var(--board-cell-size)"
    };
  }
  return {
    top: "var(--board-pad)",
    left: trackStart(index),
    width: "var(--board-cell-size)",
    height: "calc(100% - var(--board-pad) - var(--board-pad))"
  };
}

function trackStart(index: number) {
  return index === 0
    ? "var(--board-pad)"
    : `calc(var(--board-pad) + ${Array.from({ length: index }, () => "var(--board-cell-size) + var(--board-gap)").join(" + ")})`;
}

function cellGeometry(row: number, col: number): BlobGeometry {
  return {
    top: trackStart(row),
    left: trackStart(col),
    width: "var(--board-cell-size)",
    height: "var(--board-cell-size)"
  };
}
