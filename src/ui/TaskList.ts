import Phaser from 'phaser';
import { txt } from './text';
import { Audio } from '../systems/Audio';

/** Uma tarefa do capítulo. Com `goal`, mostra o progresso (ex.: "Flores 2/3"). */
export interface ChapterTask {
  id: string;
  text: string;
  goal?: number;
}

interface Row {
  task: ChapterTask;
  count: number;
  done: boolean;
  label: Phaser.GameObjects.Text;
  box: Phaser.GameObjects.Graphics;
  y: number;
}

/** Painel "Tarefas do capítulo" no canto da tela, com caixinhas que viram ✓. */
export class TaskList {
  private rows: Row[] = [];
  private bg: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  readonly container: Phaser.GameObjects.Container;
  private w: number;
  private expanded = true;
  private hideEv: Phaser.Time.TimerEvent | null = null;

  constructor(private scene: Phaser.Scene, x: number, y: number, tasks: ChapterTask[], width = 236) {
    this.w = width;
    this.bg = scene.add.graphics();
    this.title = txt(scene, 12, 13, '', 13, { origin: [0, 0.5], color: '#ffd25e' });
    this.container = scene.add.container(x, y, [this.bg, this.title]).setDepth(30);
    tasks.forEach((t, i) => {
      const ry = 34 + i * 20;
      const box = scene.add.graphics();
      const label = txt(scene, 30, ry, '', 12, { origin: [0, 0.5], bold: false, wrap: width - 40 });
      this.container.add([box, label]);
      const row: Row = { task: t, count: 0, done: false, label, box, y: ry };
      this.rows.push(row);
      this.paint(row);
    });
    this.setExpanded(true);
    this.container.setAlpha(0);
    scene.tweens.add({ targets: this.container, alpha: 1, duration: 400, delay: 300 });
    this.peek(9000);
  }

  /** Aberto mostra todas as tarefas; fechado mostra só o título com o placar. */
  private setExpanded(on: boolean): void {
    this.expanded = on;
    this.title.setText(`Tarefas do capítulo  ${this.doneCount}/${this.total}`);
    this.rows.forEach((r) => { r.label.setVisible(on); r.box.setVisible(on); });
    const h = on ? 26 + this.rows.length * 20 + 6 : 26;
    this.bg.clear();
    this.bg.fillStyle(0x1b1424, 0.72).fillRoundedRect(0, 0, this.w, h, 10);
    this.bg.lineStyle(2, 0xffd6e4, 0.5).strokeRoundedRect(0, 0, this.w, h, 10);
  }

  /** Abre o painel por um tempo e depois recolhe. */
  peek(ms = 4000): void {
    if (!this.expanded) this.setExpanded(true);
    this.hideEv?.remove();
    this.hideEv = this.scene.time.delayedCall(ms, () => this.setExpanded(false));
  }

  private paint(r: Row): void {
    const goal = r.task.goal;
    r.label.setText(goal ? `${r.task.text} ${Math.min(r.count, goal)}/${goal}` : r.task.text);
    r.label.setColor(r.done ? '#8be07a' : '#fff4e0');
    r.box.clear();
    r.box.lineStyle(2, r.done ? 0x8be07a : 0xd8c8e8, 1).strokeRect(12, r.y - 6, 12, 12);
    if (r.done) {
      r.box.lineStyle(3, 0x8be07a, 1);
      r.box.beginPath();
      r.box.moveTo(14, r.y);
      r.box.lineTo(17, r.y + 4);
      r.box.lineTo(24, r.y - 6);
      r.box.strokePath();
    }
  }

  private row(id: string): Row | undefined {
    return this.rows.find((r) => r.task.id === id);
  }

  /** Atualiza o progresso de uma tarefa com meta; completa ao atingir a meta. */
  progress(id: string, count: number): void {
    const r = this.row(id);
    if (!r || r.done) return;
    if (count === r.count) return;
    r.count = count;
    if (r.task.goal && count >= r.task.goal) this.done(id);
    else { this.paint(r); this.peek(); }
  }

  done(id: string): void {
    const r = this.row(id);
    if (!r || r.done) return;
    r.done = true;
    if (r.task.goal) r.count = r.task.goal;
    this.paint(r);
    this.peek(4500);
    this.title.setText(`Tarefas do capítulo  ${this.doneCount}/${this.total}`);
    Audio.play('coin');
    this.scene.tweens.add({ targets: r.label, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.Out' });
  }

  isDone(id: string): boolean {
    return !!this.row(id)?.done;
  }

  get doneCount(): number {
    return this.rows.filter((r) => r.done).length;
  }

  get total(): number {
    return this.rows.length;
  }

  /** Linha de resumo para a tela de resultado. */
  summary(): string {
    return `Tarefas do capítulo: ${this.doneCount}/${this.total}`;
  }

  get width(): number {
    return this.w;
  }
}
