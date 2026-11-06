export const COLORS = {
  red:    { key: 'red',    label: '红', suit: 'H', set: 'Red',    glyph: '♥', power: 1, ring: '#e0574a' },
  black:  { key: 'black',  label: '黑', suit: 'S', set: 'Black',  glyph: '♠', power: 1, ring: '#8fa79b' },
  blue:   { key: 'blue',   label: '蓝', suit: 'D', set: 'Blue',   glyph: '♦', power: 1, ring: '#6aa5f0' },
  green:  { key: 'green',  label: '绿', suit: 'C', set: 'Green',  glyph: '♣', power: 1, ring: '#7fc98c' },
  yellow: { key: 'yellow', label: '黄', suit: null, set: 'Yellow', glyph: '万能', power: 0.75, ring: '#e6c169' },
  purple: { key: 'purple', label: '紫', suit: null, set: 'Purple', glyph: '万能', power: 0.75, ring: '#b58bea' },
  white:  { key: 'white',  label: '白', suit: null, set: 'White',  glyph: '万能', power: 0.75, ring: '#e8e8e8' },
};

export const SHOP_COLORS = ['red', 'black', 'blue', 'green', 'yellow', 'purple'];

const d = (vals, lv) => vals[lv - 1];

export const SHAPES = [
  // 人形：即时计分
  { id: 'gambler',    name: '赌徒', v: [6, 12, 20],     desc: (lv) => `打出时 +${d([6, 12, 20], lv)} 筹码` },
  { id: 'apprentice', name: '学徒', v: [1, 2, 3],       desc: (lv) => `打出时 +${d([1, 2, 3], lv)} 倍率` },
  { id: 'courier',    name: '信使', v: [1, 2, 3],       desc: (lv) => `本手结束后多抽 ${d([1, 2, 3], lv)} 张` },
  { id: 'infantry',   name: '步兵', v: [3, 6, 10],      desc: (lv) => `每张相邻的计分牌 +${d([3, 6, 10], lv)} 筹码` },
  { id: 'dancer',     name: '舞者', v: [0, 2, 4],       desc: (lv) => `本手结束后回到手牌，并 +${d([0, 2, 4], lv)} 倍率` },
  { id: 'witch',      name: '女巫', v: [1, 1.5, 2],     desc: (lv) => `复制右侧刻印，效果 ×${d([1, 1.5, 2], lv)}` },
  { id: 'helper',     name: '帮手', v: [1, 2, 3],       desc: (lv) => `本手每张打出的牌 +${d([1, 2, 3], lv)} 筹码` },

  // 建筑：存续与放大
  { id: 'hut',      name: '小屋', v: [10, 18, 28],      desc: (lv) => `本手未打出的手牌永久 +${d([10, 18, 28], lv)} 筹码` },
  { id: 'warehouse', name: '仓库', v: [2, 4, 6],        desc: (lv) => `自身不计点，结算 +${d([2, 4, 6], lv)} 倍率` },
  { id: 'vault',    name: '金库', v: [1.2, 1.3, 1.45],  desc: (lv) => `本手总分 ×${d([1.2, 1.3, 1.45], lv)}` },
  { id: 'castle',   name: '城堡', v: [40, 70, 110],     desc: (lv) => `打出时 +${d([40, 70, 110], lv)} 筹码` },
  { id: 'wheel',    name: '轮盘', v: [1, 1.6, 2.2],     desc: (lv) => `随机 +0 / 15 / 30 / 60 筹码（×${d([1, 1.6, 2.2], lv)}）` },
  { id: 'rack',     name: '筹码架', v: [1, 2, 3],       desc: (lv) => `本局每累计 100 分 +${d([1, 2, 3], lv)} 倍率` },

  // 交通与旗帜：牌面结构
  { id: 'truck',   name: '卡车', v: [5, 10, 16],        desc: (lv) => `本手每张未计分的牌 +${d([5, 10, 16], lv)} 筹码` },
  { id: 'boat',    name: '帆船', v: [3, 6, 9],          desc: (lv) => `本手计分牌 ≤3 张时 +${d([3, 6, 9], lv)} 倍率` },
  { id: 'sail',    name: '帆',   v: [1, 2, 3],          desc: (lv) => `本手每有一种花色 +${d([1, 2, 3], lv)} 倍率` },
  { id: 'train',   name: '火车', v: [1, 2, 3],          desc: (lv) => `本手其余刻印额外结算 ${d([1, 2, 3], lv)} 次` },
  { id: 'command', name: '号令', v: [0, 0, 0],          desc: () => '本手所有牌视为同一花色' },
  { id: 'mark',    name: '记号', v: [1, 2, 3],          desc: (lv) => `+${d([1, 2, 3], lv)} 倍率，且本手后回到牌堆顶` },
];

export function shapeByIndex(i) {
  return SHAPES[i];
}

export function engravingTitle(e) {
  return `${COLORS[e.color].label} · ${SHAPES[e.shape].name}`;
}

export function engravingDesc(e) {
  return SHAPES[e.shape].desc(e.level);
}

export function engravingApplies(card) {
  const e = card.engraving;
  if (!e) return false;
  const c = COLORS[e.color];
  if (!c) return false;
  if (c.suit === null) return true;
  return c.suit === card.suit;
}

export function engravingPower(card) {
  const c = COLORS[card.engraving.color];
  return c ? c.power : 1;
}

export function canEngrave(card, offer) {
  if (card.engraving) return false;
  const c = COLORS[offer.color];
  if (c.suit === null) return true;
  return c.suit === card.suit;
}

export const LEVEL_LABEL = ['', 'I', 'II', 'III'];
export const LEVEL_PRICE = [0, 10, 22, 45];