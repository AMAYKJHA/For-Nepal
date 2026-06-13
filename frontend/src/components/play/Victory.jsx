"use client";

import styles from "./play.module.css";

export default function Victory({ onContinue }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.overlayCard}>
        <h2 className={styles.victoryTitle}>Victory!</h2>
        <p className={styles.overlayText}>You bested the challenge.</p>
        <div className={styles.overlayActions}>
          <button className={styles.controlBtn} onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
