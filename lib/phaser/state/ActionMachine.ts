import type { BoardCell, GameSnapshot, MoveFrame } from '@/lib/shared/types';

export type MachinePorts = {
  canSelect: (cell: BoardCell, snapshot: GameSnapshot) => boolean;
  submitMove: (cell: BoardCell, actionId: string, snapshot: GameSnapshot) => Promise<{ snapshot: GameSnapshot; frames?: MoveFrame[] }>;
  playFrame: (frame: MoveFrame) => Promise<void>;
  commit: (snapshot: GameSnapshot) => void;
  announce: (message: string) => void;
  complete: (snapshot: GameSnapshot) => void;
};

export class ActionMachine {
  private locked = false;
  private snapshot: GameSnapshot;

  constructor(snapshot: GameSnapshot, private ports: MachinePorts) {
    this.snapshot = snapshot;
  }

  update(snapshot: GameSnapshot) { this.snapshot = snapshot; }
  isLocked() { return this.locked; }

  async select(cell: BoardCell) {
    if (this.locked) return;
    if (!this.ports.canSelect(cell, this.snapshot)) {
      this.ports.announce('That tile is not available for this move.');
      return;
    }
    this.locked = true;
    const actionId = crypto.randomUUID();
    try {
      const response = await this.ports.submitMove(cell, actionId, this.snapshot);
      for (const frame of response.frames ?? []) await this.ports.playFrame(frame);
      this.snapshot = response.snapshot;
      this.ports.commit(response.snapshot);
      if (response.snapshot.outcome) this.ports.complete(response.snapshot);
    } catch (error) {
      this.ports.announce(error instanceof Error ? error.message : 'Move failed.');
    } finally {
      this.locked = false;
    }
  }
}
