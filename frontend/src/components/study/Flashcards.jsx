'use client';

import { useState, useEffect } from 'react';
import { flashcardAPI } from '@/utils/client';
import styles from './Flashcards.module.css';

export default function Flashcards() {
  const [flashcards, setFlashcards] = useState([]);
  const [flipped, setFlipped] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);

  // Filter state
  const [filterInput, setFilterInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => { loadFlashcards(); }, []);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const res = await flashcardAPI.getAll();
      setFlashcards(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = activeFilter
        ? await flashcardAPI.bulkGenerate({ subject: activeFilter })
        : await flashcardAPI.bulkGenerate();
      setFlashcards(res.data);
      setFlipped({});
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const applyFilter = () => {
    const trimmed = filterInput.trim();
    setActiveFilter(trimmed);
  };

  const clearFilter = () => {
    setFilterInput('');
    setActiveFilter('');
  };

  const handleFilterKeyDown = (e) => {
    if (e.key === 'Enter') applyFilter();
    if (e.key === 'Escape') clearFilter();
  };

  const visibleCards = activeFilter
    ? flashcards.filter(fc => {
        const q = activeFilter.toLowerCase();
        return (
          fc.front?.toLowerCase().includes(q) ||
          fc.back?.toLowerCase().includes(q) ||
          fc.topic?.toLowerCase().includes(q) ||
          fc.subject?.toLowerCase().includes(q)
        );
      })
    : flashcards;

  const toggleFlip = (id) => setFlipped(prev => ({ ...prev, [id]: !prev[id] }));

  // Study mode
  const studyCard = visibleCards[studyIndex];
  const studyFlipped = flipped['study'];

  if (studyMode && visibleCards.length > 0) {
    return (
      <div className={styles.studyContainer}>
        {/* Progress bar + back */}
        <div className={styles.studyTop}>
          <button
            onClick={() => { setStudyMode(false); setFlipped({}); }}
            className={styles.backBtn}
          >←</button>
          <span className={styles.progressText}>
            {activeFilter && (
              <span className={styles.progressFilter}>{activeFilter}</span>
            )}
            Card <strong className={styles.progressIndex}>{studyIndex + 1}</strong> of {visibleCards.length}
          </span>
          <div className={styles.progressBar}>
            {visibleCards.map((_, i) => (
              <div 
                key={i} 
                className={styles.progressDot}
                style={{
                  background: i === studyIndex ? '#7c6af7' : i < studyIndex ? '#10b981' : '#e8e4fb',
                }}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div
          onClick={() => setFlipped(prev => ({ ...prev, study: !prev.study }))}
          className={`${styles.studyCard} ${studyFlipped ? styles.studyCardFlipped : ''}`}
        >
          {!studyFlipped ? (
            <>
              <div className={styles.studyLabel}>Question</div>
              <div className={styles.studyText}>{studyCard?.front}</div>
              <div className={styles.studyHint}>Tap to reveal answer →</div>
            </>
          ) : (
            <>
              <div className={`${styles.studyLabel} ${styles.studyLabelFlipped}`}>Answer</div>
              <div className={`${styles.studyText} ${styles.studyTextFlipped}`}>{studyCard?.back}</div>
              <div className={`${styles.studyHint} ${styles.studyHintFlipped}`}>Tap to flip back ↩</div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className={styles.studyNav}>
          <button
            onClick={() => { setStudyIndex(i => Math.max(0, i - 1)); setFlipped({}); }}
            disabled={studyIndex === 0}
            className={styles.prevBtn}
          >← Prev</button>
          <button
            onClick={() => { setStudyIndex(i => Math.min(visibleCards.length - 1, i + 1)); setFlipped({}); }}
            disabled={studyIndex === visibleCards.length - 1}
            className={styles.nextBtn}
          >Next →</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Flashcards</h1>
            <p className={styles.subtitle}>
              {flashcards.length > 0
                ? activeFilter
                  ? `${visibleCards.length} of ${flashcards.length} cards match "${activeFilter}"`
                  : `${flashcards.length} cards ready to study`
                : 'AI-generated from your conversations'}
            </p>
          </div>
          <div className={styles.headerActions}>
            {visibleCards.length > 0 && (
              <button
                onClick={() => { setStudyMode(true); setStudyIndex(0); setFlipped({}); }}
                className={styles.studyModeBtn}
              >▶ Study Mode</button>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={styles.generateBtn}
            >
              <span>✦</span>
              {generating
                ? 'Generating…'
                : activeFilter
                  ? `Generate "${activeFilter}" Cards`
                  : flashcards.length ? 'Regenerate' : 'Generate from Memories'}
            </button>
          </div>
        </div>

        {/* Subject Filter Bar */}
        <div className={styles.filterBar}>
          <span className={styles.filterIcon}>🔍</span>
          <input
            className={styles.filterInput}
            type="text"
            placeholder="Filter by subject — e.g. Algorithms, Math, Physics…"
            value={filterInput}
            onChange={e => setFilterInput(e.target.value)}
            onKeyDown={handleFilterKeyDown}
          />
          <button
            onClick={applyFilter}
            disabled={!filterInput.trim()}
            className={styles.applyFilterBtn}
          >Apply Filter</button>
          {activeFilter && (
            <button onClick={clearFilter} className={styles.clearFilterBtn}>✕ Clear</button>
          )}
        </div>

        {/* Active filter badge */}
        {activeFilter && (
          <div className={styles.activeFilterBadge}>
            <span className={styles.filterLabel}>Showing cards for:</span>
            <span className={styles.filterSubject}>{activeFilter}</span>
            {visibleCards.length === 0 && flashcards.length > 0 && (
              <span className={styles.noMatches}>— no matches found. Try generating cards for this subject ↑</span>
            )}
          </div>
        )}

        {loading ? (
          <div className={styles.loadingWrap}>Loading flashcards…</div>
        ) : flashcards.length === 0 ? (
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIcon}>📇</div>
            <div className={styles.emptyTitle}>No flashcards yet</div>
            <div className={styles.emptySub}>
              {activeFilter
                ? `Enter a subject above and click "Generate" to create cards for "${activeFilter}"`
                : 'Chat with ManageAI first, then generate cards from your memory'}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={styles.emptyBtn}
            >{generating ? 'Generating…' : activeFilter ? `✦ Generate "${activeFilter}" Cards` : '✦ Generate Flashcards'}</button>
          </div>
        ) : visibleCards.length === 0 ? (
          <div className={styles.noMatchWrap}>
            <div className={styles.noMatchIcon}>🔎</div>
            <div className={styles.noMatchTitle}>No cards match "{activeFilter}"</div>
            <div className={styles.noMatchSub}>
              Generate new cards specifically for this subject, or clear the filter to see all cards.
            </div>
            <div className={styles.noMatchActions}>
              <button onClick={clearFilter} className={styles.showAllBtn}>Show All Cards</button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={styles.genSpecificBtn}
              >{generating ? 'Generating…' : `✦ Generate "${activeFilter}" Cards`}</button>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {visibleCards.map(fc => {
              const isFlipped = !!flipped[fc.id];
              return (
                <div
                  key={fc.id}
                  className={`${styles.card} ${isFlipped ? styles.cardFlipped : ''}`}
                  onClick={() => toggleFlip(fc.id)}
                >
                  {!isFlipped ? (
                    <>
                      <div className={styles.cardLabel}>Question</div>
                      <div className={styles.cardText}>{fc.front}</div>
                      <div className={styles.cardHint}>Tap to reveal →</div>
                    </>
                  ) : (
                    <>
                      <div className={`${styles.cardLabel} ${styles.cardLabelFlipped}`}>Answer</div>
                      <div className={`${styles.cardText} ${styles.cardTextFlipped}`}>{fc.back}</div>
                      <div className={`${styles.cardHint} ${styles.cardHintFlipped}`}>Tap to flip ↩</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}