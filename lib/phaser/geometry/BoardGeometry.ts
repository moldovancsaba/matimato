import { normalizeBoardSize } from '@/lib/game/progression';
import type { LegalTarget } from '@/lib/shared/types';
import type { BoardSize } from '@/lib/shared/types';
import type { Rect } from '../types';

export class BoardGeometry {
  readonly board: Rect = { x: 50, y: 360, width: 800, height: 800 };
  readonly gap = 10;
  readonly boardSize: BoardSize;
  readonly cell: number;

  constructor(boardSize: BoardSize = 9) {
    this.boardSize = normalizeBoardSize(boardSize, 9);
    this.cell = (this.board.width - this.gap * (this.boardSize + 1)) / this.boardSize;
  }

  cellRect(row: number, col: number): Rect {
    return { x: this.board.x + this.gap + col * (this.cell + this.gap), y: this.board.y + this.gap + row * (this.cell + this.gap), width: this.cell, height: this.cell };
  }

  rowRect(row: number): Rect {
    const first = this.cellRect(row, 0);
    const last = this.cellRect(row, this.boardSize - 1);
    return { x: first.x, y: first.y, width: last.x + last.width - first.x, height: first.height };
  }

  colRect(col: number): Rect {
    const first = this.cellRect(0, col);
    const last = this.cellRect(this.boardSize - 1, col);
    return { x: first.x, y: first.y, width: first.width, height: last.y + last.height - first.y };
  }

  targetRect(target: LegalTarget): Rect | null {
    if (target.axis === 'row') return this.rowRect(target.index);
    if (target.axis === 'column') return this.colRect(target.index);
    return null;
  }
}
