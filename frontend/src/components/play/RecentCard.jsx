import styles from './RecentCard.module.css';

export default function RecentCard({ title, status, variant = 'inProgress' }) {
  // Dynamically apply the correct CSS class based on the variant prop
  const badgeClass = `${styles.statusBadge} ${variant === 'completed' ? styles.completed : styles.inProgress}`;

  return (
    <div className={styles.card}>
      <span className={styles.title}>{title}</span>
      <div className={badgeClass}>
        {status}
      </div>
    </div>
  );
}