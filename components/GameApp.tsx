'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Badge, Button, Group, Progress, SimpleGrid, Stack, TextInput } from '@doneisbetter/gds';
import { IconCalendar, IconHelpCircle, IconHistory, IconHome, IconLogout, IconRoute, IconSwords, IconTrophy, IconUser } from '@tabler/icons-react';
import {
  cancelLobby,
  clearPlayerSession,
  createGame,
  fetchGame,
  fetchHistory,
  fetchLeaderboard,
  fetchLobby,
  fetchProfile,
  fetchProgression,
  getLocalOnboarding,
  getPlayerId,
  getPlayerTag,
  joinGame,
  leaveLobby,
  persistOnboarding,
  purchaseBoardSize,
  readyLobby,
  offlineTelemetryName,
  claimSeasonReward,
  recordSeasonAction,
  selectBoardSize,
  setLocalOnboarding,
  setPlayerTag
} from '@/lib/client/api';
import { getSuggestedTutorialCell, createTutorialState, resolveTutorialAi, selectTutorialCell, TUTORIAL_STEPS, type TutorialState } from '@/lib/game/tutorial';
import { BOARD_SIZES, boardUnlockCost, shouldShowTrainingChoice } from '@/lib/game/progression';
import { availableBotProfiles, BOT_PROFILES, DEFAULT_BOT_PROFILE_ID } from '@/lib/game/ai';
import { topicForScreen, type RulesHelpTopicId } from '@/lib/game/rules-help';
import { isLegal } from '@/lib/game/rules';
import { emitTelemetry, installTelemetryPagehide } from '@/lib/client/telemetry';
import { getRuntimeTelemetryProperties, registerServiceWorker, type NetworkState } from '@/lib/client/iosRuntime';
import type { BoardProgression, BoardSize, BoardCell, BotProfileSummary, GameMode, GameSnapshot, LobbyState, MatchSummary, OnboardingState, ProfileSummary, ProgressionResponse, QuestProgress, RankEntry, TrainingChoice, TutorialStepId } from '@/lib/shared/types';
import { PhaserGameRoot } from './PhaserGameRoot';
import { RulesHelpDialog } from './RulesHelpDialog';

type Screen = 'home' | 'training-choice' | 'journey' | 'battle' | 'quests' | 'ranks' | 'history' | 'profile' | 'match' | 'tutorial' | 'lobby' | 'recap';

type Props = { initialScreen: Screen; initialMatchId?: string };

const ONBOARDING_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_ONBOARDING !== 'false';
const LOBBY_V2_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_LOBBY_V2 !== 'false';
const DAILY_V2_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_DAILY_V2 !== 'false';
const BLITZ_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_BLITZ_MODE !== 'false';
const TRAINING_CHOICE_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_TRAINING_CHOICE !== 'false';
const COACH_BUBBLES_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_COACH_BUBBLES !== 'false';
const BOARD_JOURNEY_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_BOARD_JOURNEY !== 'false';
const SEASONAL_EVENTS_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_SEASONAL_EVENTS !== 'false';
const AI_PROFILES_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_AI_PROFILES !== 'false';
const RULE_ASSIST_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_RULE_ASSIST !== 'false';

export function GameApp({ initialScreen, initialMatchId }: Props) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [playerId, setPlayerId] = useState('');
  const [tag, setTag] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [history, setHistory] = useState<MatchSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<RankEntry[]>([]);
  const [progression, setProgression] = useState<ProgressionResponse | null>(null);
  const [quests, setQuests] = useState<QuestProgress[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [tutorial, setTutorial] = useState<TutorialState>(() => createTutorialState());
  const [tutorialReplay, setTutorialReplay] = useState(false);
  const [dismissedCoachSteps, setDismissedCoachSteps] = useState<TutorialStepId[]>([]);
  const [busy, setBusy] = useState('');
  const [networkState, setNetworkState] = useState<NetworkState>('online');
  const [selectedBotProfileId, setSelectedBotProfileId] = useState(DEFAULT_BOT_PROFILE_ID);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<RulesHelpTopicId>('objective');
  const reportedRuntime = useRef(false);

  useEffect(() => {
    const id = getPlayerId();
    const savedTag = getPlayerTag();
    setPlayerId(id);
    setTag(savedTag);
    const localOnboarding = getLocalOnboarding(id);
    setOnboarding(localOnboarding);
    if (TRAINING_CHOICE_ENABLED && initialScreen === 'home' && shouldShowTrainingChoice(localOnboarding, initialMatchId)) {
      setScreen('training-choice');
      emitTelemetry({ name: 'training_choice_shown', playerId: id, properties: { source: 'first-run' } });
      return;
    }
    if (!TRAINING_CHOICE_ENABLED && !initialMatchId && initialScreen === 'home' && shouldShowTutorial(localOnboarding)) {
      setTutorial(createTutorialState(localOnboarding?.lastStep));
      setScreen('tutorial');
    }
  }, [initialMatchId, initialScreen]);

  useEffect(() => installTelemetryPagehide(), []);

  useEffect(() => {
    if (reportedRuntime.current) return;
    reportedRuntime.current = true;
    void registerServiceWorker().then((serviceWorker) => {
      emitTelemetry({ name: 'ios_runtime_detected', playerId: getPlayerId(), properties: { ...getRuntimeTelemetryProperties(), serviceWorker } });
    }).catch(() => {
      emitTelemetry({ name: 'ios_wrapper_error', playerId: getPlayerId(), result: 'error', properties: { ...getRuntimeTelemetryProperties(), errorCode: 'service_worker_register_failed' } });
    });
  }, []);

  useEffect(() => {
    function syncNetworkState() {
      const next: NetworkState = navigator.onLine ? 'online' : 'offline';
      setNetworkState((current) => {
        if (current === next) return current;
        emitTelemetry({
          name: next === 'online' ? 'ios_offline_recovered' : 'ios_offline_state_changed',
          playerId: getPlayerId(),
          properties: { ...getRuntimeTelemetryProperties(), networkState: next }
        });
        return next;
      });
    }
    syncNetworkState();
    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);
    return () => {
      window.removeEventListener('online', syncNetworkState);
      window.removeEventListener('offline', syncNetworkState);
    };
  }, []);

  useEffect(() => {
    if (!playerId) return;
    if (initialMatchId) {
      fetchGame(initialMatchId).then((data) => {
        const next = data.snapshot;
        setSnapshot(next);
        setScreen(next.lobby && next.status !== 'active' ? 'lobby' : 'match');
      }).catch((error: Error) => setNotice(error.message));
    }
  }, [initialMatchId, playerId]);

  useEffect(() => {
    if (!playerId) return;
    fetchProgression(playerId).then((data) => {
      setProgression(data);
      if (data.onboarding) {
        setOnboarding(data.onboarding);
        setLocalOnboarding(data.onboarding);
        if (TRAINING_CHOICE_ENABLED && screen === 'home' && shouldShowTrainingChoice(data.onboarding, initialMatchId)) {
          setScreen('training-choice');
          emitTelemetry({ name: 'training_choice_shown', playerId, properties: { source: 'server-sync' } });
        }
        if (TRAINING_CHOICE_ENABLED && screen === 'training-choice' && !shouldShowTrainingChoice(data.onboarding, initialMatchId)) setScreen('home');
        if (screen === 'tutorial' && !tutorialReplay && !shouldShowTutorial(data.onboarding)) setScreen('home');
      }
    }).catch(() => undefined);
  }, [initialMatchId, playerId, screen, tutorialReplay]);

  useEffect(() => {
    if (!playerId) return;
    if (screen === 'profile') fetchProfile(playerId, tag || 'Player').then((data) => setProfile(data.profile)).catch((error: Error) => setNotice(error.message));
    if (screen === 'history') fetchHistory(playerId).then((data) => setHistory(data.history)).catch((error: Error) => setNotice(error.message));
    if (screen === 'ranks') fetchLeaderboard().then((data) => {
      setLeaderboard(data.leaderboard);
      emitTelemetry({ name: 'rank_viewed', playerId, properties: { screen: 'ranks' } });
    }).catch((error: Error) => setNotice(error.message));
    if (screen === 'quests') fetchProgression(playerId).then((data) => {
      setProgression(data);
      setQuests(data.quests);
      emitTelemetry({ name: 'daily_viewed', playerId, properties: { date: data.daily.date, status: data.daily.status, streakCurrent: data.streak.current } });
    }).catch((error: Error) => {
      emitTelemetry({ name: 'daily_error', playerId, result: 'error', properties: { errorCode: 'progression_fetch_failed' } });
      setNotice(error.message);
    });
  }, [screen, playerId, tag]);

  useEffect(() => {
    if (screen !== 'lobby' || !snapshot?.lobby || !playerId) return;
    const matchId = snapshot.id;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 1800;
    async function poll() {
      try {
        const data = await fetchLobby(matchId, playerId);
        if (cancelled) return;
        setSnapshot(data.snapshot);
        if ('lobby' in data) setNotice(lobbyNotice(data.lobby));
        if (data.snapshot.status === 'active') {
          setNotice('Both players are ready. Entering match.');
          emitTelemetry({ name: 'lobby_entered_match', playerId, matchId, properties: { status: 'active' } });
          setScreen('match');
          historyReplace(`/play/${data.snapshot.id}`);
          return;
        }
        delay = 'lobby' in data && (data.lobby.status === 'expired' || data.lobby.status === 'cancelled') ? 8000 : Math.min(delay + 700, 6000);
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'Lobby reconnect failed.');
          emitTelemetry({ name: 'lobby_poll_failed', playerId, matchId, result: 'error', properties: { retryable: true } });
          delay = Math.min(delay + 1000, 6000);
        }
      }
      if (!cancelled) timer = setTimeout(poll, delay);
    }
    timer = setTimeout(poll, 600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [screen, snapshot?.id, snapshot?.lobby, playerId]);

  const safeTag = useMemo(() => tag.trim() || 'Player 1', [tag]);
  const lobby = snapshot?.lobby ?? null;
  const boardProgression = progression?.progression;
  const activeBoardSize = BOARD_JOURNEY_ENABLED ? boardProgression?.boardUnlocks.activeBoardSize ?? 5 : 9;
  const botProfiles = useMemo<BotProfileSummary[]>(() => AI_PROFILES_ENABLED ? availableBotProfiles(activeBoardSize) : [BOT_PROFILES[0]].map((profile) => ({ profileId: profile.profileId, name: profile.name, difficulty: profile.difficulty, unlockBoardSize: profile.unlockBoardSize, description: profile.description })), [activeBoardSize]);
  const selectedBot = botProfiles.find((profile) => profile.profileId === selectedBotProfileId) ?? botProfiles[0];

  const blockOfflineWrite = useCallback((label: string) => {
    if (networkState === 'online') return false;
    setNotice(`${label} needs a live connection. Reconnect and retry.`);
    emitTelemetry({ name: offlineTelemetryName('offline'), playerId: playerId || getPlayerId(), result: 'cancelled', properties: { ...getRuntimeTelemetryProperties(), networkState, source: label } });
    return true;
  }, [networkState, playerId]);

  const retryNetwork = useCallback(async () => {
    setNetworkState('reconnecting');
    emitTelemetry({ name: 'ios_offline_retry', playerId: playerId || getPlayerId(), properties: { ...getRuntimeTelemetryProperties(), networkState: 'reconnecting' } });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('/api/health', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('health_failed');
      setNetworkState('online');
      setNotice('Connection restored.');
      emitTelemetry({ name: 'ios_offline_recovered', playerId: playerId || getPlayerId(), result: 'ok', properties: { ...getRuntimeTelemetryProperties(), networkState: 'online' } });
    } catch {
      const next: NetworkState = navigator.onLine ? 'degraded' : 'offline';
      setNetworkState(next);
      setNotice(next === 'degraded' ? 'Network is available, but Matimato services are not responding yet.' : 'Still offline. The app shell remains available.');
      emitTelemetry({ name: 'ios_wrapper_error', playerId: playerId || getPlayerId(), result: 'error', properties: { ...getRuntimeTelemetryProperties(), networkState: next, errorCode: 'health_retry_failed' } });
    } finally {
      window.clearTimeout(timeout);
    }
  }, [playerId]);

  const persistTag = useCallback(() => {
    setPlayerTag(safeTag);
    setTag(safeTag);
  }, [safeTag]);

  const signOut = useCallback(() => {
    const previousPlayerId = playerId || getPlayerId();
    clearPlayerSession(previousPlayerId);
    emitTelemetry({ name: 'player_signed_out', playerId: previousPlayerId, properties: { source: 'profile' } });
    const nextPlayerId = getPlayerId();
    setPlayerId(nextPlayerId);
    setTag('');
    setInviteCode('');
    setSnapshot(null);
    setProfile(null);
    setHistory([]);
    setLeaderboard([]);
    setProgression(null);
    setQuests([]);
    setOnboarding(null);
    setTutorial(createTutorialState());
    setTutorialReplay(false);
    setDismissedCoachSteps([]);
    setNotice('Signed out on this device.');
    setScreen(TRAINING_CHOICE_ENABLED ? 'training-choice' : 'home');
    historyReplace('/');
  }, [playerId]);

  async function start(mode: GameMode) {
    if (blockOfflineWrite('Starting a match')) return;
    try {
      setBusy(`start-${mode}`);
      persistTag();
      const options = mode === 'battle' && LOBBY_V2_ENABLED
        ? { lobbyVersion: 2 as const }
        : mode === 'daily' && progression?.daily
          ? { dailyId: progression.daily.id }
        : mode === 'blitz'
            ? { clock: { turnLimitMs: 30_000 }, boardSize: activeBoardSize }
            : mode === 'solo'
              ? { boardSize: activeBoardSize, botProfileId: selectedBot?.profileId }
              : undefined;
      const data = await createGame(mode, playerId, safeTag, options);
      setSnapshot(data.snapshot);
      if (data.snapshot.lobby && data.snapshot.status !== 'active') {
        setNotice(`Battle code ${data.snapshot.inviteCode} is ready to share.`);
        emitTelemetry({ name: 'lobby_created', playerId, matchId: data.snapshot.id, properties: { status: 'waiting' } });
        setScreen('lobby');
      } else {
        const resumedDaily = mode === 'daily' && data.snapshot.version > 0;
        setNotice(mode === 'battle' ? `Share battle code ${data.snapshot.inviteCode}.` : resumedDaily ? 'Daily challenge resumed.' : 'Match ready.');
        if (mode === 'daily') emitTelemetry({ name: resumedDaily ? 'daily_resumed' : 'daily_started', playerId, matchId: data.snapshot.id, properties: { dailyId: data.snapshot.dailyId ?? '', date: data.snapshot.dailyId ?? '' } });
        if (mode === 'blitz') emitTelemetry({ name: 'blitz_started', playerId, matchId: data.snapshot.id, properties: { turnLimitMs: data.snapshot.clock?.config.turnLimitMs ?? 0, boardSize: data.snapshot.boardSize ?? 9 } });
        if (mode === 'solo' || mode === 'blitz') emitTelemetry({ name: 'board_size_selected', playerId, matchId: data.snapshot.id, properties: { boardSize: data.snapshot.boardSize ?? 9, mode } });
        if (mode === 'solo' && data.snapshot.botProfile) emitTelemetry({ name: 'bot_profile_selected', playerId, matchId: data.snapshot.id, properties: { profileId: data.snapshot.botProfile.profileId, difficulty: data.snapshot.botProfile.difficulty, boardSize: data.snapshot.boardSize ?? 9 } });
        setScreen('match');
      }
      historyReplace(`/play/${data.snapshot.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start match.');
      if (mode === 'daily') emitTelemetry({ name: 'daily_error', playerId, result: 'error', properties: { errorCode: 'daily_start_failed' } });
    } finally {
      setBusy('');
    }
  }

  async function join() {
    if (blockOfflineWrite('Joining a battle')) return;
    try {
      setBusy('join');
      persistTag();
      const data = await joinGame(inviteCode, playerId, safeTag);
      setSnapshot(data.snapshot);
      setNotice(data.snapshot.lobby ? 'Battle lobby joined. Mark ready when you are set.' : 'Battle joined.');
      emitTelemetry({ name: 'lobby_joined', playerId, matchId: data.snapshot.id, properties: { status: data.snapshot.lobby?.status ?? 'active' } });
      setScreen(data.snapshot.lobby && data.snapshot.status !== 'active' ? 'lobby' : 'match');
      historyReplace(`/play/${data.snapshot.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not join battle.');
    } finally {
      setBusy('');
    }
  }

  async function persistTutorial(step: TutorialStepId, completed = false) {
    const local: OnboardingState = { playerId, lastStep: step, completedAt: completed ? new Date().toISOString() : onboarding?.completedAt, dismissedAt: onboarding?.dismissedAt, updatedAt: new Date().toISOString() };
    setOnboarding(local);
    setLocalOnboarding(local);
    emitTelemetry({ name: completed ? 'onboarding_completed' : 'onboarding_step_completed', playerId, properties: { step } });
    try {
      const data = await persistOnboarding(playerId, { step, completed });
      setOnboarding(data.onboarding);
      setLocalOnboarding(data.onboarding);
    } catch {
      setNotice('Tutorial progress is saved locally. Server sync will retry on the next step.');
    }
  }

  async function skipTutorial() {
    const local: OnboardingState = { playerId, dismissedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setOnboarding(local);
    setLocalOnboarding(local);
    setTutorialReplay(false);
    setScreen('home');
    setNotice('Tutorial skipped. You can replay it from Profile.');
    emitTelemetry({ name: 'onboarding_skipped', playerId, result: 'cancelled' });
    try {
      const data = await persistOnboarding(playerId, { dismissed: true });
      setOnboarding(data.onboarding);
      setLocalOnboarding(data.onboarding);
    } catch {
      setNotice('Tutorial skip is saved locally. Server sync will retry later.');
    }
  }

  function openTutorial(replay = false) {
    const state = createTutorialState(replay ? undefined : onboarding?.lastStep);
    setTutorial(state);
    setTutorialReplay(replay);
    setScreen('tutorial');
    setNotice(replay ? 'Tutorial replay started.' : 'Tutorial resumed.');
    emitTelemetry({ name: 'onboarding_started', playerId, properties: { source: replay ? 'profile' : 'first-run' } });
  }

  function selectTutorialTile(cell: BoardCell) {
    const result = selectTutorialCell(tutorial, cell);
    setNotice(result.announcement);
    if (!result.accepted) return;
    setTutorial(result.state);
    if (result.completedStep) void persistTutorial(result.completedStep);
  }

  function selectSuggestedTile() {
    selectTutorialTile(getSuggestedTutorialCell(tutorial));
  }

  function resolveAiTurn() {
    const result = resolveTutorialAi(tutorial);
    setNotice(result.announcement);
    if (!result.accepted) return;
    setTutorial(result.state);
    if (result.completedStep) void persistTutorial(result.completedStep);
  }

  async function chooseTraining(choice: TrainingChoice) {
    const now = new Date().toISOString();
    const local: OnboardingState = { playerId, trainingChoice: choice, trainingChoiceAt: now, updatedAt: now };
    setOnboarding(local);
    setLocalOnboarding(local);
    emitTelemetry({ name: 'training_choice_selected', playerId, properties: { choice } });
    try {
      const data = await persistOnboarding(playerId, { trainingChoice: choice });
      setOnboarding(data.onboarding);
      setLocalOnboarding(data.onboarding);
    } catch {
      setNotice('Training choice is saved locally. Server sync will retry from your next tutorial step.');
      emitTelemetry({ name: 'onboarding_failed', playerId, result: 'error', properties: { errorCode: 'training_choice_sync_failed', retryable: true } });
    }
    if (choice === 'learn') openTutorial(false);
    else {
      setScreen('home');
      setNotice('You can start on 5x5 now or open Journey to unlock larger boards.');
    }
  }

  async function buyBoard(boardSize: BoardSize) {
    if (blockOfflineWrite('Buying a board')) return;
    try {
      setBusy(`buy-${boardSize}`);
      const data = await purchaseBoardSize(playerId, boardSize);
      setProgression((current) => current ? { ...current, progression: data.progression } : current);
      setNotice(`${boardSize}x${boardSize} unlocked. Spendable XP updated.`);
      emitTelemetry({ name: 'board_unlock_purchased', playerId, properties: { boardSize, costXp: boardUnlockCost(boardSize), spendableBucket: xpBucket(data.progression.wallet.spendableXp), result: 'ok' } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Board purchase failed.';
      setNotice(boardPurchaseMessage(message, boardSize));
      emitTelemetry({ name: 'board_unlock_failed', playerId, result: 'error', properties: { boardSize, costXp: boardUnlockCost(boardSize), errorCode: message, retryable: true } });
      void refreshProgression();
    } finally {
      setBusy('');
    }
  }

  async function chooseBoard(boardSize: BoardSize) {
    if (blockOfflineWrite('Selecting a board')) return;
    try {
      setBusy(`select-${boardSize}`);
      const data = await selectBoardSize(playerId, boardSize);
      setProgression((current) => current ? { ...current, progression: data.progression } : current);
      setNotice(`${boardSize}x${boardSize} is now active for solo and Blitz.`);
      emitTelemetry({ name: 'board_size_selected', playerId, properties: { boardSize } });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not select board size.');
      void refreshProgression();
    } finally {
      setBusy('');
    }
  }

  async function refreshProgression() {
    try {
      const data = await fetchProgression(playerId);
      setProgression(data);
      setQuests(data.quests);
    } catch {
      setNotice('Progression is temporarily unavailable. Try again from Journey.');
    }
  }

  async function claimSeason(rewardId: string) {
    if (blockOfflineWrite('Claiming a season reward')) return;
    try {
      setBusy(`claim-${rewardId}`);
      const data = await claimSeasonReward(playerId, rewardId);
      setProgression((current) => current ? { ...current, activeSeason: data.activeSeason, badgeAlbum: { seasonId: data.activeSeason.definition.seasonId, badges: data.activeSeason.definition.collectibles.map((badge) => ({ ...badge, state: data.activeSeason.progress.collectedIds.includes(badge.collectibleId) ? 'collected' : (data.activeSeason.progress.taskProgress[badge.taskId] ?? 0) >= badge.threshold ? 'unlocked' : 'locked' })) }, progression: data.progression } : current);
      setNotice(data.profileDelta.xp ? `${data.reward.title} claimed for ${data.reward.xp} XP.` : `${data.reward.title} was already claimed.`);
      emitTelemetry({ name: 'season_reward_claimed', playerId, properties: { seasonId: data.activeSeason.definition.seasonId, rewardId, xp: data.reward.xp, newlyClaimed: data.profileDelta.xp > 0 } });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Reward claim failed.');
      emitTelemetry({ name: 'season_progress_error', playerId, result: 'error', properties: { rewardId, errorCode: error instanceof Error ? error.message : 'claim_failed' } });
      void refreshProgression();
    } finally {
      setBusy('');
    }
  }

  function openHelp(topic: RulesHelpTopicId = topicForScreen(screen)) {
    setHelpTopic(topic);
    setHelpOpen(true);
    emitTelemetry({ name: 'rules_help_opened', playerId, properties: { screen, topic, boardSize: activeBoardSize } });
  }

  async function finishTutorial() {
    await persistTutorial('finish', true);
    setTutorialReplay(false);
    setNotice('Tutorial complete. Starting your first solo match.');
    await start('solo');
  }

  async function copyInvite() {
    if (!snapshot) return;
    const url = `${window.location.origin}/play/${snapshot.id}`;
    try {
      await navigator.clipboard.writeText(`${snapshot.inviteCode} ${url}`);
      setNotice('Invite copied.');
      emitTelemetry({ name: 'lobby_copied', playerId, matchId: snapshot.id, properties: { status: snapshot.lobby?.status ?? 'waiting' } });
    } catch {
      setNotice(`Copy failed. Select the code ${snapshot.inviteCode}.`);
    }
  }

  async function shareInvite() {
    if (!snapshot) return;
    const url = `${window.location.origin}/play/${snapshot.id}`;
    if (!navigator.share) {
      await copyInvite();
      return;
    }
    try {
      await navigator.share({ title: 'Matimato battle', text: `Join my Matimato battle with code ${snapshot.inviteCode}.`, url });
      setNotice('Share sheet opened.');
      emitTelemetry({ name: 'lobby_shared', playerId, matchId: snapshot.id, properties: { status: snapshot.lobby?.status ?? 'waiting' } });
    } catch {
      setNotice('Share cancelled. The invite code remains visible.');
    }
  }

  async function markReady() {
    if (!snapshot) return;
    if (blockOfflineWrite('Marking ready')) return;
    try {
      setBusy('ready');
      const data = await readyLobby(snapshot.id, playerId);
      setSnapshot(data.snapshot);
      setNotice(data.snapshot.status === 'active' ? 'Both players are ready. Entering match.' : 'Ready marked. Waiting for the other player.');
      emitTelemetry({ name: 'lobby_ready', playerId, matchId: snapshot.id, properties: { status: data.snapshot.lobby?.status ?? data.snapshot.status } });
      if (data.snapshot.status === 'active') setScreen('match');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark ready.');
    } finally {
      setBusy('');
    }
  }

  async function exitLobby(kind: 'leave' | 'cancel') {
    if (!snapshot) return;
    if (blockOfflineWrite(kind === 'cancel' ? 'Cancelling a lobby' : 'Leaving a lobby')) return;
    try {
      setBusy(kind);
      const data = kind === 'cancel' ? await cancelLobby(snapshot.id, playerId) : await leaveLobby(snapshot.id, playerId);
      setSnapshot(data.snapshot);
      setScreen('home');
      historyReplace('/');
      setNotice(kind === 'cancel' ? 'Battle lobby cancelled.' : 'You left the battle lobby.');
      emitTelemetry({ name: kind === 'cancel' ? 'lobby_cancelled' : 'lobby_cancelled', playerId, matchId: snapshot.id, result: 'cancelled', properties: { status: data.snapshot.lobby?.status ?? 'cancelled' } });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update lobby.');
    } finally {
      setBusy('');
    }
  }

  if (screen === 'match' && snapshot) {
    return <PhaserGameRoot snapshot={snapshot} playerId={playerId} onExit={() => { setScreen('home'); historyReplace('/'); }} onComplete={(next) => {
      setSnapshot(next);
      setNotice('Match complete. Recap ready.');
      emitTelemetry({ name: next.mode === 'daily' ? 'daily_completed' : 'match_completed', playerId, matchId: next.id, properties: { mode: next.mode, dailyId: next.dailyId ?? '', scoreBucket: scoreBucket(next.players.north?.score ?? 0) } });
      if (next.mode === 'blitz') emitTelemetry({ name: 'blitz_completed', playerId, matchId: next.id, properties: { moveCount: next.moveLog?.length ?? 0, outcomeReason: next.outcome?.reason ?? '' } });
      if (next.mode === 'daily') void fetchProgression(playerId).then((data) => { setProgression(data); setQuests(data.quests); });
      setScreen('recap');
    }} />;
  }

  return (
    <main className={`app-shell theme-${screen === 'tutorial' ? 'home' : screen}`}>
      <Header status={screen === 'home' ? 'Ready' : screen} onHelp={RULE_ASSIST_ENABLED && screen !== 'training-choice' ? () => openHelp() : undefined} />
      <p className="sr-only" aria-live="polite">{notice}</p>
      <div className={`notice-slot${notice || networkState !== 'online' ? '' : ' empty'}`}>
        {networkState !== 'online'
          ? <NetworkRecovery state={networkState} retry={retryNetwork} />
          : notice ? <div className="notice" role="status">{notice}</div> : null}
      </div>
      <div className="screen-slot">
        {screen === 'training-choice' ? <TrainingChoiceScreen choose={chooseTraining} /> : null}
        {screen === 'home' ? <Home tag={tag} setTag={setTag} start={start} goBattle={() => setScreen('battle')} goJourney={() => setScreen('journey')} busy={busy} boardSize={activeBoardSize} journeyEnabled={BOARD_JOURNEY_ENABLED} botProfiles={botProfiles} selectedBotProfileId={selectedBot?.profileId ?? DEFAULT_BOT_PROFILE_ID} setSelectedBotProfileId={setSelectedBotProfileId} /> : null}
        {screen === 'journey' ? <BoardJourney progression={boardProgression} buy={buyBoard} select={chooseBoard} start={start} busy={busy} /> : null}
        {screen === 'tutorial' ? <Tutorial state={tutorial} select={selectTutorialTile} suggest={selectSuggestedTile} resolveAi={resolveAiTurn} finish={finishTutorial} skip={skipTutorial} busy={busy} coachEnabled={COACH_BUBBLES_ENABLED} dismissedCoachSteps={dismissedCoachSteps} dismissCoach={(step) => {
          setDismissedCoachSteps((steps) => steps.includes(step) ? steps : [...steps, step]);
          emitTelemetry({ name: 'coach_bubble_dismissed', playerId, properties: { step } });
        }} /> : null}
        {screen === 'battle' ? <Battle tag={tag} setTag={setTag} start={start} inviteCode={inviteCode} setInviteCode={setInviteCode} join={join} busy={busy} /> : null}
        {screen === 'lobby' && snapshot && lobby ? <Lobby snapshot={snapshot} lobby={lobby} playerId={playerId} copy={copyInvite} share={shareInvite} ready={markReady} exit={exitLobby} busy={busy} /> : null}
        {screen === 'recap' && snapshot ? <Recap snapshot={snapshot} playerId={playerId} rematch={() => start(snapshot.mode === 'daily' ? 'solo' : snapshot.mode)} home={() => { setScreen('home'); historyReplace('/'); }} ranks={() => setScreen('ranks')} busy={busy} /> : null}
        {screen === 'quests' ? <Quests progression={progression} quests={quests} start={() => start('daily')} busy={busy} dailyEnabled={DAILY_V2_ENABLED} seasonalEnabled={SEASONAL_EVENTS_ENABLED} claimSeason={claimSeason} /> : null}
        {screen === 'ranks' ? <Ranks leaderboard={leaderboard} /> : null}
        {screen === 'history' ? <History history={history} /> : null}
        {screen === 'profile' ? <Profile tag={tag} setTag={setTag} persistTag={persistTag} profile={profile} replayTutorial={() => openTutorial(true)} signOut={signOut} /> : null}
      </div>
      {screen !== 'tutorial' && screen !== 'lobby' && screen !== 'training-choice' ? <Nav screen={screen} setScreen={setScreen} /> : null}
      <RulesHelpDialog open={helpOpen} topicId={helpTopic} snapshot={snapshot} onTopicChange={(topicId) => {
        setHelpTopic(topicId);
        emitTelemetry({ name: 'rules_help_topic_viewed', playerId, properties: { screen, topic: topicId } });
      }} onClose={() => {
        setHelpOpen(false);
        emitTelemetry({ name: 'rules_help_closed', playerId, properties: { screen } });
      }} onReplayTutorial={screen === 'profile' || screen === 'home' ? () => {
        setHelpOpen(false);
        emitTelemetry({ name: 'rules_tutorial_replay_started', playerId, properties: { screen } });
        openTutorial(true);
      } : undefined} />
    </main>
  );
}

function Header({ status, onHelp }: { status: string; onHelp?: () => void }) {
  return (
    <section className="top-card" aria-label="Matimato status">
      <div className="brand"><div className="logo" aria-hidden="true">M</div><h1>Matimato</h1></div>
      <Group gap="xs">
        {onHelp ? <Button size="xs" variant="light" aria-label="Open rules help" onClick={onHelp}><IconHelpCircle size={18} aria-hidden="true" /></Button> : null}
        <Badge variant="light" color="orange">{status}</Badge>
      </Group>
    </section>
  );
}

function NetworkRecovery({ state, retry }: { state: NetworkState; retry: () => void }) {
  const copy = state === 'reconnecting'
    ? 'Reconnecting to Matimato.'
    : state === 'degraded'
      ? 'Server is not responding.'
      : 'Offline. Shell only.';
  return (
    <div className="notice network-recovery" role="status" aria-live="assertive">
      <span>{copy}</span>
      <Button size="xs" variant="light" loading={state === 'reconnecting'} onClick={retry}>Retry</Button>
    </div>
  );
}

function TrainingChoiceScreen({ choose }: { choose: (choice: TrainingChoice) => void }) {
  return (
    <section className="panel training-choice" aria-labelledby="training-choice-title">
      <Stack gap="md">
        <Badge color="orange" variant="light">First run</Badge>
        <h2 id="training-choice-title">Learn the chase or jump in.</h2>
        <p className="copy">Matimato is a row-and-column score game. Claim tiles, add positive values, survive negative traps, and use each pick to force the next legal row or column.</p>
        <div className="stack" aria-label="Game basics">
          <div className="list-card"><strong>Start small</strong><p className="copy">Your first board is 5x5 so the rule loop is easier to read.</p></div>
          <div className="list-card"><strong>Grow with XP</strong><p className="copy">Earn XP from matches, then spend available XP to unlock 6x6 through 9x9.</p></div>
        </div>
        <SimpleGrid cols={2}>
          <Button size="lg" onClick={() => choose('learn')}>Learn the game</Button>
          <Button size="lg" variant="light" onClick={() => choose('play-now')}>Play now</Button>
        </SimpleGrid>
      </Stack>
    </section>
  );
}

function Home({ tag, setTag, start, goBattle, goJourney, busy, boardSize, journeyEnabled, botProfiles, selectedBotProfileId, setSelectedBotProfileId }: { tag: string; setTag: (v: string) => void; start: (mode: GameMode) => void; goBattle: () => void; goJourney: () => void; busy: string; boardSize: BoardSize; journeyEnabled: boolean; botProfiles: BotProfileSummary[]; selectedBotProfileId: string; setSelectedBotProfileId: (profileId: string) => void }) {
  return (
    <section className="panel">
      <Stack gap="sm">
        <span className="hero-tag">{boardSize}x{boardSize} score chase</span>
        <h2>Own the grid.</h2>
        <p className="copy">Pick bright tiles, dodge negative traps, force the next move through rows and columns, and spend XP to unlock bigger boards.</p>
        <TextInput label="Player tag" value={tag} onChange={(event) => setTag(event.currentTarget.value)} placeholder="Enter your tag" />
        <div className="bot-picker" role="radiogroup" aria-label="Solo opponent">
          {botProfiles.map((profile) => (
            <button key={profile.profileId} type="button" role="radio" aria-checked={selectedBotProfileId === profile.profileId} className={selectedBotProfileId === profile.profileId ? 'active' : ''} onClick={() => {
              setSelectedBotProfileId(profile.profileId);
              emitTelemetry({ name: 'bot_profile_viewed', properties: { profileId: profile.profileId, difficulty: profile.difficulty, boardSize } });
            }}>
              <strong>{profile.name}</strong>
              <span>{profile.difficulty} · {profile.description}</span>
            </button>
          ))}
        </div>
        <SimpleGrid cols={2}>
          <Button size="lg" loading={busy === 'start-solo'} onClick={() => start('solo')}>Start solo</Button>
          <Button size="lg" variant="light" onClick={goBattle}>Battle</Button>
        </SimpleGrid>
        {journeyEnabled ? <Button variant="light" onClick={goJourney}>Board journey</Button> : null}
        <Button disabled={!BLITZ_ENABLED} loading={busy === 'start-blitz'} onClick={() => start('blitz')}>Blitz quick match</Button>
      </Stack>
    </section>
  );
}

function BoardJourney({ progression, buy, select, start, busy }: { progression: BoardProgression | undefined; buy: (size: BoardSize) => void; select: (size: BoardSize) => void; start: (mode: GameMode) => void; busy: string }) {
  useEffect(() => {
    if (progression) emitTelemetry({ name: 'board_unlock_viewed', properties: { boardSize: progression.boardUnlocks.activeBoardSize, spendableBucket: xpBucket(progression.wallet.spendableXp) } });
  }, [progression]);

  if (!progression) {
    return <section className="panel"><Stack gap="md"><Badge color="gray" variant="light">Journey</Badge><h2>Loading boards.</h2><p className="copy">Wallet and unlock state are loading.</p></Stack></section>;
  }
  const { wallet, boardUnlocks } = progression;
  const nextUnlock = boardUnlocks.nextUnlock;
  const journeyStatus = nextUnlock
    ? wallet.spendableXp >= nextUnlock.costXp
      ? `${nextUnlock.boardSize}x${nextUnlock.boardSize} is ready to buy for ${nextUnlock.costXp} XP.`
      : `Earn ${nextUnlock.costXp - wallet.spendableXp} more XP to unlock ${nextUnlock.boardSize}x${nextUnlock.boardSize}.`
    : 'Every board size is unlocked. Pick the board you want to play.';
  return (
    <section className="panel" aria-labelledby="journey-title">
      <Stack gap="sm">
        <Group justify="space-between">
          <span className="hero-tag">Board journey</span>
          <Badge color="green" variant="light">{boardUnlocks.activeBoardSize}x{boardUnlocks.activeBoardSize} active</Badge>
        </Group>
        <h2 id="journey-title">Unlock complexity with XP.</h2>
        <p className="copy">{journeyStatus}</p>
        <SimpleGrid cols={2}>
          <Kpi label="Lifetime XP" value={wallet.lifetimeXp} />
          <Kpi label="Spendable XP" value={wallet.spendableXp} />
        </SimpleGrid>
        <div className="board-track" role="list" aria-label="Board unlock ladder">
          {BOARD_SIZES.map((size) => {
            const unlocked = boardUnlocks.unlockedBoardSizes.includes(size);
            const active = boardUnlocks.activeBoardSize === size;
            const next = boardUnlocks.nextUnlock?.boardSize === size;
            const cost = size === 5 ? 0 : boardUnlockCost(size);
            const canBuy = next && wallet.spendableXp >= cost;
            const reason = unlocked ? active ? 'Currently active' : 'Unlocked' : next ? wallet.spendableXp >= cost ? `Costs ${cost} XP` : `Need ${cost - wallet.spendableXp} more XP` : 'Unlock earlier boards first';
            return (
              <button
                className={`board-chip ${active ? 'active' : unlocked ? 'unlocked' : next ? 'next' : 'locked'}`}
                disabled={active || (!unlocked && !canBuy)}
                key={size}
                type="button"
                role="listitem"
                aria-label={`${size} by ${size}. ${reason}`}
                onClick={() => unlocked ? select(size) : buy(size)}
              >
                <strong>{size}x{size}</strong>
                <span>{active ? 'Active' : unlocked ? 'Select' : next ? `${cost} XP` : 'Locked'}</span>
              </button>
            );
          })}
        </div>
        <SimpleGrid cols={2}>
          <Button loading={busy === 'start-solo'} onClick={() => start('solo')}>Start solo</Button>
          <Button loading={busy === 'start-blitz'} disabled={!BLITZ_ENABLED} variant="light" onClick={() => start('blitz')}>Start Blitz</Button>
        </SimpleGrid>
      </Stack>
    </section>
  );
}

function Recap({ snapshot, playerId, rematch, home, ranks, busy }: { snapshot: GameSnapshot; playerId: string; rematch: () => void; home: () => void; ranks: () => void; busy: string }) {
  const [replayIndex, setReplayIndex] = useState(0);
  const side = snapshot.players.south?.id === playerId ? 'south' : 'north';
  const you = snapshot.players[side];
  const rival = snapshot.players[side === 'north' ? 'south' : 'north'];
  const result = snapshot.outcome?.winner === 'draw' ? 'Draw' : snapshot.outcome?.winner === side ? 'Victory' : 'Defeat';
  const moves = snapshot.moveLog ?? [];
  const current = moves[Math.min(replayIndex, Math.max(0, moves.length - 1))];

  useEffect(() => {
    emitTelemetry({ name: 'recap_viewed', playerId, matchId: snapshot.id, properties: { mode: snapshot.mode, moveCount: moves.length, outcomeReason: snapshot.outcome?.reason ?? '' } });
  }, [moves.length, playerId, snapshot.id, snapshot.mode, snapshot.outcome?.reason]);

  async function share() {
    const text = `Matimato ${result}: ${you?.score ?? 0}-${rival?.score ?? 0} in ${snapshot.mode}.`;
    try {
      if (navigator.share) await navigator.share({ title: 'Matimato recap', text });
      else await navigator.clipboard.writeText(text);
      emitTelemetry({ name: 'recap_shared', playerId, matchId: snapshot.id, properties: { mode: snapshot.mode, result } });
      void recordSeasonAction({ playerId, source: 'recap', metric: 'share_recap', actionId: `${snapshot.id}:share`, boardSize: snapshot.boardSize });
    } catch {
      // Share cancellation is not an error state for gameplay.
    }
  }

  function replayNext() {
    setReplayIndex((value) => Math.min(value + 1, Math.max(0, moves.length - 1)));
    emitTelemetry({ name: 'recap_replay_started', playerId, matchId: snapshot.id, properties: { moveCount: moves.length } });
  }

  function rematchWithTelemetry() {
    emitTelemetry({ name: snapshot.mode === 'blitz' ? 'blitz_rematch_clicked' : 'rematch_started', playerId, matchId: snapshot.id, properties: { mode: snapshot.mode } });
    rematch();
  }

  return (
    <section className="panel recap-shell" aria-labelledby="recap-title">
      <Stack gap="md">
        <Group justify="space-between">
          <Badge color={result === 'Victory' ? 'green' : result === 'Draw' ? 'yellow' : 'pink'} variant="light">{result}</Badge>
          <Badge color="gray" variant="outline">{snapshot.mode}</Badge>
        </Group>
        <h2 id="recap-title">Match recap.</h2>
        <div className="score-row" aria-label="Final score">
          <Kpi label={you?.tag ?? 'You'} value={you?.score ?? 0} />
          <Kpi label={rival?.tag ?? 'Rival'} value={rival?.score ?? 0} />
        </div>
        <p className="copy">{snapshot.outcome?.reason === 'timeout-forfeit' ? 'Blitz ended by timeout forfeit.' : snapshot.outcome?.reason === 'no-legal-cells' ? 'No legal cells remained.' : 'The board reached its result state.'}</p>
        <div className="list-card" role="status" aria-label="Move replay">
          <strong>Replay {moves.length ? `${Math.min(replayIndex + 1, moves.length)} of ${moves.length}` : 'empty'}</strong>
          <p className="copy">
            {current
              ? current.timeout
                ? `${current.timeout.side} timed out at version ${current.timeout.deadlineVersion}.`
                : `${current.side} claimed ${signedValue(current.selected.value)} at row ${current.selected.row + 1}, column ${current.selected.col + 1}.`
              : 'No moves recorded for this match.'}
          </p>
          <Progress value={moves.length ? ((replayIndex + 1) / moves.length) * 100 : 0} aria-label="Replay progress" />
        </div>
        <SimpleGrid cols={2}>
          <Button disabled={!moves.length || replayIndex >= moves.length - 1} onClick={replayNext}>Replay next</Button>
          <Button variant="light" onClick={share}>Share recap</Button>
          <Button loading={busy === `start-${snapshot.mode === 'daily' ? 'solo' : snapshot.mode}`} onClick={rematchWithTelemetry}>{snapshot.mode === 'blitz' ? 'Blitz rematch' : 'Rematch'}</Button>
          <Button variant="light" onClick={ranks}>View ranks</Button>
        </SimpleGrid>
        <Button variant="subtle" onClick={home}>Back home</Button>
      </Stack>
    </section>
  );
}

function Tutorial({ state, select, suggest, resolveAi, finish, skip, busy, coachEnabled, dismissedCoachSteps, dismissCoach }: { state: TutorialState; select: (cell: BoardCell) => void; suggest: () => void; resolveAi: () => void; finish: () => void; skip: () => void; busy: string; coachEnabled: boolean; dismissedCoachSteps: TutorialStepId[]; dismissCoach: (step: TutorialStepId) => void }) {
  const step = TUTORIAL_STEPS.find((item) => item.id === state.step)!;
  const stepIndex = TUTORIAL_STEPS.findIndex((item) => item.id === state.step);
  const progress = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;
  const suggested = getSuggestedTutorialCell(state);
  const showCoach = coachEnabled && !dismissedCoachSteps.includes(state.step);
  const tutorialSize = Math.max(...state.board.map((cell) => cell.row)) + 1;
  const boardStyle = { '--tutorial-size': tutorialSize } as CSSProperties;
  function closeCoachForAction() {
    if (showCoach) dismissCoach(state.step);
  }
  useEffect(() => {
    if (showCoach) emitTelemetry({ name: 'coach_bubble_shown', properties: { step: state.step } });
  }, [showCoach, state.step]);
  return (
    <section className="panel tutorial-shell" aria-labelledby="tutorial-title">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Badge color="violet" variant="light">Guided match</Badge>
          <Badge color="gray" variant="outline">Step {stepIndex + 1} of {TUTORIAL_STEPS.length}</Badge>
        </Group>
        <h2 id="tutorial-title">{step.title}</h2>
        {showCoach ? <CoachModal step={state.step} title={step.title} body={step.body} dismiss={() => dismissCoach(state.step)} /> : null}
        <Progress value={progress} aria-label="Tutorial progress" />
        <div className="score-row" aria-label="Tutorial score">
          <Kpi label="You" value={state.scores.north} />
          <Kpi label="Matimato AI" value={state.scores.south} />
        </div>
        <p className="copy" role="status">{targetLabel(state.legalTarget)}</p>
        <div className="tutorial-board" role="grid" aria-label="Tutorial board" style={boardStyle}>
          {state.board.map((cell) => {
            const legal = isLegal(state.legalTarget, cell.row, cell.col, state.board);
            const disabled = cell.removed || state.step === 'ai-turn' || state.step === 'finish' || !legal;
            return (
              <button
                key={`${cell.row}-${cell.col}`}
                className={`tutorial-tile ${cell.value < 0 ? 'negative' : 'positive'} ${legal ? 'legal' : ''}`}
                disabled={disabled}
                aria-label={`Row ${cell.row + 1}, column ${cell.col + 1}, ${cell.value > 0 ? 'positive' : 'negative'} ${Math.abs(cell.value)}${legal ? ', legal target' : ''}`}
                onClick={() => {
                  closeCoachForAction();
                  select(cell);
                }}
                role="gridcell"
              >
                {cell.removed ? '' : cell.value}
              </button>
            );
          })}
        </div>
        <Group grow>
          {state.step === 'ai-turn' ? <Button onClick={() => { closeCoachForAction(); resolveAi(); }}>Resolve AI turn</Button> : null}
          {state.step !== 'ai-turn' && state.step !== 'finish' ? <Button onClick={() => { closeCoachForAction(); suggest(); }}>Choose suggested {signedValue(suggested.value)}</Button> : null}
          {state.step === 'finish' ? <Button loading={busy === 'start-solo'} onClick={() => { closeCoachForAction(); finish(); }}>Start real solo</Button> : null}
          <Button variant="light" color="gray" onClick={skip}>Skip</Button>
        </Group>
      </Stack>
    </section>
  );
}

function CoachModal({ step, title, body, dismiss }: { step: TutorialStepId; title: string; body: string; dismiss: () => void }) {
  const copy: Record<TutorialStepId, string> = {
    'first-pick': 'This first pick is free. Watch the value: green numbers raise your score and red numbers reduce it.',
    'column-target': 'The tile you picked created a column target. Only that column is legal now.',
    'row-target': 'Column moves hand the next player a row. That back-and-forth is the core Matimato rule.',
    'negative-risk': 'Negative tiles can still be the correct move if they force the rival into a worse target.',
    'ai-turn': 'The AI follows the same target rule. Resolve it to see how turns hand off.',
    finish: 'You now know scoring, legal targets, risk, and AI turns. A real match uses the same loop.'
  };
  return (
    <div className="coach-modal" role="dialog" aria-modal="false" aria-labelledby="coach-modal-title" aria-describedby="coach-modal-body">
      <div>
        <strong id="coach-modal-title">{title}</strong>
        <p id="coach-modal-body">{body} {copy[step]}</p>
      </div>
      <Button size="xs" variant="light" onClick={dismiss}>Hide</Button>
    </div>
  );
}

function Battle(props: { tag: string; setTag: (v: string) => void; start: (mode: GameMode) => void; inviteCode: string; setInviteCode: (v: string) => void; join: () => void; busy: string }) {
  return (
    <section className="panel">
      <Stack gap="md">
        <span className="hero-tag">Battle room</span>
        <h2>Invite a rival.</h2>
        <p className="copy">Create a battle lobby, share the invite, and enter only after both players are ready.</p>
        <TextInput label="Player tag" value={props.tag} onChange={(event) => props.setTag(event.currentTarget.value)} placeholder="Enter your tag" />
        <Button loading={props.busy === 'start-battle'} onClick={() => props.start('battle')}>Create lobby</Button>
        <TextInput label="Battle code" value={props.inviteCode} onChange={(event) => props.setInviteCode(event.currentTarget.value.toUpperCase())} placeholder="RACKA" />
        <Button variant="light" loading={props.busy === 'join'} onClick={props.join}>Join lobby</Button>
      </Stack>
    </section>
  );
}

function Lobby({ snapshot, lobby, playerId, copy, share, ready, exit, busy }: { snapshot: GameSnapshot; lobby: LobbyState; playerId: string; copy: () => void; share: () => void; ready: () => void; exit: (kind: 'leave' | 'cancel') => void; busy: string }) {
  const side = snapshot.players.south?.id === playerId ? 'south' : 'north';
  const readyBySide = Boolean(lobby.ready[side]);
  const creator = side === 'north';
  const expired = lobby.status === 'expired' || lobby.status === 'cancelled';
  return (
    <section className="panel">
      <Stack gap="md">
        <Group justify="space-between">
          <Badge color={expired ? 'red' : lobby.status === 'active' ? 'green' : 'blue'} variant="light">{lobby.status}</Badge>
          <Badge color="gray" variant="outline">Code {snapshot.inviteCode}</Badge>
        </Group>
        <h2>Battle lobby.</h2>
        <p className="copy">Share the code, wait for both seats, then mark ready. Match entry waits for an active server snapshot.</p>
        <div className="invite-code" aria-label="Invite code">{snapshot.inviteCode}</div>
        <Group grow>
          <Button onClick={copy}>Copy invite</Button>
          <Button variant="light" onClick={share}>Share</Button>
        </Group>
        <SimpleGrid cols={2}>
          <Seat label="Creator" player={snapshot.players.north?.tag ?? 'Open'} ready={Boolean(lobby.ready.north)} />
          <Seat label="Rival" player={snapshot.players.south?.tag ?? 'Open seat'} ready={Boolean(lobby.ready.south)} />
        </SimpleGrid>
        <p className="copy">Expires {new Date(lobby.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <Group grow>
          <Button disabled={expired || readyBySide || !snapshot.players.south} loading={busy === 'ready'} onClick={ready}>{readyBySide ? 'Ready marked' : 'Mark ready'}</Button>
          <Button color={creator ? 'red' : 'gray'} variant="light" loading={busy === 'cancel' || busy === 'leave'} onClick={() => exit(creator ? 'cancel' : 'leave')}>{creator ? 'Cancel lobby' : 'Leave lobby'}</Button>
        </Group>
      </Stack>
    </section>
  );
}

function Seat({ label, player, ready }: { label: string; player: string; ready: boolean }) {
  return <div className="list-card"><strong>{label}</strong><p className="copy">{player}</p><Badge color={ready ? 'green' : 'gray'} variant="light">{ready ? 'Ready' : 'Waiting'}</Badge></div>;
}

function Quests({ progression, quests, start, busy, dailyEnabled, seasonalEnabled, claimSeason }: { progression: ProgressionResponse | null; quests: QuestProgress[]; start: () => void; busy: string; dailyEnabled: boolean; seasonalEnabled: boolean; claimSeason: (rewardId: string) => void }) {
  const daily = progression?.daily;
  const completed = daily?.status === 'completed';
  const activeSeason = seasonalEnabled ? progression?.activeSeason : undefined;
  const album = seasonalEnabled ? progression?.badgeAlbum : undefined;
  return (
    <section className="panel scroll-screen">
      <div className="scroll-screen-header">
        <Group justify="space-between">
          <span className="hero-tag">Daily challenge</span>
          {daily ? <Badge color={completed ? 'green' : 'blue'} variant="light">{daily.status}</Badge> : null}
        </Group>
        <h2>Same grid. New chase.</h2>
        <p className="copy">{daily ? `UTC daily ${daily.date}. Resets ${new Date(daily.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : 'Loading daily challenge.'}</p>
        {progression ? (
          <SimpleGrid cols={2}>
            <Kpi label="Current streak" value={progression.streak.current} />
            <Kpi label="Best streak" value={progression.streak.best} />
          </SimpleGrid>
        ) : null}
        {progression?.dailyResult ? (
          <div className="list-card" role="status">
            <strong>Completed today</strong>
            <p className="copy">Score {progression.dailyResult.score} · Attempts {progression.dailyResult.attempts} · {new Date(progression.dailyResult.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        ) : null}
        <Button loading={busy === 'start-daily'} disabled={!dailyEnabled || completed || !daily} onClick={start}>{completed ? 'Daily complete' : 'Start or resume daily'}</Button>
      </div>
      <div className="scroll-list" role="region" aria-label="Daily quests and weekly ranks" tabIndex={0}>
        {activeSeason ? (
          <div className="season-card" aria-labelledby="season-title">
            <Group justify="space-between">
              <strong id="season-title">{activeSeason.definition.title}</strong>
              <Badge color={activeSeason.status === 'completed' ? 'green' : activeSeason.status === 'claimable' ? 'orange' : 'blue'} variant="light">{activeSeason.status}</Badge>
            </Group>
            <p className="copy">{activeSeason.nextAction}</p>
            <Progress value={Math.min(100, (activeSeason.points / 120) * 100)} aria-label={`${activeSeason.points} season points`} />
            <div className="badge-album" role="list" aria-label="Season badge album">
              {album?.badges.map((badge) => <div key={badge.collectibleId} className={`badge-tile ${badge.state}`} role="listitem"><strong>{badge.name}</strong><span>{badge.state}</span></div>)}
            </div>
            <div className="reward-list" aria-label="Season rewards">
              {activeSeason.definition.rewards.map((reward) => {
                const grant = activeSeason.progress.rewardGrants.find((item) => item.rewardId === reward.rewardId);
                const unlocked = activeSeason.points >= reward.threshold;
                const claimed = Boolean(grant?.claimedAt);
                return (
                  <div className="list-card reward-row" key={reward.rewardId}>
                    <div><strong>{reward.title}</strong><p className="copy">{reward.xp} XP · {Math.min(activeSeason.points, reward.threshold)}/{reward.threshold} points</p></div>
                    <Button size="xs" disabled={!unlocked || claimed} loading={busy === `claim-${reward.rewardId}`} onClick={() => claimSeason(reward.rewardId)}>{claimed ? 'Claimed' : 'Claim'}</Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="stack" aria-label="Daily quests">
          {quests.map((quest) => <div className="list-card" key={quest.id}><strong>{quest.title}</strong><p className="copy">{Math.min(quest.progress, quest.target)}/{quest.target} · {quest.rewardXp} XP</p></div>)}
        </div>
        <div className="stack" aria-label="Weekly challenge leaderboard">
          <strong>Weekly challenge ranks</strong>
          {progression?.weeklyLeaderboard.length ? progression.weeklyLeaderboard.map((entry) => (
            <div className="list-card rank-row" key={`${entry.rank}-${entry.playerHash}`}>
              <strong>#{entry.rank} {entry.tag}</strong>
              <p className="copy">Score {entry.score} · Attempts {entry.attempts} · {new Date(entry.completedAt).toLocaleDateString()}</p>
            </div>
          )) : <p className="copy">No daily completions on this week board yet.</p>}
        </div>
      </div>
    </section>
  );
}

function Ranks({ leaderboard }: { leaderboard: RankEntry[] }) {
  return (
    <section className="panel scroll-panel" aria-labelledby="ranks-title" tabIndex={0}>
      <div className="list-screen-header">
        <span className="hero-tag">Rank board</span>
        <h2 id="ranks-title">Climb the arena.</h2>
      </div>
      <div className="list-stack" role="list" aria-label="Ranking list">
        {leaderboard.length ? leaderboard.map((entry, index) => <div className="list-card" role="listitem" key={entry.playerId}><strong>#{index + 1} {entry.tag}</strong><p className="copy">{entry.score} XP · {entry.wins} wins</p></div>) : <p className="copy">No ranked matches yet.</p>}
      </div>
    </section>
  );
}

function History({ history }: { history: MatchSummary[] }) {
  return (
    <section className="panel scroll-panel" aria-labelledby="history-title" tabIndex={0}>
      <div className="list-screen-header">
        <span className="hero-tag">Match memory</span>
        <h2 id="history-title">Recent duels.</h2>
      </div>
      <div className="list-stack" role="list" aria-label="Match history list">
        {history.length ? history.map((match) => <div className="list-card" role="listitem" key={match.id}><strong>{match.result}</strong><p className="copy">vs {match.opponent} · {match.score}/{match.opponentScore} · {new Date(match.completedAt).toLocaleDateString()}</p></div>) : <p className="copy">Finish a match to build history.</p>}
      </div>
    </section>
  );
}

function Profile({ tag, setTag, persistTag, profile, replayTutorial, signOut }: { tag: string; setTag: (v: string) => void; persistTag: () => void; profile: ProfileSummary | null; replayTutorial: () => void; signOut: () => void }) {
  return (
    <section className="panel scroll-screen profile-panel">
      <div className="scroll-screen-header">
        <span className="hero-tag">Player card</span>
        <h2>{tag || 'Player'}</h2>
        <p className="copy">Track level, spendable XP, active board, and replay the rules path any time.</p>
        <TextInput label="Player tag" value={tag} onChange={(event) => setTag(event.currentTarget.value)} placeholder="Enter your tag" />
        <Group grow><Button onClick={persistTag}>Save tag</Button><Button variant="light" onClick={replayTutorial}>Replay tutorial</Button></Group>
        <Button variant="light" color="red" onClick={signOut}>
          <span className="button-icon-label"><IconLogout size={18} aria-hidden="true" /> Sign out</span>
        </Button>
      </div>
      <div className="scroll-list" role="region" aria-label="Player stats" tabIndex={0}>
        <div className="profile-stats"><Kpi label="Level" value={profile?.level ?? 1} /><Kpi label="Lifetime XP" value={profile?.xp ?? 0} /><Kpi label="Spendable XP" value={profile?.spendableXp ?? profile?.xp ?? 0} /><Kpi label="Active board" value={profile?.boardUnlocks.activeBoardSize ?? 5} /><Kpi label="Matches" value={profile?.matches ?? 0} /><Kpi label="Wins" value={profile?.wins ?? 0} /></div>
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="kpi"><span className="chip">{label}</span><strong>{value}</strong></div>; }

function Nav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const items = [
    ['home', 'Home', IconHome],
    ['journey', 'Journey', IconRoute],
    ['battle', 'Battle', IconSwords],
    ['quests', 'Quests', IconCalendar],
    ['ranks', 'Ranks', IconTrophy],
    ['history', 'History', IconHistory],
    ['profile', 'Profile', IconUser]
  ] as const;
  return (
    <nav className="nav" aria-label="Game navigation">
      {items.map(([key, label, Icon]) => (
        <button key={key} className={screen === key ? 'active' : ''} type="button" aria-label={label} title={label} onClick={() => setScreen(key)}>
          <Icon size={24} stroke={2.2} aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function shouldShowTutorial(onboarding: OnboardingState | null): boolean {
  return ONBOARDING_ENABLED && !onboarding?.completedAt && !onboarding?.dismissedAt;
}

function lobbyNotice(lobby: LobbyState): string {
  if (lobby.status === 'active') return 'Lobby is active.';
  if (lobby.status === 'expired') return 'Lobby expired. Create a fresh battle.';
  if (lobby.status === 'cancelled') return 'Lobby cancelled by the creator.';
  if (lobby.ready.north || lobby.ready.south) return 'One player is ready. Waiting for the other player.';
  return 'Lobby waiting for both players.';
}

function targetLabel(target: TutorialState['legalTarget']): string {
  if (target.axis === 'any') return 'Legal target: any open tile.';
  return `Legal target: ${target.axis} ${target.index + 1}.`;
}

function signedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function scoreBucket(score: number): string {
  if (score >= 50) return '50+';
  if (score >= 25) return '25-49';
  if (score >= 0) return '0-24';
  if (score >= -25) return '-25--1';
  return '<-25';
}

function xpBucket(xp: number): string {
  if (xp >= 900) return '900+';
  if (xp >= 520) return '520-899';
  if (xp >= 260) return '260-519';
  if (xp >= 120) return '120-259';
  return '0-119';
}

function boardPurchaseMessage(code: string, boardSize: BoardSize): string {
  if (code.includes('INSUFFICIENT_XP')) return `Not enough spendable XP for ${boardSize}x${boardSize}. Finish more matches and try again.`;
  if (code.includes('BOARD_SEQUENCE_LOCKED')) return 'Unlock the previous board before buying this one.';
  if (code.includes('BOARD_ALREADY_UNLOCKED')) return `${boardSize}x${boardSize} is already unlocked.`;
  if (code.includes('BOARD_JOURNEY_DISABLED')) return 'Board purchases are temporarily disabled.';
  return 'Board purchase failed. Refresh Journey and try again.';
}

function historyReplace(path: string) {
  if (typeof window !== 'undefined') window.history.replaceState(null, '', path);
}
