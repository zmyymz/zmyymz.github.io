import * as Phaser from '../../vendor/phaser.esm.min.js';
import PixelText from './PixelText.js';

const W = 960;
const H = 540;

const IDLE_MOVE = { x: 150, y: H - 112 };
const IDLE_AIM = { x: W - 150, y: H - 112 };

export default class TouchControls {
  constructor(scene, gameScene) {
    this.scene = scene;
    this.gs = gameScene;
    this.enabled = true;
    this.radius = 66;
    this.deadzone = 10;

    scene.input.addPointer(3);

    this.move = { id: null, baseX: 0, baseY: 0, x: 0, y: 0, kx: 0, ky: 0 };
    this.aimS = { id: null, baseX: 0, baseY: 0, x: 0, y: 0, kx: 0, ky: 0 };

    this.dashBtn = { x: W - 76, y: H - 198, r: 34, held: false };
    this.gateBtn = { x: W / 2, y: H - 56, r: 36, visible: false, held: false };

    this.gfx = scene.add.graphics().setDepth(20);
    this.dashLabel = new PixelText(scene, this.dashBtn.x, this.dashBtn.y - 7, 'DASH', { size: 10, align: 'center' }).setDepth(21);
    this.gateLabel = new PixelText(scene, this.gateBtn.x, this.gateBtn.y - 7, 'GATE', { size: 10, align: 'center' }).setDepth(21).setVisible(false);
    this.hintMove = new PixelText(scene, IDLE_MOVE.x, IDLE_MOVE.y - 6, 'MOVE', { size: 8, align: 'center' }).setDepth(21).setAlpha(0.3);
    this.hintAim = new PixelText(scene, IDLE_AIM.x, IDLE_AIM.y - 6, 'AIM', { size: 8, align: 'center' }).setDepth(21).setAlpha(0.3);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);

    this.resetSticks();
  }

  setEnabled(value) {
    this.enabled = value;
    this.gfx.setVisible(value);
    this.dashLabel.setVisible(value);
    this.gateLabel.setVisible(value && this.gateBtn.visible);
    this.hintMove.setVisible(value);
    this.hintAim.setVisible(value);
    if (!value) {
      this.resetSticks();
      this.gateBtn.visible = false;
      this.dashBtn.held = false;
    }
  }

  setGateAvailable(value) {
    this.gateBtn.visible = !!value && this.enabled;
    this.gateLabel.setVisible(this.gateBtn.visible);
  }

  inside(p, btn, pad = 0) {
    return Phaser.Math.Distance.Between(p.x, p.y, btn.x, btn.y) <= btn.r + pad;
  }

  onDown(pointer) {
    if (!this.enabled) return;
    const p = { x: pointer.x, y: pointer.y };

    if (this.gateBtn.visible && this.inside(p, this.gateBtn, 12)) {
      this.gateBtn.held = true;
      this.gs.touch.gateQueued = true;
      return;
    }
    if (this.inside(p, this.dashBtn, 10)) {
      this.dashBtn.held = true;
      this.gs.touch.dashQueued = true;
      return;
    }
    if (p.y < H * 0.33) return;

    if (p.x < W * 0.5) this.startStick(this.move, pointer);
    else this.startStick(this.aimS, pointer);
  }

  startStick(stick, pointer) {
    if (stick.id !== null) return;
    stick.id = pointer.id;
    stick.baseX = pointer.x;
    stick.baseY = pointer.y;
    stick.x = pointer.x;
    stick.y = pointer.y;
    stick.kx = pointer.x;
    stick.ky = pointer.y;
    this.applyStick(stick);
  }

  onMove(pointer) {
    if (!this.enabled) return;
    if (this.move.id === pointer.id) {
      this.move.x = pointer.x;
      this.move.y = pointer.y;
      this.applyStick(this.move);
    } else if (this.aimS.id === pointer.id) {
      this.aimS.x = pointer.x;
      this.aimS.y = pointer.y;
      this.applyStick(this.aimS);
    }
  }

  onUp(pointer) {
    if (this.move.id === pointer.id) {
      this.move.id = null;
      this.gs.touch.moveX = 0;
      this.gs.touch.moveY = 0;
      this.gs.touch.moving = false;
    }
    if (this.aimS.id === pointer.id) {
      this.aimS.id = null;
      this.gs.touch.aimActive = false;
      this.gs.touch.firing = false;
    }
    if (this.dashBtn.held) this.dashBtn.held = false;
    if (this.gateBtn.held) this.gateBtn.held = false;
  }

  applyStick(stick) {
    const dx = stick.x - stick.baseX;
    const dy = stick.y - stick.baseY;
    const len = Math.hypot(dx, dy);
    const mag = Phaser.Math.Clamp((len - this.deadzone) / (this.radius - this.deadzone), 0, 1);

    if (len > 0.001) {
      const clamp = Math.min(len, this.radius);
      stick.kx = stick.baseX + (dx / len) * clamp;
      stick.ky = stick.baseY + (dy / len) * clamp;
    } else {
      stick.kx = stick.baseX;
      stick.ky = stick.baseY;
    }

    if (stick === this.move) {
      this.gs.touch.moving = mag > 0;
      this.gs.touch.moveX = len > 0.001 ? (dx / len) * mag : 0;
      this.gs.touch.moveY = len > 0.001 ? (dy / len) * mag : 0;
    } else {
      this.gs.touch.aimActive = true;
      this.gs.touch.firing = true;
      if (len > this.deadzone) {
        this.gs.touch.aimX = dx / len;
        this.gs.touch.aimY = dy / len;
      }
    }
  }

  resetSticks() {
    this.move.id = null;
    this.aimS.id = null;
    this.gs.touch.moveX = 0;
    this.gs.touch.moveY = 0;
    this.gs.touch.moving = false;
    this.gs.touch.aimActive = false;
    this.gs.touch.firing = false;
  }

  drawButton(btn, color, active, label) {
    const g = this.gfx;
    g.fillStyle(0x1a1626, active ? 0.62 : 0.42).fillCircle(btn.x, btn.y, btn.r);
    g.lineStyle(2, color, active ? 0.95 : 0.6).strokeCircle(btn.x, btn.y, btn.r);
    g.fillStyle(color, active ? 0.5 : 0.22).fillCircle(btn.x, btn.y, btn.r - 5);
    label.setAlpha(active ? 1 : 0.85);
  }

  drawStick(stick, idleX, idleY, label) {
    const g = this.gfx;
    const active = stick.id !== null;
    const bx = active ? stick.baseX : idleX;
    const by = active ? stick.baseY : idleY;
    const kx = active ? stick.kx : idleX;
    const ky = active ? stick.ky : idleY;
    const alpha = active ? 1 : 0.45;

    g.fillStyle(0x2a2340, 0.28 * alpha).fillCircle(bx, by, this.radius);
    g.lineStyle(2, 0x8a7bb8, 0.5 * alpha).strokeCircle(bx, by, this.radius);
    g.fillStyle(0xc8b8e8, active ? 0.5 : 0.22).fillCircle(kx, ky, 24);
    g.lineStyle(2, 0xffffff, active ? 0.7 : 0.3).strokeCircle(kx, ky, 24);

    label.setPosition(bx, by - 6).setAlpha(active ? 0 : 0.3);
  }

  update(hud) {
    if (!this.enabled) return;
    this.gfx.clear();

    this.setGateAvailable(hud.nearGate);

    const dashReady = hud.dashReady >= 1;
    this.drawButton(
      this.dashBtn,
      dashReady ? 0x63d6b4 : 0x3f6e7d,
      this.dashBtn.held,
      this.dashLabel,
    );
    if (this.gateBtn.visible) {
      this.drawButton(this.gateBtn, 0xff8a3d, this.gateBtn.held, this.gateLabel);
    }

    this.drawStick(this.move, IDLE_MOVE.x, IDLE_MOVE.y, this.hintMove);
    this.drawStick(this.aimS, IDLE_AIM.x, IDLE_AIM.y, this.hintAim);
  }
}