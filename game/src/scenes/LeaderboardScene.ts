import Phaser from 'phaser';
import { filterLeaderboardEntries, truncateWithEllipsis, type LeaderboardRow } from '../data/leaderboardData';
import { createButton } from '../ui/createButton';

const PANEL_COLOR = 0x182536;
const PANEL_STROKE = 0xff4444;
const TEXT_COLOR = 0xffffff;
const HEADER_COLOR = 0xffd23f;
const TABLE_COLUMNS = [
  { label: 'NAME', width: 0.2, maxCharacters: 12 },
  { label: 'GRADE', width: 0.18, maxCharacters: 10 },
  { label: 'AGE', width: 0.12, maxCharacters: 4 },
  { label: 'CAUSE OF DEATH', width: 0.5 },
] as const;

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1d1d2b);
    this.add
      .text(width / 2, Math.max(28, height * 0.1), 'LEADERBOARD', { fontSize: '28px', color: '#ffd23f', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setTint(HEADER_COLOR);
    const status = this.add
      .text(width / 2, height / 2, 'LOADING LEADERBOARD...', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setTint(TEXT_COLOR);
    createButton(this, width / 2, height - 50, 'Back', () => {
      this.scene.stop('Leaderboard');
      this.scene.start('MainMenu');
      this.scene.bringToTop('MainMenu');
    });
    void this.loadLeaderboard(status);
  }

  private async loadLeaderboard(status: Phaser.GameObjects.Text): Promise<void> {
    try {
      const response = await fetch('/api/getLeaderboard');
      if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
      const rows = filterLeaderboardEntries(await response.json());
      status.destroy();
      this.renderTable(rows);
    } catch (error) {
      console.error('Could not load leaderboard:', error);
      status.setText('LEADERBOARD UNAVAILABLE');
    }
  }

  private renderTable(rows: LeaderboardRow[]): void {
    const { width, height } = this.scale;
    const panelWidth = Math.min(width - 24, 920);
    const panelHeight = Math.min(Math.max(220, height - 150), 390);
    const panelX = width / 2;
    const panelY = height / 2 + 5;
    const innerWidth = panelWidth - 32;
    const fontSize = Math.max(8, Math.min(16, Math.floor(innerWidth / 55)));
    const rowHeight = Math.max(20, Math.min(30, Math.floor((panelHeight - 48) / 11)));
    const left = panelX - innerWidth / 2;

    this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, PANEL_COLOR, 0.98)
      .setStrokeStyle(3, PANEL_STROKE);

    const columnStarts: number[] = [];
    let columnX = left;
    for (const column of TABLE_COLUMNS) {
      columnStarts.push(columnX);
      columnX += innerWidth * column.width;
    }

    const headerY = panelY - panelHeight / 2 + 18;
    TABLE_COLUMNS.forEach((column, index) => {
      this.add
        .text(columnStarts[index], headerY, column.label, { fontSize: `${fontSize}px`, color: '#ffd23f', fontStyle: 'bold' })
        .setTint(HEADER_COLOR);
    });

    if (rows.length === 0) {
      this.add
        .text(panelX, panelY + 8, 'NO RECORDS YET', { fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setTint(TEXT_COLOR);
      return;
    }

    let rowY = headerY + rowHeight;
    rows.slice(0, 10).forEach((row) => {
      const maxCharacters = TABLE_COLUMNS.map((column) =>
        'maxCharacters' in column ? Math.min(column.maxCharacters, Math.floor((innerWidth * column.width) / fontSize)) : Number.MAX_SAFE_INTEGER
      );
      const values = [
        truncateWithEllipsis(row.name.toUpperCase(), maxCharacters[0]),
        truncateWithEllipsis(row.grade.toUpperCase(), maxCharacters[1]),
        row.age,
        row.causeOfDeath.toUpperCase(),
      ];

      let rowBottom = rowY + rowHeight;
      values.forEach((value, columnIndex) => {
        const text = this.add
          .text(columnStarts[columnIndex], rowY, value, {
            fontSize: `${fontSize}px`,
            color: '#ffffff',
            fontStyle: 'bold',
            ...(columnIndex === 3 ? { wordWrap: { width: innerWidth * TABLE_COLUMNS[3].width } } : {}),
          })
          .setTint(TEXT_COLOR);
        rowBottom = Math.max(rowBottom, rowY + text.displayHeight);
      });
      rowY = rowBottom + 6;
    });
  }
}
