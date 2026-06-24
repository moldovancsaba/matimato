import type { GameSnapshot, TelemetryEventName, TelemetryPropertyValue } from '@/lib/shared/types';

export type PhaserOutboundEvent =
  | { type: 'announce'; message: string }
  | { type: 'telemetry'; name: TelemetryEventName; result?: 'ok' | 'error' | 'cancelled'; properties?: Record<string, TelemetryPropertyValue> }
  | { type: 'exit' }
  | { type: 'complete'; snapshot: GameSnapshot };

export type PhaserBootPayload = {
  snapshot: GameSnapshot;
  playerId: string;
  onEvent: (event: PhaserOutboundEvent) => void;
};

export type Rect = { x: number; y: number; width: number; height: number };
