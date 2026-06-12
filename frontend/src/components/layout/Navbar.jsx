import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark}>✦</span> Scholar
      </Link>

      <div className={styles.links}>
        <Link href="/chat" className={styles.link}>
          Chat
        </Link>
        <Link href="/play" className={styles.link}>
          Play
        </Link>
        <Link href="/play/world-map" className={styles.link}>
          World Map
        </Link>
        <Link href="/play/leaderboard" className={styles.link}>
          Leaderboard
        </Link>
        <Link href="/play/profile" className={styles.link}>
          Profile
        </Link>
      </div>
    </nav>
  );
}
