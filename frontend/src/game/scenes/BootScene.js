import Phaser from "phaser";

/**
 * BootScene — preloads every asset (sprites, backgrounds, audio, UI)
 * before handing off to the BattleScene.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.path = "/assets/";

    // Backgrounds
    // this.load.image("bg-level-1", "backgrounds/level-1.png");

    // Sprites
    // this.load.spritesheet("hero", "sprites/hero.png", { frameWidth: 64, frameHeight: 64 });

    // UI
    // this.load.image("panel", "ui/panel.png");

    // Audio is handled separately through Howler.js.
  }

  create() {
    this.scene.start("BattleScene");
  }
}
