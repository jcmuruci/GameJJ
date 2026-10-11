import Phaser from 'phaser';

/**
 * Clima de cor de cada fase, aplicado na câmera do mundo (a interface fica de fora):
 * saturação, contraste, quente (+) / frio (-) e vinheta nas bordas (0..1).
 */
interface Look { sat?: number; contrast?: number; warm?: number; vignette?: number }

const LOOKS: Record<string, Look> = {
  tutorial: { sat: 0.08, warm: 0.25, vignette: 0.25 }, // manhã quente em Caeté
  climb: { sat: 0.04, warm: 0.1, contrast: 0.03, vignette: 0.3 }, // academia
  canyon: { sat: 0.1, warm: -0.25, contrast: 0.04, vignette: 0.25 }, // fresco, água e pedra
  medal: { sat: 0.06, warm: 0.06, vignette: 0.15 }, // cidade clara
  bread: { sat: -0.08, warm: -0.45, contrast: 0.04, vignette: 0.35 }, // noite azul
  itacolomi: { sat: 0.1, warm: 0.45, vignette: 0.3 }, // luz dourada do pedido
  italiano: { sat: 0.05, warm: 0.3, vignette: 0.35 }, // restaurante aconchegante
  junina: { sat: 0.1, warm: 0.35 }, // entardecer do arraiá
  roca: { sat: 0.14, warm: 0.2, vignette: 0.2 },
  topo: { sat: 0.08, warm: -0.06, contrast: 0.05, vignette: 0.2 }, // céu limpo lá em cima
  lapinha: { sat: 0.14, warm: 0.12, vignette: 0.22 },
  volta: { sat: 0.05, warm: 0.5, vignette: 0.3 }, // fim de tarde na estrada de terra
  farm: { sat: 0.14, warm: 0.12, vignette: 0.2 },
  storm: { sat: -0.35, warm: -0.2, contrast: 0.08, vignette: 0.45 },
  amazon: { sat: 0.1, warm: -0.05, vignette: 0.35 },
};

/** ?fx=0 desliga; ?fx=1 força ligado (sem o vigia de FPS, para capturas). */
const FX_PARAM = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('fx');

export function applyGrade(scene: Phaser.Scene, cam: Phaser.Cameras.Scene2D.Camera, levelId: string, opts: { vignette?: boolean } = {}): void {
  const look = LOOKS[levelId];
  if (!look || FX_PARAM === '0' || scene.game.renderer.type !== Phaser.WEBGL) return;
  cam.postFX.clear();
  const cm = cam.postFX.addColorMatrix();
  cm.saturate(look.sat ?? 0);
  // contraste em volta do cinza médio (o deslocamento da matriz é em 0..255)
  const v = 1 + (look.contrast ?? 0);
  const o = -0.5 * (v - 1) * 255;
  cm.multiply([v, 0, 0, 0, o, 0, v, 0, 0, o, 0, 0, v, 0, o, 0, 0, 0, 1, 0], true);
  // quente puxa o vermelho e tira azul; frio faz o contrário
  const w = look.warm ?? 0;
  cm.multiply([1 + 0.07 * w, 0, 0, 0, 0, 0, 1 + 0.015 * w, 0, 0, 0, 0, 0, 1 - 0.09 * w, 0, 0, 0, 0, 0, 1, 0], true);
  if (look.vignette && opts.vignette !== false) cam.postFX.addVignette(0.5, 0.5, 0.75, look.vignette);
  if (FX_PARAM === '1') return;
  // se o aparelho não aguentar, desliga os efeitos e segue o jogo
  let slow = 0;
  const watch = scene.time.addEvent({
    delay: 500, loop: true, callback: () => {
      slow = scene.game.loop.actualFps < 40 ? slow + 0.5 : 0;
      if (slow >= 4) { cam.postFX.clear(); watch.remove(); }
    },
  });
}
