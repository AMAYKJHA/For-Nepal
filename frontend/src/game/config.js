import BootScene from "@/game/scenes/BootScene";
import BattleScene from "@/game/scenes/BattleScene";
import UIScene from "@/game/scenes/UIScene";

/**
 * Builds the Phaser.Game configuration.
 *
 * @param {typeof import("phaser")} Phaser - the dynamically imported Phaser module
 * @param {HTMLElement} parent - the DOM node to mount the canvas into
 * @returns {Phaser.Types.Core.GameConfig}
 */
export function createGameConfig(Phaser, parent) {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#05070d",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { y: 0 }, debug: false },
    },
    scene: [BootScene, BattleScene, UIScene],
  };
}
