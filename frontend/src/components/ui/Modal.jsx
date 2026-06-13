"use client";

import styles from "./ui.module.css";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className={styles.modalTitle}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
