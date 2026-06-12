/**
 * AttackEffect — a quick slash/burst tween used when the hero attacks.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.GameObject} target
 */
export function playAttackEffect(scene, target) {
  scene.tweens.add({
    targets: target,
    angle: { from: -8, to: 8 },
    yoyo: true,
    duration: 90,
    repeat: 2,
    onComplete: () => target.setAngle?.(0),
  });
}
