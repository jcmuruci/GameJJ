import { Pilot } from './Pilot';
import { TILE } from '../../config';
import { CLIFF_TILES } from '../../art/tiles';
import type { BaseLevel } from '../../scenes/levels/BaseLevel';
import type { Player, Interactable } from '../../entities/Player';

/** Rota especial: subir uma parede (escalada) ou descer pela corda (rapel). */
interface Route { tx: number; ty: number; kind: 'climb' | 'rappel'; from: Tile; to: Tile }
interface Tile { x: number; y: number }
interface Step extends Tile { route?: Route }

/** O que o piloto lê das fases com enigmas (portões, pedras, rotas). */
interface PuzzleView {
  gates?: { tx: number; ty: number; open: boolean; forced: boolean }[];
  boulders?: { tx: number; ty: number }[];
  routes?: { tx: number; ty: number; kind: 'climb' | 'rappel' }[];
  belaying?: (p: Player) => boolean;
  tryClimb?: (p: Player, tx: number, ty: number) => boolean;
  tryRappel?: (p: Player, tx: number, ty: number) => boolean;
}

const SOFT_TAGS = ['thorns', 'cracked', 'vines', 'log'];

/** Fila de prioridade mínima (Dijkstra). */
class Heap {
  private a: [number, number][] = [];
  get size(): number { return this.a.length; }
  push(n: number, pri: number): void {
    const a = this.a;
    a.push([pri, n]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.a;
    const top = a[0][1];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Piloto das fases vistas de cima: caminha pelo mapa com o caminho mais curto,
 * resolve o que estiver no caminho (abre portões, queima espinhos, quebra pedras,
 * corta cipós), escala e desce de rapel, espanta bichos e segura firme no vento.
 */
export abstract class WalkPilot<S extends BaseLevel = BaseLevel> extends Pilot<S> {
  /** Objetivo de cada jogador (tile) e o caminho até ele. */
  goals: (Tile | null)[] = [null, null];
  paths: (Step[] | null)[] = [null, null];
  private repath = [0, 0];
  private stuck = [{ t: 0, d: 1e9 }, { t: 0, d: 1e9 }];
  private routeWait = [0, 0];
  private routeTries = [0, 0];
  private goalStall = [{ key: '', best: 0, t: 0 }, { key: '', best: 0, t: 0 }];
  /** Desliga a colisão dos jogadores (true) para não enroscarem um no outro. */
  ghost = true;
  /** Segura um jogador parado neste quadro (ex.: esperar o outro alcançar). */
  pause: [boolean, boolean] = [false, false];

  constructor(s: S) {
    super(s);
    const pv = s as unknown as PuzzleView;
    // no modo admin a segurança está sempre garantida
    if (pv.belaying) pv.belaying = () => true;
  }

  get L(): S { return this.s; }
  get pv(): PuzzleView { return this.s as unknown as PuzzleView; }

  tileOf(p: { x: number; y: number }): Tile {
    return { x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) };
  }

  center(t: Tile): { x: number; y: number } {
    return { x: t.x * TILE + 8, y: t.y * TILE + 8 };
  }

  // ------------------------------------------------------------------ mapa
  private softAt(x: number, y: number): { kind: 'gate' | 'boulder' | 'tag'; it?: Interactable } | null {
    const L = this.L;
    if (!L.occupied.has(L.key(x, y))) return null;
    if (this.pv.gates?.some((g) => g.tx === x && g.ty === y)) return { kind: 'gate' };
    if (this.pv.boulders?.some((b) => b.tx === x && b.ty === y)) return { kind: 'boulder' };
    const it = L.interactables.find((i) => i.tag && SOFT_TAGS.includes(i.tag) && Math.floor(i.x / TILE) === x && Math.floor(i.y / TILE) === y);
    if (it) return { kind: 'tag', it };
    return null;
  }

  /** Custo de pisar no tile (Infinity = não passa). */
  cost(x: number, y: number): number {
    const L = this.L;
    if (x < 0 || y < 0 || x >= L.cols || y >= L.rows) return Infinity;
    if (L.isSolidTile(x, y)) return Infinity;
    if (!L.occupied.has(L.key(x, y))) return 1;
    const soft = this.softAt(x, y);
    if (!soft) return Infinity;
    return soft.kind === 'boulder' ? 8 : 3;
  }

  private isCliff(x: number, y: number): boolean {
    return CLIFF_TILES.includes(this.L.layer.getTileAt(x, y)?.index ?? -1);
  }

  private routesCache: Route[] | null = null;
  routes(): Route[] {
    if (this.routesCache) return this.routesCache;
    const out: Route[] = [];
    for (const r of this.pv.routes ?? []) {
      if (r.kind === 'climb') {
        let b = r.ty;
        while (this.isCliff(r.tx, b + 1)) b++;
        let t = r.ty;
        while (t > 0 && this.isCliff(r.tx, t - 1)) t--;
        out.push({ ...r, from: { x: r.tx, y: b + 1 }, to: { x: r.tx, y: t - 1 } });
      } else {
        let b = r.ty;
        while (this.isCliff(r.tx, b + 1)) b++;
        out.push({ ...r, from: { x: r.tx, y: r.ty - 1 }, to: { x: r.tx, y: b + 1 } });
      }
    }
    this.routesCache = out;
    return out;
  }

  /** Distâncias (Dijkstra) a partir de um tile; devolve também o "de onde veio" para montar caminhos. */
  dijkstra(from: Tile): { dist: Float64Array; prev: Int32Array; via: (Route | undefined)[] } {
    const L = this.L;
    const n = L.cols * L.rows;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const via: (Route | undefined)[] = new Array(n);
    const id = (x: number, y: number) => y * L.cols + x;
    const start = id(from.x, from.y);
    if (start < 0 || start >= n) return { dist, prev, via };
    dist[start] = 0;
    const h = new Heap();
    h.push(start, 0);
    const routes = this.routes();
    while (h.size) {
      const u = h.pop();
      const ux = u % L.cols;
      const uy = Math.floor(u / L.cols);
      const du = dist[u];
      const relax = (vx: number, vy: number, c: number, r?: Route) => {
        if (!isFinite(c)) return;
        const v = id(vx, vy);
        if (du + c < dist[v]) { dist[v] = du + c; prev[v] = u; via[v] = r; h.push(v, du + c); }
      };
      relax(ux + 1, uy, this.cost(ux + 1, uy));
      relax(ux - 1, uy, this.cost(ux - 1, uy));
      relax(ux, uy + 1, this.cost(ux, uy + 1));
      relax(ux, uy - 1, this.cost(ux, uy - 1));
      for (const r of routes) {
        if (r.from.x === ux && r.from.y === uy) relax(r.to.x, r.to.y, Math.abs(r.to.y - r.from.y) + 6, r);
      }
    }
    return { dist, prev, via };
  }

  pathTo(from: Tile, to: Tile): Step[] | null {
    const L = this.L;
    const { prev, via, dist } = this.dijkstra(from);
    let v = to.y * L.cols + to.x;
    if (!isFinite(dist[v])) return null;
    const out: Step[] = [];
    const start = from.y * L.cols + from.x;
    while (v !== start && v >= 0) {
      out.push({ x: v % L.cols, y: Math.floor(v / L.cols), route: via[v] });
      v = prev[v];
    }
    return out.reverse();
  }

  /** Tile livre mais perto de um ponto (para chegar ao lado de um objeto sólido). */
  nearFree(tx: number, ty: number, from?: Tile): Tile | null {
    const cands: Tile[] = [];
    for (let r = 0; r <= 3 && !cands.length; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (this.cost(tx + dx, ty + dy) === 1) cands.push({ x: tx + dx, y: ty + dy });
      }
    }
    if (!cands.length) return null;
    if (!from) return cands[0];
    return cands.reduce((a, b) => (Math.abs(a.x - from.x) + Math.abs(a.y - from.y) <= Math.abs(b.x - from.x) + Math.abs(b.y - from.y) ? a : b));
  }

  // ------------------------------------------------------------------ movimento
  /** Define o objetivo de um jogador; o caminho é recalculado quando muda. */
  goTo(i: 0 | 1, t: Tile | null): void {
    const g = this.goals[i];
    if (!t) { this.goals[i] = null; this.paths[i] = null; return; }
    if (g && g.x === t.x && g.y === t.y) return;
    this.goals[i] = { ...t };
    this.paths[i] = null;
  }

  /** Chegou ao objetivo? */
  at(i: 0 | 1, t: Tile | null, tol = 3): boolean {
    if (!t) return false;
    const p = this.L.players[i];
    const c = this.center(t);
    return Math.abs(p.x - c.x) <= tol && Math.abs(p.y - c.y) <= tol;
  }

  near(i: 0 | 1, pt: { x: number; y: number }, d: number): boolean {
    const p = this.L.players[i];
    return Math.hypot(p.x - pt.x, p.y - pt.y) <= d;
  }

  /** Anda em direção ao objetivo, resolvendo o que estiver no caminho. */
  walk(i: 0 | 1, dt: number): void {
    const L = this.L;
    const p = L.players[i];
    if (p.locked || p.fainted) return;
    p.body.checkCollision.none = this.ghost;
    if (this.pause[i]) return;
    const goal = this.goals[i];
    if (!goal) return;
    // vigia: se não chega mais perto do objetivo por muito tempo, pula até ele
    const gc = this.center(goal);
    const gd = Math.hypot(gc.x - p.x, gc.y - p.y);
    const gs = this.goalStall[i];
    const gk = `${goal.x},${goal.y}`;
    if (gs.key !== gk) { gs.key = gk; gs.best = gd; gs.t = 0; }
    else if (gd < gs.best - 8) { gs.best = gd; gs.t = 0; }
    else gs.t += dt;
    if (gs.t > 20 && gd > 4) { p.teleport(gc.x, gc.y); gs.t = 0; gs.best = 0; this.paths[i] = null; return; }
    this.repath[i] -= dt;
    if (!this.paths[i] || this.repath[i] <= 0) {
      this.repath[i] = 0.8;
      this.paths[i] = this.pathTo(this.tileOf(p), goal);
      this.stuck[i] = { t: 0, d: 1e9 };
    }
    const path = this.paths[i];
    if (!path) {
      // sem caminho: vai em linha reta (último recurso)
      const c = this.center(goal);
      this.steer(i, c.x - p.x, c.y - p.y);
      return;
    }
    if (!path.length) {
      const c = this.center(goal);
      if (Math.hypot(c.x - p.x, c.y - p.y) > 1.5) this.steer(i, c.x - p.x, c.y - p.y);
      return;
    }
    const next = path[0];
    if (next.route) {
      // escalada / rapel: posiciona embaixo (ou em cima) e usa a corda
      const c = this.center(next.route.from);
      if (Math.hypot(c.x - p.x, c.y - p.y) > 2) { this.steer(i, c.x - p.x, c.y - p.y); return; }
      if (p.held) { p.held.destroy(); p.held = null; }
      this.routeWait[i] += dt;
      if (this.routeWait[i] > 0.25) {
        this.routeWait[i] = 0;
        const r = next.route;
        if (r.kind === 'climb') this.pv.tryClimb?.(p, r.tx, r.ty);
        else this.pv.tryRappel?.(p, r.tx, r.ty);
        if (!p.locked && ++this.routeTries[i] > 2) {
          // a corda não funcionou: pula direto para o outro lado
          const to = this.center(r.to);
          p.teleport(to.x, to.y);
        }
        if (p.locked) this.routeTries[i] = 0;
        this.paths[i] = null;
      }
      return;
    }
    // algo no caminho? resolve antes de passar
    if (L.occupied.has(L.key(next.x, next.y))) {
      const soft = this.softAt(next.x, next.y);
      if (soft?.kind === 'gate') {
        this.pv.gates?.filter((g) => g.tx === next.x && g.ty === next.y).forEach((g) => { g.forced = true; });
      } else if (soft?.kind === 'tag' && soft.it) {
        this.clearObstacle(soft.it);
      }
    }
    const c = this.center(next);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    // fica parado esperando o portão/espinho sumir (até um limite)
    if (d < 14 && L.occupied.has(L.key(next.x, next.y)) && this.softAt(next.x, next.y)?.kind !== 'boulder' && !this.waited(`soft${i}`, 1.5)) return;
    this.resetWait(`soft${i}`);
    if (d <= 2.5) { path.shift(); return; }
    // travou? recalcula; travou muito? dá um empurrãozinho até o próximo tile
    const s = this.stuck[i];
    if (d < s.d - 0.5) { s.d = d; s.t = 0; } else s.t += dt;
    if (s.t > 2.5) { p.teleport(c.x, c.y); s.t = 0; s.d = 1e9; path.shift(); return; }
    this.steer(i, c.x - p.x, c.y - p.y);
  }

  steer(i: 0 | 1, dx: number, dy: number): void {
    const d = Math.hypot(dx, dy);
    if (d < 0.5) return;
    const k = Math.min(1, Math.max(0.35, d / 6));
    this.move(i, (dx / d) * k, (dy / d) * k);
  }

  /** Espinhos: magia dela · rocha rachada, cipó e tronco: espada dele. */
  clearObstacle(it: Interactable): void {
    if (!this.waited(`clear${it.x},${it.y}`, 0.35)) return;
    const [j, ju] = this.L.players;
    if (it.tag === 'thorns') { ju.actTimer = 0.3; it.onMagic?.(ju); }
    else { j.actTimer = 0.3; it.onStrike?.(j, 1); }
  }

  // ------------------------------------------------------------------ comportamentos comuns
  /** Espanta inimigos por perto (ele com a espada, ela com a magia). */
  fight(): void {
    const L = this.L;
    L.players.forEach((p, idx) => {
      const i = idx as 0 | 1;
      if (p.locked || p.fainted) return;
      const e = L.enemies.filter((en) => !en.dead).find((en) => Math.hypot(en.x - p.x, en.y - p.y) < (i === 0 ? 22 : 40));
      if (!e || p.abilityCd > 0) return;
      // vira para o bicho e ataca
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (Math.abs(dx) > Math.abs(dy)) this.face(i, dx, 0);
      else this.face(i, 0, dy);
      this.press(i, 'ability', 0.4);
    });
  }

  /** Segue o outro jogador de perto (sem grudar). */
  follow(i: 0 | 1, leader: 0 | 1, gap = 20): void {
    const L = this.L;
    const a = L.players[i];
    const b = L.players[leader];
    if (Math.hypot(a.x - b.x, a.y - b.y) <= gap && !b.locked) { this.goTo(i, null); return; }
    this.goTo(i, this.tileOf(b));
  }

  release(): void {
    // volta a colisão normal dos personagens
    this.L.players.forEach((p) => { if (!p.locked) p.body.checkCollision.none = false; });
  }

  step(dt: number): void {
    this.pause = [false, false];
    this.plan(dt);
    this.walk(0, dt);
    this.walk(1, dt);
    this.fight();
  }

  abstract plan(dt: number): void;
}

export type { Tile, Route, Step };
