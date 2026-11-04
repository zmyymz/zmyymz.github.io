(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const VIEW_W = 384;
  const VIEW_H = 216;
  const GRAVITY = 680;
  const JUMP_SPEED = 300;
  const RUN_SPEED = 70;
  const COYOTE_TIME = .12;
  const STORAGE_KEY = 'hop-and-pop-progress-v1';
  const TILES = {
    background: [0, 0], cloud: [1, 0], cloudBottom: [1, 1],
    groundLeft: [3, 0], groundMid: [4, 0], groundRight: [5, 0],
    dirt: [0, 0], ledgeLeft: [3, 0], ledgeMid: [4, 0], ledgeRight: [5, 0],
    hangingLeft: [3, 1], hangingMid: [4, 1], hangingRight: [5, 1],
    trunkLeft: [7, 4], trunkMid: [8, 4], trunkRight: [9, 4],
    trunkBaseLeft: [7, 5], trunkBaseMid: [8, 5], trunkBaseRight: [9, 5],
    mushroom: [0, 3], sprout: [1, 3], flowerRed: [2, 3], flowerRed2: [3, 3], flowerYellow: [4, 3],
    vine: [5, 3], vine2: [6, 3], crate: [7, 3], brokenCrate: [8, 3],
    player: [0, 4], playerRun: [1, 4], playerGun: [2, 4], muzzle: [3, 4], bullet: [4, 4],
    fly: [3, 5], fly2: [4, 5], grub: [5, 5], grub2: [6, 5], bee: [1, 5], bee2: [2, 5]
  };

  const LEVELS = [
    {
      name: '林间起跑', tag: '先热热身', short: '林间起跑', tip: '点击 / 空格跳跃，前方自动开火', width: 1232, startY: 178,
      platforms: [[0, 192, 16], [18, 176, 13], [34, 160, 13], [49, 176, 17], [69, 160, 18], [90, 176, 32]],
      ledges: [], trees: [[9, 192], [20, 176], [37, 160], [52, 176], [74, 160]],
      springs: [[26, 176], [57, 176]],
      decorations: [['sprout', 20, 176], ['flowerYellow', 37, 160], ['flowerRed', 52, 176], ['vine', 81, 160]],
      coins: [[210, 145], [255, 135], [304, 120], [360, 127], [416, 131], [465, 117], [510, 104], [552, 112], [596, 122], [676, 123], [720, 125], [808, 108], [858, 116], [906, 130], [1010, 124], [1070, 124]],
      enemies: [['grub', 370, 144], ['fly', 610, 115, 0], ['bee', 815, 100, 1], ['grub', 950, 160]]
    },
    {
      name: '云朵之间', tag: '再跳一次，就能到达', short: '云朵之间', tip: '空中再按一次，完成二段跳', width: 1408, startY: 162,
      platforms: [[0, 176, 16], [18, 176, 13], [34, 160, 13], [49, 160, 17], [69, 144, 18], [90, 160, 32]],
      ledges: [], trees: [[9, 176], [20, 176], [36, 160], [52, 160], [72, 144], [93, 160]],
      springs: [[24, 176], [63, 160]],
      decorations: [['flowerRed', 5, 176], ['vine2', 33, 160], ['flowerYellow', 45, 144], ['sprout', 87, 144], ['flowerRed2', 111, 160]],
      coins: [[200, 130], [240, 115], [280, 101], [325, 88], [365, 88], [410, 99], [460, 79], [505, 84], [550, 100], [610, 84], [655, 90], [700, 77], [745, 93], [810, 110], [850, 96], [890, 82], [935, 88], [990, 100], [1050, 105], [1110, 112], [1180, 112]],
      enemies: [['fly', 324, 76, 0], ['grub', 468, 128], ['bee', 640, 92, 1], ['fly', 750, 101, 0], ['grub', 875, 128], ['bee', 1010, 99, 1], ['grub', 1160, 144]]
    },
    {
      name: '花园大冒险', tag: '把节奏串起来', short: '花园大冒险', tip: '跳得更高，也能命中空中的敌人', width: 1568, startY: 178,
      platforms: [[0, 192, 16], [18, 176, 13], [34, 160, 13], [49, 176, 17], [69, 160, 18], [90, 144, 15], [108, 160, 14], [124, 160, 23]],
      ledges: [], trees: [[9, 192], [20, 176], [36, 160], [52, 176], [72, 160], [92, 144]],
      springs: [[24, 176], [41, 160]],
      decorations: [['flowerRed', 23, 176], ['sprout', 40, 160], ['flowerYellow', 56, 176], ['vine', 78, 144], ['flowerRed2', 99, 160], ['flowerYellow', 143, 160]],
      coins: [[190, 135], [230, 125], [270, 107], [310, 92], [350, 91], [395, 99], [440, 115], [490, 105], [530, 93], [575, 79], [620, 83], [665, 92], [715, 101], [760, 87], [805, 72], [850, 77], [900, 89], [945, 103], [990, 93], [1030, 82], [1070, 93], [1110, 104], [1160, 115], [1210, 111], [1260, 101], [1310, 99], [1360, 106], [1430, 110]],
      enemies: [['grub', 228, 160], ['fly', 325, 100, 1], ['bee', 440, 99, 1], ['grub', 504, 144], ['fly', 625, 85, 1], ['grub', 715, 160], ['bee', 815, 83, 1], ['fly', 910, 100, 0], ['grub', 988, 144], ['bee', 1120, 85, 0], ['fly', 1200, 110, 0], ['grub', 1320, 144], ['bee', 1460, 85, 0]]
    }
  ];

  const sprites = new Image();
  sprites.src = 'assets/sprites.png';
  let selectedLevel = 0;
  let state = 'ready';
  let level;
  let player;
  let bullets = [];
  let particles = [];
  let camera = 0;
  let elapsed = 0;
  let shotTimer = 0;
  let animationTime = 0;
  let deathTimer = 0;
  let completionTimer = 0;
  let hintTimer = 0;
  let shake = 0;
  let soundEnabled = true;
  let audioContext;
  let totalCoins = 0;
  let totalKills = 0;
  let lastFrame = performance.now();

  let progress = { best: [null, null, null] };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.best)) {
      progress.best = [0, 1, 2].map((i) => {
        const score = stored.best[i];
        return score && Number.isFinite(score.time) ? { time: score.time, coins: Number(score.coins) || 0 } : null;
      });
    }
  } catch {}

  function rect(x, y, w, h) { return { x, y, w, h }; }
  function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function drawTile(name, x, y, flip = false) {
    const [sx, sy] = TILES[name];
    if (!sprites.complete || !sprites.naturalWidth) return;
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x + 16), Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(sprites, sx * 16, sy * 16, 16, 16, 0, 0, 16, 16);
      ctx.restore();
    } else {
      ctx.drawImage(sprites, sx * 16, sy * 16, 16, 16, Math.round(x), Math.round(y), 16, 16);
    }
  }
  function drawCloud(x, y, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    drawTile('cloud', 0, 0);
    drawTile('cloud', 16, 0);
    drawTile('cloudBottom', 0, 16);
    drawTile('cloudBottom', 16, 16);
    ctx.restore();
  }
  function playSound(type) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      const settings = {
        jump: [320, 520, .09, 'square', .027],
        doubleJump: [420, 700, .12, 'square', .027],
        spring: [210, 760, .2, 'square', .038],
        shoot: [720, 430, .045, 'square', .012],
        coin: [880, 1320, .1, 'sine', .05],
        hit: [240, 90, .12, 'square', .035],
        hurt: [200, 60, .28, 'sawtooth', .04],
        win: [523, 1046, .5, 'triangle', .06]
      }[type];
      if (!settings) return;
      const [from, to, duration, wave, volume] = settings;
      osc.type = wave;
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }
  function announce(text) { $('announcer').textContent = text; }
  function showTip(text, duration = 3) {
    $('top-tip').textContent = text;
    $('top-tip').classList.add('visible');
    hintTimer = duration;
  }
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toFixed(1).padStart(4, '0');
    return `${minutes}:${remainder}`;
  }

  function prepareLevel(index) {
    selectedLevel = index;
    const source = LEVELS[index];
    level = {
      ...source,
      platforms: source.platforms.map(([x, y, w]) => rect(x * 16, y, w * 16, VIEW_H - y + 32)),
      ledges: source.ledges.map(([x, y, w]) => rect(x * 16, y, w * 16, 8)),
      springs: source.springs.map(([x, y], index) => ({ x: x * 16, y, compress: 0, phase: index * 1.9 })),
      springHintShown: false,
      coins: source.coins.map(([x, y]) => ({ x, y, collected: false, bob: Math.random() * Math.PI * 2 })),
      enemies: source.enemies.map(([type, x, y, vertical], id) => ({ id, type, x, y, baseX: x, baseY: y, vertical: !!vertical, dead: false, phase: id * 1.7 }))
    };
    player = { x: 48, y: source.startY, previousY: source.startY, vy: 0, grounded: false, jumpsLeft: 1, coyote: 0, jumpBuffer: 0, rotation: 0 };
    bullets = [];
    particles = [];
    camera = 0;
    elapsed = 0;
    shotTimer = .12;
    deathTimer = 0;
    completionTimer = 0;
    hintTimer = 0;
    shake = 0;
    $('top-tip').classList.remove('visible');
    updateHud();
  }

  function setState(next) {
    state = next;
    const overlay = $('screen-overlay');
    overlay.hidden = next === 'ready' || next === 'playing' || next === 'dying' || next === 'finishing';
    $('result-panel').hidden = next !== 'dead' && next !== 'complete' && next !== 'won';
    $('pause-panel').hidden = next !== 'paused';
    $('pause-button').textContent = next === 'paused' ? '▶' : 'Ⅱ';
    $('pause-button').setAttribute('aria-label', next === 'paused' ? '继续' : '暂停');
    $('pause-button').title = next === 'paused' ? '继续 (P)' : '暂停 (P)';
    if (next === 'dead') {
      $('result-eyebrow').textContent = '再试一次';
      $('result-title').textContent = '就差一点！';
      $('result-description').textContent = '留意前方的路，下一跳会更好。';
      $('result-button').innerHTML = '重新出发 <span>↻</span>';
      $('result-stats').innerHTML = `<span><small>本次金币</small>${totalCoins}</span><span><small>本次击破</small>${totalKills}</span>`;
      $('result-button').focus({ preventScroll: true });
      announce('挑战失败，按回车重新出发');
    }
    if (next === 'complete' || next === 'won') {
      const isFinal = next === 'won';
      $('result-eyebrow').textContent = isFinal ? '小小的射手，大大的胜利' : `第 ${selectedLevel + 1} 关完成`;
      $('result-title').textContent = isFinal ? '旅程圆满！' : '漂亮的一跳！';
      $('result-description').textContent = isFinal ? '三段旅程都留下了你的脚印，随时回来刷新纪录。' : '前方还有新的风景，继续向前吧。';
      $('result-button').innerHTML = isFinal ? '再玩一次 <span>↻</span>' : '前往下一关 <span>→</span>';
      $('result-stats').innerHTML = `<span><small>金币</small>${totalCoins} / ${level.coins.length}</span><span><small>击破</small>${totalKills} / ${level.enemies.length}</span><span><small>用时</small>${formatTime(elapsed)}</span>`;
      $('result-button').focus({ preventScroll: true });
      announce(isFinal ? '恭喜完成全部关卡' : '关卡完成，按回车前往下一关');
    }
    if (next === 'paused') {
      $('resume-button').focus({ preventScroll: true });
      announce('游戏已暂停');
    }
    if (next === 'playing') {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
    updateHud();
  }

  function startLevel() {
    prepareLevel(selectedLevel);
    setState('playing');
    showTip(level.tip, 3.5);
    announce(`第 ${selectedLevel + 1} 关，${level.name}，开始`);
  }

  function jump() {
    if (state === 'ready') {
      setState('playing');
      showTip(level.tip, 3.5);
    }
    if (state !== 'playing') return;
    if (player.grounded || player.coyote > 0 || player.jumpsLeft > 0) performJump();
    player.jumpBuffer = .15;
    $('jump-button').classList.add('pressed');
    setTimeout(() => $('jump-button').classList.remove('pressed'), 100);
  }

  function performJump() {
    const canGroundJump = player.grounded || player.coyote > 0;
    if (!canGroundJump && player.jumpsLeft <= 0) return;
    player.vy = -JUMP_SPEED;
    player.y += canGroundJump ? -1 : -3;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    if (canGroundJump) {
      player.jumpsLeft = 1;
      playSound('jump');
    } else {
      player.jumpsLeft = 0;
      playSound('doubleJump');
      for (let i = 0; i < 7; i++) {
        particles.push({ x: player.x + 6, y: player.y + 13, vx: (Math.random() - .5) * 45, vy: Math.random() * 22 + 8, life: .35, maxLife: .35, color: '#fff3d5', size: 2 });
      }
    }
  }

  function togglePause() {
    if (state === 'playing') setState('paused');
    else if (state === 'paused') setState('playing');
  }

  function spawnParticles(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      particles.push({ x, y, vx: (Math.random() - .5) * 100, vy: (Math.random() - .8) * 90, life: .4 + Math.random() * .25, maxLife: .65, color, size: Math.random() > .5 ? 2 : 1, gravity: 180 });
    }
  }

  function shoot() {
    bullets.push({ x: player.x + 16, y: player.y + 9, previousX: player.x + 16, life: 1.5 });
    playSound('shoot');
    if (bullets.length > 8) bullets.shift();
  }

  function killEnemy(enemy) {
    enemy.dead = true;
    totalKills++;
    spawnParticles(enemy.x + 8, enemy.y + 8, enemy.type === 'grub' ? '#dc735b' : '#5ba9b3', 9);
    shake = .12;
    playSound('hit');
  }

  function die() {
    if (state !== 'playing') return;
    setState('dying');
    player.vy = -150;
    player.rotation = 0;
    deathTimer = .65;
    shake = .2;
    playSound('hurt');
  }

  function finishLevel() {
    if (state !== 'playing') return;
    setState('finishing');
    completionTimer = .7;
    playSound('win');
    const isFinal = selectedLevel === LEVELS.length - 1;
    const best = progress.best[selectedLevel];
    if (!best || elapsed < best.time || (Math.abs(elapsed - best.time) < .1 && totalCoins > best.coins)) {
      progress.best[selectedLevel] = { time: elapsed, coins: totalCoins };
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
    for (let i = 0; i < 25; i++) {
      particles.push({ x: player.x + Math.random() * 70 - 35, y: player.y - 30 - Math.random() * 60, vx: (Math.random() - .5) * 45, vy: Math.random() * 30, life: 1.5, maxLife: 1.5, color: ['#a9c66c', '#efc56d', '#e58a70', '#71b8c2'][i % 4], size: 2, gravity: 35 });
    }
    setTimeout(() => {
      if (state === 'finishing') setState(isFinal ? 'won' : 'complete');
    }, 700);
  }

  function update(dt) {
    animationTime += dt;
    if (hintTimer > 0 && state === 'playing') {
      hintTimer -= dt;
      if (hintTimer <= 0) $('top-tip').classList.remove('visible');
    }
    updateParticles(dt);
    if (state === 'dying') {
      deathTimer -= dt;
      player.vy += GRAVITY * .7 * dt;
      player.y += player.vy * dt;
      player.rotation += dt * 7;
      if (deathTimer <= 0) setState('dead');
      return;
    }
    if (state !== 'playing') return;

    elapsed += dt;
    player.previousY = player.y;
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.coyote = Math.max(0, player.coyote - dt);
    player.x += RUN_SPEED * dt;
    player.vy = Math.min(380, player.vy + GRAVITY * dt);
    player.y += player.vy * dt;

    const wasGrounded = player.grounded;
    player.grounded = false;
    if (player.vy >= 0) {
      const oldBottom = player.previousY + 14;
      const newBottom = player.y + 14;
      let landingY = Infinity;
      for (const platform of [...level.platforms, ...level.ledges]) {
        if (player.x + 11 <= platform.x || player.x + 3 >= platform.x + platform.w) continue;
        if (oldBottom <= platform.y + 1 && newBottom >= platform.y) landingY = Math.min(landingY, platform.y);
      }
      if (landingY !== Infinity) {
        player.y = landingY - 14;
        player.vy = 0;
        player.grounded = true;
        player.jumpsLeft = 1;
        if (!wasGrounded) {
          for (let i = 0; i < 3; i++) particles.push({ x: player.x + 7, y: player.y + 14, vx: (Math.random() - .7) * 30, vy: -Math.random() * 12, life: .25, maxLife: .25, color: '#d9c69e', size: 1 });
        }
      }
    }
    if (wasGrounded && !player.grounded) player.coyote = COYOTE_TIME;
    for (const spring of level.springs) {
      spring.compress = Math.max(0, spring.compress - dt);
      if (player.vy < 0 || spring.compress > 0) continue;
      if (!intersects(rect(player.x + 3, player.y + 3, 9, 11), rect(spring.x + 1, spring.y - 15, 14, 16))) continue;
      player.y = spring.y - 20;
      player.vy = -360;
      player.grounded = false;
      player.jumpsLeft = 1;
      player.coyote = 0;
      player.jumpBuffer = 0;
      spring.compress = .2;
      shake = .08;
      playSound('spring');
      spawnParticles(spring.x + 8, spring.y - 10, '#f0bd55', 8);
      if (!level.springHintShown) {
        showTip('弹簧蘑菇：自动高跳，还能再补一次二段跳', 2.6);
        level.springHintShown = true;
      }
    }
    if (player.jumpBuffer > 0 && (player.grounded || player.coyote > 0 || player.jumpsLeft > 0)) performJump();
    if (player.y > VIEW_H + 16) { die(); return; }

    shotTimer -= dt;
    if (shotTimer <= 0) {
      shoot();
      shotTimer = .32;
    }
    for (const bullet of bullets) {
      bullet.previousX = bullet.x;
      bullet.x += 210 * dt;
      bullet.life -= dt;
    }
    bullets = bullets.filter((bullet) => bullet.life > 0 && bullet.x < camera + VIEW_W + 40);

    for (const enemy of level.enemies) {
      if (enemy.dead) continue;
      if (enemy.type === 'grub') {
        enemy.x = enemy.baseX + Math.sin(elapsed * 1.7 + enemy.phase) * 3;
      } else if (enemy.vertical) {
        enemy.y = enemy.baseY + Math.sin(elapsed * 1.6 + enemy.phase) * 17;
      } else {
        enemy.x = enemy.baseX + Math.sin(elapsed * 1.4 + enemy.phase) * 22;
        enemy.y = enemy.baseY + Math.sin(elapsed * 2 + enemy.phase) * 6;
      }
      const enemyHitbox = rect(enemy.x + 2, enemy.y + 3, 12, 11);
      for (const bullet of bullets) {
        if (bullet.life <= 0) continue;
        if (bullet.y + 3 > enemyHitbox.y && bullet.y < enemyHitbox.y + enemyHitbox.h && bullet.x + 5 >= enemyHitbox.x && bullet.previousX <= enemyHitbox.x + enemyHitbox.w) {
          bullet.life = 0;
          killEnemy(enemy);
          break;
        }
      }
      if (!enemy.dead && intersects(rect(player.x + 3, player.y + 3, 9, 11), enemyHitbox)) {
        die();
        return;
      }
    }

    for (const coin of level.coins) {
      if (coin.collected) continue;
      if (intersects(rect(player.x, player.y, 16, 16), rect(coin.x + 3, coin.y + 4, 10, 9))) {
        coin.collected = true;
        totalCoins++;
        spawnParticles(coin.x + 8, coin.y + 7, '#e9bd4c', 6);
        playSound('coin');
      }
    }

    if (player.x >= level.width - 48) finishLevel();
    camera = Math.max(0, Math.min(level.width - VIEW_W, player.x - 105));
    shake = Math.max(0, shake - dt);
    updateHud();
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.gravity) particle.vy += particle.gravity * dt;
    }
    particles = particles.filter((particle) => particle.life > 0);
  }

  function updateHud() {
    if (!level) return;
    totalCoins = level.coins.filter((coin) => coin.collected).length;
    totalKills = level.enemies.filter((enemy) => enemy.dead).length;
    $('coin-count').textContent = `${totalCoins} / ${level.coins.length}`;
    $('enemy-count').textContent = `${totalKills} / ${level.enemies.length}`;
    $('time-count').textContent = formatTime(elapsed);
    $('level-progress').style.width = `${Math.min(100, Math.max(0, player.x / (level.width - 48) * 100))}%`;
    const canDoubleJump = state === 'playing' && !player.grounded && player.jumpsLeft > 0;
    const label = state === 'ready' ? '开始！' : canDoubleJump ? '再跳一下！' : '跳一下！';
    const jumpLabel = $('jump-button').lastElementChild;
    if (jumpLabel.textContent !== label) {
      jumpLabel.textContent = label;
      $('jump-button').classList.toggle('double-ready', canDoubleJump);
      $('jump-button').setAttribute('aria-label', state === 'ready' ? '开始游戏' : canDoubleJump ? '再跳一下，使用二段跳' : '跳跃');
    }
  }

  function render() {
    if (!level) return;
    ctx.fillStyle = '#f9e4cd';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawBackground();
    ctx.save();
    const shakeX = shake > 0 ? Math.sin(animationTime * 100) * 1.5 : 0;
    ctx.translate(Math.round(-camera + shakeX), 0);
    drawScenery();
    drawPlatforms();
    drawSprings();
    drawCoins();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawParticles();
    ctx.restore();
  }

  function drawBackground() {
    const cloudPositions = [[70, 43, .7], [210, 28, .55], [350, 70, .8], [510, 45, .6], [690, 29, .75]];
    for (const [x, y, scale] of cloudPositions) {
      const wrappedX = ((x - camera * .16) % 780 + 780) % 780 - 60;
      drawCloud(wrappedX, y, scale);
    }
    ctx.fillStyle = '#f3ddbf';
    for (let i = 0; i < 7; i++) {
      const x = ((i * 150 - camera * .3) % 1050 + 1050) % 1050 - 50;
      const height = 20 + (i % 3) * 10;
      ctx.fillRect(Math.round(x), VIEW_H - height, 38, height);
      ctx.fillRect(Math.round(x + 7), VIEW_H - height - 7, 24, 7);
    }
    ctx.fillStyle = '#f9e4cd';
    ctx.fillRect(0, VIEW_H - 2, VIEW_W, 2);
  }

  function drawScenery() {
    for (const [tileX, groundY] of level.trees) {
      const x = tileX * 16;
      const supported = level.platforms.some((platform) => platform.y === groundY && x >= platform.x && x + 48 <= platform.x + platform.w);
      if (!supported) continue;
      drawTile('trunkLeft', x, groundY - 32);
      drawTile('trunkMid', x + 16, groundY - 32);
      drawTile('trunkRight', x + 32, groundY - 32);
      drawTile('trunkBaseLeft', x, groundY - 16);
      drawTile('trunkBaseMid', x + 16, groundY - 16);
      drawTile('trunkBaseRight', x + 32, groundY - 16);
    }
    for (const [type, x, y] of level.decorations) drawTile(type, x * 16, y - 16);
  }

  function drawSprings() {
    for (const spring of level.springs) {
      const squash = spring.compress > 0 ? .72 : 1 + Math.sin(animationTime * 4 + spring.phase) * .035;
      ctx.save();
      ctx.translate(spring.x + 8, spring.y);
      ctx.scale(2 - squash, squash);
      drawTile('mushroom', -8, -16);
      ctx.restore();
    }
  }

  function drawPlatforms() {
    for (const platform of level.platforms) {
      const tiles = platform.w / 16;
      for (let i = 0; i < tiles; i++) {
        const x = platform.x + i * 16;
        drawTile(i === 0 ? 'groundLeft' : i === tiles - 1 ? 'groundRight' : 'groundMid', x, platform.y);
        const hangingBottom = 20 + ((platform.x / 16 + i * 7) % 4) * 16;
        for (let y = platform.y + 16; y < Math.min(VIEW_H + 32, platform.y + hangingBottom); y += 16) {
          drawTile('dirt', x, y);
        }
      }
    }
    for (const ledge of level.ledges) {
      const tiles = ledge.w / 16;
      for (let i = 0; i < tiles; i++) {
        const x = ledge.x + i * 16;
        drawTile(i === 0 ? 'ledgeLeft' : i === tiles - 1 ? 'ledgeRight' : 'ledgeMid', x, ledge.y);
        drawTile(i === 0 ? 'hangingLeft' : i === tiles - 1 ? 'hangingRight' : 'hangingMid', x, ledge.y + 16);
      }
    }
    const finishX = level.width - 32;
    ctx.fillStyle = '#a4ac73';
    ctx.fillRect(finishX, 112, 2, 64);
    ctx.fillStyle = '#d47d5e';
    ctx.fillRect(finishX + 2, 112, 20, 12);
    ctx.fillStyle = '#f6d595';
    ctx.fillRect(finishX + 2, 118, 20, 6);
  }

  function drawCoins() {
    for (const coin of level.coins) {
      if (coin.collected) continue;
      const bob = Math.sin(animationTime * 3 + coin.bob) * 2;
      const width = Math.max(4, Math.round(Math.abs(Math.cos(animationTime * 4 + coin.bob)) * 10));
      const x = Math.round(coin.x + 8 - width / 2);
      const y = Math.round(coin.y + bob);
      ctx.fillStyle = '#c98032';
      ctx.fillRect(x, y + 2, width, 6);
      ctx.fillRect(x + 1, y + 1, width - 2, 8);
      ctx.fillStyle = '#f3c64c';
      ctx.fillRect(x + 1, y + 2, width - 2, 6);
      ctx.fillStyle = '#fff0a0';
      ctx.fillRect(x + 2, y + 3, Math.max(1, width - 5), 2);
    }
  }

  function drawEnemies() {
    for (const enemy of level.enemies) {
      if (enemy.dead) continue;
      let tile;
      if (enemy.type === 'grub') tile = Math.floor(animationTime * 5 + enemy.phase) % 2 ? 'grub' : 'grub2';
      else if (enemy.type === 'bee') tile = Math.floor(animationTime * 10 + enemy.phase) % 2 ? 'bee' : 'bee2';
      else tile = Math.floor(animationTime * 8 + enemy.phase) % 2 ? 'fly' : 'fly2';
      drawTile(tile, enemy.x, enemy.y, enemy.type === 'grub' && Math.cos(animationTime * 1.7 + enemy.phase) < 0);
    }
  }

  function drawBullets() {
    for (const bullet of bullets) {
      if (bullet.life <= 0) continue;
      drawTile('muzzle', bullet.x - 7, bullet.y - 1);
      drawTile('bullet', bullet.x, bullet.y);
    }
  }

  function drawPlayer() {
    let tile = 'player';
    if (!player.grounded && state !== 'ready') tile = 'playerGun';
    else if (state === 'playing' || state === 'finishing') tile = Math.floor(animationTime * 10) % 2 ? 'playerRun' : 'playerGun';
    ctx.save();
    ctx.translate(Math.round(player.x + 8), Math.round(player.y + 8));
    if (state === 'dying') ctx.rotate(player.rotation);
    if (player.vy < -80) ctx.scale(.94, 1.06);
    if (sprites.complete && sprites.naturalWidth) {
      const [sx, sy] = TILES[tile];
      ctx.drawImage(sprites, sx * 16, sy * 16, 16, 16, -8, -8, 16, 16);
    }
    ctx.restore();
    if (state === 'playing' && !player.grounded && player.jumpsLeft > 0) {
      ctx.fillStyle = '#a4b371';
      ctx.fillRect(Math.round(player.x + 7), Math.round(player.y - 5), 2, 2);
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.min(1, particle.life / (particle.maxLife * .5));
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    const dt = Math.min((now - lastFrame) / 1000, .025);
    lastFrame = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  $('result-button').addEventListener('click', () => {
    if (state === 'complete') { selectedLevel++; startLevel(); }
    else if (state === 'won') { selectedLevel = 0; startLevel(); }
    else startLevel();
  });
  $('pause-button').addEventListener('click', togglePause);
  $('resume-button').addEventListener('click', togglePause);
  $('restart-button').addEventListener('click', startLevel);
  $('jump-button').addEventListener('pointerdown', (event) => { event.preventDefault(); jump(); });
  $('stage').addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || event.target.closest('.panel')) return;
    event.preventDefault();
    jump();
  });
  $('sound-button').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    $('sound-icon').textContent = soundEnabled ? '♪' : '×';
    $('sound-button').setAttribute('aria-label', soundEnabled ? '关闭声音' : '打开声音');
    $('sound-button').title = soundEnabled ? '关闭声音' : '打开声音';
    if (soundEnabled) playSound('coin');
  });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
      if (event.target instanceof HTMLButtonElement && event.target !== $('jump-button')) return;
      event.preventDefault();
      if (!event.repeat) jump();
    }
    if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
      event.preventDefault();
      togglePause();
    }
    if (event.code === 'KeyR' && !event.repeat) startLevel();
    if (event.code === 'Enter' && !event.repeat && state === 'dead') startLevel();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') setState('paused'); });
  window.addEventListener('blur', () => { if (state === 'playing') setState('paused'); });
  sprites.addEventListener('load', render);

  prepareLevel(0);
  setState('ready');
  showTip('点击 / 空格开始', 999);
  requestAnimationFrame(loop);
})();
