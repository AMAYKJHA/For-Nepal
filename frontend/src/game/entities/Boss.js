import Enemy from "./Enemy";

/**
 * Boss — a stronger Enemy that ends a level. Has more HP and can be
 * extended with special attack phases.
 */
export default class Boss extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y);

    this.maxHp = 200;
    this.hp = 200;
    this.phase = 1;
  }

  nextPhase() {
    this.phase += 1;
  }
}
