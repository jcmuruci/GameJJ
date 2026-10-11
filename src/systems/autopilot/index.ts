import type Phaser from 'phaser';
import { Admin } from '../Admin';
import { MotoPilot, FishPilot, MedalPilot } from './RidePilots';
import { TrailPilot, TutorialPilot, FarmPilot, KitchenPilot } from './LevelPilots';
import type { BaseLevel } from '../../scenes/levels/BaseLevel';

/** Modo admin: liga o piloto automático da fase (os personagens jogam sozinhos). */
export function attachPilot(scene: Phaser.Scene): void {
  if (!Admin.on) return;
  switch (scene.scene.key) {
    case 'MotoLevel': new MotoPilot(scene); break;
    case 'FishingLevel': new FishPilot(scene); break;
    case 'MedalLevel': new MedalPilot(scene); break;
    case 'TrailLevel': new TrailPilot(scene as BaseLevel); break;
    case 'TutorialLevel': new TutorialPilot(scene as BaseLevel); break;
    case 'FarmLevel': new FarmPilot(scene as BaseLevel); break;
    case 'KitchenLevel': new KitchenPilot(scene as BaseLevel); break;
    default: break;
  }
}
