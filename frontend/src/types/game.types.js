/**
 * Game-related type definitions (JSDoc) shared across the play mode.
 *
 * @typedef {Object} Question
 * @property {string} id
 * @property {string} prompt
 * @property {string[]} options
 * @property {number} answerIndex
 *
 * @typedef {Object} LevelConfig
 * @property {number} id
 * @property {string} title
 * @property {number} enemyHp
 * @property {number} questions
 * @property {boolean} [boss]
 *
 * @typedef {"idle" | "playing" | "victory" | "gameover"} BattleStatus
 *
 * @typedef {Object} GameSession
 * @property {string} sessionId
 * @property {number} level
 * @property {number} score
 */

export {};
