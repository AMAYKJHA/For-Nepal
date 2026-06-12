"use client";

import { useState } from "react";
import styles from "./chat.module.css";

export default function Flashcards({ cards = [] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className={styles.panelView}>
        <h2>Flashcards</h2>
        <p className={styles.placeholder}>
          Generate flashcards from your study material.
        </p>
      </div>
    );
  }

  const card = cards[index];

  function next() {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  }

  return (
    <div className={styles.panelView}>
      <h2>Flashcards</h2>
      <button
        className={styles.flashcard}
        onClick={() => setFlipped((f) => !f)}
      >
        {flipped ? card.back : card.front}
      </button>
      <button className={styles.sendBtn} onClick={next}>
        Next
      </button>
    </div>
  );
}
