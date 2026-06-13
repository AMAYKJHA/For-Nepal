'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getUserTopics } from '@/lib/api';
import RecentCard from '@/components/play/RecentCard.jsx';
import StreakCard from '@/components/ui/StreakCard.jsx';

// Deterministic pseudo-random number generator based on a string seed.
// This ensures the server and client generate the EXACT same numbers.
const seededRandom = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash % 10000) / 10000; // Returns a number between 0 and 1
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const userData = getUser();
      setUser(userData);

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

  const username = user?.username || 'Scholar';
  const initials = username.substring(0, 2).toUpperCase();
  
  const completedCount = topics.filter(t => t.status === 'ready').length;
  const totalCount = topics.length;
  const accuracy = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const xp = completedCount * 100;

  // Generate exactly 30 days of deterministic mock data
  const streakData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Use UTC methods to prevent server/client timezone mismatches
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let count = 0;
      // Use the date string as a seed so it's always the same for that specific day
      const rand1 = seededRandom(dateStr + '-weekend');
      const rand2 = seededRandom(dateStr + '-chance');
      const rand3 = seededRandom(dateStr + '-amount');

      if (!isWeekend || rand1 > 0.4) {
        if (rand2 > 0.3) {
          count = Math.floor(rand3 * 10) + 1;
        }
      }

      let level = 0;
      if (count === 0) level = 0;
      else if (count <= 2) level = 1;
      else if (count <= 4) level = 2;
      else if (count <= 7) level = 3;
      else level = 4;

      data.push({
        date: dateStr,
        count,
        level,
        isHigh: level >= 3,
        isLow: level === 1 && count > 0,
      });
    }

    return data;
  }, []);

  const totalStudySessions = streakData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        
        {/* BEGIN: TopHeader */}
        <header className={styles.header}>
          <div className={styles.logoWrapper}>
            <img alt="Arcane Scholar Logo" className={styles.logoImg} src="/assets/logo.png" />
            <h1 className={styles.brandTitle}>Scholar</h1>
          </div>
          
          <nav className={styles.nav}>
            <button className={styles.rpgButton} onClick={handleGameMenu}>Game Menu</button>
            <button className={`${styles.rpgButton} ${styles.rpgButtonActive}`} onClick={handleStudyMode}>Study Mode</button>
          </nav>
        </header>

        {/* BEGIN: UserStatsSection */}
        <section className={styles.statsSection}>
          <div className={styles.profileBlock}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarInner}>{initials}</div>
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

        {/* BEGIN: StudyStreakSection */}
        <section className={styles.recentSection}>
          <h2 className={styles.recentTitle}>30-Day Study Streak</h2>
          <StreakCard
            title="Your Recent Activity"
            subtitle={`${totalStudySessions} games played in the last 30 days`}
            data={streakData}
            onDayClick={(day) => console.log('Study day clicked:', day)}
          />
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
              textAlign: 'center', padding: '3rem 1rem', color: 'var(--on-surface-variant)',
              border: '2px dashed var(--outline-variant)', backgroundColor: 'var(--surface-container)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
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