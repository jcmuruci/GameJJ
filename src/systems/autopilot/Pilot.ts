import Phaser from 'phaser';
import { Input, BotCmd } from '../InputManager';
import { Admin } from '../Admin';

/**
 * Piloto automático (modo admin): a cada quadro decide os comandos dos dois jogadores.
 * Os comandos entram no lugar do teclado no quadro seguinte, então a fase roda as
 * mesmas regras de sempre — só que ninguém precisa apertar nada.
 */
export abstract class Pilot<S extends Phaser.Scene = Phaser.Scene> {
  cmd: [BotCmd, BotCmd] = [{}, {}];
  /** Tempo desde o início (s). */
  t = 0;
  private cooldown: Record<string, number> = {};

  constructor(protected s: S) {
    s.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onStep, this);
    s.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      s.events.off(Phaser.Scenes.Events.POST_UPDATE, this.onStep, this);
      Input.botCmd = [null, null];
    });
  }

  private released = false;

  private onStep(_time: number, delta: number): void {
    // admin desligado no meio da fase: devolve o controle aos jogadores
    if (!Admin.on) {
      if (!this.released) { this.released = true; this.release(); }
      return;
    }
    this.released = false;
    const dt = Math.min(delta / 1000, 0.05);
    this.t += dt;
    for (const k of Object.keys(this.cooldown)) this.cooldown[k] -= dt;
    this.cmd = [{}, {}];
    try {
      this.step(dt);
    } catch (e) {
      // o piloto nunca pode travar o jogo
      console.warn('piloto automático:', e);
    }
    Input.botCmd = [this.cmd[0], this.cmd[1]];
  }

  abstract step(dt: number): void;

  /** Chamado quando o modo admin é desligado com a fase em andamento. */
  release(): void {}

  /** Aperta um botão (no máximo uma vez a cada `every` segundos para a mesma chave). */
  press(i: 0 | 1, what: 'action' | 'ability' | 'up' | 'down' | 'left' | 'right', every = 0.25, key = `${i}${what}`): boolean {
    if ((this.cooldown[key] ?? 0) > 0) return false;
    this.cooldown[key] = every;
    const c = this.cmd[i];
    if (what === 'action') c.actionPressed = true;
    else if (what === 'ability') c.abilityPressed = true;
    else c[what] = true;
    return true;
  }

  /** Segura AÇÃO / HABILIDADE neste quadro. */
  hold(i: 0 | 1, what: 'action' | 'ability'): void {
    this.cmd[i][what] = true;
  }

  /** Vira o jogador para uma direção sem sair do lugar. */
  face(i: 0 | 1, dx: number, dy: number): void {
    this.move(i, Math.sign(dx) * 0.02, Math.sign(dy) * 0.02);
  }

  move(i: 0 | 1, x: number, y: number): void {
    this.cmd[i].x = Phaser.Math.Clamp(x, -1, 1);
    this.cmd[i].y = Phaser.Math.Clamp(y, -1, 1);
  }

  /** Espera: true quando passou `secs` desde a primeira chamada com esta chave (e reinicia). */
  private waits: Record<string, number> = {};
  waited(key: string, secs: number): boolean {
    if (this.waits[key] === undefined) this.waits[key] = this.t;
    if (this.t - this.waits[key] >= secs) { delete this.waits[key]; return true; }
    return false;
  }

  resetWait(key: string): void {
    delete this.waits[key];
  }
}
