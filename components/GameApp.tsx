'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Group, Progress, SimpleGrid, Stack, TextInput } from '@doneisbetter/gds';
import {
  cancelLobby,
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
  readyLobby,
  setLocalOnboarding,
  setPlayerTag
} from '@/lib/client/api';
import { getSuggestedTutorialCell, createTutorialState, resolveTutorialAi, selectTutorialCell, TUTORIAL_STEPS, type TutorialState } from '@/lib/game/tutorial';
import { isLegal } from '@/lib/game/rules';
import type { BoardCell, GameMode, GameSnapshot, LobbyState, MatchSummary, OnboardingState, ProfileSummary, RankEntry, TutorialStepId } from '@/lib/shared/types';
import { PhaserGameRoot } from './PhaserGameRoot';

type Screen = 'home' | 'battle' | 'quests' | 'ranks' | 'history' | 'profile' | 'match' | 'tutorial' | 'lobby';

type Props = { initialScreen: Screen; initialMatchId?: string };

const ONBOARDING_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_ONBOARDING !== 'false';
const LOBBY_V2_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_LOBBY_V2 !== 'false';

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
  const [quests, setQuests] = useState<Array<{ id: string; title: string; progress: number; target: number; rewardXp: number }>>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [tutorial, setTutorial] = useState<TutorialState>(() => createTutorialState());
  const [tutorialReplay, setTutorialReplay] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const id = getPlayerId();
    const savedTag = getPlayerTag();
    setPlayerId(id);
    setTag(savedTag);
    const localOnboarding = getLocalOnboarding(id);
    setOnboarding(localOnboarding);
    if (!initialMatchId && initialScreen === 'home' && shouldShowTutorial(localOnboarding)) {
      setTutorial(createTutorialState(localOnboarding?.lastStep));
      setScreen('tutorial');
    }
  }, [initialMatchId, initialScreen]);

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
      if (data.onboarding) {
        setOnboarding(data.onboarding);
        setLocalOnboarding(data.onboarding);
        if (screen === 'tutorial' && !tutorialReplay && !shouldShowTutorial(data.onboarding)) setScreen('home');
      }
    }).catch(() => undefined);
  }, [playerId, screen, tutorialReplay]);

  useEffect(() => {
    if (!playerId) return;
    if (screen === 'profile') fetchProfile(playerId, tag || 'Player').then((data) => setProfile(data.profile)).catch((error: Error) => setNotice(error.message));
    if (screen === 'history') fetchHistory(playerId).then((data) => setHistory(data.history)).catch((error: Error) => setNotice(error.message));
    if (screen === 'ranks') fetchLeaderboard().then((data) => setLeaderboard(data.leaderboard)).catch((error: Error) => setNotice(error.message));
    if (screen === 'quests') fetchProgression(playerId).then((data) => setQuests(data.quests)).catch((error: Error) => setNotice(error.message));
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
          setScreen('match');
          historyReplace(`/play/${data.snapshot.id}`);
          return;
        }
        delay = 'lobby' in data && (data.lobby.status === 'expired' || data.lobby.status === 'cancelled') ? 8000 : Math.min(delay + 700, 6000);
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'Lobby reconnect failed.');
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

  const persistTag = useCallback(() => {
    setPlayerTag(safeTag);
    setTag(safeTag);
  }, [safeTag]);

  async function start(mode: GameMode) {
    try {
      setBusy(`start-${mode}`);
      persistTag();
      const options = mode === 'battle' && LOBBY_V2_ENABLED ? { lobbyVersion: 2 as const } : undefined;
      const data = await createGame(mode, playerId, safeTag, options);
      setSnapshot(data.snapshot);
      if (data.snapshot.lobby && data.snapshot.status !== 'active') {
        setNotice(`Battle code ${data.snapshot.inviteCode} is ready to share.`);
        setScreen('lobby');
      } else {
        setNotice(mode === 'battle' ? `Share battle code ${data.snapshot.inviteCode}.` : 'Match ready.');
        setScreen('match');
      }
      historyReplace(`/play/${data.snapshot.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start match.');
    } finally {
      setBusy('');
    }
  }

  async function join() {
    try {
      setBusy('join');
      persistTag();
      const data = await joinGame(inviteCode, playerId, safeTag);
      setSnapshot(data.snapshot);
      setNotice(data.snapshot.lobby ? 'Battle lobby joined. Mark ready when you are set.' : 'Battle joined.');
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
    } catch {
      setNotice('Share cancelled. The invite code remains visible.');
    }
  }

  async function markReady() {
    if (!snapshot) return;
    try {
      setBusy('ready');
      const data = await readyLobby(snapshot.id, playerId);
      setSnapshot(data.snapshot);
      setNotice(data.snapshot.status === 'active' ? 'Both players are ready. Entering match.' : 'Ready marked. Waiting for the other player.');
      if (data.snapshot.status === 'active') setScreen('match');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark ready.');
    } finally {
      setBusy('');
    }
  }

  async function exitLobby(kind: 'leave' | 'cancel') {
    if (!snapshot) return;
    try {
      setBusy(kind);
      const data = kind === 'cancel' ? await cancelLobby(snapshot.id, playerId) : await leaveLobby(snapshot.id, playerId);
      setSnapshot(data.snapshot);
      setScreen('home');
      historyReplace('/');
      setNotice(kind === 'cancel' ? 'Battle lobby cancelled.' : 'You left the battle lobby.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update lobby.');
    } finally {
      setBusy('');
    }
  }

  if (screen === 'match' && snapshot) {
    return <PhaserGameRoot snapshot={snapshot} playerId={playerId} onExit={() => { setScreen('home'); historyReplace('/'); }} onComplete={(next) => { setSnapshot(next); setNotice('Match complete.'); }} />;
  }

  return (
    <main className={`app-shell theme-${screen === 'tutorial' ? 'home' : screen}`}>
      <Header status={screen === 'home' ? 'Ready' : screen} />
      <p className="sr-only" aria-live="polite">{notice}</p>
      {notice ? <div className="notice" role="status">{notice}</div> : null}
      {screen === 'home' ? <Home tag={tag} setTag={setTag} start={start} goBattle={() => setScreen('battle')} startTutorial={() => openTutorial(true)} busy={busy} /> : null}
      {screen === 'tutorial' ? <Tutorial state={tutorial} select={selectTutorialTile} suggest={selectSuggestedTile} resolveAi={resolveAiTurn} finish={finishTutorial} skip={skipTutorial} busy={busy} /> : null}
      {screen === 'battle' ? <Battle tag={tag} setTag={setTag} start={start} inviteCode={inviteCode} setInviteCode={setInviteCode} join={join} busy={busy} /> : null}
      {screen === 'lobby' && snapshot && lobby ? <Lobby snapshot={snapshot} lobby={lobby} playerId={playerId} copy={copyInvite} share={shareInvite} ready={markReady} exit={exitLobby} busy={busy} /> : null}
      {screen === 'quests' ? <Quests quests={quests} start={() => start('daily')} busy={busy} /> : null}
      {screen === 'ranks' ? <Ranks leaderboard={leaderboard} /> : null}
      {screen === 'history' ? <History history={history} /> : null}
      {screen === 'profile' ? <Profile tag={tag} setTag={setTag} persistTag={persistTag} profile={profile} replayTutorial={() => openTutorial(true)} /> : null}
      {screen !== 'tutorial' && screen !== 'lobby' ? <Nav screen={screen} setScreen={setScreen} /> : null}
    </main>
  );
}

function Header({ status }: { status: string }) {
  return (
    <section className="top-card" aria-label="Matimato status">
      <div className="brand"><div className="logo" aria-hidden="true">M</div><h1>Matimato</h1></div>
      <Badge variant="light" color="orange">{status}</Badge>
    </section>
  );
}

function Home({ tag, setTag, start, goBattle, startTutorial, busy }: { tag: string; setTag: (v: string) => void; start: (mode: GameMode) => void; goBattle: () => void; startTutorial: () => void; busy: string }) {
  return (
    <section className="panel">
      <Stack gap="md">
        <span className="hero-tag">9x9 score chase</span>
        <h2>Own the grid.</h2>
        <p className="copy">Pick bright tiles, dodge negative traps, and force the next move through rows and columns.</p>
        <TextInput label="Player tag" value={tag} onChange={(event) => setTag(event.currentTarget.value)} placeholder="Enter your tag" />
        <SimpleGrid cols={2}>
          <Button size="lg" loading={busy === 'start-solo'} onClick={() => start('solo')}>Start solo</Button>
          <Button size="lg" variant="light" onClick={goBattle}>Battle</Button>
        </SimpleGrid>
        <Button variant="subtle" onClick={startTutorial}>Replay tutorial</Button>
      </Stack>
    </section>
  );
}

function Tutorial({ state, select, suggest, resolveAi, finish, skip, busy }: { state: TutorialState; select: (cell: BoardCell) => void; suggest: () => void; resolveAi: () => void; finish: () => void; skip: () => void; busy: string }) {
  const step = TUTORIAL_STEPS.find((item) => item.id === state.step)!;
  const stepIndex = TUTORIAL_STEPS.findIndex((item) => item.id === state.step);
  const progress = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;
  const suggested = getSuggestedTutorialCell(state);
  return (
    <section className="panel tutorial-shell" aria-labelledby="tutorial-title">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Badge color="violet" variant="light">Guided match</Badge>
          <Badge color="gray" variant="outline">Step {stepIndex + 1} of {TUTORIAL_STEPS.length}</Badge>
        </Group>
        <h2 id="tutorial-title">{step.title}</h2>
        <p className="copy">{step.body}</p>
        <Progress value={progress} aria-label="Tutorial progress" />
        <div className="score-row" aria-label="Tutorial score">
          <Kpi label="You" value={state.scores.north} />
          <Kpi label="Matimato AI" value={state.scores.south} />
        </div>
        <p className="copy" role="status">{targetLabel(state.legalTarget)}</p>
        <div className="tutorial-board" role="grid" aria-label="Tutorial board">
          {state.board.map((cell) => {
            const legal = isLegal(state.legalTarget, cell.row, cell.col, state.board);
            const disabled = cell.removed || state.step === 'ai-turn' || state.step === 'finish' || !legal;
            return (
              <button
                key={`${cell.row}-${cell.col}`}
                className={`tutorial-tile ${cell.value < 0 ? 'negative' : 'positive'} ${legal ? 'legal' : ''}`}
                disabled={disabled}
                aria-label={`Row ${cell.row + 1}, column ${cell.col + 1}, ${cell.value > 0 ? 'positive' : 'negative'} ${Math.abs(cell.value)}${legal ? ', legal target' : ''}`}
                onClick={() => select(cell)}
                role="gridcell"
              >
                {cell.removed ? '' : cell.value}
              </button>
            );
          })}
        </div>
        <Group grow>
          {state.step === 'ai-turn' ? <Button onClick={resolveAi}>Resolve AI turn</Button> : null}
          {state.step !== 'ai-turn' && state.step !== 'finish' ? <Button onClick={suggest}>Choose suggested {signedValue(suggested.value)}</Button> : null}
          {state.step === 'finish' ? <Button loading={busy === 'start-solo'} onClick={finish}>Start real solo</Button> : null}
          <Button variant="light" color="gray" onClick={skip}>Skip</Button>
        </Group>
      </Stack>
    </section>
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

function Quests({ quests, start, busy }: { quests: Array<{ id: string; title: string; progress: number; target: number; rewardXp: number }>; start: () => void; busy: string }) {
  return <section className="panel stack"><span className="hero-tag">Daily challenge</span><h2>Same grid. New chase.</h2><Button loading={busy === 'start-daily'} onClick={start}>Start daily</Button>{quests.map((quest) => <div className="list-card" key={quest.id}><strong>{quest.title}</strong><p className="copy">{quest.progress}/{quest.target} · {quest.rewardXp} XP</p></div>)}</section>;
}

function Ranks({ leaderboard }: { leaderboard: RankEntry[] }) {
  return <section className="panel stack"><span className="hero-tag">Rank board</span><h2>Climb the arena.</h2>{leaderboard.length ? leaderboard.map((entry, index) => <div className="list-card" key={entry.playerId}><strong>#{index + 1} {entry.tag}</strong><p className="copy">{entry.score} XP · {entry.wins} wins</p></div>) : <p className="copy">No ranked matches yet.</p>}</section>;
}

function History({ history }: { history: MatchSummary[] }) {
  return <section className="panel stack"><span className="hero-tag">Match memory</span><h2>Review every duel.</h2>{history.length ? history.map((match) => <div className="list-card" key={match.id}><strong>{match.result}</strong><p className="copy">vs {match.opponent} · {match.score}/{match.opponentScore} · {new Date(match.completedAt).toLocaleDateString()}</p></div>) : <p className="copy">Finish a match to build history.</p>}</section>;
}

function Profile({ tag, setTag, persistTag, profile, replayTutorial }: { tag: string; setTag: (v: string) => void; persistTag: () => void; profile: ProfileSummary | null; replayTutorial: () => void }) {
  return (
    <section className="panel">
      <Stack gap="md">
        <span className="hero-tag">Player card</span>
        <h2>{tag || 'Player'}</h2>
        <p className="copy">Track level, form, best score, and replay the rules path any time.</p>
        <TextInput label="Player tag" value={tag} onChange={(event) => setTag(event.currentTarget.value)} placeholder="Enter your tag" />
        <Group grow><Button onClick={persistTag}>Save tag</Button><Button variant="light" onClick={replayTutorial}>Replay tutorial</Button></Group>
        <SimpleGrid cols={2}><Kpi label="Level" value={profile?.level ?? 1} /><Kpi label="XP" value={profile?.xp ?? 0} /><Kpi label="Matches" value={profile?.matches ?? 0} /><Kpi label="Wins" value={profile?.wins ?? 0} /></SimpleGrid>
      </Stack>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="kpi"><span className="chip">{label}</span><strong>{value}</strong></div>; }

function Nav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const items: Array<[Screen, string]> = [['home', 'Home'], ['battle', 'Battle'], ['quests', 'Quests'], ['ranks', 'Ranks'], ['history', 'History'], ['profile', 'Profile']];
  return <nav className="nav" aria-label="Game navigation">{items.map(([key, label]) => <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>{label}</button>)}</nav>;
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

function historyReplace(path: string) {
  if (typeof window !== 'undefined') window.history.replaceState(null, '', path);
}
