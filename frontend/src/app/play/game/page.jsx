'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import ResultModal from '@/components/play/ResultModal.jsx';
import { getRandomDialogue } from '@/data/dialogues';
import { getTopicSession, updateSessionState } from '@/lib/api';

const XP_PER_QUESTION = { 1: 15, 2: 25, 3: 40, 4: 60 };
const LEVEL_XP = { 1: 100, 2: 200, 3: 350, 4: 500 };
const LEVEL_NAMES = { 1: 'easy', 2: 'medium', 3: 'hard', 4: 'boss' };

const FALLBACK_QUESTIONS = {
  1: [
    { q: 'What is an operating system?', opts: ['Hardware', 'Software that manages hardware', 'A programming language', 'A type of memory'], ans: 1 },
    { q: 'Which is NOT an OS?', opts: ['Windows', 'Linux', 'Python', 'macOS'], ans: 2 },
    { q: 'What does CPU stand for?', opts: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility'], ans: 1 },
    { q: 'What is a process?', opts: ['A file', 'A program in execution', 'A folder', 'A variable'], ans: 1 },
  ],
  2: [
    { q: 'What is concurrency?', opts: ['Running one task', 'Multiple tasks making progress', 'Deleting processes', 'Memory allocation'], ans: 1 },
    { q: 'What is a thread?', opts: ['A large process', 'Lightweight process', 'A file handle', 'A CPU core'], ans: 1 },
    { q: 'Which scheduling is preemptive?', opts: ['FCFS', 'Round Robin', 'SJF Non-preemptive', 'None'], ans: 1 },
    { q: 'What is context switching?', opts: ['Changing users', 'Saving/restoring state', 'Deleting files', 'Booting OS'], ans: 1 },
  ],
  3: [
    { q: 'What is a race condition?', opts: ['Fast execution', 'Output depends on timing', 'Memory leak', 'CPU overload'], ans: 1 },
    { q: 'What does a semaphore do?', opts: ['Kills processes', 'Controls shared resources', 'Allocates memory', 'Schedules CPU'], ans: 1 },
    { q: 'What is virtual memory?', opts: ['Fake RAM', 'Uses disk as extended RAM', 'Cloud storage', 'Cache memory'], ans: 1 },
    { q: 'What is paging?', opts: ['Printing pages', 'Memory in fixed blocks', 'File compression', 'Disk formatting'], ans: 1 },
  ],
  4: [
    { q: 'Which is NOT required for deadlock?', opts: ['Mutual Exclusion', 'Hold and Wait', 'Preemption', 'Circular Wait'], ans: 2 },
    { q: 'Banker\'s Algorithm is for?', opts: ['Scheduling', 'Deadlock avoidance', 'Memory paging', 'File allocation'], ans: 1 },
    { q: 'What is a safe state?', opts: ['No processes', 'Can allocate to all', 'All deadlocked', 'Memory full'], ans: 1 },
    { q: 'Which ignores deadlock?', opts: ['Detection', 'Avoidance', 'Ostrich Algorithm', 'Prevention'], ans: 2 },
  ],
};

export default function GamePage() {
  const gameRef = useRef(null);
  const phaserRef = useRef(null);
  const [sessionData, setSessionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topicTitle, setTopicTitle] = useState('');

  useEffect(() => { loadSessionData(); }, []);

  const loadSessionData = async () => {
    try {
      const topicId = localStorage.getItem('scholar_active_topic_id');
      const activeLevel = parseInt(localStorage.getItem('scholar_active_level') || '1', 10);
      if (topicId) {
        const result = await getTopicSession(topicId);
        if (result.success && result.data) {
          const session = result.data.session || result.data;
          setSessionData(session);
          setTopicTitle(session?.topic?.title || session?.topic?.name || 'Unknown Topic');
          
          const quizData = session?.topic?.quiz_data;
          if (quizData && quizData.levels) {
            const levelName = LEVEL_NAMES[activeLevel] || 'easy';
            const levelQuestions = quizData.levels[levelName];
            if (levelQuestions && Array.isArray(levelQuestions)) {
              const formattedQuestions = levelQuestions.map((q) => ({
                q: q.question || q.text || 'Question not found',
                opts: q.options || q.choices || ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                // Extract correctOptionIndex from your database schema
                ans: q.correctOptionIndex !== undefined ? q.correctOptionIndex : 
                     q.correct_answer !== undefined ? q.correct_answer : 
                     q.correct !== undefined ? q.correct : 0,
              }));
              setQuestions(formattedQuestions);
              setLoading(false);
              return;
            }
          }
        }
      }
      setQuestions(FALLBACK_QUESTIONS[activeLevel] || FALLBACK_QUESTIONS[1]);
    } catch (error) {
      console.error('❌ Failed to load session:', error);
      const activeLevel = parseInt(localStorage.getItem('scholar_active_level') || '1', 10);
      setQuestions(FALLBACK_QUESTIONS[activeLevel] || FALLBACK_QUESTIONS[1]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (loading) return;

    async function initPhaser() {
      const Phaser = (await import('phaser')).default;
      phaserRef.current = Phaser;

      class MainGame extends Phaser.Scene {
        constructor() { super('MainGame'); }

        preload() {
          const activeLevel = parseInt(localStorage.getItem('scholar_active_level') || '1', 10);
          const charId = parseInt(localStorage.getItem('scholar_selected_character') || '1', 10);

          if (activeLevel === 1) this.load.image('gameBackground', '/assets/background/bg-easy.jpeg');
          else if (activeLevel === 2) this.load.image('gameBackground', '/assets/background/bg-medium.jpg');
          else if (activeLevel === 3) this.load.image('gameBackground', '/assets/background/bg-hard-level.jpg');
          else if (activeLevel === 4) this.load.image('gameBackground', '/assets/background/bg-final-boss.jpg');
          else this.load.image('gameBackground', '/assets/background/bg-easy.jpeg');

          if (charId === 1) this.load.spritesheet('hero', '/assets/hero-animation/char1sprite.png', { frameWidth: 360, frameHeight: 640 });
          else if (charId === 2) this.load.spritesheet('hero', '/assets/hero-animation/char2sprite.png', { frameWidth: 360, frameHeight: 640 });
          else if (charId === 3) this.load.spritesheet('hero', '/assets/hero-animation/char4sprite.png', { frameWidth: 360, frameHeight: 640 });
          else if (charId === 4) this.load.spritesheet('hero', '/assets/hero-animation/char3sprite.png', { frameWidth: 640, frameHeight: 360 });
          else this.load.spritesheet('hero', '/assets/hero-animation/char1sprite.png', { frameWidth: 360, frameHeight: 640 });

          // ✅ REVERTED: Back to static enemy1.png for Level 1
          if (activeLevel === 1) {
            this.load.image('enemy', '/assets/enemy/enemy1.png');
          } else if (activeLevel === 2) {
            this.load.image('enemy', '/assets/enemy/enemy2.png');
          } else if (activeLevel === 3) {
            this.load.image('enemy', '/assets/enemy/enemy3.png');
          } else if (activeLevel === 4) {
            this.load.image('enemy', '/assets/enemy/enemy4.png');
          } else {
            this.load.image('enemy', '/assets/enemy/enemy1.png');
          }

          this.load.image('enemyBullet', '/assets/attack/enemy.png');
          this.load.image('heroBullet', '/assets/attack/hero.png');
        }

        create() {
          const W = this.sys.game.config.width;
          const H = this.sys.game.config.height;
          const activeLevel = parseInt(localStorage.getItem('scholar_active_level') || '1', 10);
          const charId = parseInt(localStorage.getItem('scholar_selected_character') || '1', 10);

          this.add.image(0, 0, 'gameBackground').setOrigin(0, 0).setDisplaySize(W, H);

          const hasHeroTexture = this.textures.exists('hero');
          if (hasHeroTexture) {
            if (charId === 1) {
              this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 6 }), frameRate: 8, repeat: -1 });
              this.anims.create({ key: 'power1', frames: this.anims.generateFrameNumbers('hero', { start: 7, end: 13 }), frameRate: 10, repeat: -1 });
              this.anims.create({ key: 'power2', frames: this.anims.generateFrameNumbers('hero', { start: 14, end: 20 }), frameRate: 10, repeat: -1 });
              this.anims.create({ key: 'power3', frames: this.anims.generateFrameNumbers('hero', { start: 21, end: 27 }), frameRate: 10, repeat: -1 });
              this.anims.create({ key: 'power4', frames: this.anims.generateFrameNumbers('hero', { start: 28, end: 34 }), frameRate: 10, repeat: -1 });
              this.anims.create({ key: 'power5', frames: this.anims.generateFrameNumbers('hero', { start: 35, end: 39 }), frameRate: 10, repeat: -1 });
            } else {
              this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
              this.anims.create({ key: 'power1', frames: this.anims.generateFrameNumbers('hero', { start: 6, end: 11 }), frameRate: 10, repeat: 0 });
              this.anims.create({ key: 'power2', frames: this.anims.generateFrameNumbers('hero', { start: 12, end: 17 }), frameRate: 10, repeat: 0 });
              this.anims.create({ key: 'power3', frames: this.anims.generateFrameNumbers('hero', { start: 18, end: 23 }), frameRate: 10, repeat: 0 });
              this.anims.create({ key: 'power4', frames: this.anims.generateFrameNumbers('hero', { start: 24, end: 29 }), frameRate: 10, repeat: 0 });
              this.anims.create({ key: 'power5', frames: this.anims.generateFrameNumbers('hero', { start: 30, end: 33 }), frameRate: 10, repeat: 0 });
            }
          }

          let FW, FH, heroScale;
          if (charId === 1) { heroScale = 0.7; FW = 360 * heroScale; FH = 640 * heroScale; }
          else if (charId === 2) { heroScale = 0.55; FW = 360 * heroScale; FH = 640 * heroScale; }
          else if (charId === 3) { heroScale = 0.6; FW = 640 * heroScale; FH = 360 * heroScale; }
          else if (charId === 4) { heroScale = 0.8; FW = 360 * heroScale; FH = 640 * heroScale; }
          else { heroScale = 0.5; FW = 360 * heroScale; FH = 640 * heroScale; }

          if (activeLevel === 1) {
            if (charId === 1) { this.heroX = 300; this.heroY = 650; }
            else if (charId === 2) { this.heroX = 350; this.heroY = 700; }
            else if (charId === 3) { this.heroX = 350; this.heroY = 700; }
            else if (charId === 4) { this.heroX = 410; this.heroY = 690; }
            else { this.heroX = 220; this.heroY = 450; }
          } else if (activeLevel === 2) {
            if (charId === 1) { this.heroX = 350; this.heroY = 700; }
            else if (charId === 2) { this.heroX = 370; this.heroY = 700; }
            else if (charId === 3) { this.heroX = 380; this.heroY = 700; }
            else if (charId === 4) { this.heroX = 650; this.heroY = 700; }
            else { this.heroX = 250; this.heroY = 430; }
          } else if (activeLevel === 3) {
            if (charId === 1) { this.heroX = 300; this.heroY = 700; }
            else if (charId === 2) { this.heroX = 400; this.heroY = 700; }
            else if (charId === 3) { this.heroX = 400; this.heroY = 700; }
            else if (charId === 4) { this.heroX = 500; this.heroY = 760; }
            else { this.heroX = 200; this.heroY = 460; }
          } else if (activeLevel === 4) {
            if (charId === 1) { this.heroX = 300; this.heroY = 750; }
            else if (charId === 2) { this.heroX = 300; this.heroY = 800; }
            else if (charId === 3) { this.heroX = 650; this.heroY = 710; }
            else if (charId === 4) { this.heroX = 650; this.heroY = 770; }
            else { this.heroX = 180; this.heroY = 470; }
          } else { this.heroX = 220; this.heroY = 450; }

          if (hasHeroTexture) {
            this.heroSpr = this.add.sprite(this.heroX, this.heroY, 'hero').setScale(heroScale).setDepth(5);
            if (this.anims.exists('idle')) this.heroSpr.play('idle');
          } else {
            this.heroSpr = this.add.rectangle(this.heroX, this.heroY, FW * 0.8, FH * 0.8, 0x534ab7).setDepth(5);
          }

          // ✅ REVERTED: Original dimensions and scale for enemy1.png
          let EW, EH, enemyScale;
          if (activeLevel === 1) {
            this.enemyX = 1500; this.enemyY = 700;
            EW = 408 * 0.95; EH = 612 * 0.95; enemyScale = 0.95;
          } else if (activeLevel === 2) {
            this.enemyX = 1500; this.enemyY = 700; enemyScale = 0.7;
            EW = 408 * enemyScale; EH = 612 * enemyScale;
          } else if (activeLevel === 3) {
            this.enemyX = 1400; this.enemyY = 440; enemyScale = 0.8;
            EW = 408 * enemyScale; EH = 612 * enemyScale;
          } else if (activeLevel === 4) {
            this.enemyX = 950; this.enemyY = 450; enemyScale = 0.8;
            EW = 408 * 0.8; EH = 612 * 0.8;
          } else {
            this.enemyX = 900; this.enemyY = 420; enemyScale = 0.6;
            EW = 408 * 0.6; EH = 612 * 0.6;
          }

          // ✅ SIMPLIFIED: Removed all enemy spritesheet animation logic
          this.enemySpr = this.add.image(this.enemyX, this.enemyY, 'enemy')
            .setScale(enemyScale).setFlipX(true).setDepth(5);

          if (charId === 1) { this.heroHand = { x: this.heroX + FW * 0.42, y: this.heroY - FH * 0.05 }; }
          else if (charId === 2) { this.heroHand = { x: this.heroX + FW * 0.40, y: this.heroY - FH * 0.08 }; }
          else if (charId === 3) { this.heroHand = { x: this.heroX + FW * 0.35, y: this.heroY - FH * 0.15 }; }
          else if (charId === 4) { this.heroHand = { x: this.heroX + FW * 0.41, y: this.heroY - FH * 0.07 }; }
          else { this.heroHand = { x: this.heroX + FW * 0.42, y: this.heroY - FH * 0.05 }; }

          if (activeLevel === 1) { this.enemyHand = { x: this.enemyX - EW * 0.42, y: this.enemyY - EH * 0.05 }; }
          else if (activeLevel === 2) { this.enemyHand = { x: this.enemyX - EW * 0.40, y: this.enemyY - EH * 0.06 }; }
          else if (activeLevel === 3) { this.enemyHand = { x: this.enemyX - EW * 0.44, y: this.enemyY - EH * 0.07 }; }
          else if (activeLevel === 4) { this.enemyHand = { x: this.enemyX - EW * 0.45, y: this.enemyY - EH * 0.08 }; }
          else { this.enemyHand = { x: this.enemyX - EW * 0.42, y: this.enemyY - EH * 0.05 }; }

          this.bubblePos = { x: W / 2, y: H * 0.16 };

          let timer, enemyHP, damagePerWrong;
          if (activeLevel === 1) { timer = 12; enemyHP = 100; damagePerWrong = 15; }
          else if (activeLevel === 2) { timer = 15; enemyHP = 100; damagePerWrong = 20; }
          else if (activeLevel === 3) { timer = 20; enemyHP = 100; damagePerWrong = 25; }
          else if (activeLevel === 4) { timer = 25; enemyHP = 150; damagePerWrong = 30; }
          else { timer = 25; enemyHP = 100; damagePerWrong = 15; }

          this.heroHP = 100; this.enemyHP = enemyHP;
          this.maxHeroHP = 100; this.maxEnemyHP = enemyHP;
          this.damagePerWrong = damagePerWrong; this.timeLimit = timer;
          this.heroWidth = FW; this.heroHeight = FH;
          this.enemyWidth = EW; this.enemyHeight = EH;
          
          this._buildHPBars(W, H);
          this.currentLevel = activeLevel;

          this.questions = questions;
          this.qIdx = 0; this.correctCount = 0;
          this.battleActive = false; this.busy = false;

          this._setupDialogue(W, H, FW, FH, EW, EH);
        }

        _buildHPBars(W, H) {
          const BW = 260, BH = 20, MARGIN = 20;
          const heroBarX = MARGIN; const heroBarY = MARGIN;
          this.add.rectangle(heroBarX, heroBarY, BW, BH, 0x220000).setOrigin(0, 0).setDepth(20);
          this.heroBar = this.add.rectangle(heroBarX, heroBarY, BW, BH, 0x25f225).setOrigin(0, 0).setDepth(21);
          this.add.rectangle(heroBarX, heroBarY, BW, BH, 0xffffff, 0).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.5).setDepth(22);
          this.heroHPText = this.add.text(heroBarX + BW / 2, heroBarY + BH / 2, `Hero ${this.heroHP}/${this.maxHeroHP}`, { fontSize: '14px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 0.5).setDepth(23);
          this.heroDamageText = this.add.text(heroBarX + BW / 2, heroBarY + BH + 8, '', { fontSize: '18px', fill: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(23).setAlpha(0);

          const enemyBarX = W - MARGIN - BW; const enemyBarY = MARGIN;
          this.add.rectangle(enemyBarX, enemyBarY, BW, BH, 0x220000).setOrigin(0, 0).setDepth(20);
          this.enemyBar = this.add.rectangle(enemyBarX, enemyBarY, BW, BH, 0x10ebcb).setOrigin(0, 0).setDepth(21);
          this.add.rectangle(enemyBarX, enemyBarY, BW, BH, 0xffffff, 0).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.5).setDepth(22);
          this.enemyHPText = this.add.text(enemyBarX + BW / 2, enemyBarY + BH / 2, `Enemy ${this.enemyHP}/${this.maxEnemyHP}`, { fontSize: '14px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 0.5).setDepth(23);
          this.enemyDamageText = this.add.text(enemyBarX + BW / 2, enemyBarY + BH + 8, '', { fontSize: '18px', fill: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(23).setAlpha(0);
          this._BAR_W = BW; this._BAR_H = BH;
        }

        _updateBars(damageToHero = 0, damageToEnemy = 0) {
          const heroPercent = Math.max(0, this.heroHP / this.maxHeroHP);
          this.heroBar.setDisplaySize(this._BAR_W * heroPercent, this._BAR_H);
          this.heroHPText.setText(`Hero ${this.heroHP}/${this.maxHeroHP}`);
          if (damageToHero > 0) {
            this.heroDamageText.setText(`-${damageToHero}`);
            this.heroDamageText.setAlpha(1);
            this.heroDamageText.y = this.heroBar.y + this._BAR_H + 8;
            this.tweens.add({ targets: this.heroDamageText, alpha: 0, y: this.heroDamageText.y - 20, duration: 1200, ease: 'Power2', onComplete: () => { this.heroDamageText.setAlpha(0); } });
          }
          const enemyPercent = Math.max(0, this.enemyHP / this.maxEnemyHP);
          this.enemyBar.setDisplaySize(this._BAR_W * enemyPercent, this._BAR_H);
          this.enemyHPText.setText(`Enemy ${this.enemyHP}/${this.maxEnemyHP}`);
          if (damageToEnemy > 0) {
            this.enemyDamageText.setText(`-${damageToEnemy}`);
            this.enemyDamageText.setAlpha(1);
            this.enemyDamageText.y = this.enemyBar.y + this._BAR_H + 8;
            this.tweens.add({ targets: this.enemyDamageText, alpha: 0, y: this.enemyDamageText.y - 20, duration: 1200, ease: 'Power2', onComplete: () => { this.enemyDamageText.setAlpha(0); } });
          }
        }

        _setupDialogue(W, H, FW, FH, EW, EH) {
          const activeLevel = parseInt(localStorage.getItem('scholar_active_level') || '1', 10);
          const dialogues = getRandomDialogue(activeLevel);
          let step = 0; let active = true;
          const heroAnchor = { x: this.heroX, y: this.heroY - FH / 2 - 90 };
          const enemyAnchor = { x: this.enemyX, y: this.enemyY - EH / 2 - 90 };

          const makeBubble = (ax, ay, text, side) => {
            const PAD=18, TAIL=14, R=14;
            const txt = this.add.text(0, 0, text, { fontSize: '17px', fill: '#ffffff', fontFamily: 'Georgia, serif', align: 'center', wordWrap: { width: 260 } }).setOrigin(0.5, 0.5);
            const bw = Math.max(txt.width + PAD*2, 200); const bh = txt.height + PAD*2;
            const g = this.add.graphics();
            g.fillStyle(0x0d0d1a, 0.9); g.fillRoundedRect(-bw/2, -bh/2, bw, bh, R);
            const bc = side==='enemy' ? 0x9b59b6 : 0xf0c040;
            g.lineStyle(2, bc, 1); g.strokeRoundedRect(-bw/2, -bh/2, bw, bh, R);
            g.fillStyle(0x0d0d1a, 0.9); g.fillTriangle(-10, bh/2, 10, bh/2, 0, bh/2+TAIL);
            g.lineStyle(2, bc, 1); g.strokeTriangle(-10, bh/2, 10, bh/2, 0, bh/2+TAIL);
            return this.add.container(ax, ay, [g, txt]).setDepth(10);
          };

          const hint = this.add.text(W/2, H-30, '▼ Press any key or click to continue', { fontSize: '14px', fill: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5, 1).setDepth(10);
          this.tweens.add({ targets: hint, alpha: 0.2, duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

          let bubble = null;
          const show = (s) => {
            if (bubble) { bubble.destroy(); bubble = null; }
            if (s >= dialogues.length) { hint.setVisible(false); active = false; this.time.delayedCall(400, () => this._startEnemyAttack()); return; }
            const d = dialogues[s]; const a = d.speaker==='hero' ? heroAnchor : enemyAnchor;
            bubble = makeBubble(a.x, a.y, d.text, d.speaker);
            bubble.setAlpha(0); this.tweens.add({ targets: bubble, alpha: 1, duration: 300 });
          };

          show(step);
          const advance = () => { if (!active) return; step++; show(step); };
          this.input.keyboard.on('keydown', advance);
          this.input.on('pointerdown', advance);
        }

        _twinkle(obj) {
          return this.tweens.add({
            targets: obj,
            scaleX: { from: obj.scaleX*0.8, to: obj.scaleX*1.2 },
            scaleY: { from: obj.scaleY*0.8, to: obj.scaleY*1.2 },
            alpha: { from: 0.65, to: 1 },
            duration: 140, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
          });
        }

        _applyBulletFX(obj, spinDir = 1) {
          this.tweens.add({ targets: obj, angle: 360 * spinDir, duration: 600, repeat: -1 });
          this.tweens.add({
            targets: obj,
            scaleX: { from: obj.scaleX * 0.7, to: obj.scaleX * 1.3 },
            scaleY: { from: obj.scaleY * 0.7, to: obj.scaleY * 1.3 },
            duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
          });
        }

        _hitFlash(isHero) {
          const x = isHero ? this.heroHand.x : this.enemyHand.x;
          const y = isHero ? this.heroY : this.enemyY;
          
          const impact = this.add.graphics().setDepth(30);
          impact.fillStyle(0xffffff, 1); impact.fillCircle(0, 0, 15);
          impact.fillStyle(0xffaa00, 0.8); impact.fillCircle(0, 0, 25);
          impact.setPosition(x, y);
          
          for(let i=0; i<8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const line = this.add.rectangle(x, y, 4, 20, 0xffff00).setDepth(30).setOrigin(0.5);
            line.rotation = angle;
            this.tweens.add({ targets: line, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, ease: 'Power2', onComplete: () => line.destroy() });
          }

          this.tweens.add({ targets: impact, scaleX: { from: 0.5, to: 2 }, scaleY: { from: 0.5, to: 2 }, alpha: { from: 1, to: 0 }, duration: 400, ease: 'Power2', onComplete: () => impact.destroy() });

          const target = isHero ? this.heroSpr : this.enemySpr;
          if(target) {
            this.tweens.add({ targets: target, x: target.x - 10, duration: 50, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
          }
        }

        _playAttackAnim() {
          const powerAnims = ['power1', 'power2', 'power3', 'power4', 'power5'];
          const chosen = powerAnims[Phaser.Math.Between(0, powerAnims.length - 1)];
          if (this.anims.exists(chosen) && this.heroSpr) {
            this.heroSpr.play(chosen);
            this.time.delayedCall(800, () => { if (this.anims.exists('idle') && this.heroSpr) this.heroSpr.play('idle'); });
          }
        }

        _startEnemyAttack() {
          if (this.busy) return;
          if (this.qIdx >= this.questions.length) { this._gameOver(); return; }
          this.busy = true; this.battleActive = true;

          const activeLevel = parseInt(localStorage.getItem('scholar_active_level') || '1', 10);
          
          // ✅ Removed enemy animation triggers since enemy1.png is static

          const bulletKey = 'enemyBullet';
          const scale = 0.5; // Standardized scale since we aren't using the tiny spritesheet anymore
          
          const bullet = this.add.image(this.enemyHand.x, this.enemyHand.y, bulletKey).setScale(scale).setDepth(15);
          this._twinkle(bullet);

          this.tweens.add({
            targets: bullet,
            x: this.bubblePos.x, y: this.bubblePos.y,
            duration: 850, ease: 'Cubic.easeIn',
            onComplete: () => {
              this.tweens.killTweensOf(bullet);
              bullet.destroy();
              this._showQuestion();
            },
          });
        }

        _showQuestion() {
          const q = this.questions[this.qIdx];
          this.game.events.emit('SHOW_QUESTION', {
            question: q.q, options: q.opts,
            onAnswer: (idx) => this._onAnswer(idx, q.ans),
            timeLimit: this.timeLimit,
          });
        }

        async _onAnswer(chosen, correct) {
          if (!this.busy) return;
          this.game.events.emit('HIDE_UI');

          const isRight = chosen === correct;
          if (isRight) this.correctCount++;

          if (sessionData?.id) {
            try {
              await fetch(`/api/game/sessions/${sessionData.id}/attempts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questionIndex: this.qIdx,
                  selectedOption: chosen,
                  isCorrect: isRight,
                }),
              });
            } catch (error) {
              console.warn('⚠️ Failed to record attempt on backend:', error);
            }
          }

          if (sessionData?.id) {
            updateSessionState(sessionData.id, {
              current_question: this.qIdx,
              answer: chosen,
              correct: isRight,
            }).catch(err => console.error('Failed to update session state:', err));
          }

          this.time.delayedCall(200, () => {
            if (isRight) this._correctAttack();
            else this._wrongAttack();
          });
        }

                _correctAttack() {
          this._playAttackAnim();
          this.game.events.emit('CORRECT_ANSWER', { xp: XP_PER_QUESTION[this.currentLevel] || 15 });

          // 1. Hero Bullet: Diagonally UP from Left (Hero Hand) to Top Center
          const b1 = this.add.image(this.heroHand.x, this.heroHand.y, 'heroBullet')
            .setScale(0.4).setDepth(15);
          
          this._applyBulletFX(b1, 1); // Spin and pulse

          this.tweens.add({
            targets: b1, 
            x: this.bubblePos.x, 
            y: this.bubblePos.y, 
            duration: 600, 
            ease: 'Cubic.easeOut',
            onComplete: () => {
              // 2. Hero Bullet: Diagonally DOWN from Top Center to Right (Enemy Hand)
              this.tweens.add({
                targets: b1, 
                x: this.enemyHand.x, 
                y: this.enemyHand.y, 
                duration: 600, 
                ease: 'Cubic.easeIn',
                onComplete: () => {
                  this.tweens.killTweensOf(b1); 
                  b1.destroy();
                  
                  const damage = 25;
                  this.enemyHP = Math.max(0, this.enemyHP - damage);
                  this._updateBars(0, damage);
                  this._hitFlash(false);
                  
                  this.qIdx++;
                  this.time.delayedCall(800, () => {
                    this.busy = false;
                    if (this.qIdx >= this.questions.length) this._gameOver();
                    else this._startEnemyAttack();
                  });
                }
              });
            }
          });
        }

        _wrongAttack() {
          // Enemy Bullet: Diagonally DOWN from Top Center to Left (Hero Hand)
          const b = this.add.image(this.bubblePos.x, this.bubblePos.y, 'enemyBullet')
            .setScale(0.4).setDepth(15);
          
          this._applyBulletFX(b, -1); // Spin opposite direction

          this.tweens.add({
            targets: b, 
            x: this.heroHand.x, 
            y: this.heroHand.y, 
            duration: 700, 
            ease: 'Cubic.easeIn', // Accelerates as it hits the hero
            onComplete: () => {
              this.tweens.killTweensOf(b); 
              b.destroy();
              
              const damage = this.damagePerWrong;
              this.heroHP = Math.max(0, this.heroHP - damage);
              this._updateBars(damage, 0);
              this._hitFlash(true);
              
              this.qIdx++;
              this.time.delayedCall(800, () => {
                this.busy = false;
                if (this.qIdx >= this.questions.length) this._gameOver();
                else this._startEnemyAttack();
              });
            },
          });
        }

        _gameOver() {
          const activeLevel = parseInt(localStorage.getItem('scholar_active_level') || '1', 10);
          const topicId = localStorage.getItem('scholar_active_topic_id');
          
          let result = false;
          if (this.enemyHP <= 0) result = true;
          else if (this.heroHP <= 0) result = false;
          else result = this.heroHP >= this.enemyHP;

          if (result && activeLevel < 4 && topicId) {
            const topicProgress = JSON.parse(localStorage.getItem('scholar_topic_progress') || '{}');
            topicProgress[topicId] = { level: activeLevel + 1, title: topicTitle, completed: false };
            localStorage.setItem('scholar_topic_progress', JSON.stringify(topicProgress));
          }
          if (result && activeLevel === 4 && topicId) {
            const topicProgress = JSON.parse(localStorage.getItem('scholar_topic_progress') || '{}');
            topicProgress[topicId] = { level: 4, title: topicTitle, completed: true };
            localStorage.setItem('scholar_topic_progress', JSON.stringify(topicProgress));
            localStorage.setItem('scholar_topic_completed', 'true');
          }

          if (sessionData?.id) {
            updateSessionState(sessionData.id, { completed: true, score: this.correctCount, total_questions: this.questions.length, won: result });
          }

          const damageDealt = this.maxEnemyHP - this.enemyHP;
          const xpEarned = this.accumulatedXP ? (LEVEL_XP[activeLevel] || 100) : 0;

          this.game.events.emit('GAME_OVER', {
            won: result, level: activeLevel, damageDealt, heroHP: this.heroHP,
            correctAnswers: this.correctCount, totalQuestions: this.questions.length,
            xpEarned, nextLevel: activeLevel + 1, topicCompleted: result && activeLevel === 4, topicTitle,
          });
        }

        update() {}
      }

      const config = {
        type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight,
        parent: 'game-window-container', backgroundColor: '#111',
        physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
        scene: [MainGame], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      };

      if (!gameRef.current) gameRef.current = new Phaser.Game(config);
    }

    initPhaser();
    return () => { if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; } };
  }, [loading, questions, sessionData, topicTitle]);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#c5c0ff', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Loading Quest...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div id="game-window-container" className={styles.gameContainer} />
      <GameUI gameRef={gameRef} />
    </div>
  );
}

function GameUI({ gameRef }) {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [showXP, setShowXP] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [correctMsg, setCorrectMsg] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const checkReady = setInterval(() => {
      if (!gameRef.current) return;
      const events = gameRef.current.events;

      events.on('SHOW_QUESTION', (data) => { setState(data); setSelected(null); setTimeLeft(data.timeLimit || 20); });
      events.on('HIDE_UI', () => { setState(null); setSelected(null); clearInterval(timerRef.current); });
      events.on('GAME_OVER', (payload) => {
        setResult(payload); setState(null);
        if (payload.won && payload.xpEarned > 0) { setXpAmount(payload.xpEarned); setShowXP(true); setTimeout(() => setShowXP(false), 3000); }
      });
      events.on('CORRECT_ANSWER', (data) => { setCorrectMsg(data.xp); setTimeout(() => setCorrectMsg(null), 2500); });

      clearInterval(checkReady);
    }, 100);
    return () => clearInterval(checkReady);
  }, []);

  useEffect(() => {
    if (!state) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); if (state) state.onAnswer(-1); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [state]);

  const handleAnswer = useCallback((idx) => {
    if (selected !== null) return;
    setSelected(idx); clearInterval(timerRef.current);
    if (state) state.onAnswer(idx);
  }, [selected, state]);

  const handleContinue = useCallback(() => {
    if (result && result.won && result.level < 4) { localStorage.setItem('scholar_active_level', String(result.nextLevel)); router.push('/play/game/'); }
    else { router.push('/play/world-map'); }
  }, [result, router]);

  const handleWorldMap = useCallback(() => router.push('/play/world-map'), [router]);
  const handleMainMenu = useCallback(() => router.push('/play'), [router]);

  return (
    <>
      {state && (
        <div className={styles.uiOverlay}>
          <div className={styles.questionBubble}>
            <p className={styles.questionText}>{state.question}</p>
            <div className={styles.timerTrack}>
              <div className={styles.timerFill} style={{ width: `${(timeLeft / (state.timeLimit || 20)) * 100}%`, background: (timeLeft / (state.timeLimit || 20)) * 100 > 50 ? '#2ecc71' : (timeLeft / (state.timeLimit || 20)) * 100 > 25 ? '#f39c12' : '#e74c3c' }} />
            </div>
            <span className={styles.timerLabel}>{timeLeft}s</span>
          </div>

          <div className={styles.optionRow}>
            {state.options.map((opt, i) => (
              <button key={i} className={`${styles.optionBtn} ${selected === i ? styles.optionSelected : ''}`} onClick={() => handleAnswer(i)} disabled={selected !== null}>
                <span className={styles.optionLabel}>{['A','B','C','D'][i]}</span>
                <span className={styles.optionText}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {correctMsg && (
        <div className={styles.correctOverlay}>
          <div className={styles.correctText}>You got it right!</div>
          <div className={styles.correctXP}>+{correctMsg} XP</div>
        </div>
      )}
      <ResultModal result={result} onContinue={handleContinue} onWorldMap={handleWorldMap} onMainMenu={handleMainMenu} />
    </>
  );
}