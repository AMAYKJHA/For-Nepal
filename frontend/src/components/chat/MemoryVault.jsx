"use client";

import styles from "./chat.module.css";

export default function MemoryVault({ entries = [] }) {
  return (
    <div className={styles.panelView}>
      <h2>Memory Vault</h2>
      <p className={styles.placeholder}>
        Saved facts, notes, and uploaded documents.
      </p>
      <ul className={styles.vaultList}>
        {entries.map((entry, i) => (
          <li key={i} className={styles.vaultItem}>
            {entry.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
