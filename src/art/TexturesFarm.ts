import Phaser from 'phaser';
import { PG } from './pixel';

/** Hotel fazenda: avestruz, animais calmos, pedalinho e boias. */

type Draw = (pg: PG) => void;

function sheet(scene: Phaser.Scene, key: string, fw: number, fh: number, frames: Draw[]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const pg = new PG(tex.getContext());
  frames.forEach((f, i) => {
    pg.at(i * fw, 0);
    f(pg);
    pg.outline(0, 0, fw, fh);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
}

export function generateFarmTextures(scene: Phaser.Scene): void {
  // avestruz (olhando para a esquerda): 0 parada, 1 correndo, 2 tonta
  const ostrich = (run: boolean, dizzy = false): Draw => (pg) => {
    const leg = '#e8a0a8';
    if (run) { pg.vline(10, 21, 27, leg); pg.vline(15, 20, 25, leg); pg.hline(14, 17, 25, leg); pg.hline(8, 10, 27, leg); }
    else { pg.vline(11, 21, 27, leg); pg.vline(14, 21, 27, leg); pg.hline(9, 11, 27, leg); pg.hline(14, 16, 27, leg); }
    pg.ellipse(13, 16, 7, 5, '#2a2a34'); pg.ellipse(12, 15, 5, 3, '#4a4a58'); pg.rect(17, 12, 4, 4, '#fff7f0'); pg.px(20, 11, '#fff7f0');
    pg.rect(7, 4, 2, 10, '#f0b8c0'); pg.px(6, 12, '#f0b8c0');
    pg.ellipse(6, 3, 3, 3, '#f0b8c0'); pg.rect(1, 3, 3, 2, '#f08a3a');
    if (dizzy) { pg.px(5, 2, '#2a1d2e'); pg.px(7, 2, '#2a1d2e'); pg.px(6, 3, '#2a1d2e'); pg.px(5, 4, '#2a1d2e'); pg.px(7, 4, '#2a1d2e'); }
    else { pg.rect(5, 1, 3, 3, '#ffffff'); pg.px(5, 2, '#2a1d2e'); pg.px(4, 1, '#2a1d2e'); }
  };
  sheet(scene, 'ostrich', 24, 28, [ostrich(false), ostrich(true), ostrich(false, true)]);

  const goat = (k: number): Draw => (pg) => {
    pg.ellipse(9, 8, 6, 4, '#f0ece0'); pg.ellipse(3, 5, 3, 3, '#f0ece0'); pg.px(1, 1, '#a8a8b8'); pg.px(2, 2, '#a8a8b8'); pg.px(4, 1, '#a8a8b8');
    pg.px(2, 5, '#2a1d2e'); pg.px(2, 8, '#d8d0c0'); pg.px(3, 9, '#d8d0c0');
    pg.vline(5 + k, 11, 14, '#c8c0b0'); pg.vline(12 - k, 11, 14, '#c8c0b0'); pg.px(15, 7, '#f0ece0');
  };
  sheet(scene, 'goat', 17, 16, [goat(0), goat(1)]);
  const horse = (k: number): Draw => (pg) => {
    pg.ellipse(14, 10, 9, 5, '#8a5a34'); pg.rect(3, 3, 6, 8, '#8a5a34'); pg.rect(1, 3, 4, 4, '#8a5a34'); pg.px(3, 4, '#2a1d2e');
    pg.rect(6, 2, 3, 9, '#3a2418'); pg.rect(22, 8, 3, 8, '#3a2418');
    pg.vline(8 + k, 14, 21, '#6a4224'); pg.vline(11 - k, 14, 21, '#6a4224'); pg.vline(17 + k, 14, 21, '#6a4224'); pg.vline(20 - k, 14, 21, '#6a4224');
  };
  sheet(scene, 'horse', 27, 23, [horse(0), horse(1)]);
  const dog = (k: number): Draw => (pg) => {
    pg.ellipse(8, 7, 5, 3, '#d8a050'); pg.ellipse(3, 4, 3, 3, '#d8a050'); pg.px(2, 3, '#2a1d2e'); pg.px(0, 5, '#2a1d2e');
    pg.rect(4, 1, 2, 3, '#a8703a'); pg.vline(4, 9, 11, '#a8703a'); pg.vline(11, 9, 11, '#a8703a');
    pg.px(13, 4 - k, '#d8a050'); pg.px(14, 3 - k, '#d8a050');
  };
  sheet(scene, 'dog', 16, 13, [dog(0), dog(1)]);
  const duck = (k: number): Draw => (pg) => {
    pg.ellipse(7, 7, 5, 3, '#fff7f0'); pg.ellipse(3, 4, 2, 2, '#fff7f0'); pg.rect(0, 4, 2, 1, '#f08a3a'); pg.px(3, 3, '#2a1d2e');
    pg.hline(2, 12, 10, k ? '#6cc4ff' : '#8fd8ff');
  };
  sheet(scene, 'duck', 14, 11, [duck(0), duck(1)]);

  sheet(scene, 'pedalinho', 40, 30, [(pg) => {
    pg.ellipse(20, 20, 17, 8, '#fff7f0'); pg.ellipse(20, 22, 16, 6, '#e8e8f4');
    pg.rect(10, 13, 20, 6, '#ff8fb1'); pg.rect(10, 13, 20, 1, '#ffd6e4');
    pg.rect(2, 4, 4, 14, '#fff7f0'); pg.ellipse(4, 4, 3, 3, '#fff7f0'); pg.rect(0, 4, 2, 2, '#f08a3a'); pg.px(4, 3, '#2a1d2e');
    pg.ellipse(36, 15, 3, 4, '#fff7f0');
    pg.hline(4, 36, 28, '#8fd8ff');
  }]);
  sheet(scene, 'buoy', 12, 14, [(pg) => {
    pg.ellipse(6, 7, 5, 5, '#e8424a'); pg.rect(1, 6, 11, 3, '#fff7f0'); pg.vline(6, 0, 2, '#5a5a6a'); pg.hline(0, 11, 13, '#8fd8ff');
  }]);
}
