/**
 * ShieldShatter — plays a shatter effect when a shield breaks.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 */
export function playShieldShatter(scene, x, y) {
  const shards = scene.add.particles(x, y, "shard", {
    speed: { min: 80, max: 200 },
    lifespan: 500,
    quantity: 12,
    scale: { start: 0.6, end: 0 },
    emitting: false,
  });

  shards.explode(12);
  scene.time.delayedCall(600, () => shards.destroy());
}
