'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const HomePage = () => {
  const [mode, setMode] = useState('play');

  return (
    <div className={styles.root}>
      {/* Background Image Layer */}
      <div className={styles.bgLayer}>
        <img
          alt="Dungeon Background"
          className={styles.bgImage}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBr3x6nZoPuFkdcB26LaIunrFS1ZtA9jjDAI9tiuVJ0tSs8y8T0ZqBnAmbidlF52YgyLxiUEM9xeJ3QDRJeCtW9dhyHkxLbczsPo-D4dtIQplWbhZQz5FmlUxmd94RK9v-1AGBR8nXG4ew84mxp5SC_ztgSOiIAKovGLudV89LlzAmu6KSZtOuYOwUJwm2s5jIJhaXPmYXlaHBS_ojA5qGJ1fKLmhr7tWTA8wepQpehVlLs4VkqKO2FenBNArCqCKk8h-9-8Zx0xow"
        />
        <div className={styles.bgOverlay} />
      </div>

      {/* Floating Runes */}
      <div className={styles.runesLayer}>
       <span className={`${styles.rune} ${styles.rune1} ${styles.runeTertiary} material-symbols-outlined`}>change_history</span>
        <span className={`${styles.rune} ${styles.rune2} ${styles.runeTertiary} material-symbols-outlined`}>diamond</span>
        <span className={`${styles.rune} ${styles.rune3} material-symbols-outlined`}>all_inclusive</span>
        <span className={`${styles.rune} ${styles.rune4} ${styles.runeTertiary} material-symbols-outlined`}>bolt</span>
        <span className={`${styles.rune} ${styles.rune5} material-symbols-outlined`}>star</span>
      </div>

      {/* Header / Tab Bar */}
      <header className={styles.header}>
        <div className={styles.tabBar}>
          <button
            onClick={() => setMode('chat')}
            className={`${styles.tab} ${mode === 'chat' ? styles.tabActive : ''}`}
          >
            CHAT MODE
          </button>
          <button
            onClick={() => setMode('play')}
            className={`${styles.tab} ${mode === 'play' ? styles.tabActive : ''}`}
          >
            PLAY MODE
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Branding */}
        <div className={styles.branding}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuArowpYzqGC_7Dsze-kWz_m4ZTTlxHfwUVgfocmYcMxlYS-GVdqS1rVRSkWo6QbKtcN2bMNrU47LBUFrYy3YTK1qeeyL_6thaaY7epYGwrC0rOi33EgiQybWUl1fKn3kuEXCqRjxT-W5L8lBCOgs-reihjKWFa5DB7mnZ0E0X9lxr0851NnlY7w52KKjK8kZhTA8bytgZPEqRVZjFRVt2KXCwwO2XdaTybep_RlZv-M0yy2sWIvTbuRl-nBh3nOM2m1MaOaE6dxpLI"
            alt="Scholar Logo"
            className={styles.logo}
          />
          <h1 className={styles.title}>SCHOLAR</h1>
          <p className={styles.subtitle}>Conquer Knowledge. Defeat the Dungeon.</p>
        </div>

        {/* Mode Content */}
        <div className={styles.modeContent}>
          {mode === 'play' ? (
            <div key="play" className={styles.fadeIn}>
              <div className={styles.menuPanel}>
                {/* Corner Ornaments */}
                <span className={`${styles.ornament} ${styles.ornamentTL}`} />
                <span className={`${styles.ornament} ${styles.ornamentTR}`} />
                <span className={`${styles.ornament} ${styles.ornamentBL}`} />
                <span className={`${styles.ornament} ${styles.ornamentBR}`} />

                <nav className={styles.menuNav}>
                  <Link href="/play/upload/" className={`${styles.menuBtn} ${styles.menuBtnPrimary}`}>
                    Start New Game
                  </Link>
                  <button className={styles.menuBtn}>Continue</button>
                  <button className={styles.menuBtn}>User Profile</button>
                  <button className={styles.menuBtn}>Leaderboard</button>
                  <button className={`${styles.menuBtn} ${styles.menuBtnIcon}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                    Settings
                  </button>
                  <div className={styles.username}>User: BishalShr</div>
                </nav>
              </div>
            </div>
          ) : (
            <div key="chat" className={`${styles.fadeIn} ${styles.chatPlaceholder}`}>
              <div className={styles.chatBox}>
                <p className={styles.chatText}>
                  CHAT MODE — Connect your knowledge vault.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Version Tag */}
      <div className={styles.version}>v1.0.4</div>

      {/* Mage Sprite */}
      <div className={styles.mageSprite}>
        <img
          alt="Mage Idle Sprite"
          className={styles.mageImg}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfnMSSU2NjxkG3H2SI3kCGbJMnPG2eraXA1aCo07AvbOMU7SEXi-yRTwAqIGoJJhsOd0zINYSJjGb-jcmB6y6SWY24spcRq--kC6iVA-_l0W13J7rS_gFbridhV93T54ot3P1dwGnXQD6NBb6aRg0O6Jv7YlabEmLUqTfFWQCdOcrel0AO0rT6gp_FPFeW_Tw_5JD-upr1BG0QzX5t6A8AUzQOamhGUDq99VNsoCs_yFXqrz6QipFXnMktmfKBPZl2BF-nrUYh0vY"
        />
      </div>
    </div>
  );
};

export default HomePage;