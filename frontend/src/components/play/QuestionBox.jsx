"use client";

import styles from "./play.module.css";

export default function QuestionBox({ question, options = [], onAnswer }) {
  if (!question) {
    return (
      <div className={styles.questionBox}>
        <p className={styles.questionPrompt}>Waiting for next question…</p>
      </div>
    );
  }

  return (
    <div className={styles.questionBox}>
      <p className={styles.questionPrompt}>{question}</p>
      <div className={styles.options}>
        {options.map((opt, i) => (
          <button
            key={i}
            className={styles.optionBtn}
            onClick={() => onAnswer?.(i)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
