"use client";

import { useState } from "react";
import styles from "./chat.module.css";

export default function SearchMemory({ onSearch }) {
  const [query, setQuery] = useState("");

  function submit(e) {
    e.preventDefault();
    onSearch?.(query);
  }

  return (
    <div className={styles.panelView}>
      <h2>Search Memory</h2>
      <form className={styles.composer} onSubmit={submit}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your memory vault…"
        />
        <button type="submit" className={styles.sendBtn}>
          Search
        </button>
      </form>
    </div>
  );
}
