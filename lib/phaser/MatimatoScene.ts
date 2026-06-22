import * as Phaser from 'phaser';
import type { BoardCell, GameSnapshot, LegalTarget, MoveFrame, PlayerSide } from '@/lib/shared/types';
import type { PhaserBootPayload } from './types';
import { BoardActor } from './actors/BoardActor';
import { BlobActor } from './actors/BlobActor';
import { NetworkBridge } from './network/NetworkBridge';
import { ActionMachine } from './state/ActionMachine';

export class MatimatoScene extends Phaser.Scene {
  private payload!: PhaserBootPayload;
  private snapshot!: GameSnapshot;
  private board!: BoardActor;
  private blob!: BlobActor;
  private network = new NetworkBridge();
  private machine!: ActionMachine;
  private title!: Phaser.GameObjects.Text;
  private northTag!: Phaser.GameObjects.Text;
  private northScore!: Phaser.GameObjects.Text;
  private southTag!: Phaser.GameObjects.Text;
  private southScore!: Phaser.GameObjects.Text;
  private resultLayer?: Phaser.GameObjects.Container;
  private syncInFlight = false;

  constructor() { super('matimato'); }

  init(payload: PhaserBootPayload) {
    this.payload = payload;
    this.snapshot = payload.snapshot;
  }

  create() {
    this.drawShell();
    this.board = new BoardActor(this, this.snapshot.board, (cell) => void this.machine.select(cell));
    this.blob = new BlobActor(this);
    this.machine = new ActionMachine(this.snapshot, {
      canSelect: (cell, snapshot) => this.canSelect(cell, snapshot),
      submitMove: async (cell, actionId, snapshot) => {
        const response = await this.network.move({ matchId: snapshot.id, playerId: this.payload.playerId, actionId, row: cell.row, col: cell.col, expectedVersion: snapshot.version });
        return { snapshot: response.snapshot, frames: 'frames' in response ? response.frames : [] };
      },
      playFrame: (frame) => this.playFrame(frame),
      commit: (snapshot) => this.commit(snapshot),
      announce: (message) => this.payload.onEvent({ type: 'announce', message }),
      complete: (snapshot) => this.showResult(snapshot)
    });
    this.commit(this.snapshot);
    this.payload.onEvent({ type: 'announce', message: 'Game ready. Claim any open tile.' });
    this.maybeSyncAutomatedTurn();
  }

  private drawShell() {
    this.cameras.main.setBackgroundColor('#120811');
    const g = this.add.graphics();
    g.fillGradientStyle(0x180915, 0x180915, 0x35101f, 0x140711, 1);
    g.fillRect(0, 0, 900, 1400);
    const header = this.add.graphics().setDepth(19);
    header.fillStyle(0x260c1d, 0.9);
    header.fillRoundedRect(30, 54, 840, 92, 28);
    header.lineStyle(2, 0x7b3324, 0.8);
    header.strokeRoundedRect(30, 54, 840, 92, 28);
    this.add.text(72, 76, 'M', { fontFamily: 'Arial', fontSize: '28px', fontStyle: '900', color: '#ffffff', backgroundColor: '#ff4f64', padding: { x: 12, y: 8 } }).setDepth(20);
    this.title = this.add.text(140, 74, 'Matimato', { fontFamily: 'Arial', fontSize: '58px', fontStyle: '900', color: '#fff8ec' }).setDepth(20);
    const scorePanel = this.add.graphics().setDepth(19);
    scorePanel.fillStyle(0x260c1d, 0.72);
    scorePanel.fillRoundedRect(50, 178, 370, 116, 24);
    scorePanel.fillRoundedRect(480, 178, 370, 116, 24);
    scorePanel.lineStyle(2, 0x7b3324, 0.75);
    scorePanel.strokeRoundedRect(50, 178, 370, 116, 24);
    scorePanel.strokeRoundedRect(480, 178, 370, 116, 24);
    this.northTag = this.add.text(78, 198, '', { fontFamily: 'Arial', fontSize: '22px', color: '#ffcfb5' }).setDepth(20);
    this.northScore = this.add.text(78, 224, '', { fontFamily: 'Arial', fontSize: '54px', fontStyle: '900', color: '#fff8ec' }).setDepth(20);
    this.southTag = this.add.text(508, 198, '', { fontFamily: 'Arial', fontSize: '22px', color: '#ffcfb5' }).setDepth(20);
    this.southScore = this.add.text(508, 224, '', { fontFamily: 'Arial', fontSize: '54px', fontStyle: '900', color: '#fff8ec' }).setDepth(20);
    this.add.text(730, 86, 'ACTIVE', { fontFamily: 'Arial', fontSize: '18px', fontStyle: '900', color: '#ffb06f' }).setDepth(20);
    const dock = this.add.graphics().setDepth(28);
    dock.fillStyle(0x260c1d, 0.9);
    dock.fillRoundedRect(50, 1218, 800, 96, 30);
    dock.lineStyle(2, 0x7b3324, 0.75);
    dock.strokeRoundedRect(50, 1218, 800, 96, 30);
    const homeButton = this.add.graphics().setDepth(29);
    homeButton.fillStyle(0xff3f93, 1);
    homeButton.fillRoundedRect(72, 1236, 218, 60, 22);
    homeButton.fillStyle(0xff6a2a, 0.95);
    homeButton.fillRoundedRect(72, 1236, 78, 60, 22);
    const homeLabel = this.add.text(181, 1266, 'Home', { fontFamily: 'Arial', fontSize: '24px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(30);
    const homeHit = this.add.zone(72, 1236, 218, 60).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(31);
    homeHit.on('pointerdown', () => this.payload.onEvent({ type: 'exit' }));
    this.add.text(320, 1252, '9x9 chase · Phaser board', { fontFamily: 'Arial', fontSize: '22px', color: '#ffcfb5' }).setDepth(30);
    void homeLabel;
  }

  private canSelect(cell: BoardCell, snapshot: GameSnapshot) {
    if (snapshot.status !== 'active') return false;
    const side = this.sideForPlayer(snapshot);
    if (snapshot.currentTurn !== side) return false;
    if (cell.removed) return false;
    const target = snapshot.legalTarget;
    if (target.axis === 'any') return true;
    if (target.axis === 'row') return cell.row === target.index;
    return cell.col === target.index;
  }

  private async playFrame(frame: MoveFrame) {
    const geometry = this.board.geometry;
    const tileRect = geometry.cellRect(frame.selected.row, frame.selected.col);
    const from = frame.fromTarget.axis === 'column' ? geometry.colRect(frame.fromTarget.index) : geometry.rowRect(frame.selected.row);
    const to = frame.toTarget.axis === 'column' ? geometry.colRect(frame.toTarget.index) : frame.toTarget.axis === 'row' ? geometry.rowRect(frame.toTarget.index) : tileRect;
    await this.board.showSelected(frame.selected.row, frame.selected.col, frame.side);
    if (!this.blob.isVisible()) this.blob.show(from);
    await this.blob.morph(tileRect);
    await this.board.remove(frame.selected.row, frame.selected.col);
    await this.blob.morph(to);
    this.payload.onEvent({ type: 'announce', message: `${frame.side} claimed ${Math.abs(frame.selected.value)}.` });
  }

  private commit(snapshot: GameSnapshot) {
    this.snapshot = snapshot;
    this.machine?.update(snapshot);
    this.board?.setLegalTarget(snapshot.legalTarget);
    this.northTag?.setText(snapshot.players.north?.tag ?? 'Player');
    this.northScore?.setText(String(snapshot.players.north?.score ?? 0));
    this.southTag?.setText(snapshot.players.south?.tag ?? 'Rival');
    this.southScore?.setText(String(snapshot.players.south?.score ?? 0));
  }


  private maybeSyncAutomatedTurn() {
    if (this.syncInFlight || this.snapshot.status !== 'active' || this.snapshot.mode === 'battle') return;
    if (this.snapshot.currentTurn === this.sideForPlayer(this.snapshot)) return;
    this.syncInFlight = true;
    this.time.delayedCall(220, async () => {
      try {
        const response = await this.network.sync(this.snapshot.id, this.payload.playerId);
        for (const frame of 'frames' in response ? response.frames : []) await this.playFrame(frame);
        this.commit(response.snapshot);
        if (response.snapshot.outcome) this.showResult(response.snapshot);
      } catch (error) {
        this.payload.onEvent({ type: 'announce', message: error instanceof Error ? error.message : 'Sync failed.' });
      } finally {
        this.syncInFlight = false;
      }
    });
  }

  private showResult(snapshot: GameSnapshot) {
    const side = this.sideForPlayer(snapshot);
    const winner = snapshot.outcome?.winner;
    const title = winner === 'draw' ? 'Draw' : winner === side ? 'Victory' : 'Defeat';
    this.resultLayer?.destroy();
    const layer = this.add.container(450, 650).setDepth(100);
    const bg = this.add.rectangle(0, 0, 720, 420, 0x120811, 0.94).setStrokeStyle(3, 0xff6a2a, 0.8);
    const label = this.add.text(0, -80, title, { fontFamily: 'Arial', fontSize: '76px', fontStyle: '900', color: '#fff8ec' }).setOrigin(0.5);
    const score = this.add.text(0, 20, `${snapshot.players.north?.score ?? 0} / ${snapshot.players.south?.score ?? 0}`, { fontFamily: 'Arial', fontSize: '34px', color: '#ffb06f' }).setOrigin(0.5);
    const exit = this.add.text(0, 118, 'Back home', { fontFamily: 'Arial', fontSize: '28px', fontStyle: '900', color: '#ffffff', backgroundColor: '#ff3f93', padding: { x: 28, y: 18 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    exit.on('pointerdown', () => this.payload.onEvent({ type: 'exit' }));
    layer.add([bg, label, score, exit]);
    this.resultLayer = layer;
    this.payload.onEvent({ type: 'complete', snapshot });
  }

  private sideForPlayer(snapshot: GameSnapshot): PlayerSide {
    return snapshot.players.south?.id === this.payload.playerId ? 'south' : 'north';
  }

  destroy() {
    this.board?.destroy();
    this.blob?.destroy();
  }
}
