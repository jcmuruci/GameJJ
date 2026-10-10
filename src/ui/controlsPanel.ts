import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { txt, panel } from './text';
import { KEY_LABELS } from '../systems/InputManager';
import { Save } from '../systems/SaveManager';

/** Painel "Como jogar" (usado no menu e na pausa). */
export function controlsPanel(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const w = 820;
  const h = 450;
  const x0 = (GAME_W - w) / 2;
  const y0 = (GAME_H - h) / 2;
  c.add(panel(scene, x0, y0, w, h));
  c.add(txt(scene, GAME_W / 2, y0 + 30, 'Como jogar', 28, { color: '#ffd6e4' }));
  const names = [Save.data.looks[0].name, Save.data.looks[1].name];
  const cols = [
    { x: x0 + 205, color: '#bfe6ff', role: 'Guardião', ab: 'Espada: corta troncos, quebra pedras rachadas, afasta inimigos e corvos.', pas: 'Força: só ele empurra pedras grandes e corta ingredientes.' },
    { x: x0 + w - 205, color: '#ffd6e4', role: 'Maga', ab: 'Magia: acende fogueiras e fornos, queima espinhos, atordoa inimigos.', pas: 'Encanto: só ela ativa runas mágicas.' },
  ];
  cols.forEach((col, i) => {
    const k = KEY_LABELS[i];
    c.add(scene.add.image(col.x, y0 + 92, `char_${i}`, 0).setScale(3));
    c.add(txt(scene, col.x, y0 + 140, `${names[i]} · ${col.role}`, 18, { color: col.color }));
    c.add(txt(scene, col.x, y0 + 172, `Mover: ${k.move}`, 15, { bold: false }));
    c.add(txt(scene, col.x, y0 + 194, `Ação: ${k.action}  ·  Habilidade: ${k.ability}`, 15, { bold: false }));
    c.add(txt(scene, col.x, y0 + 236, col.ab, 13, { wrap: 330, color: '#fff4e0', bold: false }));
    c.add(txt(scene, col.x, y0 + 278, col.pas, 13, { wrap: 330, color: '#ffd25e', bold: false }));
  });
  const tips = [
    'AÇÃO: pegar, largar, usar. Segure AÇÃO para cortar ou para reviver o parceiro.',
    'Abraço: juntinhos e de mãos vazias, apertem AÇÃO quase ao mesmo tempo (+1 coração).',
    'Controles: botão A = ação, B/X = habilidade, Start = pausa. Esc pausa no teclado.',
  ];
  tips.forEach((t, i) => c.add(txt(scene, GAME_W / 2, y0 + 330 + i * 26, t, 14, { wrap: 760, bold: false, color: '#e8d8f0' })));
  c.add(txt(scene, GAME_W / 2, y0 + h - 22, 'Aperte AÇÃO ou Esc para voltar', 13, { color: '#ffd25e', bold: false }));
  c.setDepth(100);
  return c;
}
