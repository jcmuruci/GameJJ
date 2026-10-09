import { Input, BINDINGS } from './InputManager';
import { Save } from './SaveManager';

/**
 * Controles de toque para celular/tablet (na horizontal).
 * A tela é dividida ao meio: João à esquerda, Juliana à direita — cada um com
 * um joystick e dois botões. Cada toque vira a tecla equivalente do teclado,
 * então menus, história e fases funcionam sem nenhuma mudança.
 */

/** Captura o dedo no elemento (ignora navegadores que não suportam). */
function capture(el: HTMLElement, id: number): void {
  try { el.setPointerCapture?.(id); } catch { /* sem captura: segue funcionando */ }
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('toque')) return true;
  return (navigator.maxTouchPoints ?? 0) > 0 && window.matchMedia?.('(pointer: coarse)').matches;
}

const CSS = `
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 10; user-select: none; -webkit-user-select: none;
  font-family: "Pixelify Sans", monospace; touch-action: none; }
#touch .stick { position: absolute; bottom: 0; width: 26vw; height: 62vh; pointer-events: auto; touch-action: none; }
#touch .stick.p0 { left: 0; } #touch .stick.p1 { right: 0; }
#touch .base { position: absolute; width: 23vh; height: 23vh; border-radius: 50%; transform: translate(-50%, -50%);
  border: 3px solid var(--c); background: rgba(27, 20, 36, .35); opacity: .55; }
#touch .knob { position: absolute; width: 10vh; height: 10vh; border-radius: 50%; transform: translate(-50%, -50%);
  background: var(--c); opacity: .8; box-shadow: 0 2px 0 rgba(0,0,0,.4); }
#touch .btns { position: absolute; bottom: 4vh; display: flex; gap: 2.2vh; pointer-events: none; }
#touch .btns.p0 { left: 27vw; } #touch .btns.p1 { right: 27vw; flex-direction: row-reverse; }
#touch .btn { opacity: .9; pointer-events: auto; touch-action: none; width: 15vh; height: 15vh; border-radius: 50%;
  border: 3px solid var(--c); background: rgba(27, 20, 36, .55); color: #fff4e0; display: flex; align-items: center;
  justify-content: center; font-size: 2.6vh; font-weight: bold; text-shadow: 0 2px 0 #2a1d2e; }
#touch .btn.big { width: 18vh; height: 18vh; font-size: 3vh; }
#touch .btn.on { background: var(--c); color: #2a1d2e; text-shadow: none; transform: scale(.94); }
#touch .name { position: absolute; bottom: 24vh; font-size: 2.4vh; color: var(--c); text-shadow: 0 2px 0 #2a1d2e; opacity: .85; }
#touch .name.p0 { left: 27vw; } #touch .name.p1 { right: 27vw; }
#touch .top { position: absolute; top: 1.5vh; left: 1vw; display: flex; flex-direction: column; align-items: flex-start; gap: 1.2vh; pointer-events: none; }
#touch .small { pointer-events: auto; touch-action: none; padding: 1vh 2vh; border-radius: 1.4vh; border: 2px solid #ffd6e4;
  background: rgba(27, 20, 36, .65); color: #fff4e0; font-size: 2.4vh; }
#rotate { position: fixed; inset: 0; z-index: 20; display: none; align-items: center; justify-content: center; text-align: center;
  background: #1b1424; color: #ffd6e4; font: bold 22px "Pixelify Sans", monospace; padding: 24px; }
@media (orientation: portrait) { #rotate.active { display: flex; } }
`;

export class TouchControls {
  private root!: HTMLDivElement;

  mount(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    document.body.style.touchAction = 'none';

    const rotate = document.createElement('div');
    rotate.id = 'rotate';
    rotate.className = 'active';
    rotate.innerHTML = '📱↻<br><br>Gire o celular para a horizontal<br>e joguem juntinhos!';
    document.body.appendChild(rotate);

    this.root = document.createElement('div');
    this.root.id = 'touch';
    document.body.appendChild(this.root);

    const names = [Save.data.looks[0].name, Save.data.looks[1].name];
    for (const id of [0, 1] as const) {
      const color = id === 0 ? '#6cc4ff' : '#ff9cc2';
      this.stick(id, color);
      const btns = document.createElement('div');
      btns.className = `btns p${id}`;
      btns.style.setProperty('--c', color);
      btns.appendChild(this.button(id === 0 ? 'Espada' : 'Magia', BINDINGS[id].ability[0], color));
      btns.appendChild(this.button('Ação', BINDINGS[id].action[0], color, true));
      this.root.appendChild(btns);
      const name = document.createElement('div');
      name.className = `name p${id}`;
      name.style.setProperty('--c', color);
      name.textContent = names[id];
      this.root.appendChild(name);
    }

    const top = document.createElement('div');
    top.className = 'top';
    top.appendChild(this.button('⏸ Pausa', 'Escape', '#ffd6e4', false, 'small'));
    const fs = document.createElement('div');
    fs.className = 'small';
    fs.textContent = '⛶ Tela';
    fs.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Input.onFirstGesture?.();
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else {
        const p = el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
        void Promise.resolve(p).then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape')).catch(() => undefined);
      }
    });
    top.appendChild(fs);
    this.root.appendChild(top);
  }

  /** Botão que "segura" uma tecla enquanto pressionado. */
  private button(label: string, code: string, color: string, big = false, cls = 'btn'): HTMLDivElement {
    const b = document.createElement('div');
    b.className = cls + (big ? ' big' : '');
    b.style.setProperty('--c', color);
    b.textContent = label;
    const up = (e: PointerEvent) => {
      e.preventDefault();
      b.classList.remove('on');
      Input.simulate(code, false);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Input.onFirstGesture?.();
      capture(b, e.pointerId);
      b.classList.add('on');
      Input.simulate(code, true);
      navigator.vibrate?.(10);
    });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', () => { b.classList.remove('on'); Input.simulate(code, false); });
    return b;
  }

  /** Joystick flutuante: aparece onde o dedo tocar e vira as teclas de direção. */
  private stick(id: 0 | 1, color: string): void {
    const zone = document.createElement('div');
    zone.className = `stick p${id}`;
    zone.style.setProperty('--c', color);
    const base = document.createElement('div');
    base.className = 'base';
    const knob = document.createElement('div');
    knob.className = 'knob';
    zone.append(base, knob);
    this.root.appendChild(zone);

    const keys = BINDINGS[id];
    const held = { up: false, down: false, left: false, right: false };
    let pointer: number | null = null;
    let ox = 0;
    let oy = 0;

    const place = (bx: number, by: number, kx: number, ky: number) => {
      base.style.left = `${bx}px`; base.style.top = `${by}px`;
      knob.style.left = `${kx}px`; knob.style.top = `${ky}px`;
    };
    const rest = () => {
      const r = zone.getBoundingClientRect();
      const cx = id === 0 ? r.width * 0.42 : r.width * 0.58;
      const cy = r.height * 0.62;
      place(cx, cy, cx, cy);
    };
    const set = (dir: keyof typeof held, on: boolean) => {
      if (held[dir] === on) return;
      held[dir] = on;
      Input.simulate(keys[dir][0], on);
    };
    const release = () => {
      pointer = null;
      (Object.keys(held) as (keyof typeof held)[]).forEach((d) => set(d, false));
      rest();
    };

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Input.onFirstGesture?.();
      if (pointer !== null) return;
      pointer = e.pointerId;
      capture(zone, e.pointerId);
      const r = zone.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      place(ox, oy, ox, oy);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointer) return;
      e.preventDefault();
      const r = zone.getBoundingClientRect();
      const max = base.getBoundingClientRect().width / 2 || 60;
      let dx = e.clientX - r.left - ox;
      let dy = e.clientY - r.top - oy;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      place(ox, oy, ox + dx, oy + dy);
      const dead = max * 0.35;
      set('left', dx < -dead);
      set('right', dx > dead);
      set('up', dy < -dead);
      set('down', dy > dead);
    });
    zone.addEventListener('pointerup', (e) => { if (e.pointerId === pointer) release(); });
    zone.addEventListener('pointercancel', (e) => { if (e.pointerId === pointer) release(); });
    window.addEventListener('resize', rest);
    requestAnimationFrame(rest);
  }
}
