import Phaser from 'phaser';
import { stopBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';
import { getNextGameOverCause } from './gameOverMessages';

/**
 * ---- Integration points ----
 * 1. Preload the stamp image somewhere in your Boot/Preload scene:
 *
 * 2. Wire your real Azure Functions client into LeaderboardService below
 *    (getTopScores = GET, submitScore = POST) and pass it in when you
 *    start this scene from wherever death is handled:
 *
 *      this.scene.start('GameOverScene', {
 *        score: finalScore,
 *        leaderboardService: myLeaderboardService,
 *      });
 *
 * 3. Swap 'PixelFont' below for whatever font family your HUD already
 *    uses. If you don't have a bitmap font yet, a bitmap font (BMFont /
 *    Phaser's RetroFont) will render crisper at small sizes than a
 *    web font like "Press Start 2P" scaled down — worth the swap later.
 */

export interface ScoreEntry {
  initials: string;
  score: number;
  age: number;
  rank: string;
  causeOfDeath: string;
}

export interface LeaderboardService {
  /** Returns current top scores, sorted ascending by score. */
  getTopScores(): Promise<ScoreEntry[]>;
  /** Submits a new entry to your Azure Function / Table Storage. */
  submitScore(entry: ScoreEntry): Promise<void>;
}

interface GameOverSceneData {
  age?: number;
  rankId?: string;
  score: number;
  leaderboardService?: LeaderboardService;
}

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUM_SLOTS = 3;
const BLINK_MS = 400;
const FONT_FAMILY = 'PixelFont, monospace';

export function createLeaderboardService(): LeaderboardService {
  return {
    async getTopScores(): Promise<ScoreEntry[]> {
      const response = await fetch('/api/getLeaderboard');
      if (!response.ok) {
        throw new Error(`Leaderboard fetch failed: ${response.status}`);
      }

      const payload = (await response.json()) as Array<
        | {
            score?: number | string;
            playerName?: string;
            initials?: string;
            name?: string;
            age?: number | string;
            rank?: string;
            causeOfDeath?: string;
          }
        | undefined
      >;

      return payload
        .filter((entry): entry is Record<string, unknown> => Boolean(entry))
        .map((entry) => {
          const rawInitials = entry.initials ?? entry.playerName ?? entry.name ?? 'AAA';
          const scoreValue = typeof entry.score === 'number' ? entry.score : Number(entry.score ?? 0);
          const ageValue = typeof entry.age === 'number' ? entry.age : Number(entry.age ?? 0);
          return {
            initials: String(rawInitials).slice(0, 3).toUpperCase().padEnd(3, 'A'),
            score: Number.isFinite(scoreValue) ? scoreValue : 0,
            age: Number.isFinite(ageValue) ? ageValue : 0,
            rank: String(entry.rank ?? 'Unranked'),
            causeOfDeath: String(entry.causeOfDeath ?? 'Unknown'),
          };
        })
        .sort((a, b) => a.score - b.score);
    },
    async submitScore(entry: ScoreEntry): Promise<void> {
      const response = await fetch('/api/submitScore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: entry.initials,
          score: Math.floor(entry.score),
          age: entry.age,
          rank: entry.rank,
          causeOfDeath: entry.causeOfDeath,
        }),
      });

      if (!response.ok) {
        throw new Error(`Score submission failed: ${response.status}`);
      }
    },
  };
}

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private age = 20;
  private rankLabel = 'Grad Dev';
  private causeOfDeath = 'died in a tragic office accident';
  private leaderboardService!: LeaderboardService;
  private initials: string[] = ['A', 'A', 'A'];
  private activeSlot = 0;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Rectangle;
  private submitting = false;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverSceneData): void {
    this.score = Number(data.score ?? 0);
    this.age = Number(data.age ?? 20);
    this.rankLabel = data.rankId ?? 'Grad Dev';
    this.causeOfDeath = getNextGameOverCause();
    this.leaderboardService = data.leaderboardService ?? createLeaderboardService();
    this.initials = ['A', 'A', 'A'];
    this.activeSlot = 0;
    this.slotTexts = [];
    this.submitting = false;
  }

  async create(): Promise<void> {
    stopBackgroundMusic();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x18191f);

    const stamp = this.add.image(width / 2, height * 0.28, 'gameOverStamp').setOrigin(0.5, 0.3);
    stamp.setScale(0.6);
    const maxStampWidth = width * 0.55;
    if (stamp.width > maxStampWidth) {
      stamp.setScale(maxStampWidth / stamp.width);
    }

    this.add
  .text(width / 2, height * 0.48, `SCORE  ${Math.floor(this.score).toString().padStart(6, '0')}`, {
    fontFamily: FONT_FAMILY,
    fontSize: '20px',
    color: '#ffffff',
  })
  .setOrigin(0.5, 0.4);

    const status = this.add
      .text(width / 2, height * 0.6, 'CHECKING LEADERBOARD...', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#888888',
      })
      .setOrigin(0.5);

    let qualifies = true;
    try {
      const topScores = await this.leaderboardService.getTopScores();
      if (topScores.length >= 10) {
        qualifies = this.score > topScores[topScores.length - 1].score;
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard, defaulting to allow entry', error);
    }
    status.destroy();

    this.add
      .text(width / 2, height * 0.58, `You ${this.causeOfDeath} at ${this.age} as a ${this.rankLabel}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: '#db170d',
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5, 0.3);

    if (qualifies) {
      this.buildInitialsEntry(width, height);
    } else {
      this.buildContinuePrompt(width, height);
    }
  }

  // ---- Top-10: initials entry ----

  private buildInitialsEntry(width: number, height: number): void {
    this.add
      .text(width / 2, height * 0.66, 'Enter your initials', {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#ffcc00',
      })
      .setOrigin(0.5);

    const slotSpacing = 60;
    const startX = width / 2 - ((NUM_SLOTS - 1) * slotSpacing) / 2;
    const y = height * 0.74;

    for (let index = 0; index < NUM_SLOTS; index += 1) {
      const text = this.add
        .text(startX + index * slotSpacing, y, this.initials[index], {
          fontFamily: FONT_FAMILY,
          fontSize: '32px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this.slotTexts.push(text);
    }

    this.cursor = this.add.rectangle(startX, y + 28, 30, 4, 0xffcc00).setOrigin(0.5);
    this.tweens.add({
      targets: this.cursor,
      alpha: 0,
      duration: BLINK_MS,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height * 0.82, '\u2191\u2193 CHANGE   \u2190\u2192 MOVE   TYPE LETTERS', {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        color: '#666666',
      })
      .setOrigin(0.5);

    createButton(this, width / 2, height * 0.9, 'DONE', () => void this.confirmEntry());
    this.setupInitialsInput();
  }

  private setupInitialsInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    kb.on('keydown-UP', () => this.cycleLetter(1));
    kb.on('keydown-DOWN', () => this.cycleLetter(-1));
    kb.on('keydown-LEFT', () => this.moveSlot(-1));
    kb.on('keydown-RIGHT', () => this.moveSlot(1));
    kb.on('keydown-BACKSPACE', () => this.moveSlot(-1));
    kb.on('keydown-ENTER', () => void this.confirmEntry());

    kb.on('keydown', (event: KeyboardEvent) => {
      if (this.submitting) return;
      const key = event.key.toUpperCase();
      if (key.length === 1 && CHARSET.includes(key)) {
        this.setLetter(key);
        this.moveSlot(1);
      }
    });
  }

  private cycleLetter(direction: 1 | -1): void {
    if (this.submitting) return;
    const current = this.initials[this.activeSlot];
    const index = CHARSET.indexOf(current);
    const next = CHARSET[(index + direction + CHARSET.length) % CHARSET.length];
    this.setLetter(next);
  }

  private setLetter(letter: string): void {
    this.initials[this.activeSlot] = letter;
    this.slotTexts[this.activeSlot].setText(letter);
  }

  private moveSlot(direction: 1 | -1): void {
    if (this.submitting) return;
    this.activeSlot = Phaser.Math.Clamp(this.activeSlot + direction, 0, NUM_SLOTS - 1);
    this.cursor.x = this.slotTexts[this.activeSlot].x;
  }

  private async confirmEntry(): Promise<void> {
    if (this.submitting) return;
    this.submitting = true;

    this.slotTexts.forEach((text) => text.setColor('#888888'));
    this.cursor.setVisible(false);

    try {
      await this.leaderboardService.submitScore({
        initials: this.initials.join(''),
        score: this.score,
        age: this.age,
        rank: this.rankLabel,
        causeOfDeath: this.causeOfDeath,
      });
    } catch (error) {
      console.error('Failed to submit score', error);
    }

    this.returnToMenu();
  }

  // ---- Not top-10: pass-through prompt ----

  private buildContinuePrompt(width: number, height: number): void {
    createButton(this, width / 2, height * 0.74, 'DONE', () => this.returnToMenu());
  }

  private returnToMenu(): void {
    this.scene.start('MainMenu');
  }
}