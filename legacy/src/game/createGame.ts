import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { AttractScene } from './scenes/AttractScene';
import { OverlayScene } from './scenes/OverlayScene';
import { ScreeningScene } from './scenes/ScreeningScene';
import { CHAPTER_SCENES } from './scenes/chapters';

export function createGame(parent: HTMLElement, onReady: () => void): Phaser.Game {
  const forceCanvas = new URLSearchParams(window.location.search).get('renderer') === 'canvas';
  return new Phaser.Game({
    type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    fps: { target: 60, smoothStep: true },
    input: { keyboard: false, mouse: true, touch: true, gamepad: false },
    audio: { noAudio: true },
    scene: [new BootScene(onReady), AttractScene, OverlayScene, ScreeningScene, ...CHAPTER_SCENES],
  });
}
