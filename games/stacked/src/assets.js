import { CHIP_VECTORS } from './chipPaths.js';

export const A = {
  img: {},
  atlas: {},
};

export const PIECE_SETS = ['Red', 'Black', 'Blue', 'Green', 'Yellow', 'Purple', 'White'];

const pathCache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败: ' + src));
    img.src = src;
  });
}

async function loadText(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error('资源加载失败: ' + src);
  return res.text();
}

function parseAtlas(xml) {
  const out = {};
  const tags = xml.match(/<SubTexture\b[^>]*>/g) || [];
  for (const tag of tags) {
    const attrs = {};
    for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2];
    if (!attrs.name) continue;
    out[attrs.name] = { x: +attrs.x, y: +attrs.y, w: +attrs.width, h: +attrs.height };
  }
  return out;
}

export async function loadAssets() {
  const [cards, backs, ...pieces] = await Promise.all([
    loadImage('assets/playingCards.png'),
    loadImage('assets/playingCardBacks.png'),
    ...PIECE_SETS.map((s) => loadImage(`assets/pieces${s}.png`)),
  ]);
  A.img.cards = cards;
  A.img.backs = backs;
  A.img.pieces = {};
  PIECE_SETS.forEach((s, i) => {
    A.img.pieces[s] = pieces[i];
  });

  const [cardsXml, backsXml] = await Promise.all([
    loadText('assets/playingCards.xml'),
    loadText('assets/playingCardBacks.xml'),
  ]);
  A.atlas.cards = parseAtlas(cardsXml);
  A.atlas.backs = parseAtlas(backsXml);
}

export function cardFrame(sprite) {
  const f = A.atlas.cards[sprite];
  if (!f) throw new Error('缺少牌面: ' + sprite);
  return f;
}

export function backFrame(sprite) {
  return A.atlas.backs[sprite];
}

// 棋子合图：19 列（形状）× 3 行（I / II / III 级），每格 64×64
export function pieceArt(setName, shape, level) {
  return {
    img: A.img.pieces[setName],
    sx: shape * 64,
    sy: (level - 1) * 64,
    sw: 64,
    sh: 64,
  };
}

export function chipDims(name) {
  const v = CHIP_VECTORS[name];
  return v ? { w: v.w, h: v.h } : { w: 64, h: 64 };
}

// 筹码用矢量绘制：任何缩放/DPR 下边缘都是干净的
// 对方塔用的暗色版本：直接算好颜色，避免用 ctx.filter（逐次绘制都走滤镜，很贵）
function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = 0.3 * r + 0.59 * g + 0.11 * b;
  const mix = (c) => Math.round((c * 0.55 + lum * 0.45) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function drawChip(ctx, name, x, y, w, h, dark = 0) {
  const v = CHIP_VECTORS[name];
  if (!v) return;

  const key = dark ? `${name}@${dark}` : name;
  let cache = pathCache.get(key);
  if (!cache) {
    cache = v.paths.map(([fill, d]) => ({
      fill: dark ? darken(fill, dark) : fill,
      path: new Path2D(d),
    }));
    pathCache.set(key, cache);
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / v.w, h / v.h);
  for (const p of cache) {
    ctx.fillStyle = p.fill;
    ctx.fill(p.path);
  }
  ctx.restore();
}