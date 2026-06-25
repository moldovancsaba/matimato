import type { GameApiResponse } from '@/lib/shared/types';

export class NetworkBridge {
  private writeInFlight = false;
  private controllers = new Set<AbortController>();
  private destroyed = false;

  async move(input: { matchId: string; playerId: string; actionId: string; row: number; col: number; expectedVersion: number }): Promise<GameApiResponse> {
    if (this.writeInFlight) throw new Error('Action already in progress.');
    this.writeInFlight = true;
    try {
      return await this.post({ type: 'move', ...input });
    } finally {
      this.writeInFlight = false;
    }
  }

  async sync(matchId: string, playerId: string): Promise<GameApiResponse> {
    return this.post({ type: 'sync', matchId, playerId });
  }

  async timeout(matchId: string, playerId: string, deadlineVersion: number): Promise<GameApiResponse> {
    if (this.writeInFlight) throw new Error('Action already in progress.');
    this.writeInFlight = true;
    try {
      return await this.post({ type: 'timeout', matchId, playerId, deadlineVersion });
    } finally {
      this.writeInFlight = false;
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }

  private async post(body: unknown): Promise<GameApiResponse> {
    if (this.destroyed) throw new Error('Game network bridge is closed.');
    const controller = new AbortController();
    this.controllers.add(controller);
    const timeout = globalThis.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/games', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Game request failed.');
      return data as GameApiResponse;
    } finally {
      globalThis.clearTimeout(timeout);
      this.controllers.delete(controller);
    }
  }
}
