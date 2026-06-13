'use client';

import styles from './TopicCard.module.css';

export default function TopicCard({ topic, onResume }) {
  const isReady = topic.status === 'ready';
  const statusText = isReady ? 'Reached Level 2' : 'Start Level 1';

  const handleClick = () => {
    if (isReady && onResume) {
      onResume(topic.id);
    }
  };

  return (
    <article 
      className={styles.topicCard}
      onClick={handleClick}
      style={{ 
        cursor: isReady ? 'pointer' : 'not-allowed', 
        opacity: isReady ? 1 : 0.7 
      }}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardTopPattern}></div>
        <span className={styles.cardTopTitle}>{topic.title}</span>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.cardStatus}>{statusText}</span>
        <span className={`material-symbols-outlined ${styles.cardPlayIcon}`}>play_arrow</span>
      </div>
    </article>
  );
}