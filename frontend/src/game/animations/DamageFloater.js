/**
 * DamageFloater — shows a floating damage number that rises and fades.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} amount
 */
export function showDamageFloater(scene, x, y, amount) {
  const text = scene.add.text(x, y, `-${amount}`, {
    fontFamily: "monospace",
    fontSize: "24px",
    color: "#ff5470",
    fontStyle: "bold",
  });
  text.setOrigin(0.5);

  scene.tweens.add({
    targets: text,
    y: y - 60,
    alpha: 0,
    duration: 700,
    ease: "Cubic.easeOut",
    onComplete: () => text.destroy(),
  });
}
