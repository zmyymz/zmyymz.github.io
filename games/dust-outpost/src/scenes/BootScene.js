import * as Phaser from '../../vendor/phaser.esm.min.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const label = document.createElement('div');
    label.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#c8b8e8;font:14px monospace;letter-spacing:.2em;background:#14121c';
    label.textContent = 'LOADING...';
    document.body.appendChild(label);

    this.load.spritesheet('players', 'assets/players.png', { frameWidth: 24, frameHeight: 24, spacing: 1 });
    this.load.spritesheet('enemies', 'assets/enemies.png', { frameWidth: 24, frameHeight: 24, spacing: 1 });
    this.load.spritesheet('weapons', 'assets/weapons.png', { frameWidth: 24, frameHeight: 24, spacing: 1 });
    this.load.spritesheet('tiles', 'assets/tiles.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet('ui', 'assets/ui.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });

    ['shoot-a', 'shoot-b', 'shoot-c', 'shoot-d', 'shoot-e', 'explosion-a', 'explosion-b',
      'hurt-a', 'hurt-b', 'coin-a', 'coin-b', 'error-a', 'select-a', 'lose-a', 'move-a', 'move-b']
      .forEach((key) => this.load.audio(key, `sounds/${key}.ogg`));

    this.load.once('complete', () => label.remove());
  }

  create() {
    for (let i = 0; i < 4; i++) {
      this.anims.create({
        key: `player-walk-${i}`,
        frames: this.anims.generateFrameNumbers('players', { frames: [i * 4, i * 4 + 1, i * 4 + 2] }),
        frameRate: 7,
        repeat: -1,
      });
      this.anims.create({
        key: `enemy-walk-${i}`,
        frames: this.anims.generateFrameNumbers('enemies', { frames: [i * 4, i * 4 + 1, i * 4 + 2] }),
        frameRate: 5,
        repeat: -1,
      });
    }

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff).fillRect(0, 0, 8, 3);
    g.generateTexture('bullet', 8, 3);
    g.clear().fillStyle(0xffffff).fillCircle(4, 4, 4);
    g.generateTexture('ebullet', 8, 8);
    g.clear().fillStyle(0xffffff).fillRect(0, 0, 2, 2);
    g.generateTexture('spark', 2, 2);
    g.clear().fillStyle(0xffffff).fillRect(0, 0, 1, 1);
    g.generateTexture('blank', 1, 1);
    g.clear().fillStyle(0x000000, 1).fillEllipse(0, 0, 20, 8);
    g.generateTexture('shadow', 20, 8);

    const heart = [
      '.##...##.',
      '#########',
      '#########',
      '#########',
      '.#######.',
      '..#####..',
      '...###...',
      '....#....',
    ];
    g.clear().fillStyle(0xffffff);
    heart.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '#') g.fillRect(x, y, 1, 1);
      });
    });
    g.generateTexture('heart', 9, 8);
    g.destroy();

    this.scene.start('Menu');
  }
}