import Phaser from 'phaser';

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void
): Phaser.GameObjects.Text {
  const text = scene.add
    .text(x, y, label, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#33415c',
      padding: { x: 16, y: 8 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  text.on('pointerover', () => text.setStyle({ backgroundColor: '#455a80' }));
  text.on('pointerout', () => text.setStyle({ backgroundColor: '#33415c' }));
  text.on('pointerdown', onClick);

  return text;
}
