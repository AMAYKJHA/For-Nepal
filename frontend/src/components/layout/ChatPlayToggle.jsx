"use client";

import { useState } from "react";
import styles from "./Navbar.module.css";

const MODES = ["Chat", "Play"];

export default function ChatPlayToggle({ onChange }) {
  const [active, setActive] = useState("Chat");

  function select(mode) {
    setActive(mode);
    onChange?.(mode);
  }

  return (
    <div className={styles.toggle} role="tablist">
      {MODES.map((mode) => (
        <button
          key={mode}
          role="tab"
          aria-selected={active === mode}
          className={`${styles.toggleTab} ${
            active === mode ? styles.toggleTabActive : ""
          }`}
          onClick={() => select(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
