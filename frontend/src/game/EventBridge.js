import Phaser from "phaser";

/**
 * EventBridge — a singleton Phaser.EventEmitter that lets React
 * components and Phaser scenes communicate without tight coupling.
 *
 *  React  → bridge.emit(GameEvents.PLAYER_ATTACK)
 *  Phaser → bridge.on(GameEvents.PLAYER_ATTACK, handler)
 */
export const eventBridge = new Phaser.Events.EventEmitter();

export const GameEvents = Object.freeze({
  // React → Phaser
  PLAYER_ATTACK: "player-attack",
  PLAYER_SHIELD: "player-shield",
  ANSWER_SUBMITTED: "answer-submitted",

  // Phaser → React
  BATTLE_READY: "battle-ready",
  HERO_HP_CHANGED: "hero-hp-changed",
  ENEMY_HP_CHANGED: "enemy-hp-changed",
  GAME_OVER: "game-over",
  VICTORY: "victory",
});
