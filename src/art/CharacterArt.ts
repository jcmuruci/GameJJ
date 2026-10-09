import Phaser from 'phaser';
import { CharacterLook } from '../data/characters';
import { PG, shade, mix } from './pixel';

/**
 * Gera a folha de sprites de um personagem a partir de um CharacterLook.
 * Cada quadro tem 16x24 px. Linhas: 0 = baixo, 1 = cima, 2 = lado (esquerda).
 * Colunas: 0 = parado, 1 = passo A, 2 = passo B, 3 = ação.
 * Para a direita o sprite é espelhado (flipX).
 */
export const CHAR_W = 16;
export const CHAR_H = 24;
export type Dir = 'down' | 'up' | 'side';
export const DIR_ROW: Record<Dir, number> = { down: 0, up: 1, side: 2 };

export function charFrame(dir: Dir, col: number): number {
  return DIR_ROW[dir] * 4 + col;
}

export function generateCharacterTexture(scene: Phaser.Scene, key: string, look: CharacterLook, role: 0 | 1): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, CHAR_W * 4, CHAR_H * 3);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  const dirs: Dir[] = ['down', 'up', 'side'];
  dirs.forEach((dir, row) => {
    for (let col = 0; col < 4; col++) {
      pg.at(col * CHAR_W, row * CHAR_H);
      drawCharacter(pg, look, dir, col, role);
      pg.outline(0, 0, CHAR_W, CHAR_H);
      tex.add(row * 4 + col, 0, col * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H);
    }
  });
  tex.refresh();
}

function drawCharacter(pg: PG, L: CharacterLook, dir: Dir, frame: number, role: 0 | 1): void {
  const skin = L.skin;
  const skinD = shade(skin, -0.18);
  const hair = L.hair;
  const hairD = shade(hair, -0.3);
  const hairL = shade(hair, 0.25);
  const shirt = L.shirt;
  const shirtD = shade(shirt, -0.28);
  const shirtL = shade(shirt, 0.2);
  const pants = L.pants;
  const pantsD = shade(pants, -0.3);
  const shoes = L.shoes;
  const blush = mix(skin, '#ff6f8f', 0.45);
  const walking = frame === 1 || frame === 2;
  const act = frame === 3;
  const oy = walking ? 1 : 0; // balanço do corpo ao andar
  const long = L.hairStyle === 'longo' || L.hairStyle === 'ondulado';

  // ---------- PERNAS ----------
  if (dir === 'side') {
    if (frame === 1) {
      pg.rect(4, 18, 3, 3, pants); pg.rect(9, 18, 3, 3, pantsD);
      pg.rect(3, 21, 4, 2, shoes); pg.rect(9, 21, 4, 2, shade(shoes, -0.25));
    } else if (frame === 2) {
      pg.rect(6, 18, 4, 4, pants);
      pg.rect(5, 21, 5, 2, shoes);
    } else {
      pg.rect(6, 18, 4, 4, pants);
      pg.rect(5, 21, 5, 2, shoes);
    }
  } else {
    const lUp = frame === 1 ? 1 : 0;
    const rUp = frame === 2 ? 1 : 0;
    pg.rect(4, 18, 8, 2, pants);
    pg.rect(5, 20, 3, 2 - lUp, pants);
    pg.rect(8, 20, 3, 2 - rUp, pantsD);
    pg.rect(4, 22 - lUp, 4, 2, shoes);
    pg.rect(8, 22 - rUp, 4, 2, shade(shoes, -0.2));
  }

  pg.oy += oy;

  // ---------- CABELO (camada de trás) ----------
  if (long) {
    if (dir === 'down') {
      pg.rect(2, 4, 12, 12, hairD);
      if (L.hairStyle === 'ondulado') { pg.px(1, 9, hairD); pg.px(14, 9, hairD); pg.px(1, 13, hairD); pg.px(14, 13, hairD); }
    } else if (dir === 'up') {
      // desenhado depois (cobre as costas)
    } else {
      pg.rect(8, 4, 6, 12, hairD);
      if (L.hairStyle === 'ondulado') { pg.px(14, 8, hairD); pg.px(14, 12, hairD); }
    }
  }
  if (L.hairStyle === 'cacheado' && dir !== 'up') {
    pg.ellipse(8, 6, 7, 6, hairD);
  }
  if (L.hairStyle === 'rabo' && dir === 'side') {
    pg.rect(12, 4, 3, 2, hair); pg.rect(13, 6, 2, 6, hair); pg.px(13, 12, hairD);
  }

  // ---------- CORPO ----------
  if (dir === 'side') {
    pg.rect(5, 12, 6, 6, shirt);
    pg.rect(9, 12, 2, 6, shirtD);
    pg.rect(5, 17, 6, 1, shade(shirt, -0.45)); // cinto
    if (act) {
      pg.rect(1, 13, 5, 2, shirtL); pg.px(0, 13, skin); pg.px(0, 14, skin);
    } else {
      const sw = frame === 1 ? -1 : frame === 2 ? 1 : 0;
      pg.rect(7 + sw, 12, 2, 4, shirtL); pg.rect(7 + sw, 16, 2, 1, skin);
    }
  } else {
    pg.rect(4, 12, 8, 6, shirt);
    pg.rect(10, 12, 2, 6, shirtD);
    pg.rect(4, 17, 8, 1, shade(shirt, -0.45));
    if (dir === 'down') {
      // gola e detalhe de classe
      pg.px(7, 12, skin); pg.px(8, 12, skin);
      if (role === 0) { pg.px(6, 13, shirtL); pg.px(9, 13, shirtL); pg.rect(7, 17, 2, 1, '#ffd25e'); }
      else { pg.px(7, 14, '#ffd25e'); pg.px(8, 14, '#ffd25e'); pg.px(7, 13, '#fff1a8'); }
    }
    if (act) {
      pg.rect(2, 11, 2, 3, shirtL); pg.rect(12, 11, 2, 3, shirtD);
      pg.px(2, 10, skin); pg.px(13, 10, skin);
    } else {
      const aL = frame === 1 ? 1 : 0;
      const aR = frame === 2 ? 1 : 0;
      pg.rect(3, 12 + aL, 1, 4, shirtL); pg.px(3, 16 + aL, skin);
      pg.rect(12, 12 + aR, 1, 4, shirtD); pg.px(12, 16 + aR, skin);
    }
    if (role === 0 && dir === 'up') {
      // espada nas costas
      pg.vline(11, 9, 16, '#d8d8e4'); pg.px(11, 16, '#a8a8b8'); pg.rect(10, 13, 3, 1, '#8a5a34');
    }
    if (role === 1 && dir === 'up') {
      // capa da maga
      pg.rect(4, 12, 8, 6, shade(shirt, -0.12)); pg.rect(5, 17, 6, 1, shirtD);
    }
  }

  // ---------- CABEÇA ----------
  // base da cabeça (10x9 com cantos arredondados)
  pg.rect(3, 3, 10, 9, skin);
  pg.clear(3, 3); pg.clear(12, 3); pg.clear(3, 11); pg.clear(12, 11);
  pg.rect(4, 11, 8, 1, skinD);

  if (dir === 'down') {
    // olhos
    pg.rect(5, 7, 1, 2, L.eyes); pg.rect(10, 7, 1, 2, L.eyes);
    pg.px(5, 7, mix(L.eyes, '#ffffff', 0.35));
    pg.px(10, 7, mix(L.eyes, '#ffffff', 0.35));
    pg.px(4, 9, blush); pg.px(11, 9, blush);
    pg.rect(7, 10, 2, 1, act ? '#7a2a3a' : mix(skin, '#8a3a3a', 0.5));
    if (act) pg.px(7, 11, '#7a2a3a');
  } else if (dir === 'side') {
    pg.rect(4, 7, 1, 2, L.eyes);
    pg.px(4, 7, mix(L.eyes, '#ffffff', 0.35));
    pg.px(5, 9, blush);
    pg.px(3, 10, mix(skin, '#8a3a3a', 0.5));
    pg.px(2, 8, skin); // nariz
    pg.rect(8, 7, 1, 2, skinD); // orelha
  }

  // barba
  if (L.beard !== 'nenhuma' && dir !== 'up') {
    const bc = L.beard === 'cheia' ? hair : mix(skin, hair, 0.55);
    if (dir === 'down') {
      pg.rect(4, 10, 3, 2, bc); pg.rect(9, 10, 3, 2, bc); pg.rect(6, 11, 4, 1, bc);
      if (L.beard === 'cheia') { pg.px(3, 9, bc); pg.px(12, 9, bc); pg.px(3, 10, bc); pg.px(12, 10, bc); pg.rect(7, 9, 2, 1, bc); }
      pg.rect(7, 10, 2, 1, mix(skin, '#8a3a3a', 0.5));
    } else {
      pg.rect(3, 10, 5, 2, bc); pg.px(7, 9, bc);
      pg.px(3, 10, mix(skin, '#8a3a3a', 0.5));
    }
  }

  // óculos
  if (L.glasses && dir !== 'up') {
    const gc = '#2a2a3a';
    if (dir === 'down') {
      pg.rect(4, 6, 3, 1, gc); pg.rect(9, 6, 3, 1, gc);
      pg.px(4, 7, gc); pg.px(6, 7, gc); pg.px(9, 7, gc); pg.px(11, 7, gc);
      pg.rect(4, 8, 3, 1, gc); pg.rect(9, 8, 3, 1, gc);
      pg.rect(7, 7, 2, 1, gc);
      pg.px(5, 7, L.eyes); pg.px(10, 7, L.eyes);
    } else {
      pg.rect(3, 6, 3, 1, gc); pg.px(3, 7, gc); pg.px(5, 7, gc); pg.rect(3, 8, 3, 1, gc); pg.rect(6, 7, 2, 1, gc);
    }
  }

  // ---------- CABELO (frente) ----------
  drawHairFront(pg, L, dir, hair, hairD, hairL, skin);

  // ---------- ACESSÓRIO ----------
  drawAccessory(pg, L, dir);

  pg.oy -= oy;
}

function drawHairFront(pg: PG, L: CharacterLook, dir: Dir, hair: string, hairD: string, hairL: string, skin: string): void {
  const st = L.hairStyle;
  const long = st === 'longo' || st === 'ondulado';
  if (dir === 'up') {
    if (st === 'raspado') {
      pg.rect(4, 3, 8, 7, shade(skin, -0.05)); pg.rect(4, 2, 8, 6, mix(skin, hair, 0.6));
      return;
    }
    pg.rect(3, 2, 10, 10, hair);
    pg.rect(4, 1, 8, 1, hair);
    pg.rect(5, 2, 4, 1, hairL);
    pg.rect(3, 10, 10, 2, hairD);
    if (st === 'curto' || st === 'topete') { pg.rect(4, 11, 8, 1, skin); pg.px(3, 8, skin); pg.px(12, 8, skin); }
    if (st === 'longo' || st === 'ondulado') { pg.rect(3, 10, 10, 6, hair); pg.rect(3, 14, 10, 2, hairD); if (st === 'ondulado') { pg.px(2, 12, hairD); pg.px(13, 12, hairD); pg.px(3, 16, hairD); pg.px(12, 16, hairD); } }
    if (st === 'cacheado') { pg.ellipse(8, 6, 7, 6, hair); pg.px(4, 3, hairL); pg.px(9, 2, hairL); pg.px(11, 6, hairL); pg.px(6, 8, hairL); }
    if (st === 'rabo') { pg.rect(7, 10, 3, 5, hair); pg.px(8, 15, hairD); pg.rect(7, 9, 3, 1, L.accessoryColor); }
    if (st === 'coque') { pg.ellipse(8, 1, 2, 2, hair); pg.px(7, 0, hairL); }
    if (st === 'topete') { pg.rect(6, 0, 4, 1, hair); }
    return;
  }

  if (dir === 'down') {
    switch (st) {
      case 'raspado':
        pg.rect(4, 2, 8, 2, mix(skin, hair, 0.65)); pg.rect(3, 3, 1, 2, mix(skin, hair, 0.65)); pg.rect(12, 3, 1, 2, mix(skin, hair, 0.65));
        break;
      case 'cacheado':
        pg.ellipse(8, 3, 6, 3, hair);
        pg.rect(2, 4, 2, 6, hair); pg.rect(12, 4, 2, 6, hair);
        pg.px(5, 5, hair); pg.px(8, 6, hair); pg.px(11, 5, hair);
        pg.px(4, 2, hairL); pg.px(8, 1, hairL); pg.px(11, 2, hairL); pg.px(6, 3, hairL); pg.px(10, 4, hairL);
        pg.px(2, 7, hairL); pg.px(13, 6, hairL);
        break;
      default: {
        pg.rect(4, 1, 8, 2, hair);
        pg.rect(3, 3, 10, 2, hair);
        pg.rect(5, 1, 3, 1, hairL);
        // franja
        if (st === 'topete') {
          pg.rect(5, 0, 5, 1, hair); pg.px(6, 0, hairL); pg.px(10, 1, hair);
          pg.rect(3, 5, 2, 2, hair); pg.rect(11, 5, 2, 2, hair); pg.px(3, 7, hairD); pg.px(12, 7, hairD);
          pg.px(9, 5, hair);
        } else if (st === 'curto') {
          pg.rect(3, 5, 2, 2, hair); pg.rect(11, 5, 2, 2, hair); pg.px(6, 5, hair); pg.px(7, 5, hairD); pg.px(10, 5, hair);
        } else {
          pg.rect(3, 5, 2, 5, hair); pg.rect(11, 5, 2, 5, hair);
          pg.px(5, 5, hair); pg.px(6, 5, hair); pg.px(9, 5, hair); pg.px(10, 5, hair);
          if (st === 'rabo' || st === 'coque') { pg.rect(3, 5, 1, 3, hair); pg.rect(12, 5, 1, 3, hair); pg.clear(4, 7); pg.px(4, 6, skin); pg.px(11, 6, skin); pg.px(4, 7, skin); pg.px(11, 7, skin); pg.px(4, 8, skin); pg.px(11, 8, skin); pg.px(4, 9, skin); pg.px(11, 9, skin); }
          if (st === 'coque') { pg.ellipse(8, 0, 2, 1, hair); pg.px(7, 0, hairL); }
          if (st === 'rabo') { pg.px(13, 4, hair); pg.px(13, 5, hair); }
          if (long) {
            // mechas descendo nos ombros
            pg.rect(2, 9, 2, 6, hair); pg.rect(12, 9, 2, 6, hair);
            pg.px(2, 14, hairD); pg.px(13, 14, hairD);
            if (st === 'ondulado') { pg.px(1, 11, hair); pg.px(14, 12, hair); pg.px(2, 12, hairL); pg.px(13, 10, hairL); }
          }
        }
        pg.px(4, 3, hairL); pg.px(9, 2, hairL);
      }
    }
    return;
  }

  // lado (olhando para a esquerda)
  switch (st) {
    case 'raspado':
      pg.rect(4, 2, 8, 2, mix(skin, hair, 0.65)); pg.rect(9, 4, 3, 3, mix(skin, hair, 0.65));
      break;
    case 'cacheado':
      pg.ellipse(8, 4, 6, 4, hair); pg.rect(9, 4, 5, 7, hair);
      pg.px(5, 2, hairL); pg.px(9, 1, hairL); pg.px(11, 4, hairL); pg.px(12, 8, hairL); pg.px(7, 4, hairL);
      break;
    default:
      pg.rect(4, 1, 8, 2, hair);
      pg.rect(3, 3, 10, 2, hair);
      pg.rect(9, 5, 4, 5, hair);
      pg.rect(10, 10, 3, 1, hairD);
      pg.px(3, 5, hair); pg.px(4, 5, hair);
      pg.rect(5, 1, 3, 1, hairL);
      if (st === 'topete') { pg.rect(3, 0, 5, 1, hair); pg.px(2, 1, hair); pg.px(2, 2, hair); }
      if (st === 'coque') { pg.ellipse(11, 1, 2, 2, hair); pg.px(10, 0, hairL); }
      if (st === 'longo' || st === 'ondulado') { pg.rect(9, 10, 4, 5, hair); pg.px(12, 15, hairD); if (st === 'ondulado') { pg.px(13, 12, hair); pg.px(9, 14, hairL); } }
      pg.rect(8, 7, 1, 2, shade(skin, -0.18)); // orelha visível
  }
}

function drawAccessory(pg: PG, L: CharacterLook, dir: Dir): void {
  const c = L.accessoryColor;
  const cD = shade(c, -0.3);
  const gold = '#ffd25e';
  switch (L.accessory) {
    case 'flor':
      if (dir === 'up') { pg.px(11, 3, c); pg.px(12, 4, c); pg.px(11, 4, gold); break; }
      { const x = dir === 'down' ? 11 : 10;
        pg.px(x, 2, c); pg.px(x - 1, 3, c); pg.px(x + 1, 3, c); pg.px(x, 4, c); pg.px(x, 3, gold); }
      break;
    case 'laco':
      if (dir === 'side') { pg.rect(10, 1, 3, 1, c); pg.px(10, 2, c); pg.px(12, 2, c); pg.px(11, 2, cD); break; }
      pg.rect(10, 1, 4, 2, c); pg.px(11, 1, cD); pg.px(12, 2, cD); pg.px(11, 3, c); pg.px(12, 3, c);
      break;
    case 'tiara':
      if (dir === 'up') { pg.rect(4, 2, 8, 1, gold); break; }
      pg.rect(dir === 'down' ? 4 : 3, 2, 8, 1, gold); pg.px(dir === 'down' ? 8 : 5, 1, c);
      break;
    case 'bone':
      pg.rect(3, 1, 10, 3, c); pg.rect(4, 0, 8, 1, c); pg.px(5, 1, shade(c, 0.3));
      if (dir === 'down') pg.rect(3, 4, 10, 1, cD);
      else if (dir === 'side') pg.rect(0, 3, 5, 1, cD);
      else pg.rect(6, 4, 4, 1, cD);
      break;
    case 'chapeu':
      pg.rect(1, 3, 14, 1, c); pg.rect(2, 4, 12, 1, cD);
      pg.rect(4, 0, 8, 3, c); pg.rect(4, 2, 8, 1, gold);
      break;
    case 'brinco':
      if (dir === 'down') { pg.px(3, 10, gold); pg.px(12, 10, gold); }
      else if (dir === 'side') pg.px(8, 10, gold);
      break;
    default:
      break;
  }
}
