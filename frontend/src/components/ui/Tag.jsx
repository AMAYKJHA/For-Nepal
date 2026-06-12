import styles from "./ui.module.css";

export default function Tag({ children, color = "primary" }) {
  return (
    <span className={`${styles.tag} ${styles[`tag_${color}`] || ""}`}>
      {children}
    </span>
  );
}
