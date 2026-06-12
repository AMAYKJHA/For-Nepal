"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from "./page.module.css";

const LEVELS_DATA = [
  {
    id: 1,
    title: "Level 1 Easy : The Novice",
    topic: "Concurrency Basics",
    zone: "Learning Sector",
    description: "Learn the basics of pdf you uploaded.",
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
    title: "Level 2 Medium: The Challenger",
    zone: "Survival Sector",
    description: "Dive deeper into pdf you uploaded.",
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
    title: "Level 3 Hard : The Elite",
    topic: " Memory Management and I/O Systems",
    zone: "Survival Sector",
    description: "Explore more about the pdf.",
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
    title: "Level 4: The Final Boss Fight ",
    topic: "Deadlock & Detection",
    zone: "Damage Sector",
    description: "The ultimate challenge.",
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
  1: {
    title: "The Novice",
    lvlText: "Level 1 Easy",
    hp: 100,
    xp: "50"
  },
  2: {
    title: "The Challenger",
    lvlText: "Level 2 Medium",
    hp: 100,
    xp: "100"
  },
  3: {
    title: "The Elite",
    lvlText: "LEVEL 3 Hard",
    hp: 100,
    xp: "200"
  },
  4: {
    title: "The Grandmaster",
    lvlText: "Level 4 Final Boss Fight",
    hp: 100,
    xp: "500"
  }
};

export default function WorldMapPage() {
  const [selectedLevelId, setSelectedLevelId] = useState(4); // Default to Level 4 as selected in design

  const activeLevel = LEVELS_DATA.find(l => l.id === selectedLevelId) || LEVELS_DATA[0];
  const activePlayerStats = PLAYER_STATS_BY_LEVEL[selectedLevelId] || PLAYER_STATS_BY_LEVEL[4];

  return (
    <div className={styles.pageContainer}>
      {/* TopAppBar */}
      <header className={styles.header}>
        {/* Ornaments */}
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTl}`}></div>
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTr}`}></div>
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBl}`}></div>
        <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBr}`}></div>

        <div className={styles.logoContainer}>
          <img
            src="/logo.png"
            alt="Scholar Logo"
            className={styles.logoImg}
          />
          <h1 className={styles.headerTitle}>Scholar</h1>
        </div>

        <div className={styles.headerMiddle}>
          <span className={styles.chapterTag}>
            Operating Systems — Chapter 4
          </span>
        </div>

        <div className={styles.profileSection}>
          <div className={styles.username}>
            <div className={styles.playerNameText}>BishalShr</div>
          </div>
          <button className={styles.profileBtn} type="button">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Left Area: Map Canvas */}
        <section className={styles.mapCanvas}>
          <div className={styles.mapBg}></div>
          {/* Grid overlay for visual flair */}
          <div className={styles.gridOverlay}></div>

          {/* Zone Labels */}
          <div className={`${styles.zoneLabel} ${styles.zoneLabelEasy}`} style={{ top: '10px', left: '10px' }}>
            Learning Sector
          </div>
          <div className={`${styles.zoneLabel} ${styles.zoneLabelMedium}`} style={{ top: '25%', right: '80px' }}>
            Survival Sector
          </div>
          <div className={`${styles.zoneLabel} ${styles.zoneLabelHard}`} style={{ bottom: '20px', left: '33%' }}>
            Damage Sector
          </div>

          {/* Dynamic SVG paths connecting the nodes */}
          <svg className={styles.mapPathsSvg}>
            {/* Connection 1 to 2 */}
            <line x1="20%" y1="30%" x2="45%" y2="36%" className={styles.svgPathLine} />
            {/* Connection 2 to 3 */}
            <line x1="45%" y1="36%" x2="65%" y2="33%" className={styles.svgPathLine} />
            {/* Connection 3 to 4 */}
            <line x1="65%" y1="33%" x2="73%" y2="50%" className={styles.svgPathLine} />
          </svg>

          {/* Background Terrains */}
          <div className={`${styles.terrainDecorator} ${styles.terrainForest}`} style={{ top: '15%', left: '10%' }}>
            <span className="material-symbols-outlined">nature_people</span>
            <span>Forest Area</span>
          </div>
          <div className={`${styles.terrainDecorator} ${styles.terrainForest}`} style={{ top: '45%', left: '22%' }}>
            <span className="material-symbols-outlined">park</span>
            <span>Woodlands</span>
          </div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCave}`} style={{ top: '15%', left: '55%' }}>
            <span className="material-symbols-outlined">explore</span>
            <span>Caves</span>
          </div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCave}`} style={{ top: '45%', left: '58%' }}>
            <span className="material-symbols-outlined">diamond</span>
            <span>Crystals</span>
          </div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCitadel}`} style={{ top: '68%', left: '68%' }}>
            <span className="material-symbols-outlined">castle</span>
            <span>Outpost</span>
          </div>
          <div className={`${styles.terrainDecorator} ${styles.terrainCitadel}`} style={{ top: '45%', left: '85%' }}>
            <span className="material-symbols-outlined">fort</span>
            <span>Citadel Gate</span>
          </div>

          {/* Nodes */}
          {LEVELS_DATA.map((lvl) => {
            const isActive = lvl.id === selectedLevelId;
            const nodeClass =
              lvl.type === 'easy' ? styles.nodeEasy :
                lvl.type === 'medium' ? styles.nodeMedium :
                  lvl.type === 'hard' ? styles.nodeHard :
                    styles.nodeFinalBoss;

            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevelId(lvl.id)}
                className={`${styles.mapNode} ${nodeClass} ${isActive ? styles.mapNodeActive : ''}`}
                style={{ top: lvl.y, left: lvl.x }}
                title={lvl.title}
                type="button"
              >
                {lvl.icon === 'skull' ? (
                  <span className="material-symbols-outlined text-black" style={{ fontSize: '32px' }}>
                    skull
                  </span>
                ) : (
                  <span className={styles.nodeText}>{lvl.icon}</span>
                )}
              </button>
            );
          })}
        </section>

        {/* Right Area: Sidebar Info Panel */}
        <aside className={styles.sidebar}>
          {/* Player Stats Mini-card */}
          <div className={`${styles.playerStatsCard} ${styles.pixelPanel}`}>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTl}`}></div>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTr}`}></div>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBl}`}></div>
            <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBr}`}></div>

            <div className={styles.playerInfoRow}>
              <div className={styles.avatarBox}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>
                  auto_awesome
                </span>
              </div>
              <div className={styles.playerTextGroup}>
                <div className={styles.playerNameText}>{activePlayerStats.title}</div>
                <div className={styles.playerLevelText}>{activePlayerStats.lvlText}</div>
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
                {/* XP Bar is omitted per request, displaying numbers only */}
              </div>
            </div>
          </div>

          {/* Selected Level Details */}
          <div className={styles.detailsSection}>
            <div className={`${styles.detailsPanel} ${styles.pixelPanel}`}>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTl}`}></div>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentTr}`}></div>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBl}`}></div>
              <div className={`${styles.pixelOrnament} ${styles.pixelOrnamentBr}`}></div>

              <div className={styles.detailsZone}>{activeLevel.zone}</div>
              <h2 className={styles.detailsTitle}>{activeLevel.title}</h2>
              <p className={styles.detailsDescription}>{activeLevel.description}</p>

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
                <span className="material-symbols-outlined text-sm">lock_open</span>
                <span className={styles.prerequisiteText}>Prerequisite: {activeLevel.prerequisite}</span>
              </div>
            </div>

            {/* CTA Button */}
            <Link href="/play/battle" className={styles.ctaButton}>
              Enter Battle
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
