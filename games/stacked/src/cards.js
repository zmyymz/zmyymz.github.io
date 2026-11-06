export const SUIT_PREFIX = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const SUIT_ORDER = ['S', 'H', 'D', 'C'];

export const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const HANDS = {
  high:     { name: '高牌',   chips: 5,   mult: 1 },
  pair:     { name: '一对',   chips: 12,  mult: 2 },
  two:      { name: '两对',   chips: 24,  mult: 2 },
  trips:    { name: '三条',   chips: 34,  mult: 3 },
  straight: { name: '顺子',   chips: 38,  mult: 4 },
  flush:    { name: '同花',   chips: 42,  mult: 4 },
  full:     { name: '葫芦',   chips: 50,  mult: 5 },
  quads:    { name: '四条',   chips: 72,  mult: 8 },
  sflush:   { name: '同花顺', chips: 120, mult: 10 },
};

let nextId = 1;

export function makeDeck() {
  const deck = [];
  for (const suit of SUIT_ORDER) {
    for (let rank = 2; rank <= 14; rank++) {
      const label = RANK_LABEL[rank] || String(rank);
      deck.push({
        id: nextId++,
        suit,
        rank,
        sprite: `card${SUIT_PREFIX[suit]}${label}.png`,
        engraving: null,
      });
    }
  }
  return deck;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SUIT_SORT = { S: 0, H: 1, D: 2, C: 3 };

export function sortByRank(cards) {
  return cards.sort((a, b) => b.rank - a.rank || SUIT_SORT[a.suit] - SUIT_SORT[b.suit]);
}

export function cardChips(card) {
  const base = card.rank === 14 ? 11 : card.rank >= 11 ? 10 : card.rank;
  return base + (card.bonusChips || 0);
}

function isStraightDesc(ranks) {
  if (new Set(ranks).size !== 5) return false;
  if (ranks[0] - ranks[4] === 4) return true;
  return ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2;
}

export function evaluate(cards, suitOf = (c) => c.suit) {
  const n = cards.length;
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const counts = new Map();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) || 0) + 1);

  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const isFlush = n === 5 && cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const isStraight = n === 5 && isStraightDesc(ranks);
  const pick = (pred) => cards.filter(pred);

  let key;
  let scoring;

  if (isFlush && isStraight) {
    key = 'sflush'; scoring = cards;
  } else if (groups[0].count === 4) {
    key = 'quads'; scoring = pick((c) => c.rank === groups[0].rank);
  } else if (groups[0].count === 3 && groups[1]?.count === 2) {
    key = 'full'; scoring = cards;
  } else if (isFlush) {
    key = 'flush'; scoring = cards;
  } else if (isStraight) {
    key = 'straight'; scoring = cards;
  } else if (groups[0].count === 3) {
    key = 'trips'; scoring = pick((c) => c.rank === groups[0].rank);
  } else if (groups[0].count === 2 && groups[1]?.count === 2) {
    key = 'two';
    scoring = pick((c) => c.rank === groups[0].rank || c.rank === groups[1].rank);
  } else if (groups[0].count === 2) {
    key = 'pair'; scoring = pick((c) => c.rank === groups[0].rank);
  } else {
    key = 'high'; scoring = [cards.reduce((a, b) => (b.rank > a.rank ? b : a))];
  }

  const hand = HANDS[key];
  const scoringChips = scoring.reduce((sum, c) => sum + cardChips(c), 0);
  const scoringIdx = scoring.map((c) => cards.indexOf(c));

  return {
    key,
    name: hand.name,
    baseChips: hand.chips,
    baseMult: hand.mult,
    scoring,
    scoringIdx,
    chips: hand.chips + scoringChips,
    mult: hand.mult,
    total: Math.round((hand.chips + scoringChips) * hand.mult),
  };
}