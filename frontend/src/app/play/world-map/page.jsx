"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getUser } from '@/lib/auth';
import { getUserTopics } from '@/lib/api';
import styles from "./page.module.css";

const STORAGE_KEY_LEVEL = 'scholar_current_level';
const STORAGE_KEY_CHARACTER = 'scholar_selected_character';

const CHARACTERS = [
  { id: 1, name: 'Kevin',    img: '/assets/hero/char1.png' },
  { id: 2, name: 'Ija',      img: '/assets/hero/char2.png' },
  { id: 3, name: 'Bernando', img: '/assets/hero/char3.png' },
  { id: 4, name: 'Shaswat',  img: '/assets/hero/char4.png' },
];

const LEVEL_CONFIGS = [
  {
    id: 1,
    title: "Level 1: The Novice",
    zone: "Learning Sector",
    difficulty: "Easy",
    rewards: "50 XP",
    prerequisite: "None",
    x: "20%",
    y: "30%",
    type: "easy",
    icon: "1"
  },
  {
    id: 2,
    title: "Level 2: The Challenger",
    zone: "Survival Sector",
    difficulty: "Medium",
    rewards: "100 XP",
    prerequisite: "Level 1 Cleared",
    x: "45%",
    y: "36%",
    type: "medium",
    icon: "2"
  },
  {
    id: 3,
    title: "Level 3: The Elite",
    zone: "Survival Sector",
    difficulty: "Hard",
    rewards: "200 XP",
    prerequisite: "Level 2 Cleared",
    x: "65%",
    y: "33%",
    type: "hard",
    icon: "3"
  },
  {
    id: 4,
    title: "Level 4: Final Boss",
    zone: "Damage Sector",
    difficulty: "Final Boss",
    rewards: "500 XP",
    prerequisite: "Level 3 Cleared",
    x: "73%",
    y: "50%",
    type: "Final Boss",
    icon: "skull"
  }
];

const PLAYER_STATS_BY_LEVEL = {
  1: { title: "The Novice",      lvlText: "Level 1 Easy",           hp: 100, xp: "50"  },
  2: { title: "The Challenger",  lvlText: "Level 2 Medium",         hp: 100, xp: "100" },
  3: { title: "The Elite",       lvlText: "Level 3 Hard",           hp: 100, xp: "200" },
  4: { title: "The Grandmaster", lvlText: "Level 4 Final Boss Fight", hp: 100, xp: "500" },
};

// Helper function to get initial username (avoids setState in useEffect)
const getInitialUsername = () => {
  if (typeof window === 'undefined') return 'Scholar';
  const user = getUser();
  return user?.username || 'Scholar';
};

// Helper function to get initial character
const getInitialCharacter = () => {
  if (typeof window === 'undefined') return CHARACTERS[0];
  const savedCharId = parseInt(localStorage.getItem(STORAGE_KEY_CHARACTER) || '1', 10);
  return CHARACTERS.find(c => c.id === savedCharId) || CHARACTERS[0];
};

// Helper function to get initial level
const getInitialLevel = () => {
  if (typeof window === 'undefined') return 1;
  const savedLevel = parseInt(localStorage.getItem(STORAGE_KEY_LEVEL) || '1', 10);
  return Math.min(Math.max(savedLevel, 1), 4);
};

export default function WorldMapPage() {
  // Initialize state with lazy initializers (fixes setState-in-effect warning)
  const [username] = useState(getInitialUsername);
  const [selectedChar, setSelectedChar] = useState(getInitialCharacter);
  const initialLevel = getInitialLevel();
  const [unlockedUpTo, setUnlockedUpTo] = useState(initialLevel);
  const [selectedLevelId, setSelectedLevelId] = useState(initialLevel);
  const [charPickerOpen, setCharPickerOpen] = useState(false);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const pickerRef = useRef(null);

  // Define loadTopics BEFORE the useEffect that calls it (fixes immutability warning)
  const loadTopics = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getUserTopics();
      if (result.success && result.data.length > 0) {
        setTopics(result.data);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch topics on mount
  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Close character picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setCharPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCharSelect = (char) => {
    setSelectedChar(char);
    localStorage.setItem(STORAGE_KEY_CHARACTER, String(char.id));
    setCharPickerOpen(false);
  };

  // Map topics to levels
  const getLevelData = (levelId) => {
    const config = LEVEL_CONFIGS.find(l => l.id === levelId) || LEVEL_CONFIGS[0];
    const topic = topics[levelId - 1]; // topics array is 0-indexed
    
    return {
      ...config,
      description: topic ? topic.title : config.description,
      topicId: topic ? topic.id : null,
      topicStatus: topic ? topic.status : null,
    };
  };

  const activeLevel = getLevelData(selectedLevelId);
  const activePlayerStats = PLAYER_STATS_BY_LEVEL[selectedLevelId] || PLAYER_STATS_BY_LEVEL[1];
  const isPlayable = (lvlId) => lvlId <= unlockedUpTo;

  const handleEnterBattle = () => {
    if (activeLevel.topicId) {
      localStorage.setItem('scholar_active_level', String(activeLevel.id));
      localStorage.setItem('scholar_active_topic_id', activeLevel.topicId);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTl}`}></div>
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTr}`}></div>
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBl}`}></div>
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBr}`}></div>

        <div className={styles.logoContainer}>
          <Image src="/logo.png" alt="Scholar Logo" width={40} height={40} className={styles.logoImg} />
          <h1 className={styles.headerTitle}>Scholar</h1>
        </div>

        <div className={styles.headerMiddle}>
          <span className={styles.chapterTag}>
            {topics.length > 0 ? `${topics.length} Quest${topics.length > 1 ? 's' : ''} Available` : 'No Quests Yet'}
          </span>
        </div>

        <div className={styles.profileSection}>
          <div className={styles.username}>
            <div className={styles.playerNameText}>{username}</div>
          </div>
          <button className={styles.profileBtn} type="button">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.mapCanvas}>
          <div className={styles.mapBg}></div>
          <div className={styles.gridOverlay}></div>

          <div className={`${styles.zoneLabel} ${styles.zoneLabelEasy}`} style={{ top: '10px', left: '10px' }}>Learning Sector</div>
          <div className={`${styles.zoneLabel} ${styles.zoneLabelMedium}`} style={{ top: '25%', right: '80px' }}>Survival Sector</div>
          <div className={`${styles.zoneLabel} ${styles.zoneLabelHard}`} style={{ bottom: '20px', left: '33%' }}>Damage Sector</div>

          <svg className={styles.mapPathsSvg}>
            <line x1="20%" y1="30%" x2="45%" y2="36%" className={styles.svgPathLine} />
            <line x1="45%" y1="36%" x2="65%" y2="33%" className={`${styles.svgPathLine} ${unlockedUpTo >= 3 ? '' : styles.svgPathLocked}`} />
            <line x1="65%" y1="33%" x2="73%" y2="50%" className={`${styles.svgPathLine} ${unlockedUpTo >= 4 ? '' : styles.svgPathLocked}`} />
          </svg>

          <div className={`${styles.terrainDecorator} ${styles.terrainForest}`} style={{ top: '15%', left: '10%' }}><span className="material-symbols-outlined">nature_people</span><span>Forest Area</span></div>
          <div className={`${styles.terrainDecorator} ${styles.terrainForest}`} style={{ top: '45%', left: '22%' }}><span className="material-symbols-outlined">park</span><span>Woodlands</span></div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCave}`} style={{ top: '15%', left: '55%' }}><span className="material-symbols-outlined">explore</span><span>Caves</span></div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCave}`} style={{ top: '45%', left: '58%' }}><span className="material-symbols-outlined">diamond</span><span>Crystals</span></div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCitadel}`} style={{ top: '68%', left: '68%' }}><span className="material-symbols-outlined">castle</span><span>Outpost</span></div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCitadel}`} style={{ top: '45%', left: '85%' }}><span className="material-symbols-outlined">fort</span><span>Citadel Gate</span></div>

          {LEVEL_CONFIGS.map((lvl) => {
            const isActive = lvl.id === selectedLevelId;
            const unlocked = isPlayable(lvl.id);
            const topic = topics[lvl.id - 1];
            const nodeClass =
              lvl.type === 'easy' ? styles.nodeEasy :
              lvl.type === 'medium' ? styles.nodeMedium :
              lvl.type === 'hard' ? styles.nodeHard :
              styles.nodeFinalBoss;

            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevelId(lvl.id)}
                className={`${styles.mapNode} ${nodeClass} ${isActive ? styles.mapNodeActive : ''} ${!unlocked ? styles.mapNodeLocked : ''}`}
                style={{ top: lvl.y, left: lvl.x }}
                title={unlocked ? (topic ? topic.title : lvl.title) : `🔒 ${lvl.title} — Complete previous level first`}
                type="button"
              >
                {!unlocked ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#000' }}>lock</span>
                ) : lvl.icon === 'skull' ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#000' }}>skull</span>
                ) : (
                  <span className={styles.nodeText}>{lvl.icon}</span>
                )}
              </button>
            );
          })}

          <div className={styles.charPickerWrapper} ref={pickerRef}>
            <button
              className={styles.charPickerBtn}
              type="button"
              onClick={() => setCharPickerOpen(v => !v)}
            >
              <Image src={selectedChar.img} alt={selectedChar.name} width={32} height={32} className={styles.charPickerAvatar} />
              <span className={styles.charPickerLabel}>Choose Character</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {charPickerOpen ? 'expand_more' : 'expand_less'}
              </span>
            </button>

            {charPickerOpen && (
              <div className={styles.charDropdown}>
                {CHARACTERS.map(char => (
                  <button
                    key={char.id}
                    type="button"
                    className={`${styles.charOption} ${selectedChar.id === char.id ? styles.charOptionActive : ''}`}
                    onClick={() => handleCharSelect(char)}
                  >
                    <Image src={char.img} alt={char.name} width={40} height={40} className={styles.charOptionImg} />
                    <span className={styles.charOptionName}>{char.name}</span>
                    {selectedChar.id === char.id && (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#7F77DD', marginLeft: 'auto' }}>check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className={styles.sidebar}>
          <div className={`${styles.playerStatsCard} ${styles.pixelPanel}`}>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTl}`}></div>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTr}`}></div>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBl}`}></div>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBr}`}></div>

            <div className={styles.playerInfoRow}>
              <div className={styles.avatarBox}>
                <Image 
                  src={selectedChar.img} 
                  alt={selectedChar.name} 
                  width={48} 
                  height={48} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} 
                />
              </div>
              <div className={styles.playerTextGroup}>
                <div className={styles.playerNameText}>{activePlayerStats.title}</div>
                <div className={styles.playerLevelText}>{activePlayerStats.lvlText}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#7F77DD', marginTop: '2px' }}>
                  {selectedChar.name}
                </div>
              </div>
            </div>

            <div className={styles.statsList}>
              <div>
                <div className={styles.statLabelRow}>
                  <span className={styles.statLabel}>HP</span>
                  <span className={styles.statValue} style={{ color: '#1D9E75' }}>{activePlayerStats.hp}/100</span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div className={styles.hpFill} style={{ width: `${activePlayerStats.hp}%` }}></div>
                </div>
              </div>
              <div>
                <div className={styles.statLabelRow}>
                  <span className={styles.statLabel}>XP</span>
                  <span className={styles.statValue} style={{ color: '#BA7517' }}>{activePlayerStats.xp}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.detailsSection}>
            <div className={`${styles.detailsPanel} ${styles.pixelPanel}`}>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTl}`}></div>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTr}`}></div>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBl}`}></div>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBr}`}></div>

              <div className={styles.detailsZone}>{activeLevel.zone}</div>
              <h2 className={styles.detailsTitle}>{activeLevel.title}</h2>
              <p className={styles.detailsDescription}>
                {activeLevel.topicId ? activeLevel.description : 'Upload a PDF to unlock this quest!'}
              </p>

              {activeLevel.topicStatus && (
                <div style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '12px', 
                  color: activeLevel.topicStatus === 'ready' ? '#1D9E75' : '#BA7517',
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px'
                }}>
                  Status: {activeLevel.topicStatus.toUpperCase()}
                </div>
              )}

              <div className={styles.gridBadges}>
                <div className={styles.badgeCard}>
                  <div className={styles.badgeLabel}>Difficulty</div>
                  <div
                    className={styles.badgeValue}
                    style={{
                      color: activeLevel.difficulty === 'Easy' ? '#639922' :
                             activeLevel.difficulty === 'Medium' ? '#BA7517' :
                             activeLevel.difficulty === 'Hard' ? '#993C1D' : '#E53935'
                    }}
                  >
                    {activeLevel.difficulty}
                  </div>
                </div>
                <div className={styles.badgeCard}>
                  <div className={styles.badgeLabel}>Rewards</div>
                  <div className={styles.badgeValue} style={{ color: 'var(--tertiary)' }}>
                    {activeLevel.rewards}
                  </div>
                </div>
              </div>

              <div className={styles.prerequisiteRow}>
                <span className="material-symbols-outlined text-sm">
                  {isPlayable(activeLevel.id) ? 'lock_open' : 'lock'}
                </span>
                <span className={styles.prerequisiteText}>Prerequisite: {activeLevel.prerequisite}</span>
              </div>

              {!isPlayable(activeLevel.id) && (
                <div className={styles.lockedHint}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                  Complete Level {activeLevel.id - 1} to unlock this stage.
                </div>
              )}
            </div>

            {isPlayable(activeLevel.id) ? (
              activeLevel.topicId ? (
                <Link 
                  href="/play/game/" 
                  className={styles.ctaButton}
                  onClick={handleEnterBattle}
                >
                  Enter Battle
                </Link>
              ) : (
                <Link href="/play/upload" className={styles.ctaButton}>
                  Upload PDF
                </Link>
              )
            ) : (
              <button type="button" className={styles.ctaButtonLocked} disabled>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '6px' }}>lock</span>
                Locked
              </button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}