import type { PhaserBootPayload } from './types';

export function validateBootPayload(payload: PhaserBootPayload): PhaserBootPayload {
  if (!payload.snapshot?.id) throw new Error('Missing Phaser match snapshot.');
  if (!payload.playerId) throw new Error('Missing Phaser player id.');
  if (typeof payload.onEvent !== 'function') throw new Error('Missing Phaser event bridge.');
  return payload;
}
