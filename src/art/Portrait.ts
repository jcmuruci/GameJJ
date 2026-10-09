import Phaser from 'phaser';
import { CharacterLook } from '../data/characters';
import { PG, shade, mix, hexToRgb } from './pixel';
import { reuseCanvas } from './CharacterArt';

/**
 * Retratos em estilo anime (busto 64x64) gerados a partir da aparência do personagem.
 * Quadros: 0 neutro · 1 feliz (^^) · 2 surpreso · 3 apaixonado (olhos de coração).
 */
export const PORTRAIT = 64;
export type Mood = 0 | 1 | 2 | 3;

export function generatePortrait(scene: Phaser.Scene, key: string, look: CharacterLook): void {
  const tex = reuseCanvas(scene, key, PORTRAIT * 4, PORTRAIT)!;
  const fresh = !tex.has('0');
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  for (let m = 0 as Mood; m < 4; m = (m + 1) as Mood) {
    pg.at(m * PORTRAIT, 0);
    drawBust(pg, look, m);
    pg.outline(0, 0, PORTRAIT, PORTRAIT, '#2a1d2e');
    if (fresh) tex.add(m, 0, m * PORTRAIT, 0, PORTRAIT, PORTRAIT);
  }
  tex.refresh();
}

function lum(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return r * 0.3 + g * 0.59 + b * 0.11;
}

function drawBust(pg: PG, L: CharacterLook, mood: Mood): void {
  const skin = L.skin;
  const skinD = shade(skin, -0.16);
  const skinL = shade(skin, 0.18);
  const hair = L.hair;
  const hairD = shade(hair, -0.35);
  const hairL = lum(hair) < 50 ? mix(hair, '#a8704a', 0.45) : shade(hair, 0.3);
  const long = L.hairStyle === 'longo' || L.hairStyle === 'ondulado';
  const ink = '#2a1d2e';
  const shirt = L.shirt;

  // ---------- cabelo de trás ----------
  if (long) {
    pg.ellipse(32, 26, 21, 20, hairD);
    pg.rect(11, 26, 42, 38, hairD);
    // ondas nas laterais
    for (let y = 30; y < 64; y += 6) { pg.px(10, y, hairD); pg.px(53, y + 3, hairD); }
    if (L.highlights) for (let y = 46; y < 64; y += 2) { pg.px(12 + ((y * 3) % 4), y, L.highlights); pg.px(50 - ((y * 5) % 4), y, L.highlights); }
  } else if (L.hairStyle === 'cacheado') {
    pg.ellipse(32, 22, 22, 19, hairD);
  } else if (L.hairStyle === 'rabo') {
    pg.ellipse(50, 30, 6, 14, hairD);
  }

  // ---------- ombros e roupa ----------
  const narrow = L.build === 'magro' ? 3 : L.build === 'forte' ? -3 : 0;
  pg.ellipse(32, 66, 26 - narrow, 16, shirt);
  pg.ellipse(32, 64, 24 - narrow, 13, shade(shirt, 0.12));
  pg.rect(27, 44, 10, 9, skinD); // pescoço
  pg.rect(28, 44, 8, 7, skin);
  pg.ellipse(32, 52, 6, 3, skinD); // gola
  pg.ellipse(32, 51, 5, 2, skin);

  // ---------- rosto (formato anime: bochechas cheias, queixo fino) ----------
  pg.ellipse(32, 29, 15, 15, skin);
  for (let y = 38; y <= 46; y++) {
    const half = Math.round(13 - (y - 38) * 1.25);
    pg.hline(32 - half, 32 + half - 1, y, skin);
  }
  pg.hline(29, 34, 47, skinD);
  // orelhas
  if (!long) { pg.ellipse(17, 32, 2, 3, skin); pg.ellipse(47, 32, 2, 3, skin); pg.px(17, 32, skinD); pg.px(47, 32, skinD); }

  // ---------- barba ----------
  const beardC = L.beardColor || hair;
  if (L.beard !== 'nenhuma') {
    const full = L.beard === 'cheia';
    const bD = shade(beardC, -0.22);
    const bL = shade(beardC, 0.2);
    for (let y = 33; y <= 48; y++) {
      const half = y < 38 ? (y < 35 ? 15 : 14) : Math.round(13 - (y - 38) * 1.25) + 1;
      for (let x = 32 - half; x <= 32 + half - 1; x++) {
        const dx = Math.abs(x - 31.5);
        const jaw = dx >= half - (y < 38 ? 2 : 4) || y >= 42; // costeletas, maxilar e queixo
        const mustache = y >= 39 && y <= 40 && dx <= 5;
        if (!(jaw || mustache)) continue;
        if (y >= 41 && y <= 43 && dx <= 3) continue; // boca
        if (!full && (x * 13 + y * 7) % 3) continue;
        const n = (x * 13 + y * 7) % 11;
        pg.px(x, y, n === 0 ? bL : n === 1 ? bD : beardC);
      }
    }
  }

  // ---------- cabelo da frente ----------
  drawFrontHair(pg, L, hair, hairD, hairL, skin, skinL);

  // ---------- olhos ----------
  const eyeY = 31;
  const eyes = [24, 40];
  const brow = shade(L.beard !== 'nenhuma' ? beardC : hair, -0.15);
  for (const ex of eyes) {
    const outer = ex < 32 ? -1 : 1;
    // sobrancelhas finas
    pg.hline(ex - 3, ex + 3, eyeY - 7 - (mood === 2 ? 1 : 0), brow);
    pg.px(ex + 4 * outer, eyeY - 6, brow);
    if (mood === 1) {
      // olhos fechados sorrindo (^^)
      pg.hline(ex - 3, ex + 3, eyeY, ink);
      pg.px(ex - 4, eyeY + 1, ink); pg.px(ex + 4, eyeY + 1, ink);
      pg.px(ex - 2, eyeY - 1, ink); pg.px(ex + 2, eyeY - 1, ink); pg.hline(ex - 1, ex + 1, eyeY - 1, ink);
      continue;
    }
    // esclera
    pg.ellipse(ex, eyeY + 1, 4, 5, '#fff7f0');
    if (mood === 3) {
      // olhos de coração
      const h = '#ff5c8a';
      pg.rect(ex - 3, eyeY - 1, 2, 2, h); pg.rect(ex + 1, eyeY - 1, 2, 2, h);
      pg.rect(ex - 3, eyeY + 1, 6, 2, h); pg.rect(ex - 2, eyeY + 3, 4, 1, h); pg.px(ex - 1, eyeY + 4, h); pg.px(ex, eyeY + 4, h);
      pg.px(ex - 2, eyeY - 1, '#ffd6e4');
    } else {
      // íris grande com degradê, pupila e brilhos
      const r = mood === 2 ? 2 : 3;
      pg.ellipse(ex, eyeY + 1, r, r + 1, shade(L.eyes, -0.25));
      pg.ellipse(ex, eyeY + 2, r - 1, r, L.eyes);
      pg.ellipse(ex, eyeY + 3, r - 1, 1, shade(L.eyes, 0.35));
      pg.rect(ex - 1, eyeY, 2, 2, mood === 2 ? shade(L.eyes, -0.4) : ink);
      pg.rect(ex - 2, eyeY - 2, 2, 2, '#ffffff');
      pg.px(ex + 2, eyeY + 3, '#ffffff');
    }
    // cílios / pálpebra superior grossa (marca do anime)
    pg.hline(ex - 4, ex + 4, eyeY - 4, ink);
    pg.hline(ex - 3, ex + 3, eyeY - 5, ink);
    if (L.lashes) { pg.px(ex + 5 * outer, eyeY - 5, ink); pg.px(ex + 6 * outer, eyeY - 6, ink); pg.px(ex + 5 * outer, eyeY - 4, ink); }
    pg.px(ex - 4, eyeY - 3, ink); pg.px(ex + 4, eyeY - 3, ink);
  }

  // ---------- nariz, boca, bochechas ----------
  pg.px(32, 37, skinD); pg.px(33, 38, skinD);
  const blush = mix(skin, '#ff6f8f', mood === 3 ? 0.65 : 0.4);
  pg.ellipse(21, 37, 3, 1, blush); pg.ellipse(43, 37, 3, 1, blush);
  if (mood === 3) { pg.hline(18, 24, 36, mix(skin, '#ff6f8f', 0.8)); pg.hline(40, 46, 36, mix(skin, '#ff6f8f', 0.8)); }
  const lip = mix(skin, '#c84a5a', 0.6);
  if (mood === 1 || mood === 3) {
    // sorriso aberto
    pg.hline(29, 35, 41, ink); pg.hline(30, 34, 42, '#fff7f0'); pg.hline(30, 34, 43, '#e8607a'); pg.hline(31, 33, 44, ink);
    pg.px(28, 40, ink); pg.px(36, 40, ink);
  } else if (mood === 2) {
    pg.ellipse(32, 42, 2, 2, ink); pg.px(32, 42, '#e8607a');
  } else {
    pg.hline(30, 34, 42, lip); pg.px(29, 41, lip); pg.px(35, 41, lip);
  }

  // óculos
  if (L.glasses) {
    for (const ex of eyes) { pg.hline(ex - 5, ex + 5, eyeY - 4, ink); pg.hline(ex - 5, ex + 5, eyeY + 6, ink); pg.vline(ex - 5, eyeY - 4, eyeY + 6, ink); pg.vline(ex + 5, eyeY - 4, eyeY + 6, ink); }
    pg.hline(29, 35, eyeY - 2, ink);
  }

  // ---------- acessórios ----------
  const c = L.accessoryColor;
  switch (L.accessory) {
    case 'colar_sol': {
      pg.ellipse(32, 56, 4, 4, c);
      pg.ellipse(32, 56, 2, 2, shade(c, -0.55));
      for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, -4], [-4, 4], [4, 4]]) pg.px(32 + dx, 56 + dy, c);
      for (let x = 24; x <= 40; x++) if (Math.abs(x - 32) > 4) pg.px(x, Math.round(50 + Math.abs(x - 32) * 0.3), '#c8c8d4');
      break;
    }
    case 'medalha':
      for (let x = 25; x <= 39; x++) pg.px(x, Math.round(49 + (8 - Math.abs(x - 32)) * 0.45), '#c8c8d4');
      pg.ellipse(32, 56, 3, 3, '#d8b050'); pg.ellipse(32, 56, 2, 2, '#f0d070'); pg.vline(32, 54, 58, '#a88030'); pg.hline(30, 34, 56, '#a88030');
      break;
    case 'flor':
      pg.ellipse(46, 14, 2, 2, c); pg.ellipse(50, 14, 2, 2, c); pg.ellipse(48, 12, 2, 2, c); pg.ellipse(48, 16, 2, 2, c); pg.px(48, 14, '#ffd25e');
      break;
    case 'brinco':
      pg.ellipse(17, 37, 1, 1, '#ffd25e'); pg.ellipse(47, 37, 1, 1, '#ffd25e');
      break;
    case 'laco':
      pg.rect(42, 8, 5, 4, c); pg.rect(49, 8, 5, 4, c); pg.rect(47, 9, 2, 2, shade(c, -0.3));
      break;
    case 'tiara':
      pg.hline(20, 44, 12, '#ffd25e'); pg.px(32, 11, c);
      break;
    case 'bone':
      pg.ellipse(32, 14, 17, 8, c); pg.rect(14, 16, 36, 3, shade(c, -0.3));
      break;
    case 'chapeu':
      pg.ellipse(32, 15, 24, 4, c); pg.ellipse(32, 9, 12, 7, c); pg.hline(20, 44, 13, '#ffd25e');
      break;
    default:
      break;
  }
}

function drawFrontHair(pg: PG, L: CharacterLook, hair: string, hairD: string, hairL: string, skin: string, skinL: string): void {
  const st = L.hairStyle;
  if (st === 'careca' || st === 'raspado') {
    // cabeça lisa com brilho (raspado ganha uma sombra de cabelo)
    pg.ellipse(32, 22, 15, 10, st === 'raspado' ? mix(skin, hair, 0.55) : skin);
    pg.ellipse(25, 16, 4, 2, skinL); pg.px(30, 14, '#ffffff'); pg.px(31, 14, skinL);
    return;
  }
  if (st === 'cacheado') {
    for (const [x, y, r] of [[20, 16, 6], [28, 11, 6], [37, 11, 6], [45, 16, 6], [16, 26, 5], [48, 26, 5], [32, 15, 5]]) pg.ellipse(x, y, r, r, hair);
    for (const [x, y] of [[19, 14], [27, 9], [36, 9], [44, 14]]) pg.px(x, y, hairL);
    return;
  }
  // topo da cabeça
  const parted = st === 'longo' || st === 'ondulado';
  pg.ellipse(32, 19, 17, 12, hair);
  pg.rect(15, 19, 34, 4, hair);
  // cabelo curto: a testa e os olhos ficam à mostra abaixo da franja
  if (!parted) for (let y = 25; y <= 31; y++) pg.hline(17, 46, y, skin);
  if (parted) {
    // repartido no meio: a testa aparece num "V" entre as duas cortinas de cabelo
    for (let y = 19; y <= 32; y++) {
      const half = Math.min(14, Math.round((y - 18) * 1.15));
      pg.hline(32 - half, 31 + half, y, skin);
    }
    pg.vline(31, 8, 18, hairD);
  }
  pg.ellipse(26, 12, 6, 2, hairL); // brilho em faixa (estilo anime)
  pg.hline(36, 40, 11, hairL);
  if (st === 'longo' || st === 'ondulado') {
    // mechas da franja caindo pelos lados da testa
    for (let y = 22; y <= 30; y += 4) { pg.px(18 + (y - 22) / 2, y, hairD); pg.px(45 - (y - 22) / 2, y, hairD); }
    for (let y = 24; y < 54; y++) {
      const wave = st === 'ondulado' ? Math.round(Math.sin(y / 3) * 1.2) : 0;
      pg.hline(14 + wave, 16 + wave, y, hair);
      pg.hline(47 - wave, 49 - wave, y, hair);
      if (y % 7 === 0) { pg.px(15 + wave, y, hairL); pg.px(48 - wave, y, hairL); }
    }
    if (L.highlights) for (let y = 44; y < 54; y += 2) { pg.px(15, y, L.highlights); pg.px(48, y + 1, L.highlights); }
    pg.px(16, 27, hairD); pg.px(47, 27, hairD);
    return;
  }
  // curtos: franja em pontas
  for (let i = 0; i < 9; i++) {
    const x = 18 + i * 3;
    const len = st === 'topete' ? (i < 4 ? 2 : 3) : 4 + (i % 2);
    for (let k = 0; k < len; k++) pg.px(x + (k > 1 ? 1 : 0), 22 + k, hair);
  }
  pg.vline(15, 20, 30, hair); pg.vline(16, 20, 29, hair); pg.vline(48, 20, 30, hair); pg.vline(47, 20, 29, hair);
  if (st === 'topete') { pg.ellipse(28, 8, 7, 4, hair); pg.px(26, 6, hairL); }
  if (st === 'coque') { pg.ellipse(32, 6, 6, 5, hair); pg.px(30, 4, hairL); }
  if (st === 'rabo') { pg.ellipse(32, 9, 3, 2, L.accessoryColor); }
}
