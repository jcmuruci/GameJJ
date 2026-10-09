/**
 * Entrada de dois jogadores num único teclado + controles opcionais.
 *
 * Usa `KeyboardEvent.code` (posição física da tecla), então WASD funciona
 * igual em ABNT2, US, AZERTY etc. As teclas foram escolhidas em regiões
 * distantes do teclado para minimizar "ghosting".
 */

export type PlayerId = 0 | 1;

export interface Binding {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  action: string[];
  ability: string[];
}

export const BINDINGS: [Binding, Binding] = [
  {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    action: ['KeyF', 'Space', 'KeyC'],
    ability: ['KeyG', 'KeyV', 'KeyE'],
  },
  {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    action: ['KeyK', 'Numpad1', 'Period'],
    ability: ['KeyL', 'Numpad2', 'Slash'],
  },
];

export const KEY_LABELS: [{ move: string; action: string; ability: string }, { move: string; action: string; ability: string }] = [
  { move: 'W A S D', action: 'F', ability: 'G' },
  { move: 'Setas', action: 'K', ability: 'L' },
];

const PAUSE_KEYS = ['Escape', 'KeyP'];
const BLOCK_DEFAULT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Period', 'Tab',
]);

export interface PlayerState {
  x: number;
  y: number;
  action: boolean;
  actionPressed: boolean;
  ability: boolean;
  abilityPressed: boolean;
  /** Toques discretos de direção (para menus). */
  upPressed: boolean;
  downPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  usingPad: boolean;
}

function emptyState(): PlayerState {
  return {
    x: 0, y: 0, action: false, actionPressed: false, ability: false, abilityPressed: false,
    upPressed: false, downPressed: false, leftPressed: false, rightPressed: false, usingPad: false,
  };
}

interface PadSnapshot { buttons: boolean[]; ax: number; ay: number }

class InputManagerImpl {
  private down = new Set<string>();
  private pending = new Set<string>();
  private fresh = new Set<string>();
  private padPrev: PadSnapshot[] = [];
  private padCur: PadSnapshot[] = [];
  private textListener: ((e: KeyboardEvent) => void) | null = null;
  readonly players: [PlayerState, PlayerState] = [emptyState(), emptyState()];
  padSwap = false;
  pausePressed = false;
  anyPressed = false;
  /** Código físico da última tecla pressionada (para menus). */
  lastCode = '';
  onFirstGesture: (() => void) | null = null;

  attach(target: Window = window): void {
    target.addEventListener('keydown', (e) => {
      if (this.onFirstGesture) { this.onFirstGesture(); }
      if (this.textListener) {
        this.textListener(e);
        e.preventDefault();
        return;
      }
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pending.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    target.addEventListener('blur', () => this.down.clear());
    target.addEventListener('pointerdown', () => this.onFirstGesture?.());
  }

  /** Captura texto bruto (para digitar nomes). Retorna função para encerrar. */
  captureText(fn: (e: KeyboardEvent) => void): () => void {
    this.textListener = fn;
    this.down.clear();
    return () => {
      this.textListener = null;
      this.pending.clear();
    };
  }

  get capturingText(): boolean {
    return this.textListener !== null;
  }

  /** Chamar uma vez por quadro, antes das cenas atualizarem. */
  update(): void {
    this.fresh = this.pending;
    this.pending = new Set();
    this.lastCode = this.fresh.size ? [...this.fresh][this.fresh.size - 1] : '';
    this.readPads();

    const pads = this.assignedPads();
    for (let i = 0 as PlayerId; i < 2; i = (i + 1) as PlayerId) {
      const b = BINDINGS[i];
      const st = this.players[i];
      let x = (this.anyDown(b.right) ? 1 : 0) - (this.anyDown(b.left) ? 1 : 0);
      let y = (this.anyDown(b.down) ? 1 : 0) - (this.anyDown(b.up) ? 1 : 0);
      st.action = this.anyDown(b.action);
      st.ability = this.anyDown(b.ability);
      st.actionPressed = this.anyFresh(b.action);
      st.abilityPressed = this.anyFresh(b.ability);
      st.upPressed = this.anyFresh(b.up);
      st.downPressed = this.anyFresh(b.down);
      st.leftPressed = this.anyFresh(b.left);
      st.rightPressed = this.anyFresh(b.right);
      st.usingPad = false;

      const pi = pads[i];
      if (pi !== undefined) {
        const cur = this.padCur[pi];
        const prev = this.padPrev[pi] ?? { buttons: [], ax: 0, ay: 0 };
        if (cur) {
          const dz = 0.3;
          let px = Math.abs(cur.ax) > dz ? cur.ax : 0;
          let py = Math.abs(cur.ay) > dz ? cur.ay : 0;
          if (cur.buttons[14]) px = -1;
          if (cur.buttons[15]) px = 1;
          if (cur.buttons[12]) py = -1;
          if (cur.buttons[13]) py = 1;
          if (px !== 0 || py !== 0) { x = px; y = py; st.usingPad = true; }
          const pressed = (n: number) => !!cur.buttons[n] && !prev.buttons[n];
          st.action ||= !!cur.buttons[0];
          st.ability ||= !!(cur.buttons[1] || cur.buttons[2]);
          st.actionPressed ||= pressed(0);
          st.abilityPressed ||= pressed(1) || pressed(2);
          const stickUp = (s: PadSnapshot) => s.ay < -0.6 || !!s.buttons[12];
          const stickDown = (s: PadSnapshot) => s.ay > 0.6 || !!s.buttons[13];
          const stickLeft = (s: PadSnapshot) => s.ax < -0.6 || !!s.buttons[14];
          const stickRight = (s: PadSnapshot) => s.ax > 0.6 || !!s.buttons[15];
          st.upPressed ||= stickUp(cur) && !stickUp(prev);
          st.downPressed ||= stickDown(cur) && !stickDown(prev);
          st.leftPressed ||= stickLeft(cur) && !stickLeft(prev);
          st.rightPressed ||= stickRight(cur) && !stickRight(prev);
          if (pressed(9)) this.fresh.add('PadStart');
        }
      }
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      st.x = x;
      st.y = y;
    }
    this.pausePressed = this.anyFresh(PAUSE_KEYS) || this.fresh.has('PadStart');
    this.anyPressed = this.fresh.size > 0 || this.players.some((p) => p.actionPressed || p.abilityPressed);
  }

  /** Teclas de confirmação genéricas de menu (qualquer jogador). */
  confirmPressed(): boolean {
    return this.players[0].actionPressed || this.players[1].actionPressed || this.anyFresh(['Enter', 'NumpadEnter']);
  }

  backPressed(): boolean {
    return this.anyFresh(['Escape', 'Backspace']) || this.players.some((_, i) => this.padButtonFresh(i as PlayerId, 1));
  }

  menuUp(): boolean { return this.players[0].upPressed || this.players[1].upPressed; }
  menuDown(): boolean { return this.players[0].downPressed || this.players[1].downPressed; }
  menuLeft(): boolean { return this.players[0].leftPressed || this.players[1].leftPressed; }
  menuRight(): boolean { return this.players[0].rightPressed || this.players[1].rightPressed; }

  keyFresh(code: string): boolean { return this.fresh.has(code); }

  /** Simula teclas (usado pelos testes automatizados). */
  simulate(code: string, isDown: boolean): void {
    if (isDown) { this.pending.add(code); this.down.add(code); } else { this.down.delete(code); }
  }

  rumble(player: PlayerId, ms = 120, strength = 0.5): void {
    const idx = this.assignedPads()[player];
    if (idx === undefined) return;
    const pad = navigator.getGamepads?.()[idx] as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | null;
    pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength })?.catch?.(() => undefined);
  }

  get connectedPads(): number {
    return this.padCur.filter(Boolean).length;
  }

  private padButtonFresh(player: PlayerId, btn: number): boolean {
    const idx = this.assignedPads()[player];
    if (idx === undefined) return false;
    return !!this.padCur[idx]?.buttons[btn] && !this.padPrev[idx]?.buttons[btn];
  }

  private assignedPads(): [number | undefined, number | undefined] {
    const idx: number[] = [];
    this.padCur.forEach((p, i) => { if (p) idx.push(i); });
    if (idx.length === 0) return [undefined, undefined];
    if (idx.length === 1) return this.padSwap ? [undefined, idx[0]] : [idx[0], undefined];
    return this.padSwap ? [idx[1], idx[0]] : [idx[0], idx[1]];
  }

  private readPads(): void {
    this.padPrev = this.padCur;
    this.padCur = [];
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      this.padCur[p.index] = {
        buttons: p.buttons.map((b) => b.pressed || b.value > 0.5),
        ax: p.axes[0] ?? 0,
        ay: p.axes[1] ?? 0,
      };
    }
  }

  private anyDown(codes: string[]): boolean {
    for (const c of codes) if (this.down.has(c)) return true;
    return false;
  }

  private anyFresh(codes: string[]): boolean {
    for (const c of codes) if (this.fresh.has(c)) return true;
    return false;
  }
}

export const Input = new InputManagerImpl();
