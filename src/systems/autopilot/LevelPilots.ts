import Phaser from 'phaser';
import { WalkPilot, Tile } from './WalkPilot';
import { TILE } from '../../config';
import { RECIPES } from '../../data/recipes';
import type { ItemKind, RecipeId } from '../../data/recipes';
import type { BaseLevel } from '../../scenes/levels/BaseLevel';
import type { Player, Interactable } from '../../entities/Player';
import type { Item } from '../../entities/Item';

type Pt = { x: number; y: number };

// ====================================================================== trilhas
interface TrailView {
  cfg: { event: string };
  pickups: { img: Pt; kind: string; taken: boolean; baseY: number }[];
  exits: Pt[];
  gust: { t: number } | null;
  photoTarget: { img: Pt; taken: boolean } | null;
  awaitingYes: boolean;
  cutscene: boolean;
}

/** Trilhas (escalada, cânion, Itacolomi, Topo do Mundo, Lapinha): coleta tudo e vai para a saída juntos. */
export class TrailPilot extends WalkPilot {
  private target: Tile | null = null;
  private final = false;
  private retarget = 0;

  get v(): TrailView & BaseLevel { return this.L as unknown as TrailView & BaseLevel; }

  plan(dt: number): void {
    const L = this.v;
    if (L.ended) return;
    if (L.awaitingYes) { this.press(1, 'action', 1.5); return; }
    if (!L.started || L.cutscene) return;
    // rajada de vento: os dois seguram firme
    if (L.gust) { this.hold(0, 'action'); this.hold(1, 'action'); }
    // parapente passando: ela tira a foto
    const pt = L.photoTarget;
    if (pt && !pt.taken && L.cameras.main.worldView.contains(pt.img.x, pt.img.y)) this.press(1, 'ability', 0.5);

    this.retarget -= dt;
    if (this.retarget <= 0 || !this.target) {
      this.retarget = 1;
      this.pickTarget();
    }
    const [j, ju] = L.players;
    if (!this.target) return;
    this.goTo(0, this.target);
    if (this.final) this.goTo(1, this.target);
    else this.follow(1, 0, 22);
    // não deixa um ir longe demais do outro (a câmera segue os dois)
    if (!this.final && !ju.locked && Math.hypot(j.x - ju.x, j.y - ju.y) > 150) this.pause[0] = true;
  }

  private pickTarget(): void {
    const L = this.v;
    const from = this.tileOf(L.players[0]);
    const crystals = L.pickups.filter((pk) => pk.kind === 'crystal' && !pk.taken);
    if (crystals.length) {
      const { dist } = this.dijkstra(from);
      let best: Tile | null = null;
      let bd = Infinity;
      for (const c of crystals) {
        const t = this.tileOf({ x: c.img.x, y: c.baseY });
        const d = dist[t.y * L.cols + t.x];
        if (d < bd) { bd = d; best = t; }
      }
      if (best) { this.target = best; this.final = false; return; }
    }
    const ex = L.exits[0];
    if (!ex) return;
    // Topo do Mundo: as fotos vêm dos parapentes; esperam um pouco perto da saída
    if (L.cfg.event === 'photos' && L.stats.crystals < 3 && L.elapsed < 100) {
      const t = this.tileOf(ex);
      this.target = this.nearFree(t.x, t.y - 3) ?? t;
      this.final = false;
      return;
    }
    this.target = this.tileOf(ex);
    this.final = true;
  }
}

// ====================================================================== tutorial
interface TutorialView {
  step: number;
  flags: { x: number; y: number; id: number }[];
  logCut: boolean;
  fuel: boolean;
  lit: boolean;
  exits: Pt[];
  boulders: { tx: number; ty: number }[];
  triggers: { tx: number; ty: number; type: string; gate: string }[];
}

/** Tutorial na Pedra Grande: cumpre cada passo do treino. */
export class TutorialPilot extends WalkPilot {
  get v(): TutorialView & BaseLevel { return this.L as unknown as TutorialView & BaseLevel; }

  private tagged(tag: string): Interactable | undefined {
    return this.L.interactables.find((i) => i.tag === tag);
  }

  private above(it: Pt): Tile { return { x: Math.floor(it.x / TILE), y: Math.floor(it.y / TILE) - 1 }; }

  private lastStep = -1;
  private stepT = 0;

  plan(dt: number): void {
    const L = this.v;
    if (L.ended) return;
    const [j, ju] = L.players;
    this.ghost = true;
    // passo travado por muito tempo: resolve na marra para o treino seguir
    if (L.step !== this.lastStep) { this.lastStep = L.step; this.stepT = 0; }
    this.stepT += dt;
    if (this.stepT > 25) { this.stepT = 0; this.forceStep(); return; }
    switch (L.step) {
      case 0: {
        L.flags.forEach((f) => this.goTo(f.id as 0 | 1, this.tileOf(f)));
        break;
      }
      case 1: {
        const log = this.tagged('log');
        if (!log) break;
        const spot = this.above(log);
        this.goTo(0, spot);
        if (this.at(0, spot)) {
          this.goTo(0, null);
          this.face(0, 0, 1);
          this.press(0, 'ability', 0.5);
          if (this.waited('log', 0.8)) log.onStrike?.(j, 1);
        }
        break;
      }
      case 2: {
        const fire = this.tagged('campfire');
        if (!fire) break;
        if (j.held?.kind !== 'firewood') {
          const wood = L.interactables.find((i) => (i as Interactable & { item?: Item }).item?.kind === 'firewood');
          if (wood) {
            const spot = this.above(wood);
            this.goTo(0, spot);
            if (this.at(0, spot)) {
              this.goTo(0, null);
          this.face(0, 0, 1);
              this.press(0, 'action', 0.5);
              if (this.waited('wood', 1)) wood.interact?.(j);
            }
          } else L.give(j, 'firewood');
        } else {
          const spot = this.above(fire);
          this.goTo(0, spot);
          if (this.at(0, spot)) {
            this.goTo(0, null);
          this.face(0, 0, 1);
            this.press(0, 'action', 0.5);
            if (this.waited('fuel', 1)) fire.interact?.(j);
          }
        }
        break;
      }
      case 3: {
        const fire = this.tagged('campfire');
        if (!fire) break;
        this.goTo(0, { x: Math.floor(fire.x / TILE) + 2, y: Math.floor(fire.y / TILE) - 1 });
        const spot = { x: Math.floor(fire.x / TILE) - 1, y: Math.floor(fire.y / TILE) };
        this.goTo(1, spot);
        if (this.at(1, spot)) {
          this.goTo(1, null);
          this.face(1, 1, 0);
          this.press(1, 'ability', 0.7);
          if (this.waited('lit', 1.2)) fire.onMagic?.(ju);
        }
        break;
      }
      case 4: {
        // empurra a pedra até a placa (mesma coluna): ele encosta por cima e empurra para baixo
        const b = L.boulders[0];
        const plate = L.triggers.find((t) => t.type === 'plate' && t.gate === 'A');
        if (!b || !plate) break;
        if (b.tx !== plate.tx || this.waited('push-limit', 20)) { this.cheatBoulder(b, plate); break; }
        const spot = { x: b.tx, y: b.ty - 1 };
        this.goTo(1, { x: 8, y: 10 });
        if (this.at(0, spot, 5) || (this.near(0, this.center(spot), 9) && j.y < b.ty * TILE)) {
          this.ghost = false;
          this.goTo(0, null);
          this.move(0, 0, 1);
        } else this.goTo(0, spot);
        break;
      }
      case 5: {
        this.goTo(0, { x: 37, y: 5 });
        this.goTo(1, { x: 38, y: 5 });
        break;
      }
      case 6: {
        const a = { x: 38, y: 3 };
        const c = { x: 39, y: 3 };
        this.goTo(0, a);
        this.goTo(1, c);
        if (this.near(0, this.center(a), 8) && this.near(1, this.center(c), 8)) {
          // abraço: os dois apertam AÇÃO juntos
          if (this.press(0, 'action', 0.8, 'hug')) this.cmd[1].actionPressed = true;
          if (this.waited('hug', 3)) L.doHug(j, ju);
        }
        break;
      }
      case 7: {
        this.goTo(0, { x: 38, y: 12 });
        this.goTo(1, { x: 37, y: 12 });
        break;
      }
      default: {
        const ex = L.exits[0];
        if (ex) { const t = this.tileOf(ex); this.goTo(0, t); this.goTo(1, t); }
      }
    }
  }

  /** Último recurso para cada passo do treino. */
  private forceStep(): void {
    const L = this.v;
    const [j, ju] = L.players;
    const put = (p: Player, t: Tile) => { const c = this.center(t); p.teleport(c.x, c.y); };
    const fire = this.tagged('campfire');
    switch (L.step) {
      case 0: L.flags.forEach((f) => L.players[f.id].teleport(f.x, f.y)); break;
      case 1: this.tagged('log')?.onStrike?.(j, 1); break;
      case 2: if (fire) { if (j.held?.kind !== 'firewood') { if (j.held) { j.held.destroy(); j.held = null; } L.give(j, 'firewood'); } fire.interact?.(j); } break;
      case 3: fire?.onMagic?.(ju); break;
      case 4: {
        const b = L.boulders[0];
        const plate = L.triggers.find((t) => t.type === 'plate' && t.gate === 'A');
        if (b && plate) this.cheatBoulder(b, plate);
        break;
      }
      case 5: put(j, { x: 37, y: 5 }); put(ju, { x: 38, y: 5 }); break;
      case 6: L.doHug(j, ju); break;
      case 7: put(j, { x: 38, y: 12 }); put(ju, { x: 37, y: 12 }); break;
      default: {
        const ex = L.exits[0];
        if (ex) { j.teleport(ex.x, ex.y); ju.teleport(ex.x + 2, ex.y); }
      }
    }
  }

  /** Último recurso: leva a pedra até a placa. */
  private cheatBoulder(b: { tx: number; ty: number }, plate: { tx: number; ty: number }): void {
    const bo = b as unknown as { tx: number; ty: number; zone: Phaser.GameObjects.Zone; img: Phaser.GameObjects.Image };
    const L = this.L;
    L.occupied.delete(L.key(bo.tx, bo.ty));
    bo.tx = plate.tx;
    bo.ty = plate.ty;
    L.occupied.set(L.key(bo.tx, bo.ty), bo);
    const c = this.center({ x: plate.tx, y: plate.ty });
    bo.zone.setPosition(c.x, c.y);
    (bo.zone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    L.tweens.add({ targets: bo.img, x: c.x, y: c.y, duration: 600 });
  }
}

// ====================================================================== hotel fazenda
interface FarmView {
  animals: (Interactable & { x: number; y: number; petted: boolean })[];
  ostrich: (Interactable & { x: number; y: number; state: string }) | null;
  ostrichScares: number;
  boat: { x: number; y: number; angle: number } | null;
  buoys: Pt[];
  buoyIdx: number;
  dock: Pt;
  exits: Pt[];
}

/** Hotel Fazenda: carinho em todos os bichos, espanta a avestruz e pedala até as boias. */
export class FarmPilot extends WalkPilot {
  get v(): FarmView & BaseLevel { return this.L as unknown as FarmView & BaseLevel; }

  plan(): void {
    const L = this.v;
    if (L.ended) return;
    const [j] = L.players;
    if (L.boat) { this.pedal(); return; }
    const pet = L.animals.filter((a) => !a.petted);
    if (pet.length) {
      const a = pet.reduce((x, y) => (Math.hypot(x.x - j.x, x.y - j.y) < Math.hypot(y.x - j.x, y.y - j.y) ? x : y));
      this.goTo(0, this.tileOf(a));
      this.follow(1, 0, 24);
      if (this.near(0, a, 22)) { j.actTimer = 0.3; a.interact?.(j); }
      return;
    }
    const o = L.ostrich;
    if (o && L.ostrichScares < 2) {
      this.goTo(0, this.tileOf(o));
      this.follow(1, 0, 30);
      if (this.near(0, o, 24) && o.state !== 'scared') {
        this.press(0, 'ability', 0.5);
        j.actTimer = 0.3;
        o.onStrike?.(j, 1);
      }
      return;
    }
    const ex = L.exits[0];
    if (ex) { const t = this.tileOf(ex); this.goTo(0, t); this.goTo(1, t); }
  }

  /** Pedalinho: miram na próxima boia e pedalam juntos. */
  private pedal(): void {
    const L = this.v;
    const b = L.boat!;
    const target = L.buoyIdx < L.buoys.length ? L.buoys[L.buoyIdx] : { x: L.dock.x + 22, y: L.dock.y };
    const want = Math.atan2(target.y - b.y, target.x - b.x);
    const diff = Phaser.Math.Angle.Wrap(want - b.angle);
    const steerX = Phaser.Math.Clamp(diff * 2.5, -1, 1);
    this.move(0, steerX, 0);
    this.move(1, steerX, 0);
    // só pedala com o bico apontado para a boia (senão fica rodando em volta dela)
    const dist = Math.hypot(target.x - b.x, target.y - b.y);
    const aligned = Math.abs(diff) < (dist < 70 ? 0.22 : 0.35);
    if (aligned && this.press(0, 'action', dist < 70 ? 0.6 : 0.3, 'pedal')) this.cmd[1].actionPressed = true;
  }
}

// ====================================================================== cozinha
interface KitchenView {
  orders: { recipe: RecipeId; timeLeft: number }[];
  rings: { state: string };
  cookers: { x: number; y: number; type: 'pot' | 'oven' }[];
  deliver(p: Player, at: Pt): void;
}

interface Job { recipe: RecipeId; p1: 'go' | 'work' | 'done'; p2: 'go' | 'work' | 'plate' | 'serve' | 'done'; t: number }

const CHOPPABLE: ItemKind[] = ['tomato', 'bread', 'cheese'];
const RAW: Partial<Record<ItemKind, ItemKind>> = {
  tomato_cut: 'tomato', bread_cut: 'bread', cheese_cut: 'cheese', pasta_cooked: 'pasta', pizza: 'dough',
};

/** Cozinha: os dois pegam ingredientes, cortam, cozinham e servem os pedidos no salão. */
export class KitchenPilot extends WalkPilot {
  private job: Job | null = null;

  get v(): KitchenView & BaseLevel { return this.L as unknown as KitchenView & BaseLevel; }

  private station(tag: string, near?: Player): Interactable | undefined {
    const all = this.L.interactables.filter((i) => i.tag === tag);
    if (!near || all.length < 2) return all[0];
    return all.reduce((a, b) => (Math.hypot(a.x - near.x, a.y - near.y) <= Math.hypot(b.x - near.x, b.y - near.y) ? a : b));
  }

  /** Vai até ao lado de um objeto; true quando chegou. */
  private reach(i: 0 | 1, obj: Pt | undefined): boolean {
    if (!obj) return false;
    const p = this.L.players[i];
    const spot = this.nearFree(Math.floor(obj.x / TILE), Math.floor(obj.y / TILE), this.tileOf(p));
    if (!spot) return false;
    this.goTo(i, spot);
    return this.at(i, spot, 4);
  }

  private hands(p: Player, kind: ItemKind | null): void {
    if (p.held && p.held.kind !== kind) { p.held.destroy(); p.held = null; }
    if (kind && !p.held) this.L.give(p, kind);
  }

  plan(dt: number): void {
    const L = this.v;
    if (L.ended) return;
    if (!L.started) { this.press(0, 'action', 0.6); this.press(1, 'action', 0.6); return; }
    const [j, ju] = L.players;

    // hora das alianças: ele pega a caixinha e dá um abraço nela
    if (L.rings.state === 'table' || L.rings.state === 'carried') {
      if (L.rings.state === 'table') {
        const box = this.station('rings');
        if (box && this.reach(0, box)) box.interact?.(j);
      } else {
        this.goTo(0, this.tileOf(ju));
        if (Math.hypot(j.x - ju.x, j.y - ju.y) < 24) L.doHug(j, ju);
      }
      this.goTo(1, null);
      return;
    }

    if (!this.job) {
      const o = [...L.orders].sort((a, b) => a.timeLeft - b.timeLeft)[0];
      if (!o) { this.goTo(0, null); this.goTo(1, null); return; }
      this.job = { recipe: o.recipe, p1: 'go', p2: 'go', t: 0 };
    }
    const job = this.job;
    const needs = RECIPES[job.recipe].needs;
    // ele corta o ingrediente picado; ela cuida do outro (panela, forno ou tábua)
    const raws = needs.map((k) => RAW[k] ?? k);
    const rawA = raws.find((r) => CHOPPABLE.includes(r)) ?? 'tomato';
    const rawB = raws.filter((_, idx) => idx !== raws.indexOf(rawA))[0] ?? 'cheese';
    job.t += dt;

    // ele: pega o ingrediente e corta na tábua
    if (job.p1 === 'go') {
      if (!j.held && this.reach(0, this.station(`src:${rawA}`, j))) this.hands(j, rawA);
      else if (j.held && this.reach(0, this.station('st_board', j))) { job.p1 = 'work'; this.resetWait('chop'); }
    } else if (job.p1 === 'work') {
      j.working = true;
      j.actTimer = 0.1;
      if (this.waited('chop', 1.4)) { this.hands(j, null); job.p1 = 'done'; }
    }

    // ela: pega o outro ingrediente, leva ao fogo, monta o prato e serve
    const cookerType = rawB === 'pasta' ? 'pot' : rawB === 'dough' ? 'oven' : null;
    if (job.p2 === 'go') {
      if (!ju.held && this.reach(1, this.station(`src:${rawB}`, ju))) this.hands(ju, rawB);
      else if (ju.held) {
        const target = cookerType ? L.cookers.find((c) => c.type === cookerType) : this.station('st_board', ju);
        if (this.reach(1, target)) { job.p2 = 'work'; this.resetWait('cook'); }
      }
    } else if (job.p2 === 'work') {
      ju.actTimer = 0.1;
      if (this.waited('cook', 1.6)) { this.hands(ju, null); job.p2 = 'plate'; }
    } else if (job.p2 === 'plate') {
      if (this.reach(1, this.station('st_plates', ju)) && job.p1 === 'done') {
        this.hands(ju, 'plate');
        needs.forEach((k) => ju.held!.addContent(k));
        job.p2 = 'serve';
      }
    } else if (job.p2 === 'serve') {
      if (!ju.held?.isPlate) {
        // derrubou o prato no caminho: monta outro
        this.hands(ju, 'plate');
        needs.forEach((k) => ju.held!.addContent(k));
      }
      const d = this.station('deliver', ju);
      if (this.reach(1, d)) {
        L.deliver(ju, d!);
        if (ju.held) { ju.held.destroy(); ju.held = null; }
        this.job = null;
      }
    }
    // pedido expirou no meio do caminho: começa outro
    if (this.job && !L.orders.some((o) => o.recipe === job.recipe) && job.p2 !== 'serve') {
      this.hands(j, null);
      this.hands(ju, null);
      this.job = null;
    }
    if (job.t > 40) { this.hands(j, null); this.hands(ju, null); this.job = null; }
  }
}
