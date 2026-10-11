import Phaser from 'phaser';
import { CharacterLook } from '../data/characters';
import { PG, shade, mix, hexToRgb } from './pixel';

/**
 * Gera a folha de sprites de um personagem a partir de um CharacterLook.
 * Cada quadro tem 24x32 px (cabeça grande, estilo anime). Linhas: 0 = baixo, 1 = cima, 2 = lado (esquerda).
 * Colunas: 0 = parado, 1 = passo A, 2 = passo B, 3 = ação,
 * 4/5 = passagem depois do passo A/B (pés juntos, cabelo balançando),
 * 6 = respirando (ombros descem), 7 = golpe (espada do João / magia da Juliana).
 * Para a direita o sprite é espelhado (flipX).
 */
export const CHAR_W = 24;
export const CHAR_H = 32;
export const CHAR_COLS = 8;
/** Do centro do sprite até o meio dos pés (onde fica o corpo físico). */
export const CHAR_FEET = 12;
/** Dos pés até o alto da cabeça. */
export const CHAR_TOP = 28;
/** Ciclo de caminhada (colunas). */
export const WALK_CYCLE = [1, 4, 2, 5];
export type Dir = 'down' | 'up' | 'side';
export const DIR_ROW: Record<Dir, number> = { down: 0, up: 1, side: 2 };

export function charFrame(dir: Dir, col: number): number {
  return DIR_ROW[dir] * CHAR_COLS + col;
}

export function generateCharacterTexture(scene: Phaser.Scene, key: string, look: CharacterLook, role: 0 | 1): void {
  const tex = reuseCanvas(scene, key, CHAR_W * CHAR_COLS, CHAR_H * 3);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const fresh = !tex.has('0');
  const pg = new PG(ctx);
  const dirs: Dir[] = ['down', 'up', 'side'];
  dirs.forEach((dir, row) => {
    for (let col = 0; col < CHAR_COLS; col++) {
      pg.at(col * CHAR_W, row * CHAR_H);
      drawCharacter(pg, look, dir, col, role);
      pg.outline(0, 0, CHAR_W, CHAR_H);
      if (fresh) tex.add(row * CHAR_COLS + col, 0, col * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H);
    }
  });
  tex.refresh();
}

/**
 * Devolve uma textura de canvas limpa com essa chave. Se já existir com o mesmo
 * tamanho, redesenha no mesmo canvas: sprites que a usam continuam válidos
 * (remover a textura com sprites na tela derruba o render).
 */
export function reuseCanvas(scene: Phaser.Scene, key: string, w: number, h: number): Phaser.Textures.CanvasTexture | null {
  if (scene.textures.exists(key)) {
    const old = scene.textures.get(key);
    if (old instanceof Phaser.Textures.CanvasTexture && old.width === w && old.height === h) {
      old.getContext().clearRect(0, 0, w, h);
      return old;
    }
    scene.textures.remove(key);
  }
  return scene.textures.createCanvas(key, w, h);
}

interface Colors {
  skin: string; skinD: string; skinL: string;
  hair: string; hairD: string; hairL: string;
  shirt: string; shirtD: string; shirtL: string;
  pants: string; pantsD: string; shoes: string; shoesD: string;
  blush: string; ink: string;
}

function colors(L: CharacterLook): Colors {
  const [hr, hg, hb] = hexToRgb(L.hair);
  return {
    skin: L.skin, skinD: shade(L.skin, -0.18), skinL: shade(L.skin, 0.3),
    hair: L.hair, hairD: shade(L.hair, -0.3),
    // brilho do cabelo: em cabelo bem escuro, um reflexo quente em vez de cinza
    hairL: hr * 0.3 + hg * 0.59 + hb * 0.11 < 50 ? mix(L.hair, '#a8704a', 0.4) : shade(L.hair, 0.25),
    shirt: L.shirt, shirtD: shade(L.shirt, -0.28), shirtL: shade(L.shirt, 0.2),
    pants: L.pants, pantsD: shade(L.pants, -0.3), shoes: L.shoes, shoesD: shade(L.shoes, -0.25),
    blush: mix(L.skin, '#ff6f8f', 0.45), ink: L.tattooColor || '#2f3a5a',
  };
}

function drawCharacter(pg: PG, L: CharacterLook, dir: Dir, frame: number, role: 0 | 1): void {
  const C = colors(L);
  const stepA = frame === 1;
  const stepB = frame === 2;
  const walking = stepA || stepB;
  const pass = frame === 4 || frame === 5;
  const skill = frame === 7;
  const act = frame === 3 || skill;
  const oy = walking || frame === 6 ? 1 : 0; // balanço do corpo ao andar / respirar
  const long = L.hairStyle === 'longo' || L.hairStyle === 'ondulado';

  // ---------- TIPO DE CORPO ----------
  const bw = L.build === 'magro' ? 8 : L.build === 'forte' ? 12 : 10; // largura do tronco
  const bx = 12 - bw / 2;
  const legW = L.build === 'magro' ? 3 : L.build === 'forte' ? 5 : 4;

  drawLegs(pg, L, C, dir, { stepA, stepB, walking, pass, bx, bw, legW });

  pg.oy += oy;
  drawHairBack(pg, L, C, dir, pass);
  drawBody(pg, L, C, dir, { stepA, stepB, act, bx, bw, role });
  drawHead(pg, L, C, dir, act);
  drawHairFront(pg, L, C, dir, pass);
  if (L.highlights && long) drawHighlights(pg, L, dir);
  drawAccessory(pg, L, dir);
  if (skill) drawSkill(pg, dir, role, bx, bw);
  pg.oy -= oy;
}

// ------------------------------------------------------------------ pernas
function drawLegs(pg: PG, L: CharacterLook, C: Colors, dir: Dir, o: { stepA: boolean; stepB: boolean; walking: boolean; pass: boolean; bx: number; bw: number; legW: number }): void {
  if (dir === 'side') {
    const lw = L.build === 'magro' ? 4 : L.build === 'forte' ? 6 : 5;
    if (o.walking) {
      // pernas abertas; no passo B a outra perna vai na frente
      const front = o.stepA ? C.pants : C.pantsD;
      const back = o.stepA ? C.pantsD : C.pants;
      pg.rect(13, 23, 4, 5, back); pg.rect(13, 28, 5, 2, o.stepA ? C.shoesD : C.shoes);
      pg.rect(7, 23, 4, 6, front); pg.rect(5, 29, 6, 2, o.stepA ? C.shoes : C.shoesD);
      pg.rect(9, 22, 6, 2, C.pants); // quadril
    } else {
      pg.rect(10, 22, lw, 7, C.pants);
      pg.vline(10 + lw - 1, 23, 28, C.pantsD);
      pg.rect(8, 29, lw + 2, 2, C.shoes);
      pg.px(8, 29, shade(C.shoes, 0.2));
      // passagem: o calcanhar de trás sobe
      if (o.pass) { pg.clear(9 + lw, 30); pg.px(10 + lw, 29, C.shoesD); }
    }
    return;
  }
  const lUp = o.stepA ? 1 : 0;
  const rUp = o.stepB ? 1 : 0;
  const lx = 12 - o.legW;
  pg.rect(o.bx, 23, o.bw, 1, C.pants);
  pg.rect(lx, 24, o.legW, 5 - lUp, C.pants);
  pg.rect(12, 24, o.legW, 5 - rUp, C.pantsD);
  pg.rect(lx - 1, 29 - lUp, o.legW + 1, 2, C.shoes);
  pg.px(lx - 1, 29 - lUp, shade(C.shoes, 0.2));
  pg.rect(12, 29 - rUp, o.legW + 1, 2, C.shoesD);
}

// ------------------------------------------------------------------ corpo e braços
function drawBody(pg: PG, L: CharacterLook, C: Colors, dir: Dir, o: { stepA: boolean; stepB: boolean; act: boolean; bx: number; bw: number; role: 0 | 1 }): void {
  const short = L.sleeves === 'curtas';
  // braço direito do personagem: de frente fica à esquerda da tela; de costas, à direita
  const tatL = (L.tattoo === 'braco_direito' && dir === 'down') || (L.tattoo === 'braco_esquerdo' && dir === 'up') || L.tattoo === 'dois_bracos';
  const tatR = (L.tattoo === 'braco_direito' && dir === 'up') || (L.tattoo === 'braco_esquerdo' && dir === 'down') || L.tattoo === 'dois_bracos';
  const tatSide = L.tattoo !== 'nenhuma';
  /** Pele do braço, com o desenho tribal quando tatuado. */
  const skinAt = (k: number, col: number, tattooed: boolean) => (tattooed ? ((k + col) % 3 === 0 ? C.skin : C.ink) : C.skin);

  /** Braço vertical de 2 px: manga + pele (+ tatuagem) + mão. */
  const arm = (x: number, y0: number, sleeveC: string, tattooed: boolean) => {
    const sleeve = short ? 2 : 6;
    for (let k = 0; k < 6; k++) {
      for (let c = 0; c < 2; c++) pg.px(x + c, y0 + k, k < sleeve ? sleeveC : skinAt(k, c, tattooed));
    }
    pg.rect(x, y0 + 6, 2, 1, C.skin);
    pg.px(x, y0 + 6, C.skinD);
  };

  if (dir === 'side') {
    const sw = L.build === 'magro' ? 6 : L.build === 'forte' ? 9 : 8;
    const sx = 13 - Math.floor(sw / 2);
    pg.rect(sx, 15, sw, 7, C.shirt);
    pg.rect(sx + sw - 2, 15, 2, 7, C.shirtD);
    pg.px(sx, 15, C.shirtL);
    pg.rect(sx, 21, sw, 1, shade(C.shirt, -0.45)); // cinto
    if (o.act) {
      // braço esticado para a frente
      if (short) {
        pg.rect(sx - 1, 16, 2, 2, C.shirtL);
        for (let x = 3; x < sx - 1; x++) { pg.px(x, 16, tatSide && x % 2 ? C.ink : C.skin); pg.px(x, 17, tatSide && x % 3 === 0 ? C.ink : C.skin); }
      } else pg.rect(3, 16, sx - 2, 2, C.shirtL);
      pg.rect(1, 16, 2, 2, C.skin);
    } else {
      const s = o.stepA ? -1 : o.stepB ? 1 : 0;
      arm(sx + 2 + s, 15, C.shirtL, tatSide);
    }
    return;
  }

  const { bx, bw } = o;
  pg.rect(bx, 15, bw, 7, C.shirt);
  pg.rect(bx + bw - 2, 15, 2, 7, C.shirtD);
  pg.vline(bx, 15, 21, C.shirtL);
  pg.rect(bx, 22, bw, 1, shade(C.shirt, -0.45)); // cinto
  if (L.build === 'magro' && dir === 'down') { pg.px(bx, 20, shade(C.shirt, -0.2)); pg.px(bx + bw - 1, 20, shade(C.shirt, -0.35)); } // cintura fina
  if (dir === 'down') {
    // gola e detalhe de classe
    pg.rect(11, 15, 2, 1, C.skin); pg.px(11, 16, C.skinD); pg.px(12, 16, C.skinD);
    if (o.role === 0) { pg.px(bx + 1, 16, C.shirtL); pg.px(bx + bw - 2, 16, C.shirtL); pg.rect(11, 22, 2, 1, '#ffd25e'); }
    else if (L.accessory !== 'colar_sol') { pg.rect(11, 18, 2, 1, '#ffd25e'); pg.px(11, 17, '#fff1a8'); }
  }
  const aLx = bx - 2;
  const aRx = bx + bw;
  if (o.act) {
    // braços erguidos
    const up = (x: number, c: string, tattooed: boolean) => {
      pg.rect(x, 13, 2, 3, short ? C.skin : c);
      if (short && tattooed) { pg.px(x, 13, C.ink); pg.px(x + 1, 14, C.ink); }
      pg.rect(x, 15, 2, 2, c);
      pg.rect(x, 11, 2, 2, C.skin);
    };
    up(aLx, C.shirtL, tatL);
    up(aRx, C.shirtD, tatR);
  } else {
    arm(aLx, 15 + (o.stepA ? 1 : 0), C.shirtL, tatL);
    arm(aRx, 15 + (o.stepB ? 1 : 0), C.shirtD, tatR);
  }
  if (o.role === 0 && dir === 'up') {
    // espada nas costas
    pg.vline(16, 11, 22, '#d8d8e4'); pg.vline(17, 12, 21, '#a8a8b8'); pg.rect(15, 17, 4, 1, '#8a5a34'); pg.px(16, 23, '#a8a8b8');
  }
  if (o.role === 1 && dir === 'up') {
    // capa da maga
    pg.rect(bx, 15, bw, 8, shade(C.shirt, -0.12)); pg.rect(bx + 1, 22, bw - 2, 1, C.shirtD);
  }
}

// ------------------------------------------------------------------ cabeça e rosto
function drawHead(pg: PG, L: CharacterLook, C: Colors, dir: Dir, act: boolean): void {
  // cabeça 14x13 arredondada
  pg.rect(7, 2, 10, 1, C.skin);
  pg.rect(6, 3, 12, 1, C.skin);
  pg.rect(5, 4, 14, 9, C.skin);
  pg.rect(6, 13, 12, 1, C.skin);
  pg.rect(7, 14, 10, 1, C.skinD);
  pg.px(5, 12, C.skinD); pg.px(18, 12, C.skinD);

  const brow = shade(L.beard !== 'nenhuma' ? L.beardColor || L.hair : L.hair, -0.15);
  const eyeDark = shade(L.eyes, -0.55);
  const [er, eg, eb] = hexToRgb(L.eyes);
  const lightEyes = er * 0.3 + eg * 0.59 + eb * 0.11 > 70;
  /** Olho anime 2x3: risco escuro em cima, íris com brilho, íris escura embaixo. */
  const eye = (x: number) => {
    pg.rect(x, 8, 2, 1, eyeDark);
    pg.px(x, 9, '#ffffff'); pg.px(x + 1, 9, lightEyes ? mix(L.eyes, '#ffffff', 0.25) : L.eyes);
    pg.rect(x, 10, 2, 1, shade(L.eyes, -0.25));
  };

  if (dir === 'down') {
    eye(8); eye(14);
    const long = L.hairStyle === 'longo' || L.hairStyle === 'ondulado';
    pg.rect(8, 6, 2, 1, mix(brow, L.skin, long ? 0.35 : 0)); pg.rect(14, 6, 2, 1, mix(brow, L.skin, long ? 0.35 : 0));
    if (L.lashes) { pg.px(7, 8, '#1a1010'); pg.px(16, 8, '#1a1010'); pg.px(7, 7, '#1a1010'); pg.px(16, 7, '#1a1010'); }
    pg.rect(6, 11, 2, 1, C.blush); pg.rect(16, 11, 2, 1, C.blush);
    pg.px(12, 11, C.skinD); // nariz
    if (act) { pg.rect(11, 12, 2, 2, '#7a2a3a'); pg.px(11, 13, '#ff8fa8'); }
    else pg.rect(11, 12, 2, 1, mix(L.skin, '#8a3a3a', 0.5));
  } else if (dir === 'side') {
    // olhando para a esquerda
    pg.rect(6, 8, 2, 1, eyeDark);
    pg.px(6, 9, '#ffffff'); pg.px(7, 9, lightEyes ? mix(L.eyes, '#ffffff', 0.25) : L.eyes);
    pg.rect(6, 10, 2, 1, shade(L.eyes, -0.25));
    pg.rect(6, 6, 2, 1, brow);
    if (L.lashes) { pg.px(5, 8, '#1a1010'); pg.px(5, 7, '#1a1010'); }
    pg.rect(8, 11, 2, 1, C.blush);
    pg.px(4, 9, C.skin); pg.px(4, 10, C.skin); pg.px(4, 11, C.skinD); // nariz
    pg.px(6, 12, act ? '#7a2a3a' : mix(L.skin, '#8a3a3a', 0.5));
    if (act) pg.px(6, 13, '#7a2a3a');
    pg.vline(14, 8, 10, C.skinD); pg.px(15, 9, C.skinD); // orelha
  }

  // barba
  if (L.beard !== 'nenhuma' && dir !== 'up') {
    const beardC = L.beardColor || L.hair;
    const bc = L.beard === 'cheia' ? beardC : mix(L.skin, beardC, 0.55);
    const bl = shade(bc, 0.18);
    if (dir === 'down') {
      if (L.beard === 'cheia') {
        pg.rect(5, 9, 1, 4, bc); pg.rect(18, 9, 1, 4, bc);
        pg.rect(6, 11, 1, 2, bc); pg.rect(17, 11, 1, 2, bc);
      }
      pg.rect(6, 13, 12, 1, bc); pg.rect(7, 14, 10, 1, bc); pg.rect(8, 15, 8, 1, shade(bc, -0.15));
      pg.rect(9, 12, 2, 1, bc); pg.rect(13, 12, 2, 1, bc); // bigode
      pg.px(8, 14, bl); pg.px(15, 14, bl); pg.px(11, 15, bl);
      // a boca aparece no meio da barba
      if (act) { pg.rect(11, 12, 2, 2, '#7a2a3a'); } else pg.rect(11, 12, 2, 1, mix(L.skin, '#8a3a3a', 0.5));
    } else {
      pg.rect(5, 12, 8, 2, bc); pg.rect(6, 14, 6, 1, bc); pg.rect(12, 10, 2, 2, bc);
      pg.px(5, 12, mix(L.skin, '#8a3a3a', 0.5));
      pg.px(7, 14, bl);
    }
  }

  // óculos
  if (L.glasses && dir !== 'up') {
    const gc = '#2a2a3a';
    const lens = (x: number) => { pg.rect(x, 7, 4, 1, gc); pg.rect(x, 11, 4, 1, gc); pg.vline(x, 8, 10, gc); pg.vline(x + 3, 8, 10, gc); };
    if (dir === 'down') { lens(7); lens(13); pg.rect(11, 8, 2, 1, gc); }
    else { lens(5); pg.hline(9, 14, 8, gc); }
  }
}

// ------------------------------------------------------------------ cabelo
/** Camada de trás: o volume que fica atrás da cabeça e do corpo. */
function drawHairBack(pg: PG, L: CharacterLook, C: Colors, dir: Dir, sway: boolean): void {
  const st = L.hairStyle;
  if (st === 'longo' || st === 'ondulado') {
    if (dir === 'down') {
      pg.rect(4, 5, 16, 17, C.hairD);
      if (st === 'ondulado') { pg.px(3, 11, C.hairD); pg.px(20, 11, C.hairD); pg.px(3, 17, C.hairD); pg.px(20, 17, C.hairD); }
    } else if (dir === 'side') {
      pg.rect(12, 5, 7, 17, C.hairD);
      if (st === 'ondulado') { pg.px(19, 10, C.hairD); pg.px(19, 16, C.hairD); }
      // as pontas ficam para trás no embalo do passo
      if (sway) { pg.px(19, 18, C.hairD); pg.px(19, 19, C.hairD); pg.px(20, 20, C.hairD); }
    }
  }
  if (st === 'cacheado' && dir !== 'up') pg.ellipse(12, 8, 10, 8, C.hairD);
  if (st === 'rabo' && dir === 'side') {
    pg.rect(18, 5, 2, 2, C.hair); pg.rect(19, 7, 3, 8, C.hair); pg.px(20, 15, C.hairD); pg.px(21, 9, C.hairL);
    if (sway) pg.px(22, 12, C.hair);
  }
}

/** Camada da frente: franja, topo e mechas que caem sobre os ombros. */
function drawHairFront(pg: PG, L: CharacterLook, C: Colors, dir: Dir, sway: boolean): void {
  const st = L.hairStyle;
  const { hair, hairD, hairL, skin } = C;
  const long = st === 'longo' || st === 'ondulado';
  if (st === 'careca') {
    // cabeça lisa com brilho
    if (dir === 'up') { pg.px(10, 3, C.skinL); pg.px(11, 3, C.skinL); pg.px(9, 4, C.skinL); pg.px(5, 8, C.skinD); pg.px(18, 8, C.skinD); }
    else if (dir === 'down') { pg.px(9, 3, C.skinL); pg.px(10, 3, C.skinL); pg.px(8, 4, C.skinL); pg.px(5, 6, C.skinD); pg.px(18, 6, C.skinD); }
    else { pg.px(8, 3, C.skinL); pg.px(9, 3, C.skinL); pg.px(7, 4, C.skinL); pg.px(17, 7, C.skinD); }
    return;
  }
  const buzz = mix(skin, hair, 0.65);
  if (dir === 'up') {
    if (st === 'raspado') { pg.rect(6, 2, 12, 2, buzz); pg.rect(5, 4, 14, 8, buzz); return; }
    pg.rect(7, 1, 10, 1, hair); pg.rect(6, 2, 12, 1, hair); pg.rect(5, 3, 14, 10, hair);
    pg.rect(8, 2, 5, 1, hairL); pg.px(7, 3, hairL);
    pg.rect(5, 12, 14, 2, hairD);
    if (st === 'curto' || st === 'topete') { pg.rect(8, 13, 8, 2, skin); pg.px(5, 11, skin); pg.px(18, 11, skin); }
    if (long) {
      pg.rect(5, 12, 14, 10, hair); pg.rect(5, 19, 14, 3, hairD);
      if (st === 'ondulado') { pg.px(4, 15, hairD); pg.px(19, 15, hairD); pg.px(5, 22, hairD); pg.px(18, 22, hairD); }
      if (sway) { pg.px(4, 20, hairD); pg.px(19, 19, hairD); }
    }
    if (st === 'cacheado') { pg.ellipse(12, 8, 9, 7, hair); [[7, 3], [12, 2], [16, 5], [9, 9], [14, 10], [6, 8]].forEach(([x, y]) => pg.px(x, y, hairL)); }
    if (st === 'rabo') { pg.rect(10, 12, 4, 8, hair); pg.px(11, 20, hairD); pg.px(12, 20, hairD); pg.rect(10, 11, 4, 1, L.accessoryColor); }
    if (st === 'coque') { pg.ellipse(12, 1, 3, 2, hair); pg.px(11, 0, hairL); }
    if (st === 'topete') pg.rect(9, 0, 6, 1, hair);
    return;
  }

  if (dir === 'down') {
    if (st === 'raspado') { pg.rect(7, 2, 10, 2, buzz); pg.rect(5, 4, 2, 3, buzz); pg.rect(17, 4, 2, 3, buzz); return; }
    if (st === 'cacheado') {
      pg.ellipse(12, 4, 8, 4, hair);
      pg.rect(4, 5, 3, 9, hair); pg.rect(17, 5, 3, 9, hair);
      [[6, 7], [9, 6], [12, 7], [15, 6], [18, 7]].forEach(([x, y]) => pg.px(x, y, hair));
      [[6, 2], [11, 1], [16, 2], [8, 4], [14, 4], [4, 9], [19, 8]].forEach(([x, y]) => pg.px(x, y, hairL));
      return;
    }
    pg.rect(7, 1, 10, 1, hair); pg.rect(6, 2, 12, 1, hair); pg.rect(5, 3, 14, 3, hair);
    pg.rect(8, 2, 4, 1, hairL); pg.px(7, 3, hairL); pg.px(14, 3, hairL);
    if (st === 'topete') {
      pg.rect(8, 0, 8, 1, hair); pg.px(9, 0, hairL); pg.px(16, 1, hair);
      pg.rect(5, 6, 2, 3, hair); pg.rect(17, 6, 2, 3, hair); pg.px(5, 9, hairD); pg.px(18, 9, hairD);
    } else if (st === 'curto') {
      pg.rect(5, 6, 2, 3, hair); pg.rect(17, 6, 2, 3, hair);
      pg.px(8, 6, hair); pg.px(9, 6, hairD); pg.px(14, 6, hair); pg.px(15, 6, hair);
    } else if (long) {
      // repartido no meio, emoldurando o rosto, mechas caindo nos ombros
      pg.px(11, 2, hairD); pg.px(12, 2, hairL);
      pg.rect(5, 6, 2, 3, hair); pg.rect(17, 6, 2, 3, hair);
      pg.rect(4, 8, 2, 12, hair); pg.rect(18, 8, 2, 12, hair);
      pg.px(4, 19, hairD); pg.px(19, 19, hairD);
      if (st === 'ondulado') { pg.px(3, 12, hair); pg.px(20, 14, hair); pg.px(4, 15, hairL); pg.px(19, 11, hairL); }
      if (sway) { pg.px(3, 19, hairD); pg.px(20, 18, hairD); }
    } else {
      // rabo / coque: preso, as laterais rentes
      pg.rect(5, 6, 1, 3, hair); pg.rect(18, 6, 1, 3, hair);
      if (st === 'coque') { pg.ellipse(12, 0, 3, 1, hair); pg.px(11, 0, hairL); }
      if (st === 'rabo') { pg.px(19, 5, hair); pg.px(19, 6, hair); }
    }
    return;
  }

  // lado (olhando para a esquerda)
  if (st === 'raspado') { pg.rect(6, 2, 11, 2, buzz); pg.rect(12, 4, 6, 5, buzz); return; }
  if (st === 'cacheado') {
    pg.ellipse(12, 5, 7, 4, hair); pg.rect(12, 5, 7, 9, hair);
    [[8, 2], [13, 1], [16, 5], [17, 10], [10, 4]].forEach(([x, y]) => pg.px(x, y, hairL));
    return;
  }
  pg.rect(7, 1, 9, 1, hair); pg.rect(6, 2, 12, 1, hair); pg.rect(5, 3, 14, 3, hair);
  pg.rect(12, 6, 7, 6, hair); pg.rect(14, 12, 5, 1, hairD);
  pg.px(5, 6, hair); pg.px(6, 6, hair);
  pg.rect(8, 2, 4, 1, hairL);
  pg.rect(14, 8, 2, 3, shade(skin, -0.18)); // orelha visível
  if (st === 'topete') { pg.rect(4, 0, 7, 1, hair); pg.px(3, 1, hair); pg.px(3, 2, hair); }
  if (st === 'coque') { pg.ellipse(16, 1, 3, 2, hair); pg.px(15, 0, hairL); }
  if (long) {
    pg.rect(13, 12, 6, 8, hair); pg.px(18, 20, hairD); pg.px(13, 19, hairD);
    if (st === 'ondulado') { pg.px(19, 15, hair); pg.px(13, 17, hairL); }
    if (sway) { pg.px(19, 17, hair); pg.px(19, 18, hair); pg.px(19, 19, hairD); }
  }
}

function drawHighlights(pg: PG, L: CharacterLook, dir: Dir): void {
  const h = L.highlights;
  const hl = shade(h, 0.2);
  const pts: [number, number, string][] = dir === 'down'
    ? [[4, 16, h], [5, 17, hl], [4, 18, h], [19, 16, h], [18, 17, hl], [19, 18, h], [3, 17, h], [20, 17, h]]
    : dir === 'up'
      ? [[6, 18, h], [8, 19, hl], [11, 20, h], [14, 18, h], [16, 19, hl], [7, 20, h], [17, 20, h]]
      : [[14, 16, h], [15, 17, hl], [17, 18, h], [13, 18, h], [17, 15, h]];
  for (const [x, y, c] of pts) pg.px(x, y, c);
}

// ------------------------------------------------------------------ acessórios
function drawAccessory(pg: PG, L: CharacterLook, dir: Dir): void {
  const c = L.accessoryColor;
  const cD = shade(c, -0.3);
  const gold = '#ffd25e';
  switch (L.accessory) {
    case 'flor':
      if (dir === 'up') { pg.px(16, 3, c); pg.px(17, 4, c); pg.px(16, 4, gold); break; }
      { const x = dir === 'down' ? 16 : 14;
        pg.px(x, 2, c); pg.px(x - 1, 3, c); pg.px(x + 1, 3, c); pg.px(x, 4, c); pg.px(x, 3, gold); }
      break;
    case 'laco':
      if (dir === 'side') { pg.rect(14, 1, 4, 1, c); pg.px(14, 2, c); pg.px(17, 2, c); pg.px(15, 2, cD); break; }
      pg.rect(14, 1, 5, 2, c); pg.px(16, 1, cD); pg.px(16, 2, cD); pg.px(15, 3, c); pg.px(17, 3, c);
      break;
    case 'tiara':
      if (dir === 'up') { pg.rect(6, 3, 12, 1, gold); break; }
      pg.rect(dir === 'down' ? 6 : 5, 3, dir === 'down' ? 12 : 11, 1, gold); pg.px(dir === 'down' ? 12 : 7, 2, c);
      break;
    case 'bone':
      pg.rect(5, 1, 14, 4, c); pg.rect(7, 0, 10, 1, c); pg.px(8, 1, shade(c, 0.3)); pg.px(9, 1, shade(c, 0.3));
      if (dir === 'down') pg.rect(5, 5, 14, 1, cD);
      else if (dir === 'side') pg.rect(1, 4, 6, 1, cD);
      else pg.rect(9, 5, 6, 1, cD);
      break;
    case 'chapeu':
      pg.rect(2, 4, 20, 1, c); pg.rect(3, 5, 18, 1, cD);
      pg.rect(6, 0, 12, 4, c); pg.rect(6, 3, 12, 1, gold);
      break;
    case 'medalha':
      // cordão prateado com a medalha de São Bento
      if (dir === 'down') { pg.px(9, 15, '#c8c8d4'); pg.px(14, 15, '#c8c8d4'); pg.px(10, 16, '#c8c8d4'); pg.px(13, 16, '#c8c8d4'); pg.rect(11, 17, 2, 2, '#d8b050'); pg.px(11, 17, '#f0d070'); }
      else if (dir === 'side') { pg.px(7, 16, '#c8c8d4'); pg.px(6, 17, '#d8b050'); }
      break;
    case 'colar_sol':
      if (dir === 'down') {
        const dark = shade(c, -0.55);
        pg.px(9, 15, c); pg.px(14, 15, c); pg.px(10, 16, c); pg.px(13, 16, c);
        pg.rect(11, 17, 2, 2, dark); pg.px(10, 17, c); pg.px(13, 17, c); pg.px(11, 16, shade(c, 0.25)); pg.px(12, 16, shade(c, 0.25)); pg.px(11, 19, c); pg.px(12, 19, c);
      } else if (dir === 'side') { pg.px(6, 17, c); pg.px(7, 17, shade(c, -0.55)); }
      break;
    case 'brinco':
      if (dir === 'down') { pg.px(5, 13, gold); pg.px(18, 13, gold); }
      else if (dir === 'side') pg.px(15, 12, gold);
      break;
    default:
      break;
  }
}

/** Quadro de golpe: o João com a espada para a frente, a Juliana soltando magia pelas mãos. */
function drawSkill(pg: PG, dir: Dir, role: 0 | 1, bx: number, bw: number): void {
  const blade = '#e8e8f4';
  const bladeD = '#a8a8b8';
  const spark = ['#fff1a8', '#ffd6e4', '#ffffff'];
  if (role === 0) {
    if (dir === 'side') { pg.hline(0, 3, 15, blade); pg.hline(0, 3, 14, bladeD); pg.rect(4, 14, 1, 3, '#ffd25e'); }
    else if (dir === 'down') { pg.vline(bx + bw + 4, 3, 10, blade); pg.vline(bx + bw + 5, 4, 10, bladeD); pg.rect(bx + bw + 3, 11, 4, 1, '#ffd25e'); }
    else { pg.vline(bx - 4, 3, 10, blade); pg.vline(bx - 5, 4, 10, bladeD); pg.rect(bx - 6, 11, 4, 1, '#ffd25e'); }
    return;
  }
  if (dir === 'side') { pg.px(0, 15, spark[0]); pg.px(1, 14, spark[1]); pg.px(0, 19, spark[2]); pg.px(2, 20, spark[0]); pg.px(1, 12, spark[2]); }
  else { pg.px(bx - 3, 9, spark[0]); pg.px(bx - 2, 8, spark[2]); pg.px(bx + bw + 2, 9, spark[1]); pg.px(bx + bw + 1, 8, spark[0]); pg.px(12, 0, spark[2]); pg.px(9, 1, spark[1]); }
}
