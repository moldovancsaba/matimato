import { describe, expect, it, vi } from 'vitest';
import { newGame } from '@/lib/game/rules';
import { validateBootPayload } from '@/lib/phaser/bootPayload';
import { BoardGeometry } from '@/lib/phaser/geometry/BoardGeometry';
import { NetworkBridge } from '@/lib/phaser/network/NetworkBridge';

describe('phaser runtime contracts', () => {
  it('validates boot payloads before creating the canvas runtime', () => {
    const snapshot = newGame('boot-game', 'solo', 'p1', 'Player');
    const payload = { snapshot, playerId: 'p1', onEvent: vi.fn() };
    expect(validateBootPayload(payload)).toBe(payload);
    expect(() => validateBootPayload({ ...payload, playerId: '' })).toThrow('Missing Phaser player id.');
  });

  it('uses deterministic fixed-world board geometry from 5x5 through 9x9', () => {
    const geometry = new BoardGeometry(9);
    const rects = [];
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) rects.push(geometry.cellRect(row, col));
    }
    expect(rects).toHaveLength(81);
    expect(rects[0]).toMatchObject({ x: 60, y: 370 });
    expect(rects[80].x + rects[80].width).toBeLessThanOrEqual(850);
    expect(rects[80].y + rects[80].height).toBeLessThanOrEqual(1160);
    expect(geometry.rowRect(4).height).toBe(geometry.cell);
    expect(geometry.colRect(4).width).toBe(geometry.cell);

    const compact = new BoardGeometry(5);
    const last = compact.cellRect(4, 4);
    expect(compact.cellRect(0, 0)).toMatchObject({ x: 60, y: 370 });
    expect(last.x + last.width).toBeLessThanOrEqual(850);
    expect(last.y + last.height).toBeLessThanOrEqual(1160);
    expect(compact.cell).toBeGreaterThan(geometry.cell);
  });

  it('keeps state-changing network writes single-flight', async () => {
    const bridge = new NetworkBridge();
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const first = bridge.move({ matchId: 'm1', playerId: 'p1', actionId: 'a1', row: 0, col: 0, expectedVersion: 0 });

    await expect(bridge.move({ matchId: 'm1', playerId: 'p1', actionId: 'a2', row: 0, col: 1, expectedVersion: 0 })).rejects.toThrow('Action already in progress.');

    resolveFetch?.(new Response(JSON.stringify({ snapshot: newGame('m1', 'solo', 'p1', 'Player'), frames: [] }), { status: 200 }));
    await expect(first).resolves.toHaveProperty('snapshot.id', 'm1');
    fetchMock.mockRestore();
  });

  it('aborts pending bridge reads on destroy', async () => {
    const bridge = new NetworkBridge();
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      capturedSignal = init?.signal as AbortSignal;
      return new Promise<Response>(() => undefined);
    });

    void bridge.sync('m1', 'p1').catch(() => undefined);
    bridge.destroy();

    expect(capturedSignal?.aborted).toBe(true);
    fetchMock.mockRestore();
  });
});
