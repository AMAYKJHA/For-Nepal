/**
 * constants — palette tokens and level configuration shared across
 * React and Phaser.
 */

export const PALETTE = {
  bg: "#0b0f1a",
  panel: "#1a2238",
  primary: "#7c5cff",
  secondary: "#2dd4bf",
  accent: "#ffb347",
  danger: "#ff5470",
  success: "#43d17a",
  hp: "#ff5470",
  shield: "#4ea8ff",
  xp: "#ffd166",
};

export const LEVELS = [
  { id: 1, title: "The Gate", enemyHp: 60, questions: 5 },
  { id: 2, title: "Whispering Library", enemyHp: 90, questions: 7 },
  { id: 3, title: "Hall of Trials", enemyHp: 120, questions: 9 },
  { id: 4, title: "Archmage's Spire", enemyHp: 200, questions: 12, boss: true },
];

export const QUESTION_TIME_LIMIT = 20; // seconds
export const SHIELD_DAMAGE_REDUCTION = 0.5;
