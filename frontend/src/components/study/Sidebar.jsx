'use client';

import Link from 'next/link'; // ✅ FIX: Added missing import
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  navItems,
  isOpen,
  theme,
}) {
  const pathname = usePathname();
  
  // ✅ FIX: Use state + useEffect to avoid calling impure Date functions during render
  const [today, setToday] = useState('');
  const [yesterday, setYesterday] = useState('');
  const [sevenDaysAgo, setSevenDaysAgo] = useState(0);

  useEffect(() => {
    const now = new Date();
    setToday(now.toDateString());
    setYesterday(new Date(now.getTime() - 86400000).toDateString());
    setSevenDaysAgo(now.getTime() - 7 * 86400000);
  }, []);

  // Note: new Date(string) is deterministic and perfectly safe during render
  const groups = sessions.reduce((acc, s) => {
    const d = new Date(s.createdAt).toDateString();
    const ms = new Date(s.createdAt).getTime();
    const key = d === today ? 'Today' : d === yesterday ? 'Yesterday' : ms > sevenDaysAgo ? 'Previous 7 Days' : 'Older';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

  // ✅ Always render, just add collapsed class for CSS animation
  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''}`}>
      {/* Logo + New Chat */}
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>M</div>
          <div className={styles.logoText}>
            <div className={styles.title}>ManageAI</div>
            <div className={styles.subtitle}>Smart Memory Chat</div>
          </div>
        </div>
        <button className={styles.newChatBtn} onClick={onNewChat} title="New chat">
          <span>+</span>
        </button>
      </div>

      {/* Chat List */}
      <div className={styles.listContainer}>
        {groupOrder.filter(g => groups[g]).map(label => (
          <div key={label}>
            <div className={styles.groupLabel}>{label}</div>
            {groups[label].map(s => (
              <div
                key={s.id}
                className={`${styles.sessionItem} ${s.id === activeSessionId ? styles.active : ''}`}
                onClick={() => onSelectSession(s.id)}
              >
                <span className={styles.icon}>💬</span>
                <span className={styles.sessionTitle}>{s.title}</span>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                >✕</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className={styles.navContainer}>
        {navItems.map(item => {
          const isActive = pathname === item.to || pathname.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`${styles.navBtn} ${isActive ? styles.navActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}