import * as Phaser from '../../vendor/phaser.esm.min.js';
import {
  CHARACTERS, WEAPONS, ENEMY_TYPES, WAVES, UPGRADES, GATE_DEFS, GATE_CELLS,
} from '../data/gameData.js';
import PixelText from '../ui/PixelText.js';
import { isTouchDevice } from '../ui/device.js';

const W = 640;
const H = 360;
const TILE = 16;
const COLS = 40;
const ROWS = 22;

const SAND_FRAME = 64;
const WALL_FRAME = 19;
const GATE_FRAME = 214;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(data) {
    this.charIndex = data.charIndex ?? 0;
    this.char = CHARACTERS[this.charIndex];
    this.state = 'playing';

    this.maxHp = this.char.maxHp;
    this.hp = this.maxHp;
    this.dmgMul = this.char.dmgMul;
    this.rateMul = 1;
    this.speedMul = this.char.speedMul;
    this.dashCd = this.char.dashCd;
    this.powerRegen = 1;
    this.maxPower = 100;
    this.power = 100;
    this.overloaded = false;
    this.weaponId = 'pistol';
    this.score = 0;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;

    this.lastShot = 0;
    this.invulnUntil = 0;
    this.dashUntil = 0;
    this.knockUntil = 0;
    this.dashReadyAt = 0;
    this.gateLockedUntil = 0;
    this.gunKick = 0;
    this.lastHud = 0;
    this.dashDir = new Phaser.Math.Vector2(1, 0);
    this.aimAngle = 0;
    this.gateNear = false;

    const forcedTouch = new URLSearchParams(location.search).get('touch');
    this.isTouch = isTouchDevice()
      || (forcedTouch !== '0' && this.sys.game.device.input.touch && !this.sys.game.device.os.desktop);
    this.touch = {
      moveX: 0, moveY: 0, moving: false,
      aimX: 0, aimY: 1, aimActive: false, firing: false,
      dashQueued: false, gateQueued: false,
    };

    this.buildArena();
    this.createGates();
    this.createPlayer();
    this.createGroups();

    this.physics.world.setBounds(-120, -120, W + 240, H + 240);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.gateGroup);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.gateGroup);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.bullets, this.walls, (b) => this.killBullet(b));
    this.physics.add.collider(this.bullets, this.gateGroup, (b) => this.killBullet(b));
    this.physics.add.collider(this.enemyBullets, this.walls, (b) => this.killBullet(b));
    this.physics.add.collider(this.enemyBullets, this.gateGroup, (b) => this.killBullet(b));
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b, e));
    this.physics.add.overlap(this.enemyBullets, this.player, (b) => this.hitByBullet(b));
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this.hitByEnemy(e));

    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor('#221c30');

    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE');

    this.events.once('shutdown', () => {
      this.game.canvas.style.cursor = 'default';
      this.debugEl?.remove();
    });

    this.createEdgeBounds();
    this.physics.add.collider(this.player, this.edgeBounds);

    this.game.canvas.style.cursor = this.isTouch ? 'default' : 'none';
    this.scene.launch('Hud');

    this.publishHud();
    this.startWave(1);

    this.debugEl = null;
    if (new URLSearchParams(location.search).get('debug') === '1') {
      this.debugEl = document.createElement('div');
      this.debugEl.id = 'state';
      this.debugEl.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:9998;color:#9f9;background:#000b;font:11px monospace;padding:4px;white-space:pre-wrap;max-width:96vw';
      document.body.appendChild(this.debugEl);
    }
  }

  buildArena() {
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(0);
    this.walls = this.physics.add.staticGroup();

    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        const isGateCell = GATE_CELLS.has(`${cx},${cy}`);
        const isWall = !isGateCell && (cx < 2 || cx > COLS - 3 || cy < 2 || cy > ROWS - 3);
        if (isWall) {
          const w = this.walls.create(cx * TILE + 8, cy * TILE + 8, 'tiles', WALL_FRAME);
          w.setDepth(1);
          if ((cx * 5 + cy * 3) % 11 === 0) w.setTint(0xcbbfe6);
        } else {
          rt.drawFrame('tiles', SAND_FRAME, cx * TILE, cy * TILE);
        }
      }
    }

    const props = [
      [70, 62, 66], [152, 54, 62], [248, 64, 82], [420, 58, 63],
      [560, 62, 80], [588, 300, 66], [470, 312, 62], [182, 310, 82],
      [86, 292, 63], [372, 314, 57],
    ];
    props.forEach(([x, y, frame]) => {
      this.add.image(x, y, 'tiles', frame).setDepth(2).setAlpha(0.95);
    });
  }

  createGates() {
    this.gateGroup = this.physics.add.staticGroup();
    this.gates = GATE_DEFS.map((def) => {
      const barrier = this.gateGroup.create(def.x, def.y, 'blank')
        .setVisible(false)
        .setDisplaySize(def.w, def.h);
      barrier.refreshBody();
      barrier.body.enable = false;

      const light = this.add.rectangle(def.x, def.y, def.w, def.h, 0x63d6b4, 0.12)
        .setDepth(59);

      const bars = def.bars.map(([x, y]) => this.add
        .image(x + 8, y + 8, 'tiles', GATE_FRAME)
        .setDepth(60)
        .setAlpha(0.14)
        .setTint(0x63d6b4));

      const prompt = new PixelText(this, def.x, def.y - 26, 'E', { size: 10, align: 'center' })
        .setDepth(400)
        .setVisible(false);

      return { ...def, barrier, bars, light, prompt, closed: false };
    });
  }

  createPlayer() {
    const startX = 320;
    const startY = 210;

    this.player = this.physics.add.sprite(startX, startY, 'players', this.charIndex * 4)
      .setDepth(100 + startY);
    this.player.body.setSize(12, 10).setOffset(6, 12);
    this.player.play(`player-walk-${this.charIndex}`);
    this.player.anims.pause();
    this.player.setFrame(this.charIndex * 4);

    this.playerShadow = this.add.image(startX, startY + 11, 'shadow')
      .setAlpha(0.26)
      .setDepth(3);

    this.gun = this.add.image(startX, startY, 'weapons', WEAPONS.pistol.frame)
      .setOrigin(0.2, 0.5)
      .setScale(1.6)
      .setDepth(this.player.depth + 1);

    this.crosshair = this.add.image(startX, startY, 'weapons', 34)
      .setDepth(1000)
      .setScale(1.15)
      .setAlpha(0.95)
      .setVisible(!this.isTouch);
  }

  createGroups() {
    this.bullets = this.physics.add.group({ maxSize: 220 });
    this.enemyBullets = this.physics.add.group({ maxSize: 120 });
    this.enemies = this.physics.add.group();
  }

  createEdgeBounds() {
    this.edgeBounds = this.physics.add.staticGroup();
    const walls = [
      [-20, 180, 16, 560],
      [660, 180, 16, 560],
      [320, -20, 720, 16],
      [320, 380, 720, 16],
      [10, 176, 8, 32],
      [W - 10, 176, 8, 32],
      [320, 10, 32, 8],
    ];
    walls.forEach(([x, y, w, h]) => {
      const body = this.edgeBounds.create(x, y, 'blank').setVisible(false).setDisplaySize(w, h);
      body.refreshBody();
    });
  }

  aimPoint() {
    const p = this.input.activePointer;
    return { x: p.worldX, y: p.worldY };
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    if (this.state === 'playing') {
      this.updatePlayer(dt);
      this.updateGates(dt);
      this.updateShooting(dt);
      this.updateEnemies(dt);
      this.updateWave(dt);
      this.cleanupBullets();
      this.updateCrosshair();
      this.updateGatePrompts();

      if (time - this.lastHud > 100) {
        this.lastHud = time;
        this.publishHud();
      }
    } else {
      this.player.setVelocity(0, 0);
      this.enemies.getChildren().forEach((e) => e.setVelocity(0, 0));
      this.updateCrosshair();
    }

    if (this.debugEl) this.updateDebug(dt);
  }

  updateDebug() {
    this.frames = (this.frames ?? 0) + 1;
    const list = this.enemies.getChildren()
      .filter((e) => e.active)
      .map((e) => `${e.getData('type')}@${Math.round(e.x)},${Math.round(e.y)}`)
      .join(' ');
    this.debugEl.textContent = [
      `frames=${this.frames ?? 0} t=${Math.round(this.time.now)} state=${this.state} wave=${this.wave} active=${this.enemies.countActive(true)} queue=${this.spawnQueue.length}`,
      `player=${Math.round(this.player.x)},${Math.round(this.player.y)} hp=${this.hp}/${this.maxHp} power=${Math.round(this.power)}`,
      `gates=${this.gates.map((g) => g.id + (g.closed ? 'C' : 'O')).join(',')} enemies=${list}`,
    ].join('\n');
  }

  updatePlayer(dt) {
    const speed = 118 * this.speedMul;
    const now = this.time.now;

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.touch.dashQueued) {
      this.touch.dashQueued = false;
      this.tryDash();
    }

    if (now < this.knockUntil) {
      // 击退期间保留冲量，不做输入覆盖
    } else if (now < this.dashUntil) {
      this.player.setVelocity(this.dashDir.x * 360, this.dashDir.y * 360);
    } else {
      let vx = 0;
      let vy = 0;
      let mag = 0;

      if (this.isTouch) {
        vx = this.touch.moveX;
        vy = this.touch.moveY;
        mag = Math.hypot(vx, vy);
      } else {
        if (this.keys.A.isDown) vx -= 1;
        if (this.keys.D.isDown) vx += 1;
        if (this.keys.W.isDown) vy -= 1;
        if (this.keys.S.isDown) vy += 1;
        const len = Math.hypot(vx, vy);
        if (len > 0) {
          vx /= len;
          vy /= len;
          mag = 1;
        }
      }

      if (mag > 0.01) {
        this.player.setVelocity(vx * speed, vy * speed);
        if (this.player.anims.isPaused) this.player.anims.resume();
      } else {
        this.player.setVelocity(0, 0);
        if (!this.player.anims.isPaused) this.player.anims.pause();
      }
    }

    this.player.setDepth(100 + this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y + 11);

    const angle = this.resolveAimAngle();
    this.gunKick = Math.max(0, this.gunKick - dt * 60);

    const gx = this.player.x + Math.cos(angle) * (9 - this.gunKick * 0.6);
    const gy = this.player.y + 2 + Math.sin(angle) * (9 - this.gunKick * 0.6);

    this.gun.setPosition(gx, gy);
    this.gun.setRotation(angle);
    this.gun.setFlipY(Math.cos(angle) < 0);
    this.gun.setDepth(this.player.depth + 1);

    if (this.time.now < this.invulnUntil) {
      this.player.setAlpha(Math.floor(this.time.now / 70) % 2 === 0 ? 0.35 : 1);
    } else {
      this.player.setAlpha(1);
    }
  }

  resolveAimAngle() {
    let angle;
    if (this.isTouch) {
      if (this.touch.aimActive) {
        angle = Math.atan2(this.touch.aimY, this.touch.aimX);
        this.aimAngle = angle;
      } else {
        angle = this.aimAngle;
      }
      if (this.touch.firing) {
        const target = this.aimAssistTarget(angle);
        if (target) {
          angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
          this.aimAngle = angle;
        }
      }
    } else {
      const aim = this.aimPoint();
      angle = Math.atan2(aim.y - this.player.y + 4, aim.x - this.player.x);
      this.aimAngle = angle;
    }
    return angle;
  }

  aimAssistTarget(angle) {
    let best = null;
    let bestDiff = 0.22;
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || !enemy.visible) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist > 360) return;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(
        Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y) - angle,
      ));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = enemy;
      }
    });
    return best;
  }

  tryDash() {
    const now = this.time.now;
    if (now < this.dashReadyAt) return;

    let dir = new Phaser.Math.Vector2(this.player.body.velocity.x, this.player.body.velocity.y);
    if (dir.lengthSq() < 1) {
      dir = new Phaser.Math.Vector2(Math.cos(this.aimAngle), Math.sin(this.aimAngle));
    }
    dir.normalize();

    this.dashDir = dir;
    this.dashUntil = now + 150;
    this.dashReadyAt = now + this.dashCd * 1000;
    this.invulnUntil = Math.max(this.invulnUntil, now + 280);
    this.sound.play('move-b', { volume: 0.22 });

    const ghost = this.add.image(this.player.x, this.player.y, 'players', this.player.frame.name)
      .setAlpha(0.45)
      .setTint(0x8ad7ff)
      .setDepth(this.player.depth - 1);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
  }

  updateShooting() {
    const wantsFire = this.isTouch ? this.touch.firing : this.input.activePointer.isDown;
    if (!wantsFire) return;
    const weapon = WEAPONS[this.weaponId];
    const interval = weapon.rate / this.rateMul;
    if (this.time.now - this.lastShot < interval) return;
    this.lastShot = this.time.now;

    const angle = this.aimAngle;
    const muzzleX = this.player.x + Math.cos(angle) * 24;
    const muzzleY = this.player.y + 2 + Math.sin(angle) * 24;

    for (let i = 0; i < weapon.pellets; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread * 2;
      this.spawnBullet(muzzleX, muzzleY, angle + spread, weapon);
    }

    this.gunKick = weapon.kick;
    this.sound.play(weapon.sound, { volume: 0.16 });
    this.cameras.main.shake(60, weapon.shake);
    this.burst(muzzleX, muzzleY, 0xffd27a, 3, 90);
  }

  spawnBullet(x, y, angle, weapon) {
    const bullet = this.bullets.get(x, y, 'bullet');
    if (!bullet) return;
    bullet.enableBody(true, x, y, true, true);
    bullet.setDepth(300).setTint(0xffe08a).setBlendMode(Phaser.BlendModes.ADD);
    bullet.body.setAllowGravity(false);
    bullet.body.setSize(7, 3);
    this.physics.velocityFromRotation(angle, weapon.speed, bullet.body.velocity);
    bullet.setRotation(angle);
    bullet.setData('dmg', weapon.dmg * this.dmgMul);
    bullet.setData('pierce', weapon.pierce);
    bullet.setData('born', this.time.now);
    bullet.setData('hitList', []);
  }

  spawnEnemyBullet(x, y, angle) {
    const bullet = this.enemyBullets.get(x, y, 'ebullet');
    if (!bullet) return;
    bullet.enableBody(true, x, y, true, true);
    bullet.setDepth(300).setTint(0xff6b6b);
    bullet.body.setAllowGravity(false);
    bullet.body.setSize(6, 6);
    this.physics.velocityFromRotation(angle, 165, bullet.body.velocity);
    bullet.setData('born', this.time.now);
  }

  killBullet(bullet) {
    if (!bullet.active) return;
    this.burst(bullet.x, bullet.y, 0xffe08a, 2, 60);
    bullet.disableBody(true, true);
  }

  cleanupBullets() {
    const now = this.time.now;
    const sweep = (group, life) => {
      group.getChildren().forEach((b) => {
        if (b.active && now - b.getData('born') > life) b.disableBody(true, true);
      });
    };
    sweep(this.bullets, 1000);
    sweep(this.enemyBullets, 3200);
  }

  hitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    const list = bullet.getData('hitList');
    if (list.includes(enemy)) return;
    list.push(enemy);

    const dmg = bullet.getData('dmg');
    enemy.setData('hp', enemy.getData('hp') - dmg);
    enemy.setTint(0xff8f8f);
    this.time.delayedCall(70, () => { if (enemy.active) enemy.clearTint(); });
    this.burst(bullet.x, bullet.y, 0xffd27a, 4, 120);

    const pierce = bullet.getData('pierce');
    if (pierce > 0) {
      bullet.setData('pierce', pierce - 1);
    } else {
      bullet.disableBody(true, true);
    }

    if (enemy.getData('hp') <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    const type = ENEMY_TYPES[enemy.getData('type')];
    this.score += type.score;
    enemy.getData('shadow')?.destroy();
    this.burst(enemy.x, enemy.y, 0xff9a5c, 10, 180);
    this.sound.play(Math.random() > 0.5 ? 'explosion-a' : 'explosion-b', { volume: 0.22 });
    this.sound.play('coin-a', { volume: 0.12 });
    this.cameras.main.shake(70, 0.003);
    enemy.destroy();
  }

  updateEnemies() {
    const player = this.player;
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      enemy.setDepth(100 + enemy.y);

      // 门洞范围内渐显，避免敌人贴着屏幕边缘露出来
      const inset = Math.min(enemy.x, W - enemy.x, enemy.y, H - enemy.y);
      const alpha = Phaser.Math.Clamp((inset - 4) / 20, 0, 1);
      enemy.setVisible(inset > 4);
      enemy.setAlpha(alpha);
      const shadow = enemy.getData('shadow');
      if (shadow) {
        shadow.setPosition(enemy.x, enemy.y + 9);
        shadow.setVisible(inset > 4);
        shadow.setAlpha(0.2 * alpha);
      }

      const type = ENEMY_TYPES[enemy.getData('type')];
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);

      let moveAngle = angle;
      if (type.ranged) {
        const keep = type.keep ?? 150;
        if (dist < keep - 20) moveAngle = angle + Math.PI;
        else if (dist < keep + 20) moveAngle = angle + Math.PI / 2;

        if (dist < 340 && this.time.now >= enemy.getData('nextShot')) {
          enemy.setData('nextShot', this.time.now + type.fireRate);
          const shots = type.name === 'DEMON' ? 3 : 1;
          for (let i = 0; i < shots; i++) {
            const offset = shots > 1 ? (i - 1) * 0.22 : 0;
            this.spawnEnemyBullet(
              enemy.x + Math.cos(angle) * 12,
              enemy.y + Math.sin(angle) * 12,
              angle + offset,
            );
          }
          this.sound.play('shoot-e', { volume: 0.08 });
        }
      }

      const speed = type.speed;
      enemy.setVelocity(Math.cos(moveAngle) * speed, Math.sin(moveAngle) * speed);
      enemy.setFlipX(player.x < enemy.x);
    });
  }

  hitByEnemy(enemy) {
    if (!enemy.active) return;
    const type = ENEMY_TYPES[enemy.getData('type')];
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    this.hurt(type.dmg, angle);
  }

  hitByBullet(bullet) {
    if (!bullet.active) return;
    const angle = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
    bullet.disableBody(true, true);
    this.hurt(1, angle);
  }

  hurt(amount, fromAngle) {
    const now = this.time.now;
    if (this.state !== 'playing' || now < this.invulnUntil) return;

    this.hp -= amount;
    this.invulnUntil = now + 1200;
    this.sound.play('hurt-a', { volume: 0.35 });
    this.cameras.main.shake(140, 0.009);
    this.cameras.main.flash(90, 255, 70, 70);

    if (fromAngle != null) {
      this.player.setVelocity(Math.cos(fromAngle) * 190, Math.sin(fromAngle) * 190);
      this.knockUntil = now + 120;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
    this.publishHud();
  }

  die() {
    this.state = 'dead';
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.player.setFrame(this.charIndex * 4 + 3);
    this.gun.setVisible(false);
    this.crosshair.setVisible(false);
    this.game.canvas.style.cursor = 'default';
    this.cameras.main.shake(320, 0.014);
    this.sound.play('lose-a', { volume: 0.5 });
    this.time.delayedCall(800, () => {
      this.game.events.emit('gameover', { score: this.score, wave: this.wave });
    });
    this.publishHud();
  }

  victory() {
    this.state = 'won';
    this.game.canvas.style.cursor = 'default';
    this.sound.play('coin-b', { volume: 0.4 });
    this.time.delayedCall(600, () => {
      this.game.events.emit('victory', { score: this.score });
    });
    this.publishHud();
  }

  updateGates(dt) {
    const now = this.time.now;

    let nearest = null;
    let best = 72;
    this.gates.forEach((gate) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, gate.x, gate.y);
      if (d < best) { best = d; nearest = gate; }
    });

    if (nearest && (Phaser.Input.Keyboard.JustDown(this.keys.E) || this.touch.gateQueued)) {
      this.toggleGate(nearest, now);
    }
    this.touch.gateQueued = false;
    this.gateNear = !!nearest;

    const closedCount = this.gates.filter((g) => g.closed).length;
    if (closedCount > 0) {
      this.power -= 16 * closedCount * dt;
      if (this.power <= 0) {
        this.power = 0;
        if (!this.overloaded) this.overload(now);
      }
    } else {
      this.power = Math.min(this.maxPower, this.power + 10 * this.powerRegen * dt);
      if (this.power > 25) this.overloaded = false;
    }
  }

  toggleGate(gate, now) {
    if (now < this.gateLockedUntil) {
      this.sound.play('error-a', { volume: 0.3 });
      this.game.events.emit('toast', 'POWER LOCKED');
      return;
    }
    this.setGate(gate, !gate.closed);
    this.sound.play('move-a', { volume: 0.3 });
    this.publishHud();
  }

  playerInGate(gate) {
    const body = this.player.body;
    return body.x < gate.x + gate.w / 2
      && body.x + body.width > gate.x - gate.w / 2
      && body.y < gate.y + gate.h / 2
      && body.y + body.height > gate.y - gate.h / 2;
  }

  nudgeOutOfGate(gate) {
    if (!this.playerInGate(gate)) return;
    const inner = 52;
    const x = gate.id === 'L' ? inner : gate.id === 'R' ? W - inner : this.player.x;
    const y = gate.id === 'T' ? inner : gate.id === 'B' ? H - inner : this.player.y;
    this.player.body.reset(x, y);
    this.player.setPosition(x, y);
  }

  setGate(gate, closed) {
    gate.closed = closed;
    gate.barrier.body.enable = closed;
    if (closed) this.nudgeOutOfGate(gate);
    gate.bars.forEach((bar) => {
      bar.setAlpha(closed ? 0.95 : 0.14);
      bar.setTint(closed ? 0xffa14d : 0x63d6b4);
    });
    gate.light.setFillStyle(closed ? 0xff8a3d : 0x63d6b4, closed ? 0.18 : 0.08);
  }

  overload(now) {
    this.overloaded = true;
    this.gateLockedUntil = now + 6000;
    this.gates.forEach((gate) => {
      if (gate.closed) this.setGate(gate, false);
    });
    this.sound.play('error-a', { volume: 0.45 });
    this.cameras.main.flash(180, 255, 110, 60);
    this.cameras.main.shake(220, 0.01);
    this.game.events.emit('toast', 'GATE OVERLOAD');
  }

  updateGatePrompts() {
    this.gates.forEach((gate) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, gate.x, gate.y);
      gate.prompt.setVisible(!this.isTouch && d < 72);
      gate.prompt.setY(gate.y - 30 + Math.sin(this.time.now / 220) * 2);
    });
  }

  updateCrosshair() {
    if (this.isTouch) return;
    const p = this.input.activePointer;
    this.crosshair.setPosition(p.worldX, p.worldY);
  }

  startWave(n) {
    this.wave = n;
    const wave = WAVES[n - 1];
    this.spawnQueue = [];
    wave.spawns.forEach(([type, count]) => {
      for (let i = 0; i < count; i++) this.spawnQueue.push(type);
    });
    Phaser.Utils.Array.Shuffle(this.spawnQueue);
    this.spawnTimer = 0.8;
    this.waveActive = true;
    this.game.events.emit('toast', `WAVE ${n}`);
    this.publishHud();
  }

  updateWave(dt) {
    if (!this.waveActive) return;

    this.spawnTimer -= dt;
    if (this.spawnQueue.length && this.spawnTimer <= 0) {
      const type = this.spawnQueue.pop();
      const gate = Phaser.Utils.Array.GetRandom(this.gates);
      this.spawnEnemy(type, gate);
      this.spawnTimer = 0.95;
    }

    if (!this.spawnQueue.length && this.enemies.countActive(true) === 0) {
      this.waveActive = false;
      this.time.delayedCall(650, () => {
        if (this.state !== 'playing') return;
        if (this.wave >= WAVES.length) this.victory();
        else this.offerUpgrades();
      });
    }
  }

  spawnEnemy(type, gate) {
    const def = ENEMY_TYPES[type];
    const hp = Math.round(def.hp * (1 + (this.wave - 1) * 0.22));
    const x = gate.spawn.x + Phaser.Math.Between(-8, 8);
    const y = gate.spawn.y + Phaser.Math.Between(-14, 14);

    const enemy = this.enemies.create(x, y, 'enemies', def.frame * 4);
    enemy.setDepth(100 + y);
    enemy.body.setSize(14, 14).setOffset(5, 8);
    enemy.setData({
      type,
      hp,
      maxHp: hp,
      nextShot: this.time.now + 700,
    });
    enemy.play(`enemy-walk-${def.frame}`);
    const shadow = this.add.image(x, y + 9, 'shadow').setDepth(3).setAlpha(0.2).setScale(0.9);
    enemy.setData('shadow', shadow);
    this.burst(x, y, 0x8ad7ff, 5, 90);
    return enemy;
  }

  offerUpgrades() {
    const pool = UPGRADES.filter((u) => !u.weapon || u.weapon !== this.weaponId);
    Phaser.Utils.Array.Shuffle(pool);
    const options = pool.slice(0, 3);
    this.state = 'upgrade';
    this.game.events.emit('showUpgrades', options);
    this.scene.pause();
  }

  onUpgradePicked(option) {
    switch (option.id) {
      case 'dmg': this.dmgMul *= 1.25; break;
      case 'rate': this.rateMul *= 1.2; break;
      case 'speed': this.speedMul *= 1.12; break;
      case 'power':
        this.maxPower += 40;
        this.powerRegen *= 1.5;
        this.power = Math.min(this.maxPower, this.power + 40);
        break;
      case 'hp':
        this.maxHp += 1;
        this.hp = Math.min(this.maxHp, this.hp + 1);
        break;
      case 'dash': this.dashCd *= 0.7; break;
      default:
        if (option.weapon) this.weaponId = option.weapon;
    }

    this.state = 'playing';
    this.game.canvas.style.cursor = this.isTouch ? 'default' : 'none';
    this.startWave(this.wave + 1);
    this.publishHud();
  }

  publishHud() {
    const weapon = WEAPONS[this.weaponId];
    this.game.events.emit('hud', {
      hp: this.hp,
      maxHp: this.maxHp,
      wave: this.wave,
      waves: WAVES.length,
      power: Math.round(this.power),
      maxPower: this.maxPower,
      gates: this.gates.map((g) => ({
        id: g.id,
        closed: g.closed,
        near: this.enemies.getChildren()
          .filter((e) => e.active && Phaser.Math.Distance.Between(e.x, e.y, g.x, g.y) < 90).length,
      })),
      locked: this.time.now < this.gateLockedUntil,
      weapon: weapon.name,
      weaponFrame: weapon.frame,
      dashReady: this.time.now >= this.dashReadyAt ? 1 : 1 - (this.dashReadyAt - this.time.now) / (this.dashCd * 1000),
      score: this.score,
      enemies: this.enemies.countActive(true) + this.spawnQueue.length,
      nearGate: this.gateNear,
      state: this.state,
    });
  }

  burst(x, y, color, count, speed) {
    const emitter = this.add.particles(x, y, 'spark', {
      speed: { min: speed * 0.3, max: speed },
      lifespan: { min: 160, max: 380 },
      scale: { start: 1.4, end: 0 },
      tint: color,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(500);
    emitter.explode(count);
    this.time.delayedCall(600, () => emitter.destroy());
  }
}