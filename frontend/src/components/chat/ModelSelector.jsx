"use client";

import { useState } from "react";
import styles from "./chat.module.css";

const MODELS = ["ScholarAI Fast", "ScholarAI Pro", "ScholarAI Reasoning"];

export default function ModelSelector({ onChange }) {
  const [model, setModel] = useState(MODELS[0]);

  function handleChange(e) {
    setModel(e.target.value);
    onChange?.(e.target.value);
  }

  return (
    <div className={styles.modelSelector}>
      <label className={styles.modelLabel}>Model</label>
      <select className={styles.modelSelect} value={model} onChange={handleChange}>
        {MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
