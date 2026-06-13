'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/study/Sidebar';
import Header from '@/components/study/Header';
import { useTheme } from '@/components/ThemeProvider';
import { StudyProvider, useStudy } from '@/components/study/StudyContext';
import styles from './layout.module.css'; // You can reuse your old page.module.css styles here

function Shell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  
  const {
    sessions, activeSessionId, activeSession,
    handleNewChat, handleSelectSession, handleDeleteSession
  } = useStudy();

  const navItems = [
    { to: '/study/memory',     label: 'Memory',     icon: '🧠' },
    { to: '/study/search',     label: 'Search',     icon: '🔍' },
    { to: '/study/flashcards', label: 'Flashcards', icon: '📇' },
    { to: '/study/reviews',    label: 'Reviews',    icon: '⏱️' },
    { to: '/study/concept-map', label: 'Concept Map', icon: '🗺️' },
  ];

  const isChat = pathname === '/study';
  const currentNav = navItems.find(n => pathname.startsWith(n.to));
  const headerTitle = isChat
    ? (activeSession?.title || 'New Chat')
    : (currentNav ? `${currentNav.icon} ${currentNav.label}` : '');

  return (
    <div className={styles.shell}>
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        navItems={navItems}
        isOpen={sidebarOpen}
        theme={theme}
      />
      <div className={styles.mainArea}>
        <Header
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          theme={theme}
          onToggleTheme={toggle}
          isChat={isChat}
          title={headerTitle}
          onNewChat={handleNewChat}
        />
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function StudyLayout({ children }) {
  return (
    <StudyProvider>
      <Shell>{children}</Shell>
    </StudyProvider>
  );
}