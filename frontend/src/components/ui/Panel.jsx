import styles from "./ui.module.css";

export default function Panel({ children, title, className = "" }) {
  return (
    <div className={`${styles.panel} ${className}`}>
      {title && <h3 className={styles.panelTitle}>{title}</h3>}
      {children}
    </div>
  );
}
