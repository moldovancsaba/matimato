import * as Phaser from 'phaser';
import type { BoardCell, LegalTarget } from '@/lib/shared/types';
import { BoardGeometry } from '../geometry/BoardGeometry';
import { TileActor } from './TileActor';

export class BoardActor {
  readonly geometry = new BoardGeometry();
  private tiles = new Map<string, TileActor>();
  private bg: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, cells: BoardCell[], onSelect: (cell: BoardCell) => void) {
    this.bg = scene.add.graphics().setDepth(1);
    this.drawBackground();
    for (const cell of cells) {
      const tile = new TileActor(scene, cell, this.geometry.cellRect(cell.row, cell.col), onSelect);
      this.tiles.set(key(cell.row, cell.col), tile);
    }
  }

  setLegalTarget(target: LegalTarget) {
    for (const tile of this.tiles.values()) {
      const legal = !tile.removed && (target.axis === 'any' || (target.axis === 'row' && tile.cell.row === target.index) || (target.axis === 'column' && tile.cell.col === target.index));
      tile.setEnabled(legal);
    }
  }

  async remove(row: number, col: number) { await this.tiles.get(key(row, col))?.remove(true); }

  destroy() { this.bg.destroy(); for (const tile of this.tiles.values()) tile.destroy(); }

  private drawBackground() {
    const r = this.geometry.board;
    this.bg.fillStyle(0xfff4e5, 1);
    this.bg.fillRoundedRect(r.x - 10, r.y - 10, r.width + 20, r.height + 20, 34);
    this.bg.fillStyle(0xe8dbc9, 0.8);
    this.bg.fillRoundedRect(r.x, r.y, r.width, r.height, 24);
  }
}

function key(row: number, col: number) { return `${row}:${col}`; }
