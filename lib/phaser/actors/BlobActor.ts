import * as Phaser from 'phaser';
import type { Rect } from '../types';

const SPEED = 1780;
const MIN_DURATION = 120;

export class BlobActor {
  private shape: Phaser.GameObjects.Graphics;
  private rect: Rect | null = null;
  private activeTween: Phaser.Tweens.Tween | null = null;

  constructor(private scene: Phaser.Scene) {
    this.shape = scene.add.graphics().setDepth(5).setVisible(false);
  }

  isVisible() { return this.shape.visible; }

  show(rect: Rect) {
    this.rect = { ...rect };
    this.shape.setVisible(true);
    this.draw(rect);
  }

  async morph(to: Rect): Promise<void> {
    if (!this.rect || !this.shape.visible) {
      this.show(to);
      return;
    }
    const from = { ...this.rect };
    const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y) + Math.abs(to.width - from.width) + Math.abs(to.height - from.height);
    const duration = Math.max(MIN_DURATION, Math.round((distance / SPEED) * 1000));
    await new Promise<void>((resolve) => {
      this.activeTween?.stop();
      const proxy = { ...from };
      this.activeTween = this.scene.tweens.add({
        targets: proxy,
        x: to.x,
        y: to.y,
        width: to.width,
        height: to.height,
        duration,
        ease: 'Cubic.easeInOut',
        onUpdate: () => this.draw(proxy),
        onComplete: () => {
          this.rect = { ...to };
          this.draw(to);
          resolve();
        }
      });
    });
  }

  hide() {
    this.activeTween?.stop();
    this.shape.setVisible(false).clear();
    this.rect = null;
  }

  destroy() { this.activeTween?.stop(); this.shape.destroy(); }

  private draw(rect: Rect) {
    this.shape.clear();
    const radius = Math.min(rect.height, rect.width) / 2;
    this.shape.fillStyle(0x35d07f, 0.9);
    this.shape.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
    this.shape.fillStyle(0xdfffea, 0.34);
    this.shape.fillCircle(rect.x + Math.min(rect.width * 0.22, 54), rect.y + rect.height * 0.35, Math.max(8, Math.min(rect.width, rect.height) * 0.28));
  }
}
