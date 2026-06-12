import Phaser from "phaser";

/**
 * UIScene — a transparent overlay scene that renders in-canvas HUD
 * elements (HP, timer) above the BattleScene. Most HUD lives in React,
 * but in-world effects can be drawn here.
 */
export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene", active: false });
  }

  create() {
    this.timerText = this.add.text(16, 16, "", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#e6ebff",
    });
  }

  setTimer(seconds) {
    this.timerText?.setText(`⏱ ${seconds}s`);
  }
}
