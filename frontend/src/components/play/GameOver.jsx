"use client";

import styles from "./play.module.css";

export default function GameOver({ onRetry, onQuit }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayCard}>
        <h2 className={styles.gameOverTitle}>Defeated</h2>
        <p className={styles.overlayText}>The knowledge eluded you… this time.</p>
        <div className={styles.overlayActions}>
          <button className={styles.controlBtn} onClick={onRetry}>
            Retry
          </button>
          <button className={styles.controlBtn} onClick={onQuit}>
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
