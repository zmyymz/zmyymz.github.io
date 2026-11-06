import { evaluate, cardChips } from './cards.js';
import { SHAPES, engravingApplies, engravingPower } from './engravings.js';

const isId = (card, id) => card.engraving && SHAPES[card.engraving.shape].id === id;
const r1 = (v) => Math.round(v * 10) / 10;

const WHEEL_FACES = [0, 15, 30, 60];

export function resolvePlay(played, { roundScore = 0, preview = false } = {}) {
  let overrideSuit = null;
  for (const c of played) {
    if (isId(c, 'command') && engravingApplies(c)) {
      overrideSuit = c.suit;
      break;
    }
  }

  const suitOf = overrideSuit ? () => overrideSuit : undefined;
  const res = evaluate(played, suitOf);
  const scoringIdx = new Set(res.scoringIdx);
  const order = played.map((c, i) => ({ c, i })).filter((o) => scoringIdx.has(o.i));

  let chips = res.baseChips;
  let mult = res.baseMult;
  let xmult = 1;

  const notes = new Map();
  const note = (text) => notes.set(text, (notes.get(text) || 0) + 1);

  const post = { draw: 0, returnCards: [], hut: 0, markCards: [] };

  for (const o of order) {
    if (isId(o.c, 'warehouse') && engravingApplies(o.c)) continue;
    chips += cardChips(o.c);
  }

  const scoringNeighbors = (card) => {
    const p = played.indexOf(card);
    let n = 0;
    for (const q of [p - 1, p + 1]) {
      if (q >= 0 && q < played.length && scoringIdx.has(q)) n++;
    }
    return n;
  };

  function applyOne(card, boost, copied) {
    const e = card.engraving;
    if (!e || !engravingApplies(card)) return;
    if (copied && SHAPES[e.shape].id === 'witch') return;

    const S = SHAPES[e.shape];
    const lv = e.level;
    const k = boost * engravingPower(card);
    const v = S.v[lv - 1];

    switch (S.id) {
      case 'gambler': {
        const add = Math.round(v * k);
        chips += add;
        note(`赌徒 +${add}`);
        break;
      }
      case 'apprentice': {
        const add = r1(v * k);
        mult += add;
        note(`学徒 +${add}倍`);
        break;
      }
      case 'courier':
        post.draw += lv;
        note(`信使 +${lv}张`);
        break;
      case 'infantry': {
        const n = scoringNeighbors(card);
        if (!n) break;
        const add = Math.round(v * k * n);
        chips += add;
        note(`步兵 +${add}`);
        break;
      }
      case 'dancer':
        post.returnCards.push(card);
        if (v > 0) {
          const add = r1(v * k);
          mult += add;
          note(`舞者 +${add}倍`);
        } else {
          note('舞者 回手');
        }
        break;
      case 'witch': {
        const idx = played.indexOf(card);
        const next = played[idx + 1];
        if (next && next.engraving) {
          note('女巫 复制');
          applyOne(next, boost * v, true);
        }
        break;
      }
      case 'helper': {
        const add = Math.round(v * k * played.length);
        chips += add;
        note(`帮手 +${add}`);
        break;
      }
      case 'hut': {
        post.hut = Math.max(post.hut, Math.round(v * k));
        note(`小屋 +${Math.round(v * k)}/张`);
        break;
      }
      case 'warehouse': {
        const add = r1(v * k);
        mult += add;
        note(`仓库 +${add}倍`);
        break;
      }
      case 'vault': {
        const m = 1 + (v - 1) * k;
        xmult *= m;
        note(`金库 ×${r1(m)}`);
        break;
      }
      case 'castle': {
        const add = Math.round(v * k);
        chips += add;
        note(`城堡 +${add}`);
        break;
      }
      case 'wheel': {
        const face = preview ? 30 : WHEEL_FACES[(Math.random() * WHEEL_FACES.length) | 0];
        const add = Math.round(face * v * k);
        if (add > 0) {
          chips += add;
          note(`轮盘 +${add}`);
        } else {
          note('轮盘 ×0');
        }
        break;
      }
      case 'rack': {
        const steps = Math.floor(roundScore / 100);
        if (steps <= 0) break;
        const add = r1(v * k * steps);
        mult += add;
        note(`筹码架 +${add}倍`);
        break;
      }
      case 'truck': {
        const n = played.length - scoringIdx.size;
        if (n <= 0) break;
        const add = Math.round(v * k * n);
        chips += add;
        note(`卡车 +${add}`);
        break;
      }
      case 'boat': {
        if (scoringIdx.size > 3) break;
        const add = r1(v * k);
        mult += add;
        note(`帆船 +${add}倍`);
        break;
      }
      case 'sail': {
        const suits = new Set(played.map((c) => (overrideSuit || c.suit)));
        const add = r1(v * k * suits.size);
        mult += add;
        note(`帆 +${add}倍`);
        break;
      }
      case 'mark': {
        const add = r1(v * k);
        mult += add;
        post.markCards.push(card);
        note(`记号 +${add}倍`);
        break;
      }
      default:
        break;
    }
  }

  const pass = (boost, skipStructural) => {
    for (const o of order) {
      const c = o.c;
      if (!c.engraving) continue;
      const id = SHAPES[c.engraving.shape].id;
      if (skipStructural && (id === 'train' || id === 'witch')) continue;
      applyOne(c, boost, false);
    }
  };

  pass(1, false);

  let trainLv = 0;
  for (const o of order) {
    if (isId(o.c, 'train') && engravingApplies(o.c)) trainLv = Math.max(trainLv, o.c.engraving.level);
  }
  for (let i = 0; i < trainLv; i++) pass(1, true);

  const finalChips = Math.round(chips);
  const finalMult = r1(mult);
  const total = Math.max(0, Math.round(finalChips * finalMult * xmult));

  const log = [...notes.entries()].map(([t, n]) => (n > 1 ? `${t}×${n}` : t));

  return {
    key: res.key,
    name: res.name,
    chips: finalChips,
    mult: finalMult,
    xmult: r1(xmult),
    total,
    log,
    post,
    scoringIdx: res.scoringIdx,
  };
}