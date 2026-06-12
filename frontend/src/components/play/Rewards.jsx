"use client";

import styles from "./play.module.css";

export default function Rewards({ xp = 0, items = [] }) {
  return (
    <div className={styles.rewards}>
      <h3 className={styles.rewardsTitle}>Rewards</h3>
      <p className={styles.rewardsXp}>+{xp} XP</p>
      <ul className={styles.rewardsList}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
