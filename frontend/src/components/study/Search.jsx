'use client';

import { useState, useRef } from 'react';
import { searchAPI } from '@/utils/client';
import styles from './Search.module.css';

const TOPIC_COLORS = {
  Algorithms: '#059669', Programming: '#2563eb',
  Math: '#7c3aed',      Physics: '#dc2626',
  Database: '#d97706',  General: '#6b7280',
};

const TOPIC_BG = {
  Algorithms: '#ecfdf5', Programming: '#eff6ff',
  Math:        '#f5f3ff', Physics:     '#fef2f2',
  Database:    '#fffbeb', General:     '#f9fafb',
};

const SUGGESTIONS = [
  'sorting algorithms', 'recursion', 'binary search',
  'SQL joins', 'React hooks', 'linear regression',
];

export default function Search({ onLoadChat }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  const doSearch = async (q) => {
    const searchQ = q ?? query;
    if (!searchQ.trim()) return;
    if (q) setQuery(q);
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchAPI.search(searchQ);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Search Memory</h1>
          <p className={styles.subtitle}>Semantic similarity search across all your saved knowledge</p>
        </div>

        {/* Search input */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            ref={inputRef}
            className={styles.searchInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="e.g. 'how does quicksort work' or 'SQL window functions'"
          />
          <button
            onClick={() => doSearch()}
            disabled={loading || !query.trim()}
            className={styles.searchBtn}
          >{loading ? '···' : 'Search'}</button>
        </div>

        {/* Suggestion chips */}
        {!searched && (
          <div className={styles.suggestions}>
            <span className={styles.suggestionLabel}>Try:</span>
            {SUGGESTIONS.map(s => (
              <button key={s} className={styles.suggestionChip} onClick={() => doSearch(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.loadingText}>Searching your memory vault…</div>
            <div className={styles.loadingDots}>
              {[0, 1, 2].map(i => <div key={i} className={styles.loadingDot} />)}
            </div>
          </div>
        ) : !searched ? (
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIcon}>🔍</div>
            <div className={styles.emptyTitle}>Search your knowledge base</div>
            <div className={styles.emptySub}>Uses vector similarity to find semantically related answers</div>
          </div>
        ) : results.length === 0 ? (
          <div className={styles.emptyWrap}>
            <div className={styles.noResultsIcon}>¿</div>
            <div className={styles.emptyTitle}>No results found</div>
            <div className={styles.emptySub}>Try different keywords or chat more to build your memory</div>
          </div>
        ) : (
          <div className={styles.resultsWrap}>
            <div className={styles.resultsMeta}>
              {results.length} result{results.length !== 1 ? 's' : ''} for <em>"{query}"</em>
            </div>
            {results.map(m => (
              <div key={m.id} className={styles.resultCard}>
                <div className={styles.resultTop}>
                  <span 
                    className={styles.topicBadge}
                    style={{
                      background: TOPIC_BG[m.topic] || '#f9fafb',
                      color: TOPIC_COLORS[m.topic] || '#6b7280',
                      border: `1px solid ${TOPIC_COLORS[m.topic] || '#6b7280'}25`,
                    }}
                  >{m.topic}</span>
                  <span className={styles.resultDate}>
                    {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className={styles.resultQuestion}>{m.question}</div>

                <div className={styles.resultAnswer}>{m.answer}</div>

                <button className={styles.openChatBtn} onClick={() => onLoadChat(m)}>💬 Open in Chat</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}