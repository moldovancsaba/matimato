'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createGame, fetchGame, fetchHistory, fetchLeaderboard, fetchProfile, fetchProgression, getPlayerId, getPlayerTag, joinGame, setPlayerTag } from '@/lib/client/api';
import type { GameMode, GameSnapshot, MatchSummary, ProfileSummary, RankEntry } from '@/lib/shared/types';
import { PhaserGameRoot } from './PhaserGameRoot';

type Screen = 'home' | 'battle' | 'quests' | 'ranks' | 'history' | 'profile' | 'match';

type Props = { initialScreen: Screen; initialMatchId?: string };

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

  useEffect(() => {
    const id = getPlayerId();
    const savedTag = getPlayerTag();
    setPlayerId(id);
    setTag(savedTag);
    if (initialMatchId) {
      fetchGame(initialMatchId).then((data) => {
        setSnapshot(data.snapshot);
        setScreen('match');
      }).catch((error: Error) => setNotice(error.message));
    }
  }, [initialMatchId]);

  useEffect(() => {
    if (!playerId) return;
    if (screen === 'profile') fetchProfile(playerId, tag || 'Player').then((data) => setProfile(data.profile)).catch((error: Error) => setNotice(error.message));
    if (screen === 'history') fetchHistory(playerId).then((data) => setHistory(data.history)).catch((error: Error) => setNotice(error.message));
    if (screen === 'ranks') fetchLeaderboard().then((data) => setLeaderboard(data.leaderboard)).catch((error: Error) => setNotice(error.message));
    if (screen === 'quests') fetchProgression().then((data) => setQuests(data.quests)).catch((error: Error) => setNotice(error.message));
  }, [screen, playerId, tag]);

  const safeTag = useMemo(() => tag.trim() || 'Player 1', [tag]);

  const persistTag = useCallback(() => {
    setPlayerTag(safeTag);
    setTag(safeTag);
  }, [safeTag]);

  async function start(mode: GameMode) {
    try {
      persistTag();
      const data = await createGame(mode, playerId, safeTag);
      setSnapshot(data.snapshot);
      setNotice(mode === 'battle' ? `Share battle code ${data.snapshot.inviteCode}.` : 'Match ready.');
      setScreen('match');
      historyReplace(`/play/${data.snapshot.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start match.');
    }
  }

  async function join() {
    try {
      persistTag();
      const data = await joinGame(inviteCode, playerId, safeTag);
      setSnapshot(data.snapshot);
      setNotice('Battle joined.');
      setScreen('match');
      historyReplace(`/play/${data.snapshot.id}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not join battle.');
    }
  }

  if (screen === 'match' && snapshot) {
    return <PhaserGameRoot snapshot={snapshot} playerId={playerId} onExit={() => { setScreen('home'); historyReplace('/'); }} onComplete={(next) => { setSnapshot(next); setNotice('Match complete.'); }} />;
  }

  return (
    <main className="app-shell">
      <Header status={screen === 'home' ? 'Ready' : screen} />
      {notice ? <div className="notice" role="status">{notice}</div> : null}
      {screen === 'home' ? <Home tag={tag} setTag={setTag} start={start} goBattle={() => setScreen('battle')} /> : null}
      {screen === 'battle' ? <Battle tag={tag} setTag={setTag} start={start} inviteCode={inviteCode} setInviteCode={setInviteCode} join={join} /> : null}
      {screen === 'quests' ? <Quests quests={quests} start={() => start('daily')} /> : null}
      {screen === 'ranks' ? <Ranks leaderboard={leaderboard} /> : null}
      {screen === 'history' ? <History history={history} /> : null}
      {screen === 'profile' ? <Profile tag={tag} setTag={setTag} persistTag={persistTag} profile={profile} /> : null}
      <Nav screen={screen} setScreen={setScreen} />
    </main>
  );
}

function Header({ status }: { status: string }) {
  return <section className="top-card"><div className="brand"><div className="logo">M</div><h1>Matimato</h1></div><div className="status-pill">{status}</div></section>;
}

function Home({ tag, setTag, start, goBattle }: { tag: string; setTag: (v: string) => void; start: (mode: GameMode) => void; goBattle: () => void }) {
  return <section className="panel stack"><span className="hero-tag">9x9 score chase</span><h2>Own the grid.</h2><p className="copy">Pick bright tiles, dodge red traps, and force the next move through rows and columns.</p><label className="stack">Player tag<input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Enter your tag" /></label><div className="grid two"><button className="btn mode" onClick={() => start('solo')}>SOLO</button><button className="btn mode secondary" onClick={goBattle}>BATTLE</button></div></section>;
}

function Battle(props: { tag: string; setTag: (v: string) => void; start: (mode: GameMode) => void; inviteCode: string; setInviteCode: (v: string) => void; join: () => void }) {
  return <section className="panel stack"><span className="hero-tag">Battle room</span><h2>Invite a rival.</h2><p className="copy">Create a battle code or enter one from another player.</p><label className="stack">Player tag<input className="input" value={props.tag} onChange={(e) => props.setTag(e.target.value)} placeholder="Enter your tag" /></label><button className="btn" onClick={() => props.start('battle')}>Create battle</button><label className="stack">Battle code<input className="input" value={props.inviteCode} onChange={(e) => props.setInviteCode(e.target.value.toUpperCase())} placeholder="RACKA" /></label><button className="btn secondary" onClick={props.join}>Join battle</button></section>;
}

function Quests({ quests, start }: { quests: Array<{ id: string; title: string; progress: number; target: number; rewardXp: number }>; start: () => void }) {
  return <section className="panel stack"><span className="hero-tag">Daily challenge</span><h2>Same grid. New chase.</h2><button className="btn" onClick={start}>Start daily</button>{quests.map((quest) => <div className="list-card" key={quest.id}><strong>{quest.title}</strong><p className="copy">{quest.progress}/{quest.target} · {quest.rewardXp} XP</p></div>)}</section>;
}

function Ranks({ leaderboard }: { leaderboard: RankEntry[] }) {
  return <section className="panel stack"><span className="hero-tag">Rank board</span><h2>Climb the arena.</h2>{leaderboard.length ? leaderboard.map((entry, index) => <div className="list-card" key={entry.playerId}><strong>#{index + 1} {entry.tag}</strong><p className="copy">{entry.score} XP · {entry.wins} wins</p></div>) : <p className="copy">No ranked matches yet.</p>}</section>;
}

function History({ history }: { history: MatchSummary[] }) {
  return <section className="panel stack"><span className="hero-tag">Match memory</span><h2>Review every duel.</h2>{history.length ? history.map((match) => <div className="list-card" key={match.id}><strong>{match.result}</strong><p className="copy">vs {match.opponent} · {match.score}/{match.opponentScore} · {new Date(match.completedAt).toLocaleDateString()}</p></div>) : <p className="copy">Finish a match to build history.</p>}</section>;
}

function Profile({ tag, setTag, persistTag, profile }: { tag: string; setTag: (v: string) => void; persistTag: () => void; profile: ProfileSummary | null }) {
  return <section className="panel stack"><span className="hero-tag">Player card</span><h2>{tag || 'Player'}</h2><p className="copy">Track level, form, and best score across the arena.</p><label className="stack">Player tag<input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Enter your tag" /></label><button className="btn" onClick={persistTag}>Save tag</button><div className="grid two"><Kpi label="Level" value={profile?.level ?? 1} /><Kpi label="XP" value={profile?.xp ?? 0} /><Kpi label="Matches" value={profile?.matches ?? 0} /><Kpi label="Wins" value={profile?.wins ?? 0} /></div></section>;
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="kpi"><span className="chip">{label}</span><strong>{value}</strong></div>; }

function Nav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const items: Array<[Screen, string]> = [['home', 'Home'], ['battle', 'Battle'], ['quests', 'Quests'], ['ranks', 'Ranks'], ['history', 'History'], ['profile', 'Profile']];
  return <nav className="nav" aria-label="Game navigation">{items.map(([key, label]) => <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>{label}</button>)}</nav>;
}

function historyReplace(path: string) {
  if (typeof window !== 'undefined') window.history.replaceState(null, '', path);
}
