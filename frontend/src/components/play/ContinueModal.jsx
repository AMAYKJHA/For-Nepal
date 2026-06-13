"use client";

import styles from "./play.module.css";

export default function ContinueModal({ open, onContinue, onCancel }) {
  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.overlayCard}>
        <h2>Continue?</h2>
        <p className={styles.overlayText}>Resume from your last checkpoint.</p>
        <div className={styles.overlayActions}>
          <button className={styles.controlBtn} onClick={onContinue}>
            Yes
          </button>
          <button className={styles.controlBtn} onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}
