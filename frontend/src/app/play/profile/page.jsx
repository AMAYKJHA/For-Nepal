'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getUserTopics } from '@/lib/api';
import RecentCard from '@/components/play/RecentCard.jsx';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Get real user data
      const userData = getUser();
      setUser(userData);

      // Fetch topics from backend
      try {
        const result = await getUserTopics();
        if (result.success) {
          setTopics(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGameMenu = () => router.push('/play/');
  const handleStudyMode = () => router.push('/study/');

  // Derive display data from fetched state
  const username = user?.username || 'Scholar';
  const initials = username.substring(0, 2).toUpperCase();
  
  const completedCount = topics.filter(t => t.status === 'ready').length;
  const totalCount = topics.length;
  const accuracy = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const xp = completedCount * 100;

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        
        {/* BEGIN: TopHeader */}
        <header className={styles.header}>
          <div className={styles.logoWrapper}>
            <img 
              alt="Arcane Scholar Logo" 
              className={styles.logoImg} 
              src="/assets/logo.png" 
            />
            <h1 className={styles.brandTitle}>Scholar</h1>
          </div>
          
          <nav className={styles.nav}>
            <button className={styles.rpgButton} onClick={handleGameMenu}>
              Game Menu
            </button>
            <button className={`${styles.rpgButton} ${styles.rpgButtonActive}`} onClick={handleStudyMode}>
              Study Mode
            </button>
          </nav>
        </header>

        {/* BEGIN: UserStatsSection */}
        <section className={styles.statsSection}>
          <div className={styles.profileBlock}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarInner}>
                {initials}
              </div>
            </div>
            <div className={styles.username}>{username}</div>
          </div>
          
          <div className={styles.statsBlock}>
            <h2 className={styles.statsTitle}>Stats</h2>
            <div className={styles.statsGrid}>
              <div className={styles.rpgCard}>
                <div className={styles.statLabel}>Total Completed</div>
                <div className={styles.statValue}>{completedCount}/{totalCount}</div>
              </div>
              <div className={styles.rpgCard}>
                <div className={styles.statLabel}>Accuracy</div>
                <div className={styles.statValue}>{accuracy}% answered</div>
              </div>
              <div className={styles.rpgCard}>
                <div className={styles.statLabel}>Xp</div>
                <div className={styles.statValue}>{xp}</div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.divider}></div>

        {/* BEGIN: RecentTopicsSection */}
        <section className={styles.recentSection}>
          <h2 className={styles.recentTitle}>Recent Topics</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)' }}>
              Loading topics...
            </div>
          ) : topics.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 1rem', 
              color: 'var(--on-surface-variant)',
              border: '2px dashed var(--outline-variant)',
              backgroundColor: 'var(--surface-container)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>inbox</span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', margin: 0 }}>No Quiz Generated Yet</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', margin: 0, opacity: 0.7 }}>
                Upload a PDF in Game Menu to start your journey!
              </p>
            </div>
          ) : (
            topics.map((topic) => (
              <RecentCard 
                key={topic.id}
                title={topic.title} 
                status={topic.status === 'ready' ? 'Ready to Play' : 'Processing...'} 
                variant={topic.status === 'ready' ? 'completed' : 'inProgress'} 
              />
            ))
          )}
        </section>

      </main>
    </div>
  );
}