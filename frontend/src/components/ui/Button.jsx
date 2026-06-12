import styles from "./ui.module.css";

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      className={`${styles.button} ${styles[variant] || ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
