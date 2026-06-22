import type { GameApiResponse } from '@/lib/shared/types';

export class NetworkBridge {
  private writeInFlight = false;

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

  private async post(body: unknown): Promise<GameApiResponse> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/games', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Game request failed.');
      return data as GameApiResponse;
    } finally {
      window.clearTimeout(timeout);
    }
  }
}
