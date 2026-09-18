import Phaser from 'phaser';
import { filterLeaderboardEntries, truncateWithEllipsis, type LeaderboardRow } from '../data/leaderboardData';
import { createButton } from '../ui/createButton';

const PANEL_COLOR = 0x182536;
const PANEL_STROKE = 0xff4444;
const TEXT_COLOR = 0xffffff;
const HEADER_COLOR = 0xffd23f;
const TABLE_COLUMNS = [
  { label: 'NAME', width: 0.1, maxCharacters: 3 },
  { label: 'GRADE', width: 0.3 },
  { label: 'AGE', width: 0.1, maxCharacters: 2 },
  { label: 'CAUSE OF DEATH', width: 0.5 },
] as const;

// Padding/spacing constants — tune these to taste.
const PANEL_HORIZONTAL_PADDING = 40; // space between panel edge and table content, each side
const PANEL_TOP_PADDING = 36; // space between panel top edge and header row
const PANEL_BOTTOM_PADDING = 30; // space between last row's bottom and panel bottom edge
const HEADER_ROW_GAP = 20; // space between header labels and first data row
const ROW_SPACING = 16; // vertical gap between data rows
const COLUMN_GUTTER = 18; // horizontal gap reserved before the next column starts
const PANEL_MAX_WIDTH = 1200; // wider cap so the panel uses more of the page on large screens
const PANEL_SIDE_MARGIN = 16; // gap between panel edge and screen edge on small screens
const MAX_LEADERBOARD_ROWS = 10;
const MIN_FONT_SIZE = 8;
const BACK_BUTTON_CLEARANCE = 70; // vertical gap reserved above the Back button

interface TableLayout {
  objects: Phaser.GameObjects.GameObject[];
  contentBottom: number;
}

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

  /** Renders header + rows at a given font size and returns everything created, plus where
   * content actually ends up — based on real (possibly wrapped) text, not an estimate. */
  private layoutTable(
    rows: LeaderboardRow[],
    fontSize: number,
    panelX: number,
    panelTop: number,
    innerWidth: number,
    columnStarts: number[]
  ): TableLayout {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const rowHeight = Math.round(fontSize * 1.4) + ROW_SPACING;

    const headerY = panelTop + PANEL_TOP_PADDING;
    TABLE_COLUMNS.forEach((column, index) => {
      const text = this.add
        .text(columnStarts[index], headerY, column.label, { fontSize: `${fontSize}px`, color: '#ffd23f', fontStyle: 'bold' })
        .setTint(HEADER_COLOR);
      objects.push(text);
    });

    let contentBottom = headerY + rowHeight;

    if (rows.length === 0) {
      const rowY = headerY + rowHeight + HEADER_ROW_GAP;
      const text = this.add
        .text(panelX, rowY, 'NO RECORDS YET', { fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setTint(TEXT_COLOR);
      objects.push(text);
      contentBottom = rowY + rowHeight;
      return { objects, contentBottom };
    }

    let rowY = headerY + rowHeight + HEADER_ROW_GAP;
    rows.slice(0, MAX_LEADERBOARD_ROWS).forEach((row) => {
      const maxCharacters = TABLE_COLUMNS.map((column) =>
        'maxCharacters' in column
          ? Math.min(column.maxCharacters, Math.floor((innerWidth * column.width - COLUMN_GUTTER) / fontSize))
          : Number.MAX_SAFE_INTEGER
      );
      const values = [
        truncateWithEllipsis(row.name.toUpperCase(), maxCharacters[0]),
        truncateWithEllipsis(row.grade.toUpperCase(), maxCharacters[1]),
        row.age,
        row.causeOfDeath.toUpperCase(),
      ];

      let rowBottom = rowY + rowHeight;
      values.forEach((value, columnIndex) => {
        const columnWidth = innerWidth * TABLE_COLUMNS[columnIndex].width - COLUMN_GUTTER;
        const text = this.add
          .text(columnStarts[columnIndex], rowY, value, {
            fontSize: `${fontSize}px`,
            color: '#ffffff',
            fontStyle: 'bold',
            ...(columnIndex === 3 ? { wordWrap: { width: columnWidth } } : {}),
          })
          .setTint(TEXT_COLOR);
        objects.push(text);
        rowBottom = Math.max(rowBottom, rowY + text.displayHeight);
      });
      rowY = rowBottom + ROW_SPACING;
      contentBottom = rowBottom;
    });

    return { objects, contentBottom };
  }

  private renderTable(rows: LeaderboardRow[]): void {
    const { width, height } = this.scale;
    const panelWidth = Math.min(width - PANEL_SIDE_MARGIN * 2, PANEL_MAX_WIDTH);
    const panelX = width / 2;
    const panelTop = Math.max(150, height * 0.22);
    const innerWidth = panelWidth - PANEL_HORIZONTAL_PADDING * 2;
    const availableHeight = height - 50 - BACK_BUTTON_CLEARANCE - panelTop;
    const left = panelX - innerWidth / 2;

    const columnStarts: number[] = [];
    let columnX = left;
    for (const column of TABLE_COLUMNS) {
      columnStarts.push(columnX);
      columnX += innerWidth * column.width;
    }

    let fontSize = Math.max(MIN_FONT_SIZE, Math.min(16, Math.floor(innerWidth / 55)));
    let layout = this.layoutTable(rows, fontSize, panelX, panelTop, innerWidth, columnStarts);

    // Only shrink if the *real* rendered content actually overflows the available space —
    // never assume worst-case wrapping up front, so normal-length data keeps full-size text.
    while (
      layout.contentBottom - panelTop + PANEL_BOTTOM_PADDING > availableHeight &&
      fontSize > MIN_FONT_SIZE
    ) {
      layout.objects.forEach((object) => object.destroy());
      fontSize -= 1;
      layout = this.layoutTable(rows, fontSize, panelX, panelTop, innerWidth, columnStarts);
    }

    const panelHeight = layout.contentBottom - panelTop + PANEL_BOTTOM_PADDING;
    const panelY = panelTop + panelHeight / 2;
    this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, PANEL_COLOR, 0.98)
      .setStrokeStyle(3, PANEL_STROKE)
      .setDepth(-1);
  }
}