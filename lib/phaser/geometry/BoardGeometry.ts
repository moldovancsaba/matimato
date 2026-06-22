import type { LegalTarget } from '@/lib/shared/types';
import type { Rect } from '../types';

export class BoardGeometry {
  readonly board: Rect = { x: 50, y: 360, width: 800, height: 800 };
  readonly gap = 10;
  readonly cell = (this.board.width - this.gap * 10) / 9;

  cellRect(row: number, col: number): Rect {
    return { x: this.board.x + this.gap + col * (this.cell + this.gap), y: this.board.y + this.gap + row * (this.cell + this.gap), width: this.cell, height: this.cell };
  }

  rowRect(row: number): Rect {
    const first = this.cellRect(row, 0);
    const last = this.cellRect(row, 8);
    return { x: first.x, y: first.y, width: last.x + last.width - first.x, height: first.height };
  }

  colRect(col: number): Rect {
    const first = this.cellRect(0, col);
    const last = this.cellRect(8, col);
    return { x: first.x, y: first.y, width: first.width, height: last.y + last.height - first.y };
  }

  targetRect(target: LegalTarget): Rect | null {
    if (target.axis === 'row') return this.rowRect(target.index);
    if (target.axis === 'column') return this.colRect(target.index);
    return null;
  }
}
