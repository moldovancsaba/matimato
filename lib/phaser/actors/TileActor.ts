import * as Phaser from 'phaser';
import type { BoardCell } from '@/lib/shared/types';
import type { Rect } from '../types';

export class TileActor {
  readonly container: Phaser.GameObjects.Container;
  private halo: Phaser.GameObjects.Graphics;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private readonly width: number;
  private readonly height: number;
  removed = false;

  constructor(scene: Phaser.Scene, readonly cell: BoardCell, rect: Rect, onSelect: (cell: BoardCell) => void) {
    this.container = scene.add.container(rect.x + rect.width / 2, rect.y + rect.height / 2).setDepth(10);
    this.width = rect.width;
    this.height = rect.height;
    this.halo = scene.add.graphics();
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 1, String(cell.magnitude), { fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: '900', color: cell.sign > 0 ? '#148c55' : '#cc2434' }).setOrigin(0.5);
    this.container.add([this.halo, this.bg, this.label]);
    this.draw(rect.width, rect.height);
    this.container.setSize(rect.width, rect.height).setInteractive({ useHandCursor: true }).on('pointerdown', () => onSelect(cell));
    if (cell.removed) this.remove(false);
  }

  setEnabled(enabled: boolean) { if (!this.removed) this.container.setAlpha(enabled ? 1 : 0.62); }

  showSelected(accent: number): Promise<void> {
    if (this.removed) return Promise.resolve();
    this.halo.clear();
    this.halo.fillStyle(accent, 0.18);
    this.halo.fillRoundedRect(-this.width / 2 - 8, -this.height / 2 - 8, this.width + 16, this.height + 16, 22);
    this.halo.lineStyle(5, accent, 0.96);
    this.halo.strokeRoundedRect(-this.width / 2 - 5, -this.height / 2 - 5, this.width + 10, this.height + 10, 20);
    this.container.setDepth(18);
    return new Promise((resolve) => {
      this.container.scene.tweens.add({
        targets: this.container,
        scale: 1.08,
        duration: 118,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => resolve()
      });
    });
  }

  remove(animated = true): Promise<void> {
    this.removed = true;
    this.halo.clear();
    this.container.disableInteractive();
    if (!animated) {
      this.container.setVisible(false);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.container.scene.tweens.add({ targets: this.container, scale: 0.2, alpha: 0, duration: 140, ease: 'Back.easeIn', onComplete: () => { this.container.setVisible(false); resolve(); } });
    });
  }

  destroy() { this.container.destroy(); }

  private draw(width: number, height: number) {
    this.bg.clear();
    this.bg.fillStyle(0xfff8ec, 1);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
    this.bg.lineStyle(2, 0xe8dccb, 0.7);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  }
}
