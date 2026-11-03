import * as Phaser from '../../vendor/phaser.esm.min.js';
import { WEAPONS } from '../data/gameData.js';
import PixelText from '../ui/PixelText.js';
import TouchControls from '../ui/TouchControls.js';

const W = 960;
const H = 540;

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.gs = this.scene.get('Game');
    this.hud = { hp: 1, maxHp: 1, wave: 1, waves: 4, power: 100, maxPower: 100, gates: [], locked: false, weapon: 'PISTOL', weaponFrame: 0, dashReady: 1, score: 0, enemies: 0, nearGate: false, state: 'playing' };
    this.isTouch = !!this.gs.isTouch;
    this.layout = this.isTouch
      ? {
        power: { x: 10, y: 96, w: 292 },
        dash: { x: W - 196, y: 96, w: 186 },
      }
      : {
        power: { x: 10, y: H - 86, w: 292 },
        dash: { x: W - 196, y: H - 86, w: 186 },
      };
    this.overlay = null;
    this.resultOpen = false;
    this.hearts = [];
    this.heartState = '';

    this.buildStatus();
    this.buildWeapon();
    this.buildPower();
    this.buildDash();
    if (!this.isTouch) this.buildHint();

    if (this.isTouch) {
      this.touchCtl = new TouchControls(this, this.gs);
    }

    this.game.events.on('hud', this.onHud, this);
    this.game.events.on('showUpgrades', this.onShowUpgrades, this);
    this.game.events.on('toast', this.onToast, this);
    this.game.events.on('gameover', this.onGameOver, this);
    this.game.events.on('victory', this.onVictory, this);

    this.events.once('shutdown', () => {
      this.game.events.off('hud', this.onHud, this);
      this.game.events.off('showUpgrades', this.onShowUpgrades, this);
      this.game.events.off('toast', this.onToast, this);
      this.game.events.off('gameover', this.onGameOver, this);
      this.game.events.off('victory', this.onVictory, this);
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.resultOpen) return;
      this.backToMenu();
    });
    this.input.keyboard.on('keydown-R', () => {
      if (!this.resultOpen) return;
      this.restartRun();
    });

    this.gs.publishHud();
  }

  panel(x, y, w, h) {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(0x201b2e, 0.88).fillRoundedRect(x, y, w, h, 6);
    g.lineStyle(2, 0x5b4d7d, 0.9).strokeRoundedRect(x, y, w, h, 6);
    return g;
  }

  buildStatus() {
    this.panel(10, 10, 330, 78);

    const ringFrames = [0, 1, 2, 18, 19, 20, 36, 37, 38];
    const scale = 1.1;
    const cell = 16 * scale;
    ringFrames.forEach((frame, i) => {
      const c = i % 3;
      const r = Math.floor(i / 3);
      this.add.image(18 + c * cell, 16 + r * cell, 'ui', frame)
        .setOrigin(0)
        .setScale(scale)
        .setDepth(11);
    });

    this.portrait = this.add.sprite(18 + cell * 1.5, 16 + cell * 1.5, 'players', (this.gs.charIndex ?? 0) * 4)
      .setScale(1.05)
      .setDepth(12);

    this.charName = new PixelText(this, 94, 18, 'CAT', { size: 10 }).setDepth(12);
    this.charName.setText(this.gs.char?.name ?? 'CAT');

    this.waveLabel = new PixelText(this, 96, 60, 'WAVE 1/4', { size: 8 }).setDepth(12);
    this.enemyLabel = new PixelText(this, 200, 60, 'ENEMIES 0', { size: 8 }).setDepth(12);
  }

  buildWeapon() {
    this.panel(W - 214, 10, 204, 70);
    this.weaponIcon = this.add.image(W - 186, 45, 'weapons', 0).setScale(1.5).setDepth(12);
    this.weaponLabel = new PixelText(this, W - 152, 22, 'PISTOL', { size: 12 }).setDepth(12);
    this.scoreLabel = new PixelText(this, W - 152, 46, 'SCORE 0', { size: 9 }).setDepth(12);
  }

  buildPower() {
    const { x, y, w } = this.layout.power;
    this.panel(x, y, w, 76);
    new PixelText(this, x + 14, y + 8, 'POWER', { size: 10 }).setDepth(12);
    this.powerText = new PixelText(this, x + w - 6, y + 8, '100/100', { size: 8, align: 'right' }).setDepth(12);
    this.powerBar = this.add.graphics().setDepth(12);

    this.gateLabels = ['L', 'T', 'R'].map((id, i) => {
      const gx = x + 14 + i * 52;
      const box = this.add.graphics().setDepth(12);
      const label = new PixelText(this, gx + 14, y + 52, id, { size: 9, align: 'center' }).setDepth(13);
      const badge = new PixelText(this, gx + 32, y + 54, '', { size: 8 }).setDepth(13);
      return { id, x: gx, y: y + 50, box, label, badge };
    });
  }

  buildDash() {
    const { x, y, w } = this.layout.dash;
    this.panel(x, y, w, 76);
    new PixelText(this, x + 14, y + 8, 'DASH', { size: 10 }).setDepth(12);
    this.dashBar = this.add.graphics().setDepth(12);
    this.dashRect = { x: x + 14, y: y + 34, w: w - 34, h: 14 };
  }

  buildHint() {
    this.hint = new PixelText(this, W / 2, H - 22, 'WASD MOVE  MOUSE SHOOT  SPACE DASH  E GATE', { size: 8, align: 'center' })
      .setDepth(12)
      .setAlpha(0.55);
    this.tweens.add({ targets: this.hint, alpha: 0.18, delay: 9000, duration: 1200 });
  }

  onHud(data) {
    this.hud = data;
    this.refresh();
  }

  refresh() {
    const h = this.hud;

    this.waveLabel.setText(`WAVE ${h.wave}/${h.waves}`);
    this.enemyLabel.setText(`ENEMIES ${h.enemies}`);
    this.weaponLabel.setText(h.weapon);
    this.weaponIcon.setFrame(h.weaponFrame);
    this.scoreLabel.setText(`SCORE ${h.score}`);
    this.powerText.setText(`${h.power}/${h.maxPower}`);

    const ratio = Phaser.Math.Clamp(h.power / h.maxPower, 0, 1);
    const low = ratio < 0.25;
    const px = this.layout.power.x + 14;
    const py = this.layout.power.y + 32;
    const pw = this.layout.power.w - 34;
    this.powerBar.clear();
    this.powerBar.fillStyle(0x120f1c, 1).fillRoundedRect(px, py, pw, 16, 4);
    this.powerBar.fillStyle(h.locked ? 0xff5a4d : low ? 0xff7a5c : 0xff8a3d, 1)
      .fillRoundedRect(px + 2, py + 2, Math.max(2, (pw - 4) * ratio), 12, 3);
    this.powerBar.lineStyle(1, 0x5b4d7d, 1).strokeRoundedRect(px, py, pw, 16, 4);

    h.gates.forEach((gate) => {
      const entry = this.gateLabels.find((g) => g.id === gate.id);
      if (!entry) return;
      const color = gate.closed ? 0xff8a3d : 0x63d6b4;
      entry.box.clear();
      entry.box.fillStyle(color, 0.9).fillRoundedRect(entry.x, entry.y, 28, 20, 4);
      entry.box.lineStyle(1, 0x2a2238, 1).strokeRoundedRect(entry.x, entry.y, 28, 20, 4);
      entry.label.setAlpha(0.9);
      entry.badge.setText(gate.near > 0 ? String(gate.near) : '');
      entry.badge.setAlpha(0.95);
    });

    this.refreshHearts(h);

    const dash = Phaser.Math.Clamp(h.dashReady, 0, 1);
    const dr = this.dashRect;
    this.dashBar.clear();
    this.dashBar.fillStyle(0x120f1c, 1).fillRoundedRect(dr.x, dr.y, dr.w, dr.h, 3);
    this.dashBar.fillStyle(dash >= 1 ? 0x63d6b4 : 0x3f6e7d, 1)
      .fillRoundedRect(dr.x + 2, dr.y + 2, Math.max(2, (dr.w - 4) * dash), dr.h - 4, 2);
    this.dashBar.lineStyle(1, 0x5b4d7d, 1).strokeRoundedRect(dr.x, dr.y, dr.w, dr.h, 3);
  }

  update() {
    if (this.touchCtl) this.touchCtl.update(this.hud);
  }

  refreshHearts(h) {
    const key = `${h.hp}/${h.maxHp}`;
    if (key === this.heartState) return;
    this.heartState = key;

    this.hearts.forEach((icon) => icon.destroy());
    this.hearts = [];
    for (let i = 0; i < h.maxHp; i++) {
      const icon = this.add.image(96 + i * 18, 42, 'heart')
        .setScale(1.5)
        .setDepth(12)
        .setTint(i < h.hp ? 0xff5f6d : 0x4a4258)
        .setAlpha(i < h.hp ? 1 : 0.55);
      this.hearts.push(icon);
    }
    if (this.portrait) {
      this.portrait.play(`player-walk-${this.gs.charIndex ?? 0}`, true);
    }
  }

  onToast(message) {
    const text = new PixelText(this, W / 2, 120, message, { size: 22, align: 'center' })
      .setDepth(150)
      .setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 108,
      duration: 220,
      yoyo: true,
      hold: 900,
      onComplete: () => text.destroy(),
    });
  }

  onShowUpgrades(options) {
    this.game.canvas.style.cursor = 'default';
    this.touchCtl?.setEnabled(false);
    this.overlay = [];

    const dim = this.add.rectangle(0, 0, W, H, 0x0b0912, 0.78).setOrigin(0).setDepth(160);
    const title = new PixelText(this, W / 2, 96, 'CHOOSE ONE', { size: 24, align: 'center' }).setDepth(161);
    this.overlay.push(dim, title);

    const cardW = 260;
    const gap = 30;
    const startX = (W - (cardW * 3 + gap * 2)) / 2;

    const CARD_ICONS = {
      dmg: ['ui', 91], rate: ['ui', 76], speed: ['ui', 78],
      power: ['ui', 58], hp: ['heart', null], dash: ['ui', 77],
    };

    options.forEach((option, i) => {
      const x = startX + i * (cardW + gap);
      const y = 170;
      const card = this.add.container(x, y).setDepth(162);
      const panel = this.add.graphics();
      panel.fillStyle(0x2a2340, 0.98).fillRoundedRect(0, 0, cardW, 250, 10);
      panel.lineStyle(2, 0x6a5a92, 1).strokeRoundedRect(0, 0, cardW, 250, 10);

      const accent = this.add.graphics();
      accent.fillStyle(0xff8a3d, 0.9).fillRoundedRect(0, 0, cardW, 6, { tl: 10, tr: 10, bl: 0, br: 0 });

      const index = new PixelText(this, 18, 16, String(i + 1), { size: 18 });
      const cardTitle = new PixelText(this, cardW / 2, 60, option.title, { size: 13, align: 'center' });

      const iconSpec = option.weapon
        ? ['weapons', WEAPONS[option.weapon].frame]
        : CARD_ICONS[option.id] || ['ui', 91];
      const icon = iconSpec[0] === 'heart'
        ? this.add.image(cardW / 2, 112, 'heart').setScale(3.4).setTint(0xff5f6d)
        : this.add.image(cardW / 2, 112, iconSpec[0], iconSpec[1])
          .setScale(iconSpec[0] === 'weapons' ? 2.2 : 2.6);

      const desc = this.add.text(cardW / 2, 148, option.desc, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#b9aed6',
        align: 'center',
        wordWrap: { width: cardW - 40 },
        lineSpacing: 6,
      }).setOrigin(0.5, 0);

      const keyHint = new PixelText(this, cardW / 2, 218, this.isTouch ? 'TAP' : `PRESS ${i + 1}`, { size: 9, align: 'center' }).setAlpha(0.7);

      card.add([panel, accent, index, cardTitle, icon, desc, keyHint]);
      card.setSize(cardW, 250);

      const hoverIn = () => {
        this.game.canvas.style.cursor = 'pointer';
        panel.clear();
        panel.fillStyle(0x372d52, 1).fillRoundedRect(0, 0, cardW, 250, 10);
        panel.lineStyle(3, 0xff8a3d, 1).strokeRoundedRect(0, 0, cardW, 250, 10);
        card.setY(y - 6);
      };
      const hoverOut = () => {
        this.game.canvas.style.cursor = 'default';
        panel.clear();
        panel.fillStyle(0x2a2340, 0.98).fillRoundedRect(0, 0, cardW, 250, 10);
        panel.lineStyle(2, 0x6a5a92, 1).strokeRoundedRect(0, 0, cardW, 250, 10);
        card.setY(y);
      };

      const zone = this.add.zone(x + cardW / 2, y + 125, cardW, 250)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(163);
      zone.on('pointerover', hoverIn);
      zone.on('pointerout', hoverOut);
      zone.on('pointerdown', () => this.pickUpgrade(option));

      this.overlay.push(card, zone);
    });

    this.upgradeKeys = options.map((option, i) => {
      const event = ['keydown-ONE', 'keydown-TWO', 'keydown-THREE'][i];
      const handler = () => this.pickUpgrade(option);
      this.input.keyboard.on(event, handler);
      return { event, handler };
    });
    this.pendingOptions = options;
  }

  pickUpgrade(option) {
    if (!option || !this.overlay) return;
    this.game.canvas.style.cursor = this.isTouch ? 'default' : 'none';
    this.sound.play('select-a', { volume: 0.4 });
    this.upgradeKeys?.forEach(({ event, handler }) => this.input.keyboard.off(event, handler));
    this.upgradeKeys = null;
    this.overlay.forEach((obj) => obj.destroy());
    this.overlay = null;
    this.gs.onUpgradePicked(option);
    this.scene.resume('Game');
    this.touchCtl?.setEnabled(true);
  }

  onGameOver(result) {
    this.showResult('OUTPOST LOST', '哨站失守', result);
  }

  onVictory(result) {
    this.showResult('OUTPOST HELD', '四波守住了，前哨还在', result);
  }

  showResult(title, subtitle, result) {
    this.resultOpen = true;
    this.game.canvas.style.cursor = 'default';
    this.touchCtl?.setEnabled(false);
    this.overlay = [];

    const dim = this.add.rectangle(0, 0, W, H, 0x0b0912, 0.85).setOrigin(0).setDepth(170);
    const titleText = new PixelText(this, W / 2, 150, title, { size: 30, align: 'center' }).setDepth(171);
    const sub = this.add.text(W / 2, 200, subtitle, {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#b9aed6',
    }).setOrigin(0.5, 0).setDepth(171);
    const score = new PixelText(this, W / 2, 252, `SCORE ${result.score}`, { size: 16, align: 'center' }).setDepth(171);
    const wave = new PixelText(this, W / 2, 286, `WAVE ${result.wave ?? this.hud.waves}/${this.hud.waves}`, { size: 11, align: 'center' }).setDepth(171);
    this.overlay.push(dim, titleText, sub, score, wave);

    const button = (y, label, handler) => {
      const rect = this.add.rectangle(W / 2, y, 240, 44, 0x2a2340)
        .setStrokeStyle(2, 0x6a5a92, 1)
        .setDepth(171);
      const text = new PixelText(this, W / 2, y - 7, label, { size: 13, align: 'center' }).setDepth(172);
      const zone = this.add.zone(W / 2, y, 240, 44)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(173);
      zone.on('pointerdown', handler);
      zone.on('pointerover', () => rect.setFillStyle(0x3a2f52, 1));
      zone.on('pointerout', () => rect.setFillStyle(0x2a2340, 1));
      this.overlay.push(rect, text, zone);
    };

    button(360, 'R  RETRY', () => this.restartRun());
    button(418, 'ESC  MENU', () => this.backToMenu());
  }

  restartRun() {
    const charIndex = this.gs.charIndex;
    this.scene.stop('Hud');
    this.scene.stop('Game');
    this.scene.start('Game', { charIndex });
  }

  backToMenu() {
    this.scene.stop('Hud');
    this.scene.stop('Game');
    this.scene.start('Menu');
  }
}