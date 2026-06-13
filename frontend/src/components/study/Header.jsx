'use client';

import styles from './Header.module.css';

export default function Header({
  onToggleSidebar,
  theme,
  onToggleTheme,
  isChat,
  title,
  onNewChat,
}) {
  const isDark = theme === 'dark';

  return (
    <header className={styles.header}>
      <button
        onClick={onToggleSidebar}
        title="Toggle sidebar"
        className={styles.toggleBtn}
      >
        ☰
      </button>

      <span className={styles.title}>{title}</span>

      <button
        onClick={onToggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle dark mode"
        className={styles.themeBtn}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      {isChat && (
        <button className={styles.newChatBtn} onClick={onNewChat}>
          <span>+</span> New Chat
        </button>
      )}
    </header>
  );
}