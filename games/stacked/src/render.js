import { W, H, THEME, FLOORS } from './config.js';
import { A, cardFrame, chipDims, drawChip, pieceArt } from './assets.js';
import { COLORS, SHAPES, LEVEL_LABEL, engravingDesc, canEngrave } from './engravings.js';
import { Tower } from './tower.js';
import { sfx } from './audio.js';

const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';

const HAND_Y = 626;
const HAND_CW = 126;
const HAND_CH = 171;
const HAND_GAP = 130;
const HAND_LIFT = 38;

const PLAY_Y = 118;
const PLAY_CW = 148;
const PLAY_CH = 201;
const PLAY_GAP = 158;

const BTN_Y = 502;
const BTN_H = 66;
const BTN_W = 176;

const TOP = 78;

function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function text(ctx, str, x, y, opts = {}) {
  const {
    size = 22, weight = 600, color = THEME.ink,
    align = 'left', baseline = 'middle', alpha = 1, spacing = 0,
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (spacing) {
    let cx = x;
    const chars = [...String(str)];
    const widths = chars.map((ch) => ctx.measureText(ch).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    if (align === 'center') cx = x - total / 2;
    if (align === 'right') cx = x - total;
    ctx.textAlign = 'left';
    chars.forEach((ch, i) => {
      ctx.fillText(ch, cx, y);
      cx += widths[i];
    });
  } else {
    ctx.fillText(str, x, y);
  }
  ctx.restore();
}

function measure(ctx, str, size, weight = 600) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

function handLayout(n) {
  const total = (n - 1) * HAND_GAP + HAND_CW;
  const x0 = W / 2 - total / 2;
  const mid = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = mid === 0 ? 0 : (i - mid) / mid;
    return {
      x: x0 + i * HAND_GAP,
      y: HAND_Y + t * t * 14,
      w: HAND_CW,
      h: HAND_CH,
      angle: t * 0.055,
    };
  });
}

function playLayout(n) {
  const total = (n - 1) * PLAY_GAP + PLAY_CW;
  const x0 = W / 2 - total / 2;
  return Array.from({ length: n }, (_, i) => ({
    x: x0 + i * PLAY_GAP, y: PLAY_Y, w: PLAY_CW, h: PLAY_CH, angle: 0,
  }));
}

function inRotated(r, px, py) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const a = -(r.angle || 0);
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2;
}

export class Renderer {
  constructor() {
    this.left = new Tower({ x: 138, baseY: 826, maxH: 452, unit: 20 });
    this.right = new Tower({ x: 1462, baseY: 826, maxH: 452, unit: 20, ghost: true });
    this.particles = [];
    this.floats = [];
    this.buttons = [];
    this.betButtons = [];
    this.shopRects = [];
    this.pickRects = [];
    this.hoverCard = -1;
    this.hoverButton = null;
    this.time = 0;
    this.roundKey = '';
    this.sincePhase = 0;
    this.shakeT = 0;
    this.bg = this.makeNoise();
    this.bgCanvas = null;
    this.bgDpr = 0;
    this.shadowCache = new Map();
  }

  dpr() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  cardShadow(w, h) {
    const key = `${Math.round(w)}x${Math.round(h)}`;
    let cv = this.shadowCache.get(key);
    if (cv) return cv;

    const pad = 26;
    w = Math.round(w);
    h = Math.round(h);
    cv = document.createElement('canvas');
    cv.width = w + pad * 2;
    cv.height = h + pad * 2;
    const g = cv.getContext('2d');
    g.shadowColor = 'rgba(0, 0, 0, 0.42)';
    g.shadowBlur = 13;
    g.shadowOffsetY = 7;
    roundRect(g, pad, pad, w, h, 10);
    g.fillStyle = '#000';
    g.fill();

    this.shadowCache.set(key, cv);
    return cv;
  }

  makeNoise() {
    const c = document.createElement('canvas');
    c.width = c.height = 180;
    const g = c.getContext('2d');
    const img = g.createImageData(180, 180);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 90;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 10;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ---------- 交互区域 ----------

  cardAt(x, y, game) {
    if (game.phase !== 'play') return -1;
    const layout = handLayout(game.hand.length);
    for (let i = layout.length - 1; i >= 0; i--) {
      const r = { ...layout[i] };
      if (game.selected.has(i)) r.y -= HAND_LIFT;
      if (inRotated(r, x, y)) return i;
    }
    return -1;
  }

  buttonAt(x, y) {
    for (const b of [...this.buttons, ...this.betButtons]) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  offerAt(x, y) {
    const i = this.shopRects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    return i;
  }

  pickAt(x, y) {
    const i = this.pickRects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    return i;
  }

  // ---------- 状态同步 ----------

  onPlayed(game) {
    const res = game.lastResult;
    if (!res) return;
    this.burst(Math.min(14, 4 + Math.round(res.total / 40)), { x: W / 2, y: 300 }, { x: 138, y: 800 });
    this.pushFloat(`+${fmt(res.total)}`, W / 2, 300, THEME.gold, 34);
  }

  burst(count, from, to) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        chip: ['chipWhite', 'chipRedWhite', 'chipGreen', 'chipBlue'][i % 4],
        from: { x: from.x + (Math.random() - 0.5) * 260, y: from.y + (Math.random() - 0.5) * 120 },
        to: { x: to.x + (Math.random() - 0.5) * 26, y: to.y - Math.random() * 60 },
        t: -i * 0.045,
        dur: 0.55 + Math.random() * 0.2,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 8,
        size: 34 + Math.random() * 12,
        landed: false,
      });
    }
  }

  pushFloat(str, x, y, color, size = 28) {
    this.floats.push({ str, x, y, color, size, t: 0, dur: 1.15 });
  }

  update(dt, game) {
    this.time += dt;
    this.sincePhase += dt;

    const key = `${game.floor}:${game.blind}:${game.phase}`;
    if (key !== this.roundKey) {
      this.roundKey = key;
      this.sincePhase = 0;
      const unit = Math.max(1, game.target / 16);
      this.left.unit = unit;
      this.right.unit = unit;
      if (game.phase === 'bet') {
        this.left.snap(game.roundScore);
        this.right.snap(game.target);
      }
    }

    this.left.setValue(game.roundScore);
    this.right.setValue(game.target);
    this.left.update(dt);
    this.right.update(dt);

    for (const p of this.particles) {
      p.t += dt;
      if (!p.landed && p.t >= p.dur) {
        p.landed = true;
        if (Math.random() < 0.55) sfx('chipsCollide', { gain: 0.22, rate: 1.1 });
      }
    }
    this.particles = this.particles.filter((p) => p.t < p.dur + 0.25);

    for (const f of this.floats) {
      f.t += dt;
      f.y -= dt * 42;
    }
    this.floats = this.floats.filter((f) => f.t < f.dur);

    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
  }

  // ---------- 绘制 ----------

  draw(ctx, game) {
    this.buttons = [];
    this.betButtons = [];
    this.shopRects = [];
    this.pickRects = [];

    ctx.save();
    if (this.shakeT > 0) {
      const k = this.shakeT * 10;
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }

    this.drawTable(ctx);
    this.drawTopBar(ctx, game);
    const showOutcome = (game.phase === 'won' || game.phase === 'lost'
      || game.phase === 'over' || game.phase === 'clear') && this.sincePhase > 0.75;

    this.drawTowers(ctx, game);
    this.drawPlayed(ctx, game);
    if (!showOutcome) this.drawScorePanel(ctx, game);
    this.drawHand(ctx, game);
    this.drawParticles(ctx);

    if (game.phase === 'play') this.drawActionBar(ctx, game);
    if (game.phase === 'bet') this.drawBetPanel(ctx, game);
    if (game.phase === 'shop') this.drawShop(ctx, game);
    if (game.phase === 'pick') this.drawPicker(ctx, game);
    if (showOutcome) this.drawOutcome(ctx, game);

    this.drawFloats(ctx);
    ctx.restore();
  }

  buildBackground(dpr) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);

    const grad = g.createRadialGradient(W / 2, H * 0.42, 80, W / 2, H * 0.42, W * 0.78);
    grad.addColorStop(0, '#1c4f3f');
    grad.addColorStop(0.55, THEME.felt);
    grad.addColorStop(1, THEME.feltDark);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = g.createPattern(this.bg, 'repeat');
    g.fillRect(0, 0, W, H);
    g.restore();

    const vig = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);

    this.bgCanvas = cv;
    this.bgDpr = dpr;
  }

  drawTable(ctx) {
    const dpr = this.dpr();
    if (!this.bgCanvas || this.bgDpr !== dpr) this.buildBackground(dpr);
    ctx.drawImage(this.bgCanvas, 0, 0, W, H);

    ctx.strokeStyle = 'rgba(230,193,105,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TOP);
    ctx.lineTo(W, TOP);
    ctx.stroke();
  }

  drawTopBar(ctx, game) {
    text(ctx, '叠码', 48, 40, { size: 26, weight: 700, color: THEME.gold, spacing: 3 });
    text(ctx, 'STACKED', 48 + measure(ctx, '叠码', 26, 700) + 14, 42, {
      size: 12, weight: 600, color: THEME.faint, spacing: 3,
    });

    const floorNo = Math.min(game.floor + 1, FLOORS.length);
    text(ctx, `第 ${floorNo} 层`, 250, 40, { size: 21, color: THEME.ink });
    text(ctx, '·', 335, 40, { size: 20, color: THEME.faint });
    text(ctx, game.blindName, 356, 40, { size: 21, weight: 700, color: THEME.gold });

    const cs = 30;
    const stackStr = fmt(game.stack);
    const numW = measure(ctx, stackStr, 24, 700);
    const startX = W - 48 - numW - 22 - cs - 10 - measure(ctx, '筹码', 14);
    const chipH = cs * chipDims('chipWhite').h / chipDims('chipWhite').w;
    drawChip(ctx, 'chipWhite', startX, 40 - chipH / 2, cs, chipH);
    text(ctx, stackStr, startX + cs + 10, 40, { size: 24, weight: 700, color: THEME.ink });
    text(ctx, '筹码', startX + cs + 10 + numW + 8, 42, { size: 14, color: THEME.dim });
  }

  drawTowers(ctx, game) {
    const L = this.left;
    const R = this.right;

    L.draw(ctx);
    R.draw(ctx);

    text(ctx, '你', L.x, 236, { size: 17, color: THEME.dim, align: 'center' });
    text(ctx, fmt(game.roundScore), L.x, 274, {
      size: 30, weight: 700, color: game.roundScore >= game.target ? THEME.green : THEME.ink, align: 'center',
    });
    if (game.stake > 0) {
      text(ctx, `注 ${fmt(game.stake)}`, L.x, 306, { size: 14, color: THEME.goldDim, align: 'center' });
    }
    if (game.phase === 'play') {
      text(ctx, `手 ${game.handsLeft}  ·  弃 ${game.discardsLeft}`, L.x, 338, {
        size: 14, color: THEME.dim, align: 'center',
      });
    }

    text(ctx, '庄家', R.x, 236, { size: 17, color: THEME.dim, align: 'center' });
    text(ctx, fmt(game.target), R.x, 274, { size: 30, weight: 700, color: THEME.gold, align: 'center' });

    const gap = Math.max(0, game.target - game.roundScore);
    text(ctx, gap > 0 ? `还差 ${fmt(gap)}` : '已达成', R.x, 306, {
      size: 14, color: gap > 0 ? THEME.dim : THEME.green, align: 'center',
    });
  }

  drawPlayed(ctx, game) {
    if (!game.played.length) {
      text(ctx, '打出 1–5 张牌，凑出牌型', W / 2, 230, {
        size: 20, color: 'rgba(244,236,217,0.22)', align: 'center', spacing: 2,
      });
      return;
    }
    const layout = playLayout(game.played.length);
    game.played.forEach((card, i) => {
      const r = layout[i];
      this.drawCard(ctx, card, r.x, r.y, r.w, r.h, { angle: r.angle });
    });
  }

  drawCard(ctx, card, x, y, w, h, { angle = 0, selected = false, dim = false, glow = 0 } = {}) {
    const f = cardFrame(card.sprite);
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);

    if (glow > 0) {
      ctx.shadowColor = `rgba(230,193,105,${glow})`;
      ctx.shadowBlur = 26;
    } else {
      ctx.drawImage(this.cardShadow(w, h), -w / 2 - 26, -h / 2 - 26, w + 52, h + 52);
    }

    ctx.drawImage(A.img.cards, f.x, f.y, f.w, f.h, -w / 2, -h / 2, w, h);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    if (dim) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#03110d';
      roundRect(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 10);
      ctx.fill();
    }

    if (selected) {
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 3;
      roundRect(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 11);
      ctx.stroke();
    }

    if (card.bonusChips > 0) {
      ctx.font = `700 ${Math.round(w * 0.12)}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(20, 40, 32, 0.85)';
      roundRect(ctx, -w / 2 + 8, -h / 2 + 8, w * 0.34, w * 0.17, w * 0.05);
      ctx.fill();
      ctx.fillStyle = THEME.gold;
      ctx.fillText(`+${card.bonusChips}`, -w / 2 + 12, -h / 2 + 10);
    }

    if (card.engraving) {
      const c = COLORS[card.engraving.color];
      const art = pieceArt(c.set, card.engraving.shape, card.engraving.level);
      const bs = w * 0.3;
      const bx = -w / 2 + w * 0.055;
      const by = h / 2 - bs - h * 0.055;
      const cx = bx + bs / 2;
      const cy = by + bs / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, bs * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 18, 14, 0.9)';
      ctx.fill();
      ctx.strokeStyle = c.ring;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.drawImage(art.img, art.sx, art.sy, art.sw, art.sh, bx, by, bs, bs);
    }

    ctx.restore();
  }

  drawScorePanel(ctx, game) {
    const res = game.lastResult;
    if (!res) return;
    if (game.phase === 'bet' || game.phase === 'shop' || game.phase === 'pick') return;

    const cx = W / 2;
    const y = 384;

    text(ctx, res.name, cx, y - 26, { size: 22, color: THEME.dim, align: 'center', spacing: 4 });

    const parts = [
      { v: fmt(res.chips), c: THEME.gold },
      { v: '×', c: THEME.faint },
      { v: fmt(res.mult), c: '#e8805f' },
    ];
    if (res.xmult && res.xmult !== 1) parts.push({ v: `×${res.xmult}`, c: '#b58bea' });
    parts.push({ v: '=', c: THEME.faint }, { v: fmt(res.total), c: THEME.ink });

    const size = 40;
    let totalW = 0;
    const widths = parts.map((p) => {
      const w = measure(ctx, p.v, size, 700);
      totalW += w + 16;
      return w;
    });
    totalW -= 16;

    let x = cx - totalW / 2;
    parts.forEach((p, i) => {
      text(ctx, p.v, x, y + 22, { size, weight: 700, color: p.c });
      x += widths[i] + 16;
    });

    if (!game.selected.size && res.log && res.log.length) {
      text(ctx, res.log.slice(0, 5).join('  ·  '), cx, 438, {
        size: 14, color: THEME.dim, align: 'center',
      });
    }
  }

  drawHand(ctx, game) {
    if (game.phase !== 'bet' && game.phase !== 'play') return;

    const layout = handLayout(game.hand.length);
    layout.forEach((r, i) => {
      const selected = game.selected.has(i) && game.phase === 'play';
      const hovered = this.hoverCard === i && game.phase === 'play';
      const dy = selected ? -HAND_LIFT : hovered ? -14 : 0;
      this.drawCard(ctx, game.hand[i], r.x, r.y + dy, r.w, r.h, {
        angle: r.angle,
        selected,
        glow: selected ? 0.5 : 0,
      });
    });
  }

  drawActionBar(ctx, game) {
    const sel = game.selectedCards();
    const preview = sel.length ? game.preview() : null;

    if (preview) {
      const xm = preview.xmult !== 1 ? ` ×${preview.xmult}` : '';
      text(ctx, `${preview.name}  ·  ${fmt(preview.chips)} × ${preview.mult}${xm}  =  ${fmt(preview.total)}`, W / 2, 462, {
        size: 24, weight: 600, color: THEME.gold, align: 'center',
      });
    } else {
      text(ctx, '选 1–5 张牌', W / 2, 476, { size: 18, color: THEME.faint, align: 'center' });
    }

    const cx = W / 2;
    const playBtn = { x: cx - BTN_W - 8, y: BTN_Y, w: BTN_W, h: BTN_H, id: 'play', label: '出牌', enabled: sel.length > 0 };
    const discBtn = { x: cx + 8, y: BTN_Y, w: BTN_W, h: BTN_H, id: 'discard', label: `弃牌 ${game.discardsLeft}`, enabled: sel.length > 0 && game.discardsLeft > 0 };

    for (const b of [playBtn, discBtn]) {
      this.buttons.push(b);
      this.drawButton(ctx, b, { accent: b.id === 'play' });
    }
  }

  drawButton(ctx, b, { accent = false } = {}) {
    const hovered = this.hoverButton === b.id;
    const on = b.enabled;

    ctx.save();
    ctx.globalAlpha = on ? 1 : 0.35;
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.fillStyle = accent
      ? (hovered ? 'rgba(230,193,105,0.26)' : 'rgba(230,193,105,0.14)')
      : (hovered ? 'rgba(244,236,217,0.14)' : 'rgba(244,236,217,0.07)');
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent ? THEME.gold : 'rgba(244,236,217,0.22)';
    ctx.stroke();

    text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, {
      size: 24, weight: 700, color: accent ? THEME.gold : THEME.ink, align: 'center',
    });
    ctx.restore();
  }

  drawBetPanel(ctx, game) {
    const pw = 760;
    const ph = 250;
    const px = W / 2 - pw / 2;
    const py = 268;

    ctx.save();
    roundRect(ctx, px, py, pw, ph, 20);
    ctx.fillStyle = THEME.panel;
    ctx.fill();
    ctx.strokeStyle = THEME.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    text(ctx, `${game.blindName} · 目标 ${fmt(game.target)}`, W / 2, py + 44, {
      size: 26, weight: 700, color: THEME.ink, align: 'center', spacing: 2,
    });
    text(ctx, '推一注筹码上去 —— 这一注就是本局的起始分数', W / 2, py + 82, {
      size: 16, color: THEME.dim, align: 'center',
    });

    const opts = game.betOptions();
    const bw = 190;
    const bh = 92;
    const gap = 26;
    const totalW = opts.length * bw + (opts.length - 1) * gap;
    let x = W / 2 - totalW / 2;

    opts.forEach((o, i) => {
      const b = { x, y: py + 118, w: bw, h: bh, id: `bet${i}`, value: o.value, label: o.label };
      this.betButtons.push(b);

      const hovered = this.hoverButton === b.id;
      const chipName = ['chipWhite', 'chipRedWhite', 'chipGreen'][i % 3];

      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 14);
      ctx.fillStyle = hovered ? 'rgba(230,193,105,0.18)' : 'rgba(244,236,217,0.06)';
      ctx.fill();
      ctx.strokeStyle = hovered ? THEME.gold : 'rgba(244,236,217,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      const cw = 46;
      const chh = cw * chipDims(chipName).h / chipDims(chipName).w;
      drawChip(ctx, chipName, b.x + 20, b.y + bh / 2 - chh / 2, cw, chh);

      text(ctx, o.label, b.x + 78, b.y + bh / 2 - 12, { size: 18, color: THEME.dim });
      text(ctx, fmt(o.value), b.x + 78, b.y + bh / 2 + 18, { size: 28, weight: 700, color: THEME.gold });

      x += bw + gap;
    });

    text(ctx, `牌堆余 ${game.drawPile.length} 张`, W / 2, py + ph - 22, {
      size: 13, color: THEME.faint, align: 'center',
    });
  }

  drawOutcome(ctx, game) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 12, 9, 0.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const pw = 620;
    const ph = 300;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2 + 26;

    ctx.save();
    roundRect(ctx, px, py, pw, ph, 22);
    ctx.fillStyle = THEME.panel;
    ctx.fill();
    ctx.strokeStyle = THEME.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const won = game.phase === 'won';
    const over = game.phase === 'over';
    const clear = game.phase === 'clear';

    let title = won ? '过关' : over ? '出局' : clear ? '通关' : '未达成';
    let color = won || clear ? THEME.gold : THEME.red;

    text(ctx, title, W / 2, py + 74, { size: 46, weight: 700, color, align: 'center', spacing: 8 });

    if (won) {
      text(ctx, `抢回 ${fmt(game.payout)} 筹码`, W / 2, py + 132, { size: 22, color: THEME.ink, align: 'center' });
      text(ctx, `注 ${fmt(game.stake)} × 2  +  余 ${game.handsLeft} 手 × 8`, W / 2, py + 168, {
        size: 15, color: THEME.dim, align: 'center',
      });
    } else if (game.phase === 'lost') {
      text(ctx, `被庄家收走 ${fmt(game.stake)} 筹码`, W / 2, py + 132, { size: 22, color: THEME.red, align: 'center' });
      text(ctx, `剩余筹码 ${fmt(game.stack)}`, W / 2, py + 168, { size: 15, color: THEME.dim, align: 'center' });
    } else if (over) {
      text(ctx, '筹码见底，你被请出了牌桌', W / 2, py + 132, { size: 20, color: THEME.dim, align: 'center' });
      text(ctx, `止步第 ${Math.min(game.floor + 1, FLOORS.length)} 层 · ${game.blindName}`, W / 2, py + 168, {
        size: 15, color: THEME.faint, align: 'center',
      });
    } else {
      text(ctx, `六层全部打完，最终筹码 ${fmt(game.stack)}`, W / 2, py + 140, {
        size: 20, color: THEME.dim, align: 'center',
      });
    }

    const b = {
      x: W / 2 - 110, y: py + ph - 96, w: 220, h: 62,
      id: over || clear ? 'restart' : 'continue',
      label: over || clear ? '重新开始' : '继续',
    };
    this.buttons.push(b);
    this.drawButton(ctx, b, { accent: true });
  }

  drawShop(ctx, game) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 12, 9, 0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const pw = 1040;
    const ph = 580;
    const px = (W - pw) / 2;
    const py = 148;

    ctx.save();
    roundRect(ctx, px, py, pw, ph, 22);
    ctx.fillStyle = THEME.panel;
    ctx.fill();
    ctx.strokeStyle = THEME.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    text(ctx, '商店', px + 44, py + 58, { size: 32, weight: 700, color: THEME.gold, spacing: 6 });
    text(ctx, '把棋子刻进牌里 · 刻印只在同花色的牌上生效', px + 148, py + 60, {
      size: 15, color: THEME.dim,
    });
    text(ctx, `筹码 ${fmt(game.stack)}`, px + pw - 44, py + 58, {
      size: 22, weight: 700, color: THEME.ink, align: 'right',
    });

    const cw = 300;
    const ch = 262;
    const gap = 30;
    let x = W / 2 - (3 * cw + 2 * gap) / 2;

    game.shopOffers.forEach((o, i) => {
      this.drawOffer(ctx, o, x, py + 150, cw, ch, i, game);
      x += cw + gap;
    });

    const by = py + ph - 96;
    const reroll = {
      x: W / 2 - 216, y: by, w: 200, h: 58, id: 'reroll',
      label: `换一批 ${game.rerollCost}`, enabled: game.stack >= game.rerollCost,
    };
    const leave = { x: W / 2 + 16, y: by, w: 200, h: 58, id: 'leave', label: '继续', enabled: true };
    for (const b of [reroll, leave]) {
      this.buttons.push(b);
      this.drawButton(ctx, b, { accent: b.id === 'leave' });
    }
  }

  drawOffer(ctx, offer, x, y, w, h, i, game) {
    const c = COLORS[offer.color];
    const S = SHAPES[offer.shape];
    const affordable = game.stack >= offer.price;
    const hovered = this.hoverButton === `offer${i}`;
    this.shopRects.push({ x, y, w, h, i });

    ctx.save();
    ctx.globalAlpha = affordable ? 1 : 0.4;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = hovered && affordable ? 'rgba(230,193,105,0.13)' : 'rgba(244,236,217,0.05)';
    ctx.fill();
    ctx.strokeStyle = hovered && affordable ? THEME.gold : 'rgba(244,236,217,0.16)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const art = pieceArt(c.set, offer.shape, offer.level);
    const ps = 88;
    ctx.globalAlpha = affordable ? 1 : 0.4;
    ctx.drawImage(art.img, art.sx, art.sy, art.sw, art.sh, x + w / 2 - ps / 2, y + 20, ps, ps);
    ctx.globalAlpha = 1;

    text(ctx, S.name, x + w / 2, y + 128, { size: 26, weight: 700, color: THEME.ink, align: 'center' });
    text(ctx, `${c.label} ${c.glyph}  ·  ${LEVEL_LABEL[offer.level]} 级`, x + w / 2, y + 158, {
      size: 15, color: c.ring, align: 'center',
    });

    this.wrapText(ctx, engravingDesc(offer), x + 26, y + 186, w - 52, 20, 14, THEME.dim);

    const priceColor = affordable ? THEME.gold : THEME.red;
    text(ctx, `${offer.price}`, x + w - 26, y + h - 28, {
      size: 22, weight: 700, color: priceColor, align: 'right',
    });
    text(ctx, '筹码', x + w - 26 - measure(ctx, `${offer.price}`, 22, 700) - 8, y + h - 28, {
      size: 13, color: THEME.dim, align: 'right',
    });
  }

  drawPicker(ctx, game) {
    const offer = game.pending.offer;
    const c = COLORS[offer.color];

    ctx.save();
    ctx.fillStyle = 'rgba(3, 12, 9, 0.93)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    text(ctx, `选一张牌刻上：${c.label} · ${SHAPES[offer.shape].name} ${LEVEL_LABEL[offer.level]}`, W / 2, 128, {
      size: 32, weight: 700, color: THEME.gold, align: 'center', spacing: 2,
    });

    const rule = c.suit === null ? '万能刻印，任何牌都可以刻' : `只能刻在 ${c.glyph} 上，且牌面必须是空的`;
    text(ctx, rule, W / 2, 172, { size: 17, color: THEME.dim, align: 'center' });

    const cards = game.deckView();
    const cols = 13;
    const cw = 86;
    const chh = 117;
    const gapX = 8;
    const gapY = 13;
    const x0 = (W - (cols * cw + (cols - 1) * gapX)) / 2;
    const y0 = 236;

    cards.forEach((card, i) => {
      const col = i % cols;
      const row = (i / cols) | 0;
      const x = x0 + col * (cw + gapX);
      const y = y0 + row * (chh + gapY);
      const ok = canEngrave(card, offer);
      const hovered = this.hoverCard === i && ok;

      this.pickRects.push({ x, y, w: cw, h: chh, i });

      if (!ok) ctx.globalAlpha = 0.22;
      this.drawCard(ctx, card, x, y + (hovered ? -6 : 0), cw, chh, { glow: hovered ? 0.6 : 0 });
      ctx.globalAlpha = 1;

      if (!ok) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#03110d';
        roundRect(ctx, x + 1, y + 1, cw - 2, chh - 2, 8);
        ctx.fill();
        ctx.restore();
      }
    });

    const cancel = {
      x: W / 2 - 90, y: 800, w: 180, h: 54, id: 'cancel', label: '取消', enabled: true,
    };
    this.buttons.push(cancel);
    this.drawButton(ctx, cancel, {});
  }

  wrapText(ctx, str, x, y, maxW, lineH, size, color) {
    ctx.save();
    ctx.font = `500 ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let line = '';
    let ly = y;
    for (const ch of String(str)) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, ly);
        line = ch;
        ly += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, ly);
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      if (p.t < 0) continue;
      const k = Math.min(1, p.t / p.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const cx = (p.from.x + p.to.x) / 2;
      const cy = Math.min(p.from.y, p.to.y) - 180;
      const x = (1 - e) * (1 - e) * p.from.x + 2 * (1 - e) * e * cx + e * e * p.to.x;
      const y = (1 - e) * (1 - e) * p.from.y + 2 * (1 - e) * e * cy + e * e * p.to.y;
      const alpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      const size = p.size * (1 - 0.35 * e);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(x, y);
      ctx.rotate(p.rot + p.spin * k);
      drawChip(ctx, p.chip, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  drawFloats(ctx) {
    for (const f of this.floats) {
      const k = f.t / f.dur;
      const alpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      text(ctx, f.str, f.x, f.y, {
        size: f.size, weight: 700, color: f.color, align: 'center', alpha: Math.max(0, alpha),
      });
    }
  }
}