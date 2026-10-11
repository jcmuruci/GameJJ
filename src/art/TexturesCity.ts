import Phaser from 'phaser';
import { PG, shade } from './pixel';

/** Cidade (BH, de dia): lojas, igreja, prédio, semáforo, pombos, skate e a medalha de São Bento. */

type Draw = (pg: PG) => void;

function sheet(scene: Phaser.Scene, key: string, fw: number, fh: number, frames: Draw[], outline = true): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  frames.forEach((f, i) => {
    pg.at(i * fw, 0);
    f(pg);
    if (outline) pg.outline(0, 0, fw, fh);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  pg.at(0, 0);
  tex.refresh();
}

/** Fachada de loja com toldo listrado, vitrine e porta. */
function shopFront(pg: PG, wall: string, awning: string, sign: string): void {
  pg.rect(2, 12, 44, 30, wall); pg.rect(2, 40, 44, 2, shade(wall, -0.3));
  for (let x = 0; x < 48; x += 6) pg.rect(x, 9, 6, 6, (x / 6) % 2 ? '#fff7f0' : awning);
  pg.rect(6, 0, 36, 10, '#5a3a24'); pg.rect(8, 2, 32, 6, sign);
  pg.rect(5, 19, 16, 14, '#9ce8ff'); pg.rect(5, 19, 16, 2, '#d8f4ff');
  pg.rect(28, 20, 12, 20, '#7a4a2a'); pg.px(37, 30, '#ffd25e');
}

export function generateCityTextures(scene: Phaser.Scene): void {
  // loja de artigos religiosos: toldo azul, cruz na placa e medalhas na vitrine
  sheet(scene, 'shop_rel', 48, 42, [(pg) => {
    shopFront(pg, '#f4ecd8', '#3f7fd6', '#fff4e0');
    pg.vline(24, 3, 7, '#c8902a'); pg.hline(22, 26, 4, '#c8902a');
    pg.ellipse(9, 26, 2, 2, '#ffd25e'); pg.ellipse(15, 26, 2, 2, '#d8d8e0'); pg.px(9, 26, '#2a1d2e'); pg.px(12, 30, '#8a5a34'); pg.px(13, 31, '#8a5a34');
  }]);
  // papelaria: toldo rosa e um presente na vitrine
  sheet(scene, 'papelaria', 48, 42, [(pg) => {
    shopFront(pg, '#fff0f4', '#ff6f9f', '#ffe6ef');
    pg.rect(10, 4, 4, 3, '#ff6f9f'); pg.rect(18, 4, 4, 3, '#6cc4ff'); pg.rect(26, 4, 4, 3, '#ffd25e'); pg.rect(34, 4, 4, 3, '#8be07a');
    pg.rect(9, 25, 8, 7, '#ff6f9f'); pg.vline(12, 25, 31, '#ffd25e'); pg.hline(9, 16, 28, '#ffd25e'); pg.px(11, 24, '#ffd25e'); pg.px(13, 24, '#ffd25e');
  }]);
  // igreja branca com torre, sino e cruz
  sheet(scene, 'church', 56, 70, [(pg) => {
    pg.rect(6, 30, 44, 38, '#f8f4ec'); pg.rect(6, 66, 44, 2, '#c8b898');
    for (let y = 0; y < 10; y++) pg.hline(28 - y * 2.4 - 2, 28 + y * 2.4 + 1, 20 + y, '#d8c8a8');
    pg.rect(20, 6, 16, 26, '#f8f4ec'); pg.rect(20, 6, 16, 2, '#e8e0d0');
    pg.vline(28, 0, 6, '#c8902a'); pg.hline(26, 30, 2, '#c8902a');
    pg.rect(24, 12, 8, 8, '#5a4a3a'); pg.ellipse(28, 17, 2, 2, '#ffd25e');
    pg.rect(22, 44, 12, 24, '#7a4a2a'); pg.rect(22, 44, 12, 3, '#5a3a24'); pg.vline(28, 47, 67, '#5a3a24');
    pg.rect(10, 38, 7, 12, '#6cc4ff'); pg.rect(39, 38, 7, 12, '#6cc4ff'); pg.rect(10, 38, 7, 2, '#ff8fb1'); pg.rect(39, 38, 7, 2, '#ffd25e');
    pg.ellipse(28, 26, 3, 3, '#c8a0f0'); pg.px(28, 26, '#fff7f0');
  }]);
  // prédio do João (portaria embaixo)
  sheet(scene, 'predio', 52, 72, [(pg) => {
    pg.rect(4, 2, 44, 68, '#d8c8b0'); pg.rect(4, 2, 44, 3, '#b8a890'); pg.rect(4, 68, 44, 2, '#8a7a68');
    for (let y = 8; y < 50; y += 10) for (let x = 8; x < 46; x += 10) { pg.rect(x, y, 6, 6, '#6cc4ff'); pg.rect(x, y, 6, 1, '#d8f4ff'); }
    pg.rect(14, 52, 24, 18, '#5a5a6a'); pg.rect(16, 54, 20, 14, '#9ce8ff'); pg.vline(26, 54, 67, '#5a5a6a');
    pg.rect(12, 48, 28, 4, '#3f7fd6'); pg.rect(16, 49, 20, 2, '#fff4e0');
  }]);
  // prédios genéricos de BH (fachadas)
  const bldg = (wall: string, win: string): Draw => (pg) => {
    pg.rect(2, 4, 36, 58, wall); pg.rect(2, 4, 36, 2, shade(wall, 0.2)); pg.rect(2, 60, 36, 2, shade(wall, -0.35));
    for (let y = 10; y < 50; y += 9) for (let x = 6; x < 34; x += 9) pg.rect(x, y, 5, 5, win);
    pg.rect(15, 50, 10, 12, shade(wall, -0.45));
  };
  sheet(scene, 'city_bldg', 40, 64, [bldg('#e8a87c', '#6cc4ff'), bldg('#b8c8d8', '#ffe6a0'), bldg('#f4e4b8', '#6cc4ff'), bldg('#c8a0c8', '#d8f4ff')]);
  // calçada de pedra portuguesa (ondas)
  sheet(scene, 'sidewalk', 16, 16, [(pg) => {
    pg.rect(0, 0, 16, 16, '#e8e4dc');
    for (let x = 0; x < 16; x++) { const y = Math.round(4 + Math.sin(x / 2.5) * 2); pg.px(x, y, '#5a5a6a'); pg.px(x, y + 8, '#5a5a6a'); }
    pg.px(3, 12, '#cfcac0'); pg.px(11, 2, '#cfcac0');
  }], false);
  // semáforo de pedestre: 0 = vermelho (bonequinho parado), 1 = verde (bonequinho andando)
  const light = (green: boolean): Draw => (pg) => {
    pg.vline(4, 12, 29, '#4a4a58'); pg.vline(5, 12, 29, '#6a6a78');
    pg.rect(1, 0, 8, 13, '#2a2a34');
    pg.rect(2, 1, 6, 5, green ? '#3a2020' : '#ff4a4a'); pg.rect(2, 7, 6, 5, green ? '#4aff8a' : '#203a28');
    if (!green) { pg.px(4, 2, '#ffd0d0'); pg.vline(4, 3, 4, '#ffd0d0'); } else { pg.px(5, 8, '#e0ffe8'); pg.vline(5, 9, 10, '#e0ffe8'); pg.px(4, 11, '#e0ffe8'); }
  };
  sheet(scene, 'ped_light', 10, 30, [light(false), light(true)]);
  // carro visto de cima (desce/sobe a rua transversal)
  const car = (body: string): Draw => (pg) => {
    pg.rect(1, 2, 14, 22, body); pg.rect(1, 2, 14, 2, shade(body, 0.25));
    pg.rect(3, 6, 10, 5, '#9ce8ff'); pg.rect(3, 16, 10, 4, '#7ac8e8');
    pg.rect(0, 5, 1, 4, '#2a2a34'); pg.rect(15, 5, 1, 4, '#2a2a34'); pg.rect(0, 17, 1, 4, '#2a2a34'); pg.rect(15, 17, 1, 4, '#2a2a34');
    pg.px(3, 2, '#fff4a0'); pg.px(12, 2, '#fff4a0');
  };
  sheet(scene, 'car_top', 16, 26, [car('#e8424a'), car('#3f7fd6'), car('#ffd25e'), car('#f4f0e8')]);
  // pombo: parado / batendo asa
  const pigeon = (fly: boolean): Draw => (pg) => {
    pg.ellipse(5, 6, 4, 2, '#8a8a9a'); pg.ellipse(2, 4, 2, 2, '#7a7a8a'); pg.px(1, 3, '#2a1d2e'); pg.px(0, 4, '#c8902a');
    pg.px(2, 6, '#6ab89a'); pg.px(3, 6, '#9a6ab8');
    if (fly) { pg.rect(4, 0, 5, 3, '#a8a8b8'); pg.px(9, 1, '#a8a8b8'); } else pg.rect(5, 5, 4, 2, '#a8a8b8');
    if (!fly) { pg.px(4, 9, '#e8786a'); pg.px(6, 9, '#e8786a'); }
  };
  sheet(scene, 'pigeon', 11, 10, [pigeon(false), pigeon(true)]);
  // skatista vindo na contramão
  sheet(scene, 'skater', 14, 22, [(pg) => {
    pg.ellipse(7, 4, 3, 3, '#c88a5a'); pg.rect(4, 1, 7, 2, '#e8424a');
    pg.rect(4, 8, 6, 7, '#3f7fd6'); pg.rect(3, 9, 1, 4, '#c88a5a'); pg.rect(10, 9, 1, 4, '#c88a5a');
    pg.rect(4, 15, 2, 4, '#3a3a4a'); pg.rect(8, 15, 2, 4, '#3a3a4a');
    pg.rect(1, 19, 12, 1, '#8a5a34'); pg.px(2, 20, '#2a2a34'); pg.px(11, 20, '#2a2a34');
  }]);
  // poça d'água na calçada
  sheet(scene, 'puddle', 24, 9, [(pg) => {
    pg.ellipse(12, 4, 11, 4, '#5a8ab8'); pg.ellipse(11, 4, 8, 2, '#8ac8f0'); pg.hline(7, 10, 3, '#d8f4ff');
  }], false);
  // medalhas da vitrine: 0 São Bento, 1 Milagrosa, 2 São Jorge, 3 Terço
  sheet(scene, 'medals', 18, 22, [
    (pg) => {
      pg.hline(4, 13, 1, '#c8902a'); pg.px(3, 2, '#c8902a'); pg.px(14, 2, '#c8902a'); pg.vline(9, 2, 5, '#c8902a');
      pg.ellipse(9, 13, 7, 7, '#ffd25e'); pg.ellipse(9, 13, 5, 5, '#e8b83a');
      pg.vline(9, 9, 17, '#3a2a1e'); pg.hline(5, 13, 13, '#3a2a1e');
      pg.px(6, 10, '#3a2a1e'); pg.px(12, 10, '#3a2a1e'); pg.px(6, 16, '#3a2a1e'); pg.px(12, 16, '#3a2a1e');
    },
    (pg) => {
      pg.vline(9, 1, 4, '#b8b8c8'); pg.ellipse(9, 13, 5, 7, '#d8d8e8'); pg.ellipse(9, 13, 3, 5, '#6c9cff');
      pg.ellipse(9, 11, 1, 1, '#fff7f0'); pg.vline(9, 12, 16, '#fff7f0');
    },
    (pg) => {
      pg.vline(9, 1, 5, '#c8902a'); pg.ellipse(9, 13, 7, 7, '#e8b83a'); pg.ellipse(9, 13, 5, 5, '#c84a3a');
      pg.rect(6, 13, 6, 3, '#fff7f0'); pg.px(8, 11, '#fff7f0'); pg.px(9, 10, '#fff7f0'); pg.hline(10, 14, 10, '#d8d8e8');
    },
    (pg) => {
      for (let a = 0; a < 12; a++) pg.px(Math.round(9 + Math.cos(a / 12 * Math.PI * 2) * 6), Math.round(9 + Math.sin(a / 12 * Math.PI * 2) * 6), '#8a5a34');
      pg.vline(9, 15, 19, '#8a5a34'); pg.vline(9, 18, 21, '#c8902a'); pg.hline(7, 11, 19, '#c8902a');
    },
  ]);
  // a medalha de São Bento no cordão (ícone)
  sheet(scene, 'item_medal', 14, 16, [(pg) => {
    for (let x = 1; x <= 12; x++) pg.px(x, Math.round(1 + Math.pow((x - 6.5) / 5.5, 2) * -5 + 6), '#c8902a');
    pg.ellipse(7, 10, 4, 4, '#ffd25e'); pg.vline(7, 7, 13, '#3a2a1e'); pg.hline(4, 10, 10, '#3a2a1e');
  }]);
  // presente embrulhado com laço
  sheet(scene, 'gift', 16, 16, [(pg) => {
    pg.rect(2, 6, 12, 9, '#ff6f9f'); pg.rect(1, 4, 14, 3, '#ff8fb1');
    pg.vline(7, 4, 14, '#ffd25e'); pg.vline(8, 4, 14, '#ffd25e');
    pg.ellipse(5, 2, 2, 1, '#ffd25e'); pg.ellipse(10, 2, 2, 1, '#ffd25e');
  }]);
}
