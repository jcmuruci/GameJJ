import Phaser from 'phaser';
import { GAME_W, GAME_H, RES } from '../config';

/**
 * Toda cena começa com a câmera principal ampliada em RES e centrada na área
 * lógica de 960x540: as cenas continuam usando as mesmas coordenadas, mas tudo
 * é desenhado na resolução real da tela.
 */
export function installHiRes(): void {
  if (RES === 1) return;
  const proto = Phaser.Cameras.Scene2D.CameraManager.prototype as unknown as { start: () => void; main: Phaser.Cameras.Scene2D.Camera };
  const start = proto.start;
  proto.start = function (this: typeof proto) {
    start.call(this);
    this.main.setZoom(RES).centerOn(GAME_W / 2, GAME_H / 2);
  };
}
