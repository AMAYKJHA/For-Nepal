'use client';

import { useEffect, useState } from 'react';
import { reviewAPI } from '@/utils/client';
import styles from './Reviews.module.css';

const DIFFICULTIES = [
  { key: 'again', label: 'Again', color: '#dc2626', bg: '#fef2f2' },
  { key: 'hard', label: 'Hard', color: '#b45309', bg: '#fffbeb' },
  { key: 'good', label: 'Good', color: '#0f766e', bg: '#f0fdfa' },
  { key: 'easy', label: 'Easy', color: '#166534', bg: '#f0fdf4' },
];

export default function Reviews() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const { data } = await reviewAPI.today();
      setQueue(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const submitDifficulty = async (card, difficulty) => {
    setSubmitting(true);
    try {
      await reviewAPI.submit(card.id, difficulty);
      setQueue(prev => prev.filter(c => c.id !== card.id));
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const current = queue[0];

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Today's Reviews</h1>
        <p className={styles.subtitle}>
          {queue.length} card{queue.length !== 1 ? 's' : ''} due for spaced repetition
        </p>

        {loading ? (
          <div className={styles.loading}>Loading review queue...</div>
        ) : !current ? (
          <div className={styles.emptyCard}>
            No cards due today. Great retention momentum.
          </div>
        ) : (
          <div className={styles.reviewCard}>
            <div className={styles.label}>Prompt</div>
            <div className={styles.prompt}>{current.front}</div>

            <div className={styles.label}>Answer</div>
            <div className={styles.answer}>{current.back}</div>

            <div className={styles.btnGrid}>
              {DIFFICULTIES.map(d => (
                <button
                  key={d.key}
                  onClick={() => submitDifficulty(current, d.key)}
                  disabled={submitting}
                  className={styles.diffBtn}
                  style={{
                    borderColor: `${d.color}55`,
                    background: d.bg,
                    color: d.color,
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}