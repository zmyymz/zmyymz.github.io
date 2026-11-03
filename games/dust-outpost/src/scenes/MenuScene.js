import * as Phaser from '../../vendor/phaser.esm.min.js';
import { CHARACTERS } from '../data/gameData.js';
import PixelText from '../ui/PixelText.js';
import { isTouchDevice } from '../ui/device.js';

const W = 960;
const H = 540;

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
    this.selected = 0;
  }

  create() {
    this.game.canvas.style.cursor = 'default';
    this.selected = 0;

    this.add.rectangle(0, 0, W, H, 0x1a1726).setOrigin(0);
    this.drawBackdrop();

    new PixelText(this, W / 2, 46, 'DUST OUTPOST', { size: 44, align: 'center' });
    this.add.text(W / 2, 108, '沙漠前哨 · 双摇杆 roguelite 原型', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#9d8fbe',
    }).setOrigin(0.5, 0);

    new PixelText(this, W / 2, 142, 'SELECT YOUR GUARDIAN', { size: 12, align: 'center' });

    const cardW = 200;
    const gap = 16;
    const startX = (W - (cardW * 4 + gap * 3)) / 2;
    this.cards = [];

    CHARACTERS.forEach((char, i) => {
      const x = startX + i * (cardW + gap);
      const y = 182;
      const g = this.add.graphics();
      const card = this.add.container(x, y);

      const panel = this.add.graphics();
      card.add(panel);

      const portrait = this.add.sprite(cardW / 2, 84, 'players', char.id * 4).setScale(3);
      portrait.play(`player-walk-${char.id}`);
      card.add(portrait);

      const name = new PixelText(this, cardW / 2, 130, char.name, { size: 16, align: 'center' });
      const role = new PixelText(this, cardW / 2, 154, char.role, { size: 8, align: 'center', color: 'purple' });
      const passive = new PixelText(this, cardW / 2, 172, char.passive, { size: 8, align: 'center' });
      const desc = this.add.text(cardW / 2, 190, char.desc, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#a99fc4',
        align: 'center',
        wordWrap: { width: cardW - 28 },
      }).setOrigin(0.5, 0);
      const key = new PixelText(this, 14, 10, String(i + 1), { size: 12 });

      card.add([name, role, passive, desc, key]);
      card.setSize(cardW, 236);

      const zone = this.add.zone(x + cardW / 2, y + 118, cardW, 236)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.select(i));
      zone.on('pointerover', () => { this.game.canvas.style.cursor = 'pointer'; });
      zone.on('pointerout', () => { this.game.canvas.style.cursor = 'default'; });

      this.cards.push({ card, panel, zone });
    });

    this.add.rectangle(W / 2, 452, 220, 48, 0xff8a3d)
      .setStrokeStyle(2, 0xffd8a8, 0.9);
    const dText = new PixelText(this, W / 2, 441, 'DEPLOY', { size: 18, align: 'center' });
    const dZone = this.add.zone(W / 2, 452, 220, 48).setOrigin(0.5).setInteractive({ useHandCursor: true });
    dZone.on('pointerdown', () => this.start());
    dZone.on('pointerover', () => dText.setAlpha(0.8));
    dZone.on('pointerout', () => dText.setAlpha(1));

    this.isTouch = isTouchDevice();
    this.add.text(W / 2, 496, this.isTouch
      ? '左摇杆移动 · 右摇杆瞄准并射击 · DASH 冲刺 · 靠近闸门出现 GATE · 点击卡片选角'
      : 'WASD 移动 · 鼠标瞄准与射击 · SPACE 冲刺 · E 开关闸门 · 点击卡片选角 · ENTER/点击 DEPLOY 出战', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#6f6389',
      align: 'center',
      wordWrap: { width: W - 120 },
    }).setOrigin(0.5, 0);

    if (this.isTouch && this.scale.fullscreen.available) {
      const fs = this.add.text(W - 24, 18, '全屏', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#b9aed6',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      fs.on('pointerdown', () => {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      });
    }

    this.input.keyboard.on('keydown-ONE', () => this.select(0));
    this.input.keyboard.on('keydown-TWO', () => this.select(1));
    this.input.keyboard.on('keydown-THREE', () => this.select(2));
    this.input.keyboard.on('keydown-FOUR', () => this.select(3));
    this.input.keyboard.on('keydown-ENTER', () => this.start());
    this.input.keyboard.on('keydown-SPACE', () => this.start());
    this.input.keyboard.on('keydown-LEFT', () => this.select((this.selected + 3) % 4));
    this.input.keyboard.on('keydown-RIGHT', () => this.select((this.selected + 1) % 4));

    this.select(0);
    if (this.autoStart()) return;
  }

  autoStart() {
    const params = new URLSearchParams(location.search);
    if (params.get('scene') !== 'game') return false;
    this.scene.start('Game', { charIndex: Number(params.get('char') || 0) });
    return true;
  }

  drawBackdrop() {
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0);
    const sandFrames = [42, 43, 44, 45, 73];
    for (let y = 0; y < H; y += 16) {
      for (let x = 0; x < W; x += 16) {
        const nearBottom = y > H - 96;
        if (!nearBottom && (x + y) % 64 !== 0) continue;
        const frame = sandFrames[Math.floor(Math.random() * sandFrames.length)];
        rt.drawFrame('tiles', frame, x, y).setAlpha(0.10);
      }
    }
    const props = [[70, 500, 62], [130, 470, 66], [850, 500, 63], [905, 470, 82], [500, 512, 80], [410, 500, 57]];
    props.forEach(([x, y, f]) => this.add.image(x, y, 'tiles', f).setAlpha(0.35).setScale(2));
  }

  select(i) {
    this.selected = i;
    this.cards.forEach((entry, idx) => {
      const active = idx === i;
      entry.panel.clear();
      entry.panel.fillStyle(active ? 0x3a2f52 : 0x241f33, active ? 1 : 0.82);
      entry.panel.fillRoundedRect(0, 0, 200, 236, 8);
      entry.panel.lineStyle(active ? 3 : 2, active ? 0xff8a3d : 0x4b4066, 1);
      entry.panel.strokeRoundedRect(0, 0, 200, 236, 8);
      const y = active ? 172 : 182;
      entry.card.setY(y);
      entry.zone.setY(y + 118);
    });
  }

  start() {
    this.sound.play('select-a', { volume: 0.4 });
    this.scene.start('Game', { charIndex: this.selected });
  }
}