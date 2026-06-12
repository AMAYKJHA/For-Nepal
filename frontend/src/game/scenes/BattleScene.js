import Phaser from "phaser";
import { eventBridge, GameEvents } from "@/game/EventBridge";
import Hero from "@/game/entities/Hero";
import Enemy from "@/game/entities/Enemy";

/**
 * BattleScene — the main turn-based combat loop. Answering questions
 * correctly powers attacks; wrong answers let the enemy strike.
 */
export default class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
    this.hero = null;
    this.enemy = null;
  }

  create() {
    const { width, height } = this.scale;

    this.hero = new Hero(this, width * 0.25, height * 0.7);
    this.enemy = new Enemy(this, width * 0.75, height * 0.7);

    this.scene.launch("UIScene");

    // React → Phaser: player chose to attack or shield.
    eventBridge.on(GameEvents.PLAYER_ATTACK, this.onPlayerAttack, this);
    eventBridge.on(GameEvents.PLAYER_SHIELD, this.onPlayerShield, this);

    eventBridge.emit(GameEvents.BATTLE_READY);
  }

  onPlayerAttack() {
    this.enemy.takeDamage(10);
  }

  onPlayerShield() {
    this.hero.raiseShield();
  }

  shutdown() {
    eventBridge.off(GameEvents.PLAYER_ATTACK, this.onPlayerAttack, this);
    eventBridge.off(GameEvents.PLAYER_SHIELD, this.onPlayerShield, this);
  }
}
