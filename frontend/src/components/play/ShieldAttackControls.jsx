"use client";

import styles from "./play.module.css";

export default function ShieldAttackControls({ onShield, onAttack }) {
  return (
    <div className={styles.controls}>
      <button
        className={`${styles.controlBtn} ${styles.shieldBtn}`}
        onClick={onShield}
      >
        🛡 Shield
      </button>
      <button
        className={`${styles.controlBtn} ${styles.attackBtn}`}
        onClick={onAttack}
      >
        ⚔ Attack
      </button>
    </div>
  );
}
