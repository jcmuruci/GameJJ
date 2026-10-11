import Phaser from 'phaser';
import { Pilot } from './Pilot';
import { CALLS } from '../../scenes/levels/FishingLevel';

// ====================================================================== moto
interface MotoObj { kind: string; x: number; y: number; w: number; h: number; dead: boolean; scared?: boolean; shot?: boolean }
interface MotoView {
  started: boolean;
  ended: boolean;
  solo: boolean;
  repair: number;
  stopWait: unknown;
  gate: { o: { x: number }; state: string; warned: boolean } | null;
  catchT: number;
  objs: MotoObj[];
  mx: number;
  my: number;
  air: number;
  jumpCd: number;
  boltCd: number;
  hornCd: number;
  curve: { dir: number; b: number } | null;
}

const LANES = [112, 152, 192];
const JUMPABLE = ['pothole', 'cone', 'mud'];
const DANGER = ['pothole', 'rock', 'cone', 'mud', 'capy'];

/** Moto: ele desvia e pula; a garupa (ou ele, no solo) buzina, fotografa, para e segura o pão. */
export class MotoPilot extends Pilot {
  get v(): MotoView { return this.s as unknown as MotoView; }

  step(): void {
    const s = this.v;
    if (s.ended) return;
    if (!s.started) { this.press(0, 'action', 0.5); this.press(1, 'action', 0.5); return; }
    const helper: 0 | 1 = s.solo ? 0 : 1;
    // pneu furado: ele segura a moto, ela bombeia
    if (s.repair >= 0) { this.hold(0, 'action'); this.press(1, 'action', 0.1); return; }

    const ahead = (o: MotoObj, from: number, to: number) => !o.dead && o.x > s.mx + from && o.x < s.mx + to;
    let busy = false;
    if (s.catchT > 0) busy = this.press(helper, 'action', 0.2);
    else if (s.gate && ((s.gate.state === 'closed' && s.gate.o.x - s.mx < 70) || s.gate.state === 'closing')) busy = this.press(helper, 'action', 0.35);
    else if (s.stopWait) busy = this.press(helper, 'action', 0.35);
    else if (s.objs.some((o) => o.kind === 'spot' && !o.shot && ahead(o, -50, 160))) busy = this.press(helper, 'action', 0.35);
    // buzina para os bichos na estrada
    if (s.objs.some((o) => o.kind === 'capy' && !o.scared && ahead(o, -10, 190)) && s.hornCd <= 0 && !(s.solo && busy)) this.press(0, 'action', 0.4, 'horn');
    // magia nas pedras da faixa
    if (!s.solo && s.boltCd <= 0 && s.objs.some((o) => o.kind === 'rock' && ahead(o, 0, 220) && Math.abs(o.y - s.my) < 12)) this.press(1, 'ability', 0.45);

    // escolhe a faixa mais livre
    const threats = s.objs.filter((o) => DANGER.includes(o.kind) && ahead(o, -16, 130) && !(o.kind === 'capy' && o.scared));
    const scoreLane = (ly: number) => {
      let sc = Math.abs(ly - s.my) * 0.05;
      for (const o of threats) {
        if (Math.abs(o.y - ly) < (o.h + 10) / 2 + 6) sc += JUMPABLE.includes(o.kind) ? 40 : 100 + (130 - (o.x - s.mx));
      }
      for (const o of s.objs) if ((o.kind === 'coin' || o.kind === 'heart') && ahead(o, 0, 120) && Math.abs(o.y - ly) < 10) sc -= 3;
      return sc;
    };
    const lane = LANES.reduce((a, b) => (scoreLane(a) <= scoreLane(b) ? a : b));
    const dy = lane - s.my;
    const y = Math.abs(dy) < 2 ? 0 : Phaser.Math.Clamp(dy / 10, -1, 1);
    // pula o que dá pra pular bem na frente
    const front = threats.find((o) => Math.abs(o.y - s.my) < (o.h + 10) / 2 + 2 && o.x - s.mx > 10 && o.x - s.mx < 40);
    if (front && JUMPABLE.includes(front.kind) && s.jumpCd <= 0 && s.air <= 0) this.press(0, 'ability', 0.3);
    const blocked = front && !JUMPABLE.includes(front.kind) && Math.abs(dy) < 4;
    this.move(0, blocked ? -1 : 0.45, y);
    // curva: ela se inclina para equilibrar
    if (s.curve && !s.solo) this.move(1, Phaser.Math.Clamp(s.curve.dir * 0.55 - s.curve.b * 3, -1, 1), 0);
    // torcida do sofá (quem não joga)
    if (s.solo && this.t > 2) this.press(1, 'action', Phaser.Math.FloatBetween(4, 7), 'cheer');
  }
}

// ====================================================================== pescaria
interface FishView {
  state: string;
  power: number;
  aimGrace: number;
  tension: number;
  fighting: number;
  ringT: number;
  callIdx: number;
  callWin: number;
}

/** Pescaria: ela lança na força certa, fisga e recolhe; ele afrouxa a linha e usa o puçá. Depois, quadrilha. */
export class FishPilot extends Pilot {
  get v(): FishView { return this.s as unknown as FishView; }

  step(): void {
    const s = this.v;
    switch (s.state) {
      case 'intro':
        this.press(0, 'action', 0.5);
        this.press(1, 'action', 0.5);
        break;
      case 'aim':
        if (s.aimGrace <= 0 && s.power > 0.7 && s.power < 0.92) this.press(1, 'action', 0.6);
        break;
      case 'bite':
        this.press(1, 'action', 0.3);
        break;
      case 'reel':
        if (s.tension < 0.7) this.press(1, 'action', 0.13);
        if (s.fighting > 0 || s.tension > 0.55) this.hold(0, 'ability');
        break;
      case 'land': {
        const r = s.ringT / 1.1;
        if (r > 0.16 && r < 0.4) this.press(0, 'action', 0.6);
        break;
      }
      case 'party': {
        const c = CALLS[s.callIdx];
        if (!c || c.need === 'none' || s.callWin <= 0 || s.callWin > 1.25) break;
        for (const i of [0, 1] as const) {
          const what = c.need === 'action' ? 'action' : c.need === 'ability' ? 'ability' : c.need;
          this.press(i, what, 3, `call${s.callIdx}-${i}`);
        }
        break;
      }
    }
  }
}

// ====================================================================== medalha
interface MedalObj { kind: string; wx: number; y: number; done?: boolean }
interface MedalView {
  state: string;
  dist: number;
  jy: number;
  objs: MedalObj[];
  crossings: { at: number; red: boolean; t: number; spawned: boolean; entered: boolean }[];
  atDoor: unknown;
  sel: number;
  shopOrder: number[];
  seq: ('up' | 'down' | 'left' | 'right')[];
  seqIdx: number;
}

const M_LANES = [116, 142, 168];
const JX = 150;

/** Medalha: ela anda pela calçada, espera o sinal verde, espanta pombos e resolve cada parada. */
export class MedalPilot extends Pilot {
  get v(): MedalView { return this.s as unknown as MedalView; }

  step(): void {
    const s = this.v;
    switch (s.state) {
      case 'intro':
        this.press(0, 'action', 0.5);
        this.press(1, 'action', 0.5);
        return;
      case 'walk':
        this.walk();
        break;
      case 'shop': {
        const target = s.shopOrder.indexOf(0);
        if (s.sel !== target) this.press(1, s.sel < target ? 'right' : 'left', 0.35);
        else this.press(1, 'action', 0.8);
        break;
      }
      case 'bless':
        this.hold(1, 'action');
        break;
      case 'wrap': {
        const d = s.seq[s.seqIdx];
        if (d) this.press(1, d, 0.4);
        break;
      }
    }
    // o João torce do sofá
    if (s.state !== 'end' && this.t > 2) this.press(0, 'action', Phaser.Math.FloatBetween(4, 7), 'cheer');
  }

  private walk(): void {
    const s = this.v;
    const herX = s.dist + JX;
    let go = 1;
    if (s.atDoor) { this.press(1, 'action', 0.8); go = 0; }
    // faixa de pedestre: espera o verde (e não entra no fim do verde)
    for (const c of s.crossings) {
      if (!c.spawned || c.entered) continue;
      const gap = c.at - 30 - herX;
      if (gap > -2 && gap < 36 && (c.red || c.t < 0.9)) go = 0;
    }
    // desvia da poça, dos pombos e do skate; pega os corações
    const within = (o: MedalObj, to: number) => { const sx = o.wx - s.dist; return sx > JX - 8 && sx < JX + to; };
    const bad = s.objs.filter((o) => within(o, o.kind === 'skater' ? 120 : 80) && (o.kind === 'puddle' || o.kind === 'pigeon' || o.kind === 'skater') && !o.done);
    const hearts = s.objs.filter((o) => o.kind === 'heart' && within(o, 150));
    const lane = M_LANES.reduce((a, b) => {
      const sc = (ly: number) => bad.filter((o) => Math.abs(o.y - ly) < 12).length * 10
        - hearts.filter((o) => Math.abs(o.y + 6 - ly) < 10).length * 6 + Math.abs(ly - s.jy) * 0.02;
      return sc(a) <= sc(b) ? a : b;
    });
    const dy = lane - s.jy;
    // pombos à frente: magia
    if (s.objs.some((o) => o.kind === 'pigeon' && !o.done && o.wx - s.dist > JX - 10 && o.wx - s.dist < JX + 130)) this.press(1, 'ability', 0.7);
    // cachorrinho do lado: carinho
    if (s.objs.some((o) => o.kind === 'dog' && !o.done && Math.abs(o.wx - s.dist - JX) < 26 && Math.abs(o.y - s.jy) < 18)) this.press(1, 'action', 1);
    this.move(1, go, Math.abs(dy) < 2 ? 0 : Phaser.Math.Clamp(dy / 8, -1, 1));
  }
}
