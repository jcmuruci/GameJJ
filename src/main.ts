import Phaser from 'phaser';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import { GAME_W, GAME_H } from './config';
import { Save } from './systems/SaveManager';
import { Input, KEY_LABELS } from './systems/InputManager';
import { Audio } from './systems/Audio';
import { TouchControls, isTouchDevice } from './systems/TouchControls';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { MapScene } from './scenes/MapScene';
import { StoryScene } from './scenes/StoryScene';
import { ResultScene } from './scenes/ResultScene';
import { PauseScene } from './scenes/PauseScene';
import { CustomizeScene } from './scenes/CustomizeScene';
import { HUDScene } from './scenes/HUDScene';
import { KitchenLevel } from './scenes/levels/KitchenLevel';
import { TrailLevel } from './scenes/levels/TrailLevel';
import { BossLevel } from './scenes/levels/BossLevel';
import { TutorialLevel } from './scenes/levels/TutorialLevel';
import { MotoLevel } from './scenes/levels/MotoLevel';
import { AmazonLevel } from './scenes/levels/AmazonLevel';
import { FarmLevel } from './scenes/levels/FarmLevel';

async function boot(): Promise<void> {
  // espera a fonte pixel (com tempo limite, para nunca travar)
  try {
    await Promise.race([
      Promise.all([document.fonts.load('16px "Pixelify Sans"'), document.fonts.load('bold 16px "Pixelify Sans"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* segue com a fonte reserva */
  }

  Save.load();
  Input.attach(window);
  Input.padSwap = Save.data.settings.padSwap;
  Audio.setVolumes(Save.data.settings.music, Save.data.settings.sfx);
  Input.onFirstGesture = () => Audio.unlock();
  if (isTouchDevice()) {
    new TouchControls().mount();
    // textos de ajuda passam a citar os botões da tela
    Object.assign(KEY_LABELS[0], { move: 'joystick', action: 'Ação', ability: 'Espada' });
    Object.assign(KEY_LABELS[1], { move: 'joystick', action: 'Ação', ability: 'Magia' });
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#1b1424',
    pixelArt: true,
    roundPixels: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: false, gamepad: false },
    fps: { target: 60 },
    scene: [
      BootScene, MenuScene, MapScene, StoryScene, CustomizeScene,
      TutorialLevel, KitchenLevel, TrailLevel, BossLevel, MotoLevel, AmazonLevel, FarmLevel,
      HUDScene, PauseScene, ResultScene,
    ],
  });
  game.events.on(Phaser.Core.Events.PRE_STEP, () => Input.update());
  (window as unknown as { __game: Phaser.Game; __input: typeof Input }).__game = game;
  (window as unknown as { __input: typeof Input }).__input = Input;
  document.getElementById('loading')?.remove();
}

void boot();
