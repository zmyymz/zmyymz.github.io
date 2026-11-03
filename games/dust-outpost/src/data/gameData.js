export const CHARACTERS = [
  {
    id: 0,
    name: 'CAT',
    role: 'SCOUT',
    passive: 'SPEED +15%',
    desc: '跑得最快，适合绕后与拉扯',
    speedMul: 1.15,
    dmgMul: 1,
    maxHp: 6,
    dashCd: 1.2,
  },
  {
    id: 1,
    name: 'LION',
    role: 'GUNNER',
    passive: 'DAMAGE +20%',
    desc: '伤害加成，压枪更快清场',
    speedMul: 1,
    dmgMul: 1.2,
    maxHp: 6,
    dashCd: 1.2,
  },
  {
    id: 2,
    name: 'ELEPHANT',
    role: 'TANK',
    passive: 'MAX HP +2',
    desc: '多两颗心，敢站着对枪',
    speedMul: 0.95,
    dmgMul: 1,
    maxHp: 8,
    dashCd: 1.2,
  },
  {
    id: 3,
    name: 'RHINO',
    role: 'BREACHER',
    passive: 'DASH CD -40%',
    desc: '冲刺更频繁，靠机动保命',
    speedMul: 1.05,
    dmgMul: 1,
    maxHp: 6,
    dashCd: 0.7,
  },
];

export const WEAPONS = {
  pistol: {
    id: 'pistol', name: 'PISTOL', frame: 0,
    dmg: 9, rate: 250, speed: 520, spread: 0.02, pellets: 1, pierce: 0,
    sound: 'shoot-a', shake: 0.002, kick: 2,
  },
  smg: {
    id: 'smg', name: 'SMG', frame: 2,
    dmg: 6, rate: 95, speed: 560, spread: 0.09, pellets: 1, pierce: 0,
    sound: 'shoot-b', shake: 0.0015, kick: 1,
  },
  rifle: {
    id: 'rifle', name: 'RIFLE', frame: 7,
    dmg: 13, rate: 175, speed: 720, spread: 0.03, pellets: 1, pierce: 0,
    sound: 'shoot-c', shake: 0.003, kick: 3,
  },
  shotgun: {
    id: 'shotgun', name: 'SHOTGUN', frame: 5,
    dmg: 6, rate: 620, speed: 500, spread: 0.30, pellets: 5, pierce: 0,
    sound: 'shoot-d', shake: 0.009, kick: 6,
  },
  sniper: {
    id: 'sniper', name: 'SNIPER', frame: 4,
    dmg: 46, rate: 950, speed: 1100, spread: 0.0, pellets: 1, pierce: 3,
    sound: 'shoot-e', shake: 0.012, kick: 8,
  },
};

export const ENEMY_TYPES = {
  0: { name: 'CRYSTAL', hp: 44, speed: 30, dmg: 1, score: 10, frame: 0, radius: 15, ranged: false },
  1: { name: 'SPORE', hp: 34, speed: 40, dmg: 1, score: 15, frame: 1, radius: 14, ranged: true, keep: 150, fireRate: 1900 },
  2: { name: 'DASHER', hp: 22, speed: 82, dmg: 1, score: 8, frame: 2, radius: 14, ranged: false },
  3: { name: 'DEMON', hp: 175, speed: 48, dmg: 2, score: 45, frame: 3, radius: 18, ranged: true, keep: 190, fireRate: 2400 },
};

export const WAVES = [
  { spawns: [[0, 3], [2, 3]] },
  { spawns: [[0, 4], [2, 5], [1, 3]] },
  { spawns: [[0, 4], [2, 6], [1, 4], [3, 1]] },
  { spawns: [[0, 4], [1, 6], [2, 8], [3, 2]] },
];

export const UPGRADES = [
  { id: 'dmg', title: 'DAMAGE +25%', desc: '子弹伤害提升 25%', repeat: true },
  { id: 'rate', title: 'FIRE RATE +20%', desc: '射击间隔缩短 20%', repeat: true },
  { id: 'speed', title: 'MOVE SPEED +12%', desc: '移动速度提升 12%', repeat: true },
  { id: 'power', title: 'POWER CELL +40', desc: '闸门电量上限 +40，回充 +50%', repeat: true },
  { id: 'hp', title: 'MAX HEALTH +1', desc: '生命上限 +1，并回复 1 点', repeat: true },
  { id: 'dash', title: 'DASH CD -30%', desc: '冲刺冷却缩短 30%', repeat: true },
  { id: 'weapon:shotgun', title: 'SHOTGUN', desc: '换装霰弹枪：5 发散射，近身压制', weapon: 'shotgun' },
  { id: 'weapon:sniper', title: 'SNIPER', desc: '换装狙击枪：高伤穿透，射速慢', weapon: 'sniper' },
  { id: 'weapon:rifle', title: 'RIFLE', desc: '换装步枪：中远距离最均衡', weapon: 'rifle' },
  { id: 'weapon:smg', title: 'SMG', desc: '换装冲锋枪：高射速，散布大', weapon: 'smg' },
];

export const GATE_DEFS = [
  {
    id: 'L', label: 'LEFT', x: 16, y: 176, w: 32, h: 32,
    vertical: true,
    spawn: { x: -26, y: 176 },
    bars: [[0, 160], [16, 160], [0, 176], [16, 176]],
  },
  {
    id: 'R', label: 'RIGHT', x: 624, y: 176, w: 32, h: 32,
    vertical: true,
    spawn: { x: 666, y: 176 },
    bars: [[608, 160], [624, 160], [608, 176], [624, 176]],
  },
  {
    id: 'T', label: 'TOP', x: 320, y: 16, w: 32, h: 32,
    vertical: false,
    spawn: { x: 320, y: -26 },
    bars: [[304, 0], [320, 0], [304, 16], [320, 16]],
  },
];

export const GATE_CELLS = new Set(['0,10', '1,10', '0,11', '1,11', '38,10', '39,10', '38,11', '39,11', '19,0', '20,0', '19,1', '20,1']);