'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const tileImage = new Image();
const spriteImages = {};
const tileSourcesLoaded = new Promise((resolve) => {
  tileImage.onload = () => {
    for (let index = 0; index < 150; index++) {
      const cutout = document.createElement('canvas');
      cutout.width = TILE; cutout.height = TILE;
      const ctx = cutout.getContext('2d');
      ctx.drawImage(tileImage, index % 15 * 9, Math.floor(index / 15) * 9, TILE, TILE, 0, 0, TILE, TILE);
      const pixels = ctx.getImageData(0, 0, TILE, TILE);
      for (let i = 0; i < pixels.data.length; i += 4) {
        if (pixels.data[i] === 255 && pixels.data[i + 1] === 204 && pixels.data[i + 2] === 170) pixels.data[i + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
      spriteImages[index] = cutout;
    }
    resolve();
  };
});
tileImage.src = 'assets/tilemap-standard.png';
const TILE = 8;
const SCALE = 5;
const VIEW_W = 1200;
const VIEW_H = 600;
const FLOOR = 500;
const keys = { left: false, right: false, jump: false };
const progress = loadProgress();
let selectedCharacter = 'red';
let soundEnabled = true;
let audioContext;
let toastTimer;
let game = null;
let practiceMode = false;
const trapTypes = [
  { id: 'spikes', name: '隐形尖刺' },
  { id: 'collapse', name: '塌陷地面' },
  { id: 'coin', name: '假金币' },
  { id: 'block', name: '落顶砖块' },
  { id: 'ambush', name: '突袭炸弹' },
  { id: 'door', name: '真假传送门' }
];
let animationFrame = 0;
let lastFrame = 0;
let accumulator = 0;

const levels = [
  {
    name: '薄荷森林', english: 'EASY DOES IT', subtitle: '小小一步，大大快乐。', theme: 'mint', width: 3300,
    spawn: { x: 90, y: 420 }, door: { x: 3130, y: 420 },
    grounds: [[0, 620], [740, 1300], [1430, 1930], [2060, 2670], [2800, 3300]],
    platforms: [[310, 395, 155], [610, 345, 135], [940, 390, 145], [1270, 325, 150], [1600, 390, 140], [1810, 305, 140], [2140, 370, 140], [2390, 295, 150], [2680, 385, 145]],
    coins: [[220, 440], [350, 350], [405, 350], [640, 300], [700, 300], [970, 345], [1025, 345], [1300, 280], [1360, 280], [1640, 345], [1850, 260], [1900, 260], [2170, 325], [2230, 325], [2430, 250], [2490, 250], [2710, 340], [2770, 340]],
    spikes: [[520, 2], [1100, 2], [1710, 2], [2510, 2]],
    enemies: [[830, 465, 760, 930], [1510, 465, 1460, 1630], [2190, 335, 2160, 2250], [2890, 465, 2830, 3020]],
    movers: [], trees: [[170, 1], [1150, 0], [2310, 1], [2980, 0]]
  },
  {
    name: '蜜桃矿洞', english: 'A LITTLE BOLDER', subtitle: '小心脚下，甜蜜有陷阱。', theme: 'peach', width: 3650,
    spawn: { x: 80, y: 420 }, door: { x: 3470, y: 420 },
    grounds: [[0, 520], [720, 1170], [1400, 1800], [2070, 2460], [2720, 3150], [3280, 3650]],
    platforms: [[280, 385, 130], [530, 325, 130], [840, 375, 140], [1150, 300, 140], [1460, 385, 130], [1770, 315, 130], [2110, 375, 130], [2420, 295, 140], [2780, 375, 130], [3070, 305, 130]],
    coins: [[180, 440], [315, 340], [365, 340], [560, 280], [620, 280], [875, 330], [930, 330], [1180, 255], [1240, 255], [1490, 340], [1810, 270], [1870, 270], [2140, 330], [2450, 250], [2510, 250], [2810, 330], [3100, 260], [3160, 260]],
    spikes: [[420, 2], [910, 2], [1550, 3], [2200, 2], [2860, 2], [3370, 2]],
    enemies: [[780, 465, 750, 850], [1450, 350, 1460, 1550], [2110, 465, 2100, 2190], [2790, 465, 2750, 2840], [3310, 465, 3310, 3370]],
    movers: [[1220, 430, 120, 160, 1.2], [2530, 420, 120, 160, 1.4]], trees: [[120, 0], [1050, 1], [2260, 0], [2980, 1]]
  },
  {
    name: '星光工厂', english: 'ONE LAST LEAP', subtitle: '向着星光，完成最后一跳。', theme: 'night', width: 3950,
    spawn: { x: 80, y: 420 }, door: { x: 3780, y: 420 },
    grounds: [[0, 430], [660, 1030], [1300, 1610], [1900, 2240], [2550, 2850], [3150, 3420], [3610, 3950]],
    platforms: [[230, 370, 120], [480, 300, 120], [770, 365, 120], [1060, 280, 130], [1350, 375, 120], [1630, 290, 130], [1940, 365, 120], [2230, 275, 130], [2600, 365, 120], [2870, 270, 130], [3200, 375, 120], [3440, 290, 130]],
    coins: [[160, 440], [260, 325], [510, 255], [560, 255], [800, 320], [1090, 235], [1150, 235], [1380, 330], [1660, 245], [1720, 245], [1970, 320], [2260, 230], [2320, 230], [2630, 320], [2900, 225], [2960, 225], [3230, 330], [3480, 245]],
    spikes: [[320, 2], [720, 2], [1430, 2], [1990, 3], [2660, 2], [3220, 2], [3690, 2]],
    enemies: [[690, 465, 690, 710], [1080, 245, 1080, 1150], [1930, 330, 1950, 2020], [2590, 465, 2580, 2650], [3180, 465, 3180, 3220], [3630, 465, 3630, 3680]],
    movers: [[1170, 430, 120, 150, 1.5], [1760, 410, 120, 150, 1.6], [2370, 420, 120, 150, 1.7], [3000, 400, 120, 150, 1.8]], trees: [[70, 1], [940, 0], [2130, 1], [2770, 0], [3320, 1]]
  }
];

function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem('tiaotiaotang-progress') || '{}');
    return { unlocked: clamp(Number(stored.unlocked) || 1, 1, 3), records: stored.records || {} };
  } catch { return { unlocked: 1, records: {} }; }
}

function saveProgress() {
  try { localStorage.setItem('tiaotiaotang-progress', JSON.stringify(progress)); } catch { }
}

function sprite(ctx, index, x, y, w = TILE * SCALE, h = TILE * SCALE, flip = false) {
  const source = spriteImages[index];
  if (!source) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) { ctx.translate(Math.round(x + w), Math.round(y)); ctx.scale(-1, 1); } else ctx.translate(Math.round(x), Math.round(y));
  ctx.drawImage(source, 0, 0, w, h);
  ctx.restore();
}

function characterSprite(ctx, x, y, size, color = selectedCharacter, pose = 0, flip = false) {
  sprite(ctx, (color === 'red' ? 90 : 105) + pose, x, y, size, size, flip);
}

function cloud(ctx, x, y, size = 1, color = '#fff7df') {
  ctx.fillStyle = color;
  const s = 10 * size;
  ctx.fillRect(x, y, s * 7, s * 2);
  ctx.fillRect(x + s, y - s, s * 4, s);
  ctx.fillRect(x + s * 2, y - s * 2, s * 2, s);
  ctx.fillRect(x + s * 6, y + s, s, s);
}

function star(ctx, x, y, size, color = '#ffe8a6') {
  ctx.fillStyle = color;
  ctx.fillRect(x + size, y, size, size * 3);
  ctx.fillRect(x, y + size, size * 3, size);
}

function drawTree(ctx, x, y, color = 0, size = 1) {
  sprite(ctx, color ? 38 : 31, x + 10 * size, y - 40 * size, 40 * size, 40 * size);
  sprite(ctx, color ? 24 : 16, x + 10 * size, y - 80 * size, 40 * size, 40 * size);
  sprite(ctx, color ? 24 : 16, x + 10 * size, y - 120 * size, 40 * size, 40 * size);
}

function drawBackdrop(ctx, theme, camera = 0, width = VIEW_W, height = VIEW_H) {
  const palettes = {
    mint: { sky: '#f5dfb9', far: '#d6dfb8', mid: '#b6cca0', near: '#8eaf83', dirt: '#596553', edge: '#d5df80', speck: '#899675' },
    peach: { sky: '#f5d4b3', far: '#e5bfa8', mid: '#d6a38f', near: '#bb897f', dirt: '#65565a', edge: '#f2b172', speck: '#968079' },
    night: { sky: '#d6dce4', far: '#bbc4d5', mid: '#a0aec5', near: '#7f91af', dirt: '#51566d', edge: '#d9c4ed', speck: '#7c819d' }
  };
  const p = palettes[theme];
  ctx.fillStyle = p.sky;
  ctx.fillRect(0, 0, width, height);
  const unit = width / VIEW_W;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 283 - camera * .08) % 1600 + 1600) % 1600 - 170;
    cloud(ctx, x * unit, (70 + (i % 3) * 75) * unit, (.65 + (i % 2) * .3) * unit, theme === 'night' ? '#e9eaf0' : '#fff2d9');
  }
  if (theme === 'night') {
    for (let i = 0; i < 16; i++) star(ctx, ((i * 173 - camera * .12) % 1500 + 1500) % 1500 * unit, (35 + (i * 79) % 300) * unit, 3 * unit);
  }
  ctx.fillStyle = p.far;
  ctx.beginPath(); ctx.moveTo(0, height);
  for (let x = 0; x <= width + 120; x += 120) {
    const worldX = x + camera * .15;
    ctx.lineTo(x, (390 - 55 * Math.sin(worldX / 270)) * unit);
    ctx.lineTo(x + 60, (345 - 40 * Math.sin(worldX / 270)) * unit);
  }
  ctx.lineTo(width, height); ctx.fill();
  ctx.fillStyle = p.mid;
  ctx.beginPath(); ctx.moveTo(0, height);
  for (let x = 0; x <= width + 100; x += 100) {
    const worldX = x + camera * .25;
    ctx.lineTo(x, (440 - 35 * Math.sin(worldX / 190)) * unit);
    ctx.lineTo(x + 50, (400 - 35 * Math.sin(worldX / 190)) * unit);
  }
  ctx.lineTo(width, height); ctx.fill();
  ctx.fillStyle = p.near;
  for (let i = 0; i < 15; i++) {
    const x = ((i * 137 - camera * .4) % 1700 + 1700) % 1700 - 150;
    const h = 60 + (i * 31) % 90;
    ctx.fillRect(x * unit, (500 - h) * unit, 15 * unit, h * unit);
    ctx.fillRect((x - 10) * unit, (490 - h) * unit, 35 * unit, 20 * unit);
    ctx.fillRect(x * unit, (475 - h) * unit, 15 * unit, 20 * unit);
  }
  return p;
}

function drawGround(ctx, rect, palette, accent = false) {
  const [x, y, w, h = VIEW_H + 300 - y] = rect;
  ctx.fillStyle = palette.dirt;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = accent ? '#e9af52' : palette.edge;
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = palette.speck;
  for (let tx = Math.floor(x / 28) * 28; tx < x + w; tx += 28) {
    const offset = (Math.abs(tx * 13) % 70) + 27;
    ctx.fillRect(tx + 7, y + offset, 5, 5);
    if ((tx / 28) % 3 === 0) ctx.fillRect(tx + 15, y + offset + 17, 4, 4);
  }
  ctx.fillStyle = '#ffffff0b';
  ctx.fillRect(x, y + 10, 5, h - 10);
  ctx.fillStyle = '#0000000c';
  ctx.fillRect(x + w - 6, y + 10, 6, h - 10);
}

function drawDoor(ctx, x, y, time = 0) {
  const glow = .12 + Math.sin(time * 3) * .04;
  ctx.fillStyle = `rgba(106,218,222,${glow})`;
  ctx.fillRect(x - 20, y - 20, 120, 120);
  sprite(ctx, 101, x, y, 40, 40);
  sprite(ctx, 102, x + 40, y, 40, 40);
  sprite(ctx, 117, x, y + 40, 40, 40);
  sprite(ctx, 118, x + 40, y + 40, 40, 40);
}

function drawCoin(ctx, x, y, time, index = 0) {
  const bob = Math.sin(time * 4 + index) * 5;
  const width = 13 + Math.abs(Math.cos(time * 3 + index)) * 16;
  sprite(ctx, 88, x + 15 - width / 2, y + bob, width, 30);
}

function drawPreview() {
  const canvas = $('#preview-canvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const palette = drawBackdrop(ctx, 'mint', 60, w, h);
  const s = w / VIEW_W;
  ctx.save(); ctx.scale(s, s);
  const base = 465;
  drawGround(ctx, [-80, base, 530, 300], palette);
  drawGround(ctx, [610, base, 700, 300], palette);
  drawGround(ctx, [280, 350, 135, 24], palette, true);
  drawGround(ctx, [510, 280, 125, 24], palette);
  drawGround(ctx, [840, 345, 145, 24], palette, true);
  drawTree(ctx, 80, base, 0, 1.1);
  drawTree(ctx, 730, base, 1, .85);
  drawDoor(ctx, 1020, base - 80);
  characterSprite(ctx, 460, 355, 65, 'red', 3);
  characterSprite(ctx, 930, base - 48, 47, 'blue', 1, true);
  sprite(ctx, 112, 680, base - 38, 38, 38);
  for (let i = 0; i < 3; i++) drawCoin(ctx, 525 + i * 38, 230, i * .2, i);
  for (let i = 0; i < 3; i++) sprite(ctx, 45, 360 + i * 28, base - 25, 28, 25);
  star(ctx, 370, 195, 5, '#f8f0c9');
  star(ctx, 795, 195, 4, '#f8f0c9');
  ctx.restore();
}

function drawPortrait(canvas, color) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const size = canvas.width * .78;
  characterSprite(ctx, (canvas.width - size) / 2, (canvas.height - size) / 2 - 3, size, color, 0);
}

function drawLevelPreview(index) {
  const canvas = $(`#level-canvas-${index}`);
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const scale = w / 800;
  const palette = drawBackdrop(ctx, levels[index].theme, index * 100, w, h);
  ctx.save(); ctx.scale(scale, scale);
  const base = 170 / scale;
  drawGround(ctx, [-20, base, 360, 130], palette);
  drawGround(ctx, [510, base, 360, 130], palette);
  drawGround(ctx, [320, base - 75, 110, 22], palette, index !== 1);
  drawTree(ctx, 75, base, index % 2, .62);
  drawDoor(ctx, 690, base - 65);
  characterSprite(ctx, 365, base - 140, 58, index === 1 ? 'blue' : 'red', 3);
  sprite(ctx, 112, 570, base - 31, 31, 31);
  drawCoin(ctx, 435, base - 140, .2, index);
  drawCoin(ctx, 475, base - 155, .8, index + 1);
  ctx.restore();
}

function renderStaticArt() {
  drawPreview();
  drawPortrait($('#red-canvas'), 'red');
  drawPortrait($('#blue-canvas'), 'blue');
  for (let i = 0; i < 3; i++) drawLevelPreview(i);
}

function selectCharacter(color) {
  selectedCharacter = color;
}

function updateLevelCards() {
  for (let i = 0; i < 3; i++) {
    const unlocked = i < progress.unlocked;
    const card = $(`.level-card[data-level="${i}"]`);
    card.classList.toggle('locked', !unlocked);
    card.setAttribute('aria-label', `${levels[i].name}${unlocked ? '' : '，尚未解锁'}`);
    card.querySelector('.level-lock').hidden = unlocked;
    const record = progress.records[i];
    $(`#record-${i}`).textContent = record ? `${'★'.repeat(record.stars)} · ${formatTime(record.time)}` : unlocked ? '未通关' : '未解锁';
  }
}

function showToast(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2700);
}

function initAudio() {
  if (!soundEnabled) return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function sound(notes, type = 'square', volume = .035) {
  const ac = initAudio();
  if (!ac) return;
  notes.forEach(([frequency, delay, duration = .1]) => {
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    const at = ac.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    oscillator.connect(gain); gain.connect(ac.destination);
    oscillator.start(at); oscillator.stop(at + duration);
  });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  $$('.sound-toggle').forEach((button) => {
    button.classList.toggle('muted', !soundEnabled);
    button.setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
  });
  if (soundEnabled) sound([[660, 0, .08]]);
}

function createTraps(level, levelIndex) {
  const selected = [...trapTypes].sort(() => Math.random() - .5).slice(0, 3);
  const positions = [
    { spikes: 470, collapse: 800, coin: 2, block: 1010, ambush: 1530, door: level.door.x - 290 },
    { spikes: 390, collapse: 780, coin: 3, block: 1500, ambush: 2150, door: level.door.x - 330 },
    { spikes: 300, collapse: 710, coin: 4, block: 1390, ambush: 1980, door: level.door.x - 320 }
  ][levelIndex];
  return selected.map((type, index) => {
    const trap = { type: type.id, name: type.name, triggered: false, activated: false, timer: 0, slot: index };
    if (type.id === 'spikes') Object.assign(trap, { x: positions.spikes, y: FLOOR - 28, w: 28, h: 28 });
    if (type.id === 'collapse') Object.assign(trap, { x: positions.collapse, y: FLOOR, w: 112, h: 300 });
    if (type.id === 'coin') Object.assign(trap, { coinIndex: positions.coin, x: level.coins[positions.coin][0], y: level.coins[positions.coin][1], w: 30, h: 34 });
    if (type.id === 'block') Object.assign(trap, { x: positions.block, y: -60, w: 60, h: 60 });
    if (type.id === 'ambush') Object.assign(trap, { x: positions.ambush + 100, y: 465, w: 36, h: 35 });
    if (type.id === 'door') Object.assign(trap, { x: positions.door, y: FLOOR - 80, w: 80, h: 80 });
    return trap;
  });
}

function updateTraps(dt) {
  const p = game.player;
  for (const trap of game.traps) {
    const nearTrap = trap.type === 'collapse'
      ? p.grounded && p.x + p.w > trap.x + 12 && p.x < trap.x + trap.w - 12 && Math.abs(p.y + p.h - FLOOR) < 3
      : Math.abs(p.x - trap.x) < 105;
    if (!trap.triggered && nearTrap) {
      trap.triggered = true;
      game.popups.push({ x: trap.x + trap.w / 2, y: trap.y - 28, text: '!', life: .65 });
      sound([[180, 0, .07], [260, .07, .08]], 'square', .025);
    }
    if (!trap.triggered) continue;
    trap.timer += dt;
    if (trap.type === 'spikes' && trap.timer > .24) {
      trap.activated = true;
      if (overlap(p, { x: trap.x + 4, y: FLOOR - 20, w: 20, h: 20 })) hurtPlayer();
    }
    if (trap.type === 'collapse' && trap.timer > .4) trap.activated = true;
    if (trap.type === 'coin' && !trap.activated && overlap(p, trap)) {
      trap.activated = true;
      hurtPlayer();
    }
    if (trap.type === 'block') {
      if (trap.timer > .22) trap.activated = true;
      if (trap.activated && trap.y < FLOOR - 60) trap.y = Math.min(FLOOR - 60, trap.y + 900 * dt);
      if (trap.activated && overlap(p, trap)) hurtPlayer();
    }
    if (trap.type === 'ambush') {
      if (trap.timer > .2) trap.activated = true;
      if (trap.activated) {
        trap.x -= 230 * dt;
        if (overlap(p, trap)) {
          trap.activated = false;
          burst(trap.x + 18, trap.y + 15, '#ffe0a1', 12);
          hurtPlayer();
        }
      }
    }
    if (trap.type === 'door' && !trap.activated && overlap(p, trap)) {
      trap.activated = true;
      p.vx = -360; p.vy = -380;
      game.popups.push({ x: trap.x + 40, y: trap.y - 20, text: '假的！', life: 1 });
      sound([[180, 0, .1], [120, .1, .15]], 'square', .035);
    }
  }
}

function startGame(levelIndex = 0) {
  if (levelIndex >= progress.unlocked) levelIndex = 0;
  const level = levels[levelIndex];
  game = {
    level, levelIndex, state: 'playing', time: 0, lives: practiceMode ? 9 : 5, coins: 0, camera: 0, shake: 0,
    player: { x: level.spawn.x, y: level.spawn.y, w: 34, h: 40, vx: 0, vy: 0, grounded: false, coyote: 0, jumpBuffer: 0, jumps: 0, facing: false, invincible: 0, squash: 0 },
    spawn: { ...level.spawn },
    coinsList: level.coins.map(([x, y]) => ({ x, y, w: 30, h: 34, collected: false })),
    enemies: level.enemies.map(([x, y, min, max]) => ({ x, y, w: 36, h: 35, min, max, direction: 1, dead: false, deathTime: 0 })),
    movers: level.movers.map(([x, y, w, range, speed], i) => ({ x, y, baseX: x, baseY: y, w, h: 20, range, speed, phase: i, oldX: x, oldY: y })),
    traps: createTraps(level, levelIndex), particles: [], popups: [], checkpoint: 0, overlayAction: null
  };
  document.body.style.overflow = 'hidden';
  $('#game-overlay').hidden = true;
  $('#hud-total').textContent = game.coinsList.length;
  $('#practice-toggle').classList.toggle('active', practiceMode);
  $('#practice-toggle').setAttribute('aria-pressed', String(practiceMode));
  updateHud();
  clearKeys();
  window.scrollTo(0, 0);
  $('#game-canvas').focus({ preventScroll: true });
  cancelAnimationFrame(animationFrame);
  lastFrame = performance.now(); accumulator = 0;
  animationFrame = requestAnimationFrame(gameLoop);
}

function clearKeys() { keys.left = keys.right = keys.jump = false; $$('.touch-button').forEach((b) => b.classList.remove('pressed')); }

function requestJump() {
  if (!game || game.state !== 'playing') return;
  game.player.jumpBuffer = .13;
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function resizeGame() {
  const canvas = $('#game-canvas');
  const scale = Math.max(innerWidth / VIEW_W, innerHeight / VIEW_H);
  canvas.style.width = `${Math.ceil(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.ceil(VIEW_H * scale)}px`;
  canvas.style.left = '0px';
  canvas.style.top = `${Math.floor((innerHeight - VIEW_H * scale) / 2)}px`;
}

function updateHud() {
  if (!game) return;
  $('#hud-coins').textContent = String(game.coins).padStart(2, '0');
  $('#hud-time').textContent = formatTime(game.time);
  $('#hud-hearts').innerHTML = Array.from({ length: practiceMode ? 9 : 5 }, (_, i) => `<span class="${i < game.lives ? '' : 'lost-heart'}">♥</span>`).join('');
  $('#hud-hearts').setAttribute('aria-label', `${game.lives} 点生命`);
}

function solidRects() {
  const rects = game.level.grounds.map(([x, end]) => ({ x, y: FLOOR, w: end - x, h: 300 }));
  for (const trap of game.traps) {
    if (trap.type !== 'collapse') continue;
    rects.push({ x: trap.x, y: FLOOR, w: trap.w, h: 300, trap });
    if (trap.activated) {
      const ground = rects.find((rect) => !rect.trap && rect.x < trap.x && rect.x + rect.w > trap.x + trap.w);
      if (ground) ground.w = trap.x - ground.x;
    }
  }
  game.level.platforms.forEach(([x, y, w]) => rects.push({ x, y, w, h: 12, oneWay: true }));
  game.movers.forEach((m) => rects.push({ ...m, h: 12, oneWay: true }));
  return rects;
}

function physicsStep(dt) {
  if (!game || game.state !== 'playing') return;
  const p = game.player;
  game.time += dt;
  p.invincible = Math.max(0, p.invincible - dt);
  p.coyote = Math.max(0, p.coyote - dt);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  p.squash = Math.max(0, p.squash - dt);
  game.shake = Math.max(0, game.shake - dt);
  const direction = Number(keys.right) - Number(keys.left);
  const acceleration = p.grounded ? 1900 : 1200;
  if (direction) {
    p.vx += direction * acceleration * dt;
    p.facing = direction < 0;
  } else {
    const friction = p.grounded ? 2200 : 450;
    p.vx = Math.abs(p.vx) <= friction * dt ? 0 : p.vx - Math.sign(p.vx) * friction * dt;
  }
  p.vx = clamp(p.vx, -260, 260);
  if (p.jumpBuffer > 0) {
    if (p.grounded || p.coyote > 0) {
      p.vy = selectedCharacter === 'red' ? -675 : -605;
      p.grounded = false; p.coyote = 0; p.jumps = 1; p.jumpBuffer = 0;
      sound([[440, 0, .07], [660, .05, .09]], 'square', .025);
    } else if (selectedCharacter === 'blue' && p.jumps < 2) {
      p.vy = -585; p.jumps = 2; p.jumpBuffer = 0;
      burst(p.x + p.w / 2, p.y + p.h, '#c3f1ef', 8);
      sound([[660, 0, .07], [880, .05, .09]], 'square', .025);
    }
  }
  const gravity = !keys.jump && p.vy < -180 ? 2250 : 1650;
  p.vy = Math.min(p.vy + gravity * dt, 1000);
  const solids = solidRects();
  p.x += p.vx * dt;
  for (const solid of solids) {
    if (solid.oneWay || !overlap(p, solid)) continue;
    if (p.vx > 0) p.x = solid.x - p.w;
    else if (p.vx < 0) p.x = solid.x + solid.w;
    p.vx = 0;
  }
  p.x = clamp(p.x, 0, game.level.width - p.w);
  const oldBottom = p.y + p.h;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const solid of solids) {
    if (solid.trap?.activated || !overlap(p, solid)) continue;
    if (p.vy >= 0 && oldBottom <= solid.y + 8) {
      p.y = solid.y - p.h; p.vy = 0; p.grounded = true; p.jumps = 0; p.coyote = .11;
    } else if (p.vy < 0) { p.y = solid.y + solid.h; p.vy = 30; }
  }
  if (!p.grounded && oldBottom <= FLOOR && p.vy >= 0) p.coyote = Math.max(p.coyote, .02);
  for (const mover of game.movers) {
    mover.oldX = mover.x; mover.oldY = mover.y;
    const phase = game.time * mover.speed + mover.phase;
    mover.x = mover.baseX + Math.sin(phase) * mover.range;
    mover.y = mover.baseY + Math.cos(phase * .8) * 24;
    if (p.grounded && Math.abs(p.y + p.h - mover.oldY) < 3 && p.x + p.w > mover.oldX && p.x < mover.oldX + mover.w) {
      p.x += mover.x - mover.oldX; p.y += mover.y - mover.oldY;
    }
  }
  for (const coin of game.coinsList) {
    if (!coin.collected && overlap(p, coin)) {
      coin.collected = true; game.coins++;
      burst(coin.x + 15, coin.y + 15, '#f7bf45', 9);
      game.popups.push({ x: coin.x, y: coin.y, text: '+100', life: .75 });
      sound([[988, 0, .06], [1319, .055, .12]], 'square', .03);
    }
  }
  for (const [x, count] of game.level.spikes) {
    const hazard = { x: x + 4, y: FLOOR - 20, w: count * 28 - 8, h: 20 };
    if (overlap(p, hazard)) hurtPlayer();
  }
  for (const enemy of game.enemies) {
    if (enemy.dead) { enemy.deathTime += dt; continue; }
    enemy.x += enemy.direction * 55 * dt;
    if (enemy.x <= enemy.min || enemy.x + enemy.w >= enemy.max) { enemy.direction *= -1; enemy.x = clamp(enemy.x, enemy.min, enemy.max - enemy.w); }
    if (overlap(p, enemy)) {
      if (p.vy > 80 && p.y + p.h - enemy.y < 24) {
        enemy.dead = true; p.vy = -440; p.y = enemy.y - p.h;
        burst(enemy.x + 18, enemy.y + 15, '#646580', 10);
        game.popups.push({ x: enemy.x, y: enemy.y, text: 'BOOP!', life: .8 });
        sound([[220, 0, .07], [440, .05, .08]], 'square', .04);
      } else hurtPlayer();
    }
  }
  updateTraps(dt);
  if (p.y > VIEW_H + 90) hurtPlayer(true);
  if (overlap(p, { x: game.level.door.x + 8, y: game.level.door.y, w: 64, h: 80 })) completeLevel();
  const target = clamp(p.x - VIEW_W * .36, 0, game.level.width - VIEW_W);
  game.camera += (target - game.camera) * Math.min(1, dt * 6);
  game.particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 300 * dt; particle.life -= dt; });
  game.particles = game.particles.filter((particle) => particle.life > 0);
  game.popups.forEach((popup) => { popup.y -= 35 * dt; popup.life -= dt; });
  game.popups = game.popups.filter((popup) => popup.life > 0);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) game.particles.push({ x, y, vx: (Math.random() - .5) * 240, vy: -Math.random() * 210, life: .35 + Math.random() * .3, color, size: 4 + Math.random() * 6 });
}

function hurtPlayer(fell = false) {
  const p = game.player;
  if (p.invincible > 0 || game.state !== 'playing') return;
  game.lives--;
  game.shake = .25;
  sound([[220, 0, .1], [165, .1, .15], [110, .22, .2]], 'sawtooth', .025);
  updateHud();
  if (game.lives <= 0) {
    p.vy = -300;
    showGameOver();
    return;
  }
  p.x = game.spawn.x; p.y = game.spawn.y; p.vx = 0; p.vy = 0; p.invincible = 1.8;
  game.camera = clamp(p.x - 300, 0, game.level.width - VIEW_W);
  if (fell) burst(p.x + 15, p.y + 40, '#fff2d7', 8);
}

function showOverlay(type) {
  const overlay = $('#game-overlay');
  overlay.hidden = false;
  $('#result-stats').hidden = type !== 'complete';
  $('#pause-options').hidden = type !== 'paused';
  if (type === 'paused') {
    $('#overlay-kicker').textContent = ''; $('#overlay-icon').textContent = 'Ⅱ';
    $('#overlay-title').textContent = '休息一下';
    $('#overlay-description').textContent = '准备好就继续。';
    $('#overlay-primary').innerHTML = '继续冒险 <span>→</span>';
    $('#overlay-secondary').textContent = '重新开始'; $('#overlay-secondary').hidden = false;
    game.overlayAction = () => togglePause();
  } else if (type === 'gameover') {
    $('#overlay-kicker').textContent = ''; $('#overlay-icon').textContent = '♥';
    $('#overlay-title').textContent = '差一点点！';
    $('#overlay-description').textContent = `收集 ${game.coins} 枚金币`;
    $('#overlay-primary').innerHTML = '再试一次 <span>↻</span>';
    $('#overlay-secondary').textContent = '返回首页'; $('#overlay-secondary').hidden = true;
    game.overlayAction = () => startGame(game.levelIndex);
  } else {
    const total = game.coinsList.length;
    const stars = 1 + (game.coins === total ? 1 : 0) + (game.lives === 3 ? 1 : 0);
    if (!practiceMode) {
      const old = progress.records[game.levelIndex];
      if (!old || stars > old.stars || (stars === old.stars && game.time < old.time)) progress.records[game.levelIndex] = { stars, time: game.time, coins: game.coins };
      progress.unlocked = Math.max(progress.unlocked, Math.min(3, game.levelIndex + 2));
      saveProgress();
    }
    $('#overlay-kicker').textContent = '';
    $('#overlay-icon').textContent = '★';
    $('#overlay-title').textContent = game.levelIndex === 2 ? '冒险完成！' : '漂亮的一跳！';
    $('#overlay-description').textContent = practiceMode ? '练习完成' : game.levelIndex === 2 ? '全部关卡完成' : '新关卡已解锁';
    $('#result-coins').textContent = `${game.coins} / ${total}`;
    $('#result-time').textContent = formatTime(game.time);
    $('#result-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#overlay-primary').innerHTML = game.levelIndex < 2 ? '下一关 <span>→</span>' : '再玩一次 <span>↻</span>';
    $('#overlay-secondary').textContent = '重玩本关'; $('#overlay-secondary').hidden = false;
    game.overlayAction = () => startGame(practiceMode ? game.levelIndex : game.levelIndex < 2 ? game.levelIndex + 1 : 0);
  }
  $('#overlay-primary').focus({ preventScroll: true });
}

function togglePause() {
  if (!game || ['complete', 'gameover'].includes(game.state)) return;
  clearKeys();
  if (game.state === 'paused') {
    game.state = 'playing'; $('#game-overlay').hidden = true; $('#game-canvas').focus({ preventScroll: true });
  } else if (game.state === 'playing') {
    game.state = 'paused'; showOverlay('paused');
  }
}

function showGameOver() { game.state = 'gameover'; clearKeys(); showOverlay('gameover'); }
function completeLevel() {
  if (game.state !== 'playing') return;
  game.state = 'complete'; clearKeys();
  sound([[523, 0, .12], [659, .13, .12], [784, .26, .12], [1047, .4, .3]], 'square', .04);
  showOverlay('complete');
}

function drawTrapWarning(ctx, trap, y = trap.y - 35) {
  ctx.fillStyle = '#fff6d6';
  ctx.fillRect(trap.x + trap.w / 2 - 14, y, 28, 28);
  ctx.fillStyle = '#c95e54';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('!', trap.x + trap.w / 2, y + 22);
}

function drawTraps(ctx) {
  for (const trap of game.traps) {
    if (practiceMode && !trap.triggered) drawTrapWarning(ctx, trap);
    if (trap.type === 'spikes') {
      if (practiceMode || trap.triggered) {
        const height = trap.activated ? 28 : 8;
        sprite(ctx, 45, trap.x, FLOOR - height, 28, height);
      }
    } else if (trap.type === 'collapse' && trap.triggered && !trap.activated) {
      ctx.fillStyle = '#f5c66d';
      for (let x = trap.x + 5; x < trap.x + trap.w - 8; x += 18) ctx.fillRect(x, FLOOR + 2, 11, 4);
    } else if (trap.type === 'coin' && (practiceMode || trap.triggered)) {
      if (trap.activated) sprite(ctx, 112, trap.x - 3, trap.y, 36, 36);
      else {
        ctx.strokeStyle = '#d65e5e'; ctx.lineWidth = 3;
        ctx.strokeRect(trap.x - 4, trap.y - 4, 38, 42);
      }
    } else if (trap.type === 'block' && (trap.triggered || practiceMode)) {
      sprite(ctx, 52, trap.x, trap.y, 60, 60);
    } else if (trap.type === 'ambush' && (trap.activated || practiceMode)) {
      sprite(ctx, 112, trap.x, trap.y, 36, 36, true);
    } else if (trap.type === 'door' && !trap.activated) {
      drawDoor(ctx, trap.x, trap.y, game.time);
      if (practiceMode) drawTrapWarning(ctx, trap, trap.y - 30);
    }
  }
}

function drawGame() {
  if (!game) return;
  const canvas = $('#game-canvas');
  const ctx = canvas.getContext('2d');
  const p = game.player;
  const shakeX = game.shake ? (Math.random() - .5) * 10 : 0;
  const shakeY = game.shake ? (Math.random() - .5) * 7 : 0;
  const palette = drawBackdrop(ctx, game.level.theme, game.camera);
  ctx.save(); ctx.translate(Math.round(-game.camera + shakeX), Math.round(shakeY));
  game.level.trees.forEach(([x, color]) => drawTree(ctx, x, FLOOR, color, .85));
  for (const [x, end] of game.level.grounds) drawGround(ctx, [x, FLOOR, end - x], palette);
  game.level.platforms.forEach(([x, y, w], i) => drawGround(ctx, [x, y, w, 24], palette, i % 3 === 1));
  game.movers.forEach((mover) => {
    drawGround(ctx, [mover.x, mover.y, mover.w, 20], palette, true);
    ctx.fillStyle = '#ffffff55'; ctx.fillRect(mover.x + 12, mover.y + 6, mover.w - 24, 3);
  });
  drawDoor(ctx, game.level.door.x, game.level.door.y, game.time);
  drawTraps(ctx);
  for (const [x, count] of game.level.spikes) for (let i = 0; i < count; i++) sprite(ctx, 45, x + i * 28, FLOOR - 28, 28, 28);
  game.coinsList.forEach((coin, i) => { if (!coin.collected) drawCoin(ctx, coin.x, coin.y, game.time, i); });
  game.enemies.forEach((enemy) => {
    if (enemy.dead) { if (enemy.deathTime < .3) sprite(ctx, 111, enemy.x, enemy.y + 12, 36, 24); return; }
    sprite(ctx, 112 + (Math.floor(game.time * 4) % 2), enemy.x, enemy.y, 36, 36, enemy.direction < 0);
  });
  if (!(p.invincible > 0 && Math.floor(p.invincible * 12) % 2)) {
    const pose = !p.grounded ? 3 : Math.abs(p.vx) > 20 ? 1 + (Math.floor(game.time * 10) % 2) : 0;
    characterSprite(ctx, p.x - 3, p.y - 4, 42, selectedCharacter, pose, p.facing);
    if (selectedCharacter === 'blue' && p.jumps === 1 && !p.grounded) {
      ctx.fillStyle = '#efffe999'; ctx.fillRect(p.x + 7, p.y + p.h + 5, 20, 4);
    }
  }
  for (const particle of game.particles) {
    ctx.globalAlpha = clamp(particle.life * 3, 0, 1); ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  game.popups.forEach((popup) => { ctx.globalAlpha = popup.life; ctx.fillStyle = '#fff9db'; ctx.fillText(popup.text, popup.x, popup.y); });
  ctx.restore(); ctx.globalAlpha = 1;
}

function gameLoop(now) {
  if (!game || game.state === 'exited') return;
  const delta = Math.min((now - lastFrame) / 1000, .1);
  lastFrame = now;
  if (game.state === 'playing') {
    accumulator += delta;
    while (accumulator >= 1 / 120) { physicsStep(1 / 120); accumulator -= 1 / 120; }
    updateHud();
  }
  drawGame();
  animationFrame = requestAnimationFrame(gameLoop);
}

const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump' };
window.addEventListener('keydown', (event) => {
  if (!game || $('#play-view').hidden) return;
  if (keyMap[event.code]) {
    event.preventDefault();
    if (game.state === 'playing') {
      if (keyMap[event.code] === 'jump' && !keys.jump && !event.repeat) requestJump();
      keys[keyMap[event.code]] = true;
    }
  }
  if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) { event.preventDefault(); togglePause(); }
  if (event.code === 'KeyR' && !event.repeat) { event.preventDefault(); startGame(game.levelIndex); }
});
window.addEventListener('keyup', (event) => { if (keyMap[event.code]) { event.preventDefault(); keys[keyMap[event.code]] = false; } });
window.addEventListener('blur', () => { if (game && game.state === 'playing') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game && game.state === 'playing') togglePause(); });

$$('.character-card').forEach((card) => card.addEventListener('click', () => { selectCharacter(card.dataset.character); sound([[660, 0, .07]], 'square', .018); }));
$('#pause-button').addEventListener('click', togglePause);
$('#practice-toggle').addEventListener('click', () => {
  practiceMode = !practiceMode;
  if (game) startGame(game.levelIndex);
});
$('#character-toggle').addEventListener('click', () => {
  selectCharacter(selectedCharacter === 'red' ? 'blue' : 'red');
  if (game) startGame(game.levelIndex);
});
$$('[data-pause-level]').forEach((button) => {
  const index = Number(button.dataset.pauseLevel);
  button.disabled = index >= progress.unlocked;
  button.addEventListener('click', () => startGame(index));
});
$('#restart-button').addEventListener('click', () => game && startGame(game.levelIndex));
$('#overlay-primary').addEventListener('click', () => game && game.overlayAction && game.overlayAction());
$('#overlay-secondary').addEventListener('click', () => game && startGame(game.levelIndex));

$$('.touch-button').forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    if (!game || game.state !== 'playing') return;
    if (control === 'jump' && !keys.jump) requestJump();
    keys[control] = true; button.classList.add('pressed');
  });
  const release = (event) => { event.preventDefault(); keys[control] = false; button.classList.remove('pressed'); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

selectCharacter('red');
window.addEventListener('resize', resizeGame);
resizeGame();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => startGame(0), { once: true });
else startGame(0);
