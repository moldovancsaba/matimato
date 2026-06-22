'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameSnapshot } from '@/lib/shared/types';

type Props = {
  snapshot: GameSnapshot;
  playerId: string;
  onExit: () => void;
  onComplete: (snapshot: GameSnapshot) => void;
};

export function PhaserGameRoot({ snapshot, playerId, onExit, onComplete }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [announcement, setAnnouncement] = useState('Matimato game loading.');

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
          if (event.type === 'exit') onExit();
          if (event.type === 'complete') onComplete(event.snapshot);
        }
      });
    }
    void boot();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [snapshot, playerId, onExit, onComplete]);

  return (
    <main className="game-host" aria-label="Matimato active match">
      <div ref={hostRef} className="game-canvas" />
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </main>
  );
}
