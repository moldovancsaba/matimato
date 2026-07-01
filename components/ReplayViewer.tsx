'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, Group, Progress, SimpleGrid, Stack } from '@doneisbetter/gds';
import { IconChevronLeft, IconChevronRight, IconCopy, IconHelpCircle, IconPlayerPause, IconPlayerPlay, IconSwords } from '@tabler/icons-react';
import { createGame, fetchReplay, getPlayerId, getPlayerTag } from '@/lib/client/api';
import { emitTelemetry, installTelemetryPagehide } from '@/lib/client/telemetry';
import type { GameMode, ReplayFrame, ReplaySnapshot } from '@/lib/shared/types';
import { RulesHelpDialog } from './RulesHelpDialog';

type Props = { replayId: string };

export function ReplayViewer({ replayId }: Props) {
  const [replay, setReplay] = useState<ReplaySnapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const playerId = useMemo(() => typeof window === 'undefined' ? '' : getPlayerId(), []);

  useEffect(() => installTelemetryPagehide(), []);

  useEffect(() => {
    let cancelled = false;
    fetchReplay(replayId).then((data) => {
      if (cancelled) return;
      setReplay(data.replay);
      setError('');
      emitTelemetry({
        name: 'replay_viewed',
        playerId,
        matchId: data.replay.matchId,
        properties: {
          mode: data.replay.mode,
          boardSize: data.replay.boardSize,
          frameCountBucket: countBucket(data.replay.frames.length),
          outcomeReason: data.replay.outcome.reason,
          summaryOnly: data.replay.summaryOnly
        }
      });
    }).catch((fetchError: Error) => {
      if (cancelled) return;
      setError(replayErrorCopy(fetchError.message));
      emitTelemetry({ name: 'replay_unavailable', playerId, result: 'error', properties: { errorCode: fetchError.message } });
    });
    return () => {
      cancelled = true;
    };
  }, [playerId, replayId]);

  const frames = replay?.frames ?? [];
  const current = frames[Math.min(step, Math.max(0, frames.length - 1))];
  const progress = frames.length ? ((step + 1) / frames.length) * 100 : 0;

  useEffect(() => {
    if (!playing || !frames.length) return;
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= frames.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [frames.length, playing]);

  const changeStep = useCallback((next: number) => {
    if (!replay) return;
    const bounded = Math.max(0, Math.min(next, Math.max(0, frames.length - 1)));
    setStep(bounded);
    emitTelemetry({ name: 'replay_step_changed', playerId, matchId: replay.matchId, properties: { stepIndex: bounded + 1, frameCountBucket: countBucket(frames.length) } });
  }, [frames.length, playerId, replay]);

  async function copyReplay() {
    if (!replay) return;
    const url = `${window.location.origin}/replay/${replay.replayId}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Replay link copied.');
      emitTelemetry({ name: 'replay_share_copied', playerId, matchId: replay.matchId, properties: { mode: replay.mode } });
    } catch {
      setNotice(`Copy failed. Use ${url}`);
      emitTelemetry({ name: 'replay_error', playerId, matchId: replay.matchId, result: 'error', properties: { errorCode: 'share_copy_failed' } });
    }
  }

  async function startFromReplay(mode: GameMode) {
    if (!replay) return;
    try {
      setBusy(`start-${mode}`);
      const tag = getPlayerTag() || 'Replay viewer';
      const options = mode === 'battle' ? { lobbyVersion: 2 as const } : mode === 'blitz' ? { clock: { turnLimitMs: 30_000 }, boardSize: replay.boardSize } : { boardSize: replay.boardSize };
      const data = await createGame(mode, playerId, tag, options);
      emitTelemetry({ name: 'replay_conversion_clicked', playerId, matchId: replay.matchId, properties: { mode, boardSize: replay.boardSize } });
      window.location.assign(`/play/${data.snapshot.id}`);
    } catch (startError) {
      setNotice(startError instanceof Error ? startError.message : 'Could not start from replay.');
      emitTelemetry({ name: 'replay_error', playerId, matchId: replay.matchId, result: 'error', properties: { errorCode: startError instanceof Error ? startError.message : 'conversion_failed' } });
    } finally {
      setBusy('');
    }
  }

  if (error) {
    return (
      <ReplayShell notice={notice} status="Replay unavailable" onHelp={() => setHelpOpen(true)}>
        <section className="panel replay-panel" aria-labelledby="replay-error-title">
          <Stack gap="md">
            <Badge color="red" variant="light">Unavailable</Badge>
            <h2 id="replay-error-title">Replay cannot be opened.</h2>
            <p className="copy">{error}</p>
            <Button onClick={() => window.location.assign('/')}>Back home</Button>
          </Stack>
        </section>
        <RulesHelpDialog open={helpOpen} topicId="objective" snapshot={null} onTopicChange={() => undefined} onClose={() => setHelpOpen(false)} />
      </ReplayShell>
    );
  }

  if (!replay) {
    return (
      <ReplayShell notice={notice} status="Loading replay" onHelp={() => setHelpOpen(true)}>
        <section className="panel replay-panel" aria-label="Replay loading">
          <Stack gap="md">
            <Badge color="blue" variant="light">Loading</Badge>
            <h2>Opening replay.</h2>
            <p className="copy">Fetching the public-safe match summary.</p>
          </Stack>
        </section>
        <RulesHelpDialog open={helpOpen} topicId="objective" snapshot={null} onTopicChange={() => undefined} onClose={() => setHelpOpen(false)} />
      </ReplayShell>
    );
  }

  const winner = replay.outcome.winner === 'draw' ? 'Draw' : `${playerTag(replay, replay.outcome.winner)} wins`;
  return (
    <ReplayShell notice={notice} status="Read-only replay" onHelp={() => setHelpOpen(true)}>
      <section className="panel replay-panel scroll-screen" aria-labelledby="replay-title">
        <div className="scroll-screen-header">
          <Group justify="space-between">
            <Badge color="blue" variant="light">{replay.mode}</Badge>
            <Badge color={replay.summaryOnly ? 'yellow' : 'green'} variant="light">{replay.summaryOnly ? 'Summary only' : `${frames.length} moves`}</Badge>
          </Group>
          <h2 id="replay-title">{winner}</h2>
          <p className="copy">Completed {new Date(replay.completedAt).toLocaleString()} on a {replay.boardSize}x{replay.boardSize} board. This page is read-only and cannot mutate the viewed match.</p>
          <SimpleGrid cols={2}>
            {replay.players.map((player) => <Kpi key={player.side} label={player.tag} value={player.score} />)}
          </SimpleGrid>
        </div>
        <div className="scroll-list" role="region" aria-label="Replay playback controls" tabIndex={0}>
          <div className="list-card replay-step-card" role="status" aria-live="polite">
            <strong>{frames.length ? `Move ${step + 1} of ${frames.length}` : 'No saved move log'}</strong>
            <p className="copy">{current ? frameCopy(current) : 'This older match has a final summary but no per-move replay frames.'}</p>
            <Progress value={progress} aria-label="Replay playback progress" />
          </div>
          <Group grow>
            <Button disabled={!frames.length || step <= 0} variant="light" aria-label="Previous replay move" onClick={() => changeStep(step - 1)}>
              <IconChevronLeft size={18} aria-hidden="true" />
            </Button>
            <Button disabled={!frames.length} onClick={() => {
              setPlaying((value) => !value);
              if (!playing) emitTelemetry({ name: 'replay_playback_started', playerId, matchId: replay.matchId, properties: { frameCountBucket: countBucket(frames.length) } });
            }}>
              <span className="button-icon-label">{playing ? <IconPlayerPause size={18} aria-hidden="true" /> : <IconPlayerPlay size={18} aria-hidden="true" />}{playing ? 'Pause' : 'Play'}</span>
            </Button>
            <Button disabled={!frames.length || step >= frames.length - 1} variant="light" aria-label="Next replay move" onClick={() => changeStep(step + 1)}>
              <IconChevronRight size={18} aria-hidden="true" />
            </Button>
          </Group>
          <SimpleGrid cols={2}>
            <Button loading={busy === 'start-solo'} onClick={() => startFromReplay('solo')}>Start solo</Button>
            <Button loading={busy === 'start-blitz'} variant="light" onClick={() => startFromReplay('blitz')}>Start Blitz</Button>
            <Button loading={busy === 'start-battle'} variant="light" onClick={() => startFromReplay('battle')}>
              <span className="button-icon-label"><IconSwords size={18} aria-hidden="true" /> Battle</span>
            </Button>
            <Button variant="light" onClick={copyReplay}>
              <span className="button-icon-label"><IconCopy size={18} aria-hidden="true" /> Copy link</span>
            </Button>
          </SimpleGrid>
          <Button variant="subtle" onClick={() => window.location.assign('/')}>Back home</Button>
        </div>
      </section>
      <RulesHelpDialog open={helpOpen} topicId="objective" snapshot={null} onTopicChange={() => undefined} onClose={() => setHelpOpen(false)} />
    </ReplayShell>
  );
}

function ReplayShell({ children, notice, status, onHelp }: { children: ReactNode; notice: string; status: string; onHelp: () => void }) {
  return (
    <main className="app-shell theme-history replay-app">
      <section className="top-card" aria-label="Matimato replay status">
        <div className="brand"><div className="logo" aria-hidden="true">M</div><h1>Matimato</h1></div>
        <Group gap="xs">
          <Button size="xs" variant="light" aria-label="Open rules help" onClick={onHelp}><IconHelpCircle size={18} aria-hidden="true" /></Button>
          <Badge variant="light" color="blue">{status}</Badge>
        </Group>
      </section>
      <p className="sr-only" aria-live="polite">{notice}</p>
      <div className={`notice-slot${notice ? '' : ' empty'}`}>{notice ? <div className="notice" role="status">{notice}</div> : null}</div>
      <div className="screen-slot">{children}</div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <div className="kpi"><span className="chip">{label}</span><strong>{value}</strong></div>;
}

function frameCopy(frame: ReplayFrame): string {
  if (frame.timeout) return `${frame.timeout.side} timed out at move ${frame.timeout.deadlineVersion}. Score ${frame.scores.north} to ${frame.scores.south}.`;
  return `${frame.side} claimed ${signedValue(frame.selected.value)} at row ${frame.selected.row + 1}, column ${frame.selected.col + 1}. Score ${frame.scores.north} to ${frame.scores.south}.`;
}

function signedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function playerTag(replay: ReplaySnapshot, side: string): string {
  return replay.players.find((player) => player.side === side)?.tag ?? String(side);
}

function countBucket(count: number): string {
  if (count >= 50) return '50+';
  if (count >= 20) return '20-49';
  if (count >= 1) return '1-19';
  return '0';
}

function replayErrorCopy(code: string): string {
  if (code.includes('REPLAY_NOT_FOUND')) return 'This replay link does not match a saved match.';
  if (code.includes('REPLAY_NOT_COMPLETE')) return 'This match is still active, so spectator replay is not available.';
  if (code.includes('REPLAY_PRIVATE')) return 'This match is private and cannot be shown from a public link.';
  if (code.includes('REPLAY_EXPIRED')) return 'This replay link has expired.';
  if (code.includes('REPLAY_UNAVAILABLE')) return 'Replay viewing is temporarily disabled.';
  return 'Replay data is temporarily unavailable.';
}
