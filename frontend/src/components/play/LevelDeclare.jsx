"use client";

import styles from "./play.module.css";

export default function LevelDeclare({ level = 1, title = "The Gate" }) {
  return (
    <div className={styles.levelDeclare}>
      <span className={styles.levelNumber}>Level {level}</span>
      <h2 className={styles.levelTitle}>{title}</h2>
    </div>
  );
}
