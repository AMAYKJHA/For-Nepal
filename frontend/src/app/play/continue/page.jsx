'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserTopics, getTopicSession } from '@/lib/api';
import TopicCard from '@/components/play/TopicCard';
import styles from './page.module.css';

export default function ContinuePage() {
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const result = await getUserTopics();
        if (result.success) {
          // Get per-topic progress
          const topicProgress = JSON.parse(localStorage.getItem('scholar_topic_progress') || '{}');
          
          // Merge API data with local progress
          const topicsWithProgress = result.data.map(topic => ({
            ...topic,
            currentLevel: topicProgress[topic.id]?.level || 1,
            completed: topicProgress[topic.id]?.completed || false,
          }));
          
          setTopics(topicsWithProgress);
        }
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const handleGameMenu = () => router.push('/play/');
  const handleProfile = () => router.push('/play/profile');
  const handleNewGame = () => router.push('/play/upload');

  // ✅ UPDATED: Navigate to world-map for the specific topic
  const handleResume = async (topicId, currentLevel) => {
    try {
      console.log('📋 Opening world-map for topic:', topicId, 'at level:', currentLevel);
      
      // Set the topic ID so world-map knows which topic to display
      localStorage.setItem('scholar_active_topic_id', String(topicId));
      localStorage.setItem('scholar_active_level', String(currentLevel));
      
      // Fetch session to get session_id
      const sessionResult = await getTopicSession(topicId);
      
      if (sessionResult.success && sessionResult.data) {
        const sessionData = sessionResult.data.session || sessionResult.data;
        localStorage.setItem('scholar_active_session_id', String(sessionData.id || sessionData.session_id || ''));
        
        console.log('✅ Session loaded:', {
          topicId,
          sessionId: sessionData.id || sessionData.session_id,
          currentLevel,
        });
      }
      
      // ✅ Navigate to world-map instead of game
      router.push('/play/world-map');
    } catch (error) {
      console.error('❌ Failed to load topic:', error);
      localStorage.setItem('scholar_active_topic_id', String(topicId));
      localStorage.setItem('scholar_active_level', '1');
      router.push('/play/world-map');
    }
  };

  return (
    <div className={styles.body}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>GameSpace</h1>
        <div className={styles.headerActions}>
          <button 
            className={`${styles.profileBtn} ${styles.pixelBevel}`}
            onClick={handleProfile}
            title="Profile / Menu"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
          <button 
            className={`${styles.newArenaBtn} ${styles.pixelBevel}`}
            onClick={handleNewGame}
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Create New Arena</span>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.gridHeader}>
          <span className={`material-symbols-outlined ${styles.gridHeaderIcon}`}>grid_view</span>
          <h3 className={styles.gridHeaderTitle}>Topic Cards</h3>
        </div>

        <section className={styles.gridSection}>
          {loading ? (
            <div className={styles.stateContainer}>
              <span className={`material-symbols-outlined ${styles.stateIcon}`}>hourglass_empty</span>
              <p className={styles.stateTitle}>Loading Quests...</p>
            </div>
          ) : topics.length === 0 ? (
            <div className={styles.stateContainer}>
              <span className={`material-symbols-outlined ${styles.stateIcon}`}>inbox</span>
              <p className={styles.stateTitle}>No Quests Generated Yet</p>
              <p className={styles.stateSubtitle}>Create a new arena to start your journey!</p>
            </div>
          ) : (
            topics.map((topic) => (
              <TopicCard 
                key={topic.id} 
                topic={topic} 
                onResume={() => handleResume(topic.id, topic.currentLevel)} 
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}