/* ─────────────────────────────────────────────────────────────────────────
   RESULT MODAL — Victory / Defeat dialogue, Arcane Scholar pixel style
   Drop into page.jsx, render based on `gameOver` state + result payload.
   ───────────────────────────────────────────────────────────────────────── */
'use client';

import Link from 'next/link';
import styles from './ResultModal.module.css';

/**
 * props.result shape (emitted from Phaser as 'GAME_OVER'):
 * {
 *   won: boolean,
 *   level: number,
 *   damageDealt: number,      // 0-100, total damage dealt to enemy
 *   heroHP: number,           // 0-100, remaining hero HP
 *   correctAnswers: number,
 *   totalQuestions: number,
 *   levelXP: number,          // total XP allocated for this level
 *   nextLevel: number,
 * }
 */
export default function ResultModal({ result, onContinue, onWorldMap, onMainMenu }) {
  if (!result) return null;

  const {
    won,
    level,
    damageDealt,
    heroHP,
    correctAnswers,
    totalQuestions,
    levelXP,
    nextLevel,
  } = result;

  // ── Star rating logic ───────────────────────────────────────────────
  let stars;
  if (damageDealt === 0) {
    stars = 3;
  } else if (damageDealt >= 50) {
    stars = 1;
  } else {
    stars = 2;
  }

  // ── XP earned ────────────────────────────────────────────────────────
  const xpEarned = won
    ? Math.round((correctAnswers / totalQuestions) * levelXP)
    : Math.round((correctAnswers / totalQuestions) * levelXP);

  // ── Damage text ──────────────────────────────────────────────────────
  const damageText = won
    ? (damageDealt > 0
        ? `You dealt ${damageDealt} damage in Level ${level}`
        : `You won with no damage`)
    : `You failed in Level ${level}`;

  const heroTitle = won ? `Next Level Unlocked: Level ${nextLevel}` : 'Defeated';
  const titleColor = won ? 'rgb(29, 158, 117)' : '#e74c3c';

  return (
    <div className={styles.resultOverlay}>
      <main className={styles.resultPanel}>
        {/* Corner ornaments */}
        <div className={styles.cornerTL}></div>
        <div className={styles.cornerTR}></div>
        <div className={styles.cornerBL}></div>
        <div className={styles.cornerBR}></div>

        <div className={styles.resultInner}>
          {/* ── Banner / Heading ── */}
          <div className={styles.resultBannerWrap}>
            <div className={styles.resultBannerLine}></div>
            <h1
              className={styles.resultTitle}
              style={{ color: titleColor }}
            >
              {heroTitle}
            </h1>
          </div>

          {/* ── Subtext ── */}
          <p className={styles.resultSubtext}>{damageText}</p>

          {/* ── Sprites ── */}
          <div className={styles.resultSpritesRow}>
            <div
              className={`${styles.resultSprite} ${styles.resultSpriteHero} ${
                won ? styles.floatAnim : ''
              }`}
            >
              <span className="material-symbols-outlined icon-fill text-4xl">
                {won ? 'swords' : 'sentiment_dissatisfied'}
              </span>
            </div>
            <div
              className={`${styles.resultSprite} ${styles.resultSpriteEnemy} ${
                won ? styles.resultEnemyDefeated : ''
              }`}
            >
              <span className="material-symbols-outlined text-4xl">
                {won ? 'skull' : 'auto_awesome'}
              </span>
            </div>
          </div>

          {/* ── Rewards / Status panel ── */}
          <div className={styles.resultRewardsPanel}>
            <h2 className={styles.resultRewardsHeading}>
              {won ? 'REWARDS' : 'RESULTS'}
            </h2>

            {/* XP row */}
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>XP</span>
              <span className={styles.resultXPValue}> 100 earned</span>
            </div>

            {/* HP progress bar (only shown if won and damage was dealt) */}
            {won && (
              <>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Enemy HP Remaining</span>
                  <span className={styles.resultHPValue}>
                    {100 - damageDealt}%
                  </span>
                </div>
                <div className={styles.resultHPBar}>
                  <div
                    className={styles.resultHPFill}
                    style={{ width: `${100 - damageDealt}%` }}
                  />
                  <div className={styles.resultHPSegments}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={styles.resultHPSegment} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Defeat: show hero HP remaining instead */}
            {!won && (
              <>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Hero HP Remaining</span>
                  <span className={styles.resultHPValueDefeat}>{heroHP}%</span>
                </div>
                <div className={styles.resultHPBar}>
                  <div
                    className={styles.resultHPFillDefeat}
                    style={{ width: `${heroHP}%` }}
                  />
                  <div className={styles.resultHPSegments}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={styles.resultHPSegment} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Unlock banner — only on win */}
            {won && (
              <div className={styles.resultUnlockBanner}>
                <span>Next Level {nextLevel} Unlocked!</span>
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className={styles.resultActions}>
            {won && (
              <Link href="/play/world-map/" className={styles.resultBtnPrimary} onClick={onContinue}>
                Continue
              </Link>
            )}
            <Link href="/play/world-map/" className={styles.resultBtnSecondary} onClick={onWorldMap}>
              World Map
            </Link>
            <Link href="/" className={styles.resultBtnSecondary} onClick={onMainMenu}>
              Main Menu
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}