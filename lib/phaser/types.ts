import type { GameSnapshot } from '@/lib/shared/types';

export type PhaserOutboundEvent =
  | { type: 'announce'; message: string }
  | { type: 'exit' }
  | { type: 'complete'; snapshot: GameSnapshot };

export type PhaserBootPayload = {
  snapshot: GameSnapshot;
  playerId: string;
  onEvent: (event: PhaserOutboundEvent) => void;
};

export type Rect = { x: number; y: number; width: number; height: number };
