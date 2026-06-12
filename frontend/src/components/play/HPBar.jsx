"use client";

import styles from "./play.module.css";

export default function HPBar({ current = 100, max = 100, label = "HP" }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div className={styles.hpBar}>
      <span className={styles.hpLabel}>{label}</span>
      <div className={styles.hpTrack}>
        <div className={styles.hpFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.hpValue}>
        {current}/{max}
      </span>
    </div>
  );
}
