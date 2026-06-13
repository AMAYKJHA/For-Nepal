import styles from "./ui.module.css";

export default function ProgressBar({ value = 0, max = 100, color = "primary" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={styles.progressTrack}>
      <div
        className={`${styles.progressFill} ${styles[`progress_${color}`] || ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
