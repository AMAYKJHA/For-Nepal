import Phaser from "phaser";
import { eventBridge, GameEvents } from "@/game/EventBridge";

/**
 * Hero — the player-controlled scholar.
 */
export default class Hero extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);

    this.maxHp = 100;
    this.hp = 100;
    this.shielded = false;
  }

  raiseShield() {
    this.shielded = true;
  }

  takeDamage(amount) {
    const damage = this.shielded ? Math.floor(amount / 2) : amount;
    this.shielded = false;
    this.hp = Math.max(0, this.hp - damage);
    eventBridge.emit(GameEvents.HERO_HP_CHANGED, { hp: this.hp, max: this.maxHp });

    if (this.hp === 0) {
      eventBridge.emit(GameEvents.GAME_OVER);
    }
  }
}
