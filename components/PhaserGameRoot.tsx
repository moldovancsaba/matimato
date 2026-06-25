'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameSnapshot } from '@/lib/shared/types';
import { emitTelemetry } from '@/lib/client/telemetry';

type Props = {
  snapshot: GameSnapshot;
  playerId: string;
  onExit: () => void;
  onComplete: (snapshot: GameSnapshot) => void;
};

export function PhaserGameRoot({ snapshot, playerId, onExit, onComplete }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onExitRef = useRef(onExit);
  const onCompleteRef = useRef(onComplete);
  const [announcement, setAnnouncement] = useState('Matimato game loading.');

  useEffect(() => {
    onExitRef.current = onExit;
    onCompleteRef.current = onComplete;
  }, [onExit, onComplete]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    async function boot() {
      const mod = await import('@/lib/phaser/boot');
      if (cancelled || !hostRef.current) return;
      dispose = mod.bootMatimato(hostRef.current, {
        snapshot,
        playerId,
        onEvent: (event) => {
          if (event.type === 'announce') setAnnouncement(event.message);
          if (event.type === 'telemetry') emitTelemetry({ name: event.name, playerId, matchId: snapshot.id, result: event.result, properties: { mode: snapshot.mode, ...(event.properties ?? {}) } });
          if (event.type === 'exit') onExitRef.current();
          if (event.type === 'complete') onCompleteRef.current(event.snapshot);
        }
      });
    }
    void boot();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [snapshot, playerId]);

  return (
    <main className="game-host" aria-label="Matimato active match">
      <div ref={hostRef} className="game-canvas" />
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </main>
  );
}
