import { chipDims, drawChip } from './assets.js';

// 16 枚筹码填满一座塔，每 2 枚换一种面额配色
const PALETTE = [
  'chipWhite', 'chipRedWhite', 'chipGreen', 'chipGreenWhite',
  'chipBlue', 'chipBlueWhite', 'chipBlackWhite', 'chipWhiteBlue',
];
const SLOTS = 16;
const PER_BAND = SLOTS / PALETTE.length;

export class Tower {
  constructor({ x, baseY, maxH, unit, ghost = false }) {
    this.x = x;
    this.baseY = baseY;
    this.maxH = maxH;
    this.unit = unit;
    this.ghost = ghost;
    this.value = 0;
    this.target = 0;
    this.flow = 0;
  }

  setValue(v) {
    this.target = Math.max(0, v);
  }

  snap(v) {
    this.value = v;
    this.target = v;
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * 6.5);
    this.value += (this.target - this.value) * k;
    if (Math.abs(this.target - this.value) < 0.6) this.value = this.target;

    this.flow += dt;
  }

  count() {
    if (this.unit <= 0) return 0;
    return Math.min(SLOTS + 4, Math.max(0, Math.ceil(this.value / this.unit - 0.0001)));
  }

  draw(ctx, { alpha = 1 } = {}) {
    const n = this.count();
    const side = chipDims('chipWhite_side');
    const ratio = side.h / side.w;
    const baseStep = this.maxH / SLOTS;
    const chipW = Math.min(118, baseStep / 0.52 / ratio);
    const chipH = chipW * ratio;
    // 超出目标时压缩间距，让塔始终呆在它该在的高度里
    const step = n > SLOTS ? (this.maxH - chipH) / Math.max(1, n - 1) : baseStep;

    ctx.save();
    // 对方塔用预先算好的暗色，不用整体透明度：路径内部重叠会把透明度叠花
    ctx.globalAlpha = this.ghost ? alpha : 1;

    // 桌面上的投影
    const shadowW = chipW * 1.15;
    const g = ctx.createRadialGradient(this.x, this.baseY, 2, this.x, this.baseY, shadowW);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(this.x, this.baseY, shadowW, shadowW * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < n; i++) {
      const name = PALETTE[Math.min(PALETTE.length - 1, Math.floor(i / PER_BAND))] + '_side';
      const y = this.baseY - i * step - chipH;
      drawChip(ctx, name, this.x - chipW / 2, y, chipW, chipH, this.ghost ? 0.72 : 0);
    }

    // 塔顶的一道高光，提示“这里还在长”
    if (n > 0) {
      const topY = this.baseY - (n - 1) * step - chipH;
      const pulse = 0.25 + 0.2 * Math.sin(this.flow * 3);
      ctx.globalAlpha = alpha * pulse * (this.ghost ? 0.4 : 1);
      ctx.fillStyle = '#ffe9b7';
      ctx.beginPath();
      ctx.ellipse(this.x, topY + chipH * 0.12, chipW * 0.44, chipH * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}