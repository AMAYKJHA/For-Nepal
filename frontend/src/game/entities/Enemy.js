import Phaser from "phaser";
import { eventBridge, GameEvents } from "@/game/EventBridge";

/**
 * Enemy — a standard foe in the BattleScene.
 */
export default class Enemy extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);

    this.maxHp = 60;
    this.hp = 60;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    eventBridge.emit(GameEvents.ENEMY_HP_CHANGED, {
      hp: this.hp,
      max: this.maxHp,
    });

    if (this.hp === 0) {
      eventBridge.emit(GameEvents.VICTORY);
    }
  }
}
