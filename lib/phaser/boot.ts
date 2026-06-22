import * as Phaser from 'phaser';
import { MatimatoScene } from './MatimatoScene';
import type { PhaserBootPayload } from './types';

export function bootMatimato(parent: HTMLElement, payload: PhaserBootPayload): () => void {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 900,
    height: 1400,
    backgroundColor: '#120811',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 900, height: 1400 },
    input: { activePointers: 3 },
    scene: [MatimatoScene]
  });
  game.scene.start('matimato', payload);
  return () => game.destroy(true);
}
